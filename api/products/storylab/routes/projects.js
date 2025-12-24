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

// Initialize Google OAuth2 Client
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

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
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * GET /api/projects
 * Get all projects accessible to the authenticated user (owned or member of)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is a Super User
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';

    // Fetch projects based on user role
    const projects = isSuperUser
      ? await getAllProjects()
      : await getUserProjects(req.userId);

    // Fetch owner names for all unique owner IDs
    const ownerIds = [...new Set(projects.map(p => p.ownerId).filter(Boolean))];
    const ownerMap = {};
    await Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const user = await getUser(ownerId);
          if (user) {
            ownerMap[ownerId] = user.name || user.email || 'Unknown';
          }
        } catch (err) {
          console.warn(`[StoryLab] Failed to fetch owner ${ownerId}:`, err.message);
        }
      })
    );

    // Include member info and owner name for each project, serialize dates
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
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * GET /api/projects/:projectId
 * Get a specific project (user must be a member)
 */
router.get('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await getProject(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is a Super User
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';

    // Check if user has access to this project (Super Users can access any project)
    const hasAccess = isSuperUser || (project.members && project.members[req.userId]);
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
        console.warn(`Failed to fetch owner ${project.ownerId}:`, err.message);
      }
    }

    // Include member info and owner name, serialize dates
    const projectWithMemberInfo = serializeFirestoreDates({
      ...project,
      userRole: isSuperUser ? 'super_user' : project.members?.[req.userId] || 'viewer',
      isOwner: project.ownerId === req.userId,
      isSuperUser,
      ownerName,
    });

    return res.status(200).json({
      success: true,
      project: projectWithMemberInfo,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

/**
 * POST /api/projects
 * Create a new project
 *
 * Request body (supports both simple and StoryLab projects):
 * {
 *   title: "Project Title",
 *   description: "Project description",
 *   thumbnail: "https://...",
 *   status: "draft" | "in_progress" | "completed" | "archived",
 *   // StoryLab-specific fields (optional)
 *   campaignDetails: {...},
 *   currentStageIndex: 0,
 *   stageExecutions: {...},
 *   completionPercentage: 0,
 *   // ... other optional fields
 * }
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      thumbnail,
      status,
      // StoryLab fields
      campaignDetails,
      currentStageIndex,
      stageExecutions,
      completionPercentage,
      narrativePreferences,
      visualDirection,
      scriptPreferences,
      aiGeneratedPersonas,
      aiGeneratedNarrative,
      aiGeneratedStoryboard,
      aiGeneratedScreenplay,
      aiGeneratedVideos,
      videoProduction,
      userPersonaSelection,
      storyboardCustomizations,
      screenplayCustomizations,
      metadata,
    } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project title is required',
      });
    }

    // Allow both simple statuses and workflow statuses
    const validStatuses = ['draft', 'in_progress', 'completed', 'archived', 'published'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid project status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Create project data with timestamps
    const projectData = {
      title: title.trim(),
      description: description || '',
      thumbnail: thumbnail || '',
      status: status || 'draft',
      ownerId: req.userId,
      members: {
        [req.userId]: 'owner',
      },
      // Include StoryLab fields if provided
      ...(campaignDetails && { campaignDetails }),
      ...(currentStageIndex !== undefined && { currentStageIndex }),
      ...(stageExecutions && { stageExecutions }),
      ...(completionPercentage !== undefined && { completionPercentage }),
      ...(narrativePreferences && { narrativePreferences }),
      ...(visualDirection && { visualDirection }),
      ...(scriptPreferences && { scriptPreferences }),
      ...(aiGeneratedPersonas && { aiGeneratedPersonas }),
      ...(aiGeneratedNarrative && { aiGeneratedNarrative }),
      ...(aiGeneratedStoryboard && { aiGeneratedStoryboard }),
      ...(aiGeneratedScreenplay && { aiGeneratedScreenplay }),
      ...(aiGeneratedVideos && { aiGeneratedVideos }),
      ...(videoProduction && { videoProduction }),
      ...(userPersonaSelection && { userPersonaSelection }),
      ...(storyboardCustomizations && { storyboardCustomizations }),
      ...(screenplayCustomizations && { screenplayCustomizations }),
      ...(metadata && { metadata }),
    };

    // Save to Firestore (signature: projectData, database, projectId)
    // Pass null for database to use default StoryLab db
    const projectId = await saveProject(projectData, null, null);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      projectId,
      project: serializeFirestoreDates({
        id: projectId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

/**
 * PUT /api/projects/:projectId
 * Update a project (only owner or editor can update)
 * Supports both simple fields and StoryLab-specific fields
 */
router.put('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      thumbnail,
      status,
      // StoryLab fields
      campaignDetails,
      currentStageIndex,
      stageExecutions,
      completionPercentage,
      narrativePreferences,
      visualDirection,
      scriptPreferences,
      aiGeneratedPersonas,
      aiGeneratedNarrative,
      aiGeneratedNarratives,
      aiGeneratedStoryboard,
      aiGeneratedScreenplay,
      aiGeneratedVideos,
      videoProduction,
      userPersonaSelection,
      storyboardCustomizations,
      screenplayCustomizations,
      metadata,
    } = req.body;

    // Validation
    if (title && (typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Project title must be a non-empty string',
      });
    }

    // Allow both simple statuses and workflow statuses
    const validStatuses = ['draft', 'in_progress', 'completed', 'archived', 'published'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid project status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if project exists and user has access
    const existingProject = await getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is owner or editor
    const userRole = existingProject.members?.[req.userId];
    if (!userRole || (userRole !== 'owner' && userRole !== 'editor')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this project',
      });
    }

    // Update project data - preserve existing fields and merge new ones
    const updatedProjectData = {
      ...existingProject,
      // Simple fields
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(thumbnail !== undefined && { thumbnail }),
      ...(status && { status }),
      // StoryLab fields
      ...(campaignDetails && { campaignDetails }),
      ...(currentStageIndex !== undefined && { currentStageIndex }),
      ...(stageExecutions && { stageExecutions }),
      ...(completionPercentage !== undefined && { completionPercentage }),
      ...(narrativePreferences && { narrativePreferences }),
      ...(visualDirection && { visualDirection }),
      ...(scriptPreferences && { scriptPreferences }),
      ...(aiGeneratedPersonas && { aiGeneratedPersonas }),
      ...(aiGeneratedNarrative && { aiGeneratedNarrative }),
      ...(aiGeneratedNarratives && { aiGeneratedNarratives }),
      ...(aiGeneratedStoryboard && { aiGeneratedStoryboard }),
      ...(aiGeneratedScreenplay && { aiGeneratedScreenplay }),
      ...(aiGeneratedVideos && { aiGeneratedVideos }),
      ...(videoProduction && { videoProduction }),
      ...(userPersonaSelection && { userPersonaSelection }),
      ...(storyboardCustomizations && { storyboardCustomizations }),
      ...(screenplayCustomizations && { screenplayCustomizations }),
      ...(metadata && { metadata }),
      updatedAt: new Date(),
    };

    // Save to Firestore (signature: projectData, database, projectId)
    await saveProject(updatedProjectData, null, projectId);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: serializeFirestoreDates(updatedProjectData),
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete a project (only owner can delete)
 */
