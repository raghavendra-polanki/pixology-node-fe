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
} from './utils/firestoreUtils.js';

const router = express.Router();

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
    const projects = await getUserProjects(req.userId);

    // Include member info for each project
    const projectsWithMemberInfo = projects.map((project) => ({
      ...project,
      userRole: project.members?.[req.userId] || 'viewer',
      isOwner: project.ownerId === req.userId,
    }));

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

    // Check if user has access to this project
    if (!project.members || !project.members[req.userId]) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    // Include member info
    const projectWithMemberInfo = {
      ...project,
      userRole: project.members[req.userId],
      isOwner: project.ownerId === req.userId,
    };

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

    // Save to Firestore (new signature: projectData, userId, projectId)
    const projectId = await saveProject(projectData, req.userId);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      projectId,
      project: {
        id: projectId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
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

    // Save to Firestore (new signature: projectData, userId, projectId)
    await saveProject(updatedProjectData, req.userId, projectId);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProjectData,
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

    // Check if user is the owner
    if (project.ownerId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project owner can delete this project',
      });
    }

    // Delete from Firestore
    await deleteProject(projectId);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
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
    const updatedProjectData = {
      ...existingProject,
      stageExecutions: {
        ...existingProject.stageExecutions,
        [stageName]: stageExecution,
      },
      updatedAt: new Date(),
    };

    // Save to Firestore
    await saveProject(updatedProjectData, req.userId, projectId);

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

export default router;
