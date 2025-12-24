import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import {
  saveProject,
  getUserProjects,
  getAllProjects,
  getProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
  getUser,
} from '../../../core/utils/firestoreUtils.js';
import { deleteProjectResourcesFromGCS } from '../../../core/services/gcsService.js';

const router = express.Router();

// Initialize Google OAuth2 Client
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

/**
 * Helper function to convert Firestore Timestamps to ISO strings
 * Recursively processes objects and arrays
 */
const serializeFirestoreDates = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeFirestoreDates(item));
  }

  // Handle Firestore Timestamp objects
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
  }

  // Handle Date objects
  if (obj instanceof Date || obj.toDate) {
    return obj.toDate ? obj.toDate().toISOString() : obj.toISOString();
  }

  // Recursively process object properties
  const serialized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      serialized[key] = serializeFirestoreDates(obj[key]);
    }
  }
  return serialized;
};

/**
 * Middleware to verify Google token from Authorization header
 * Extracts user ID from the verified token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    req.userId = payload.sub;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    console.error('[GameLab] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * GET /api/gamelab/projects
 * Get all GameLab projects accessible to the authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = req.db; // From productContext middleware

    // Check if user is a Super User
    const currentUser = await getUser(req.userId); // Uses StoryLab db where users are stored
    const isSuperUser = currentUser?.role === 'Super User';

    // Fetch projects based on user role
    const projects = isSuperUser
      ? await getAllProjects(db)
      : await getUserProjects(req.userId, db);

    // Fetch owner names for all unique owner IDs
    const ownerIds = [...new Set(projects.map(p => p.ownerId).filter(Boolean))];
    const ownerMap = {};
    await Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const user = await getUser(ownerId); // Uses StoryLab db where users are stored
          if (user) {
            ownerMap[ownerId] = user.name || user.email || 'Unknown';
          }
        } catch (err) {
          console.warn(`[FlareLab] Failed to fetch owner ${ownerId}:`, err.message);
        }
      })
    );

    // Include member info, owner name for each project and serialize dates
    const projectsWithMemberInfo = projects.map((project) =>
      serializeFirestoreDates({
        ...project,
        userRole: project.members?.[req.userId] || 'viewer',
        isOwner: project.ownerId === req.userId,
        ownerName: ownerMap[project.ownerId] || null,
      })
    );

    return res.status(200).json({
      success: true,
      count: projectsWithMemberInfo.length,
      projects: projectsWithMemberInfo,
    });
  } catch (error) {
    console.error('[FlareLab] Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * GET /api/gamelab/projects/:projectId
 * Get a specific GameLab project
 */