router.delete('/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists
    const project = await getProject(projectId);
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
      console.log(`[StoryLab] GCS cleanup for project ${projectId}: ${gcsCleanupResult.deleted} files deleted`);
    } catch (gcsError) {
      // Log error but continue with Firestore deletion
      console.error(`[StoryLab] GCS cleanup failed for project ${projectId}:`, gcsError.message);
    }

    // Delete from Firestore
    await deleteProject(projectId);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      gcsCleanup: {
        filesDeleted: gcsCleanupResult.deleted,
        errors: gcsCleanupResult.errors?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

/**
 * PUT /api/projects/:projectId/stages/:stageName
 * Update stage execution status for StoryLab workflow
 *
 * Request body:
 * {
 *   stageName: "campaign-details",
 *   status: "pending" | "in_progress" | "completed" | "failed" | "skipped",
 *   data?: { ... },
 *   error?: { message, code, details },
 *   executionId?: "...",
 * }
 */
router.put('/:projectId/stages/:stageName', verifyToken, async (req, res) => {
  try {
    const { projectId, stageName } = req.params;
    const { status, data, error, executionId } = req.body;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Stage status is required',
      });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stage status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if project exists and user has access
    const existingProject = await getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user is owner or editor
    const userRole = existingProject.members?.[req.userId];
    if (!userRole || (userRole !== 'owner' && userRole !== 'editor')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this project',
      });
    }

    // Build stage execution record
    const stageExecution = {
      stageName,
      status,
      startedAt: existingProject.stageExecutions?.[stageName]?.startedAt || new Date(),
      completedAt: status === 'completed' ? new Date() : null,
      ...(data && { outputs: data }),
      ...(error && { error }),
      ...(executionId && { executionId }),
    };

    // Update project with new stage execution
    // IMPORTANT: Preserve generated data when marking a stage as pending for regeneration
    // Only clear data if explicitly requested via the clearData parameter
    const updatedProjectData = {
      ...existingProject,
      stageExecutions: {
        ...existingProject.stageExecutions,
        [stageName]: stageExecution,
      },
      updatedAt: new Date(),
    };

    // Map of stage names to their generated data fields
    // These fields are preserved unless explicitly cleared
    const stageDataFields = {
      'personas': 'aiGeneratedPersonas',
      'narrative': ['aiGeneratedNarrative', 'aiGeneratedNarratives'],
      'storyboard': 'aiGeneratedStoryboard',
      'screenplay': 'aiGeneratedScreenplay',
      'video': 'aiGeneratedVideos',
    };

    // When a stage is marked as pending, DO NOT clear its previously generated data
    // The data should persist so users don't lose work if they need to regenerate
    // Only clear if explicitly requested
    if (status === 'pending' && !req.body.clearData) {
      console.log(`[Projects API] Preserving generated data for stage '${stageName}' when marking as pending`);
      // Keep all existing generated data fields
      Object.keys(stageDataFields).forEach(stage => {
        const fields = stageDataFields[stage];
        const fieldsArray = Array.isArray(fields) ? fields : [fields];
        fieldsArray.forEach(field => {
          if (existingProject[field]) {
            updatedProjectData[field] = existingProject[field];
          }
        });
      });
    }

    // Save to Firestore (signature: projectData, database, projectId)
    await saveProject(updatedProjectData, null, projectId);

    return res.status(200).json({
      success: true,
      message: `Stage '${stageName}' updated successfully`,
      project: updatedProjectData,
    });
  } catch (error) {
    console.error('Error updating stage execution:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update stage execution',
    });
  }
});

