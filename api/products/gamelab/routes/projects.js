import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import {
  saveProject,
  getUserProjects,
  getProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
} from '../../../core/utils/firestoreUtils.js';

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
    const projects = await getUserProjects(req.userId, db);

    // Include member info for each project and serialize dates
    const projectsWithMemberInfo = projects.map((project) =>
      serializeFirestoreDates({
        ...project,
        userRole: project.members?.[req.userId] || 'viewer',
        isOwner: project.ownerId === req.userId,
      })
    );

    return res.status(200).json({
      success: true,
      count: projectsWithMemberInfo.length,
      projects: projectsWithMemberInfo,
    });
  } catch (error) {
    console.error('[GameLab] Error fetching projects:', error);
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

    // Check if user has access
    const hasAccess =
      project.ownerId === req.userId ||
      (project.members && project.members[req.userId]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    return res.status(200).json({
      success: true,
      project: serializeFirestoreDates(project),
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

    // Only owner can delete
    if (project.ownerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can delete this project',
      });
    }

    await deleteProject(projectId, db);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
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
 * POST /api/gamelab/projects/:projectId/members
 * Add a member to the project
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
    console.error('[GameLab] Error adding project member:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add project member',
    });
  }
});

export default router;