router.get('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = req.db;

    const project = await getProject(projectId, db);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is a Super User
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';

    // Check if user has access (Super Users can access any project)
    const hasAccess =
      isSuperUser ||
      project.ownerId === req.userId ||
      (project.members && project.members[req.userId]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    // Fetch owner name
    let ownerName = null;
    if (project.ownerId) {
      try {
        const owner = await getUser(project.ownerId);
        if (owner) {
          ownerName = owner.name || owner.email || 'Unknown';
        }
      } catch (err) {
        console.warn(`[FlareLab] Failed to fetch owner ${project.ownerId}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      project: serializeFirestoreDates({
        ...project,
        userRole: isSuperUser ? 'super_user' : project.members?.[req.userId] || 'viewer',
        isSuperUser,
        ownerName,
      }),
    });
  } catch (error) {
    console.error('[GameLab] Error fetching project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

/**
 * POST /api/gamelab/projects
 * Create a new GameLab project
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const projectData = {
      ...req.body,
      ownerId: req.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: req.userId,
      members: {
        [req.userId]: 'owner',
      },
    };

    const projectId = await saveProject(projectData, db);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: serializeFirestoreDates({
        id: projectId,
        ...projectData,
      }),
    });
  } catch (error) {
    console.error('[GameLab] Error creating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

/**
 * PUT /api/gamelab/projects/:projectId
 * Update a GameLab project
 */
router.put('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = req.db;

    // Get existing project
    const existingProject = await getProject(projectId, db);

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user has edit access
    const userRole = existingProject.members?.[req.userId];
    const canEdit =
      existingProject.ownerId === req.userId ||
      userRole === 'owner' ||
      userRole === 'editor';

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit this project',
      });
    }

    // Update project
    const updates = {
      ...req.body,
      updatedAt: new Date(),
    };

    await saveProject({ ...existingProject, ...updates }, db, projectId);

    const updatedProject = await getProject(projectId, db);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: serializeFirestoreDates(updatedProject),
    });
  } catch (error) {
    console.error('[GameLab] Error updating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

/**
 * PUT /api/gamelab/projects/:projectId/stages/:stageName
 * Update stage execution status
 */
router.put('/:projectId/stages/:stageName', verifyToken, async (req, res) => {
  try {
    const { projectId, stageName } = req.params;
    const db = req.db;

    // Get existing project
    const existingProject = await getProject(projectId, db);

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user has edit access
    const userRole = existingProject.members?.[req.userId];
    const canEdit =
      existingProject.ownerId === req.userId ||
      userRole === 'owner' ||
      userRole === 'editor';

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit this project',
      });
    }

    // Update stage execution
    const stageExecutions = existingProject.stageExecutions || {};
    stageExecutions[stageName] = {
      ...stageExecutions[stageName],
      ...req.body,
      stageName,
    };

    const updates = {
      stageExecutions,
      updatedAt: new Date(),
    };

    await saveProject({ ...existingProject, ...updates }, db, projectId);

    const updatedProject = await getProject(projectId, db);

    return res.status(200).json({
      success: true,
      message: 'Stage execution updated successfully',
      project: serializeFirestoreDates(updatedProject),
    });
  } catch (error) {
    console.error('[GameLab] Error updating stage execution:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update stage execution',
    });
  }
});

/**
 * DELETE /api/gamelab/projects/:projectId
 * Delete a GameLab project
 */
router.delete('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = req.db;

    // Get existing project
    const project = await getProject(projectId, db);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is the owner (Super Users can also delete)
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';

    if (project.ownerId !== req.userId && !isSuperUser) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can delete this project',
      });
    }

    // Clean up GCS resources (images, videos, etc.)
    let gcsCleanupResult = { deleted: 0, errors: [] };
    try {
      gcsCleanupResult = await deleteProjectResourcesFromGCS(projectId);
      console.log(`[FlareLab] GCS cleanup for project ${projectId}: ${gcsCleanupResult.deleted} files deleted`);
    } catch (gcsError) {
      // Log error but continue with Firestore deletion
      console.error(`[FlareLab] GCS cleanup failed for project ${projectId}:`, gcsError.message);
    }

    await deleteProject(projectId, db);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      gcsCleanup: {
        filesDeleted: gcsCleanupResult.deleted,
        errors: gcsCleanupResult.errors?.length || 0,
      },
    });
  } catch (error) {
    console.error('[GameLab] Error deleting project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

/**
 * GET /api/gamelab/projects/:projectId/members
 * Get project members
 */
router.get('/:projectId/members', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = req.db;

    const members = await getProjectMembers(projectId, db);

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error('[GameLab] Error fetching project members:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project members',
    });
  }
});

/**
 * POST /api/flarelab/projects/:projectId/members
 * Add a member to the project (legacy endpoint)
 */
router.post('/:projectId/members', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;
    const db = req.db;

    // Get existing project
    const project = await getProject(projectId, db);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Only owner can add members
    if (project.ownerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can add members',
      });
    }

    await addProjectMember(projectId, userId, role, db);

    return res.status(200).json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    console.error('[FlareLab] Error adding project member:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add project member',
    });
  }
});

// ============================================================================
// PROJECT SHARING & COLLABORATION
// ============================================================================

/**
 * POST /api/flarelab/projects/:projectId/share
 * Share project with other users (only owner can share)
 *
 * Request body:
 * {
 *   users: [{ userId: string, role: 'editor' | 'viewer' }]
 * }
 */
router.post('/:projectId/share', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { users } = req.body;
    const db = req.db;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required',
      });
    }

    // Validate roles
    const validRoles = ['editor', 'viewer'];
    for (const user of users) {
      if (!user.userId || !user.role) {
        return res.status(400).json({
          success: false,
          error: 'Each user must have userId and role',
        });
      }
      if (!validRoles.includes(user.role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
      }
    }

    // Get project
    const project = await getProject(projectId, db);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Only owner can share
    if (project.ownerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can share this project',
      });
    }

    // Add members to project
    const updatedMembers = { ...project.members };
    const addedUsers = [];
    const skippedUsers = [];

    for (const user of users) {
      // Check if user exists in Pixology database
      const existingUser = await getUser(user.userId);
      if (!existingUser) {
        skippedUsers.push({ userId: user.userId, reason: 'User not found in Pixology' });
        continue;
      }

      // Don't allow changing owner's role
      if (user.userId === project.ownerId) {
        skippedUsers.push({ userId: user.userId, reason: 'Cannot change owner role' });
        continue;
      }

      updatedMembers[user.userId] = user.role;
      addedUsers.push({
        userId: user.userId,
        email: existingUser.email,
        name: existingUser.name,
        role: user.role,
      });
    }

    // Update project
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, db, projectId);

    return res.status(200).json({
      success: true,
      message: `Shared with ${addedUsers.length} user(s)`,
      addedUsers,
      skippedUsers,
      members: updatedMembers,
    });
  } catch (error) {
    console.error('[FlareLab] Error sharing project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to share project',
    });
  }
});

/**
 * PUT /api/flarelab/projects/:projectId/members/:userId
 * Update a member's role (only owner can update)
 */
router.put('/:projectId/members/:userId', verifyToken, async (req, res) => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const db = req.db;

    if (!role || !['editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role (editor or viewer) is required',
      });
    }

    const project = await getProject(projectId, db);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Only owner can update roles
    if (project.ownerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can update member roles',
      });
    }

    // Cannot change owner's role
    if (targetUserId === project.ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change the owner role',
      });
    }

    // Check if user is a member
    if (!project.members || !project.members[targetUserId]) {
      return res.status(404).json({
        success: false,
        error: 'User is not a member of this project',
      });
    }

    // Update role
    const updatedMembers = { ...project.members, [targetUserId]: role };
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, db, projectId);

    return res.status(200).json({
      success: true,
      message: 'Member role updated',
      userId: targetUserId,
      newRole: role,
    });
  } catch (error) {
    console.error('[FlareLab] Error updating member role:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update member role',
    });
  }
});

/**
 * DELETE /api/flarelab/projects/:projectId/members/:userId
 * Remove a member from project (only owner can remove, or member can leave)
 */
router.delete('/:projectId/members/:userId', verifyToken, async (req, res) => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const db = req.db;

    const project = await getProject(projectId, db);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const isOwner = project.ownerId === req.userId;
    const isRemovingSelf = targetUserId === req.userId;

    // Owner can remove anyone, members can only remove themselves
    if (!isOwner && !isRemovingSelf) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can remove members',
      });
    }

    // Cannot remove owner
    if (targetUserId === project.ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the project owner. Transfer ownership first or delete the project.',
      });
    }

    // Check if user is a member
    if (!project.members || !project.members[targetUserId]) {
      return res.status(404).json({
        success: false,
        error: 'User is not a member of this project',
      });
    }

    // Remove member
    const updatedMembers = { ...project.members };
    delete updatedMembers[targetUserId];
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, db, projectId);

    return res.status(200).json({
      success: true,
      message: isRemovingSelf ? 'You have left the project' : 'Member removed from project',
      userId: targetUserId,
    });
  } catch (error) {
    console.error('[FlareLab] Error removing member:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove member',
    });
  }
});

/**
 * POST /api/flarelab/projects/:projectId/duplicate
 * Duplicate a project (any member can duplicate, becomes owner of the copy)
 */
router.post('/:projectId/duplicate', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;
    const db = req.db;

    const project = await getProject(projectId, db);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user has access to the project
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';
    const hasAccess = isSuperUser || (project.members && project.members[req.userId]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    // Create duplicate project
    const now = new Date();
    const duplicateProject = {
      ...project,
      title: name || `${project.title} (Copy)`,
      ownerId: req.userId,
      members: {
        [req.userId]: 'owner',
      },
      createdAt: now,
      updatedAt: now,
      // Reset some fields for the duplicate
      status: 'draft',
    };

    // Remove the original project ID
    delete duplicateProject.id;

    // Save the duplicate
    const newProjectId = await saveProject(duplicateProject, db, null);

    return res.status(201).json({
      success: true,
      message: 'Project duplicated successfully',
      projectId: newProjectId,
      project: serializeFirestoreDates({
        id: newProjectId,
        ...duplicateProject,
      }),
    });
  } catch (error) {
    console.error('[FlareLab] Error duplicating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to duplicate project',
    });
  }
});

export default router;