/**
 * POST /api/projects/:projectId/upload-product-image
 * Upload a product image for the campaign
 * Requires: Authorization header with Google token
 */
router.post('/:projectId/upload-product-image', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { imageBase64, fileName } = req.body;

    if (!imageBase64 || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing imageBase64 or fileName',
      });
    }

    // Import gcsService
    const { uploadImageToGCS } = await import('./services/gcsService.js');

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Upload to GCS with product image path
    const publicUrl = await uploadImageToGCS(imageBuffer, projectId, 'product-image');

    console.log(`[Projects API] Product image uploaded for project ${projectId}: ${publicUrl}`);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      message: 'Product image uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload product image',
      details: error.message,
    });
  }
});

// ============================================================================
// PROJECT SHARING & COLLABORATION
// ============================================================================

/**
 * POST /api/projects/:projectId/share
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
    const project = await getProject(projectId);
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
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, null, projectId);

    return res.status(200).json({
      success: true,
      message: `Shared with ${addedUsers.length} user(s)`,
      addedUsers,
      skippedUsers,
      members: updatedMembers,
    });
  } catch (error) {
    console.error('Error sharing project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to share project',
    });
  }
});

/**
 * GET /api/projects/:projectId/members
 * Get all members of a project
 */
router.get('/:projectId/members', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Check if user has access
    const currentUser = await getUser(req.userId);
    const isSuperUser = currentUser?.role === 'Super User';
    const hasAccess = isSuperUser || (project.members && project.members[req.userId]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    // Get member details
    const memberIds = Object.keys(project.members || {});
    const membersWithDetails = [];

    for (const memberId of memberIds) {
      const user = await getUser(memberId);
      membersWithDetails.push({
        userId: memberId,
        email: user?.email || 'Unknown',
        name: user?.name || 'Unknown',
        picture: user?.picture,
        role: project.members[memberId],
        isOwner: memberId === project.ownerId,
      });
    }

    return res.status(200).json({
      success: true,
      members: membersWithDetails,
      count: membersWithDetails.length,
    });
  } catch (error) {
    console.error('Error getting project members:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get project members',
    });
  }
});

/**
 * PUT /api/projects/:projectId/members/:userId
 * Update a member's role (only owner can update)
 */
router.put('/:projectId/members/:userId', verifyToken, async (req, res) => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (!role || !['editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role (editor or viewer) is required',
      });
    }

    const project = await getProject(projectId);
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
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, null, projectId);

    return res.status(200).json({
      success: true,
      message: 'Member role updated',
      userId: targetUserId,
      newRole: role,
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update member role',
    });
  }
});

/**
 * DELETE /api/projects/:projectId/members/:userId
 * Remove a member from project (only owner can remove, or member can leave)
 */
router.delete('/:projectId/members/:userId', verifyToken, async (req, res) => {
  try {
    const { projectId, userId: targetUserId } = req.params;

    const project = await getProject(projectId);
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
    await saveProject({ ...project, members: updatedMembers, updatedAt: new Date() }, null, projectId);

    return res.status(200).json({
      success: true,
      message: isRemovingSelf ? 'You have left the project' : 'Member removed from project',
      userId: targetUserId,
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove member',
    });
  }
});

/**
 * POST /api/projects/:projectId/duplicate
 * Duplicate a project (any member can duplicate, becomes owner of the copy)
 */
router.post('/:projectId/duplicate', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    const project = await getProject(projectId);
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
    const newProjectId = await saveProject(duplicateProject, null, null);

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
    console.error('Error duplicating project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to duplicate project',
    });
  }
});

export default router;
