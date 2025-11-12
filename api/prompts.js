/**
 * Prompts API
 * Endpoints for managing prompt templates
 */

const express = require('express');
const admin = require('firebase-admin');
const PromptTemplateService = require('./services/PromptTemplateService');

const router = express.Router();
const db = admin.firestore();

/**
 * GET /api/prompts/templates
 * Get prompt templates for a stage
 */
router.get('/templates', async (req, res) => {
  try {
    const { stageType, projectId } = req.query;

    if (!stageType) {
      return res.status(400).json({
        error: 'stageType is required',
      });
    }

    // Get templates for stage
    const templates = await PromptTemplateService.listTemplatesByStage(
      stageType,
      { activeOnly: true, limit: 50 },
      db
    );

    // If projectId provided, also include project overrides
    let projectOverrides = null;
    if (projectId) {
      try {
        const configDoc = await db.collection('project_ai_config').doc(projectId).get();
        if (configDoc.exists) {
          projectOverrides = configDoc.data().promptOverrides?.[stageType];
        }
      } catch (err) {
        console.warn('Error loading project overrides:', err.message);
      }
    }

    res.json({
      templates,
      projectOverrides,
    });
  } catch (error) {
    console.error('Error loading prompt templates:', error);
    res.status(500).json({
      error: 'Failed to load prompt templates',
      message: error.message,
    });
  }
});

/**
 * GET /api/prompts/templates/:templateId
 * Get a specific prompt template
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await PromptTemplateService.getTemplate(templateId, db);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
      });
    }

    res.json(template);
  } catch (error) {
    console.error('Error loading prompt template:', error);
    res.status(500).json({
      error: 'Failed to load prompt template',
      message: error.message,
    });
  }
});

/**
 * POST /api/prompts/templates
 * Create or update prompt template
 */
router.post('/templates', async (req, res) => {
  try {
    const { projectId, stageType, template, isProjectOverride } = req.body;

    if (!template || !stageType) {
      return res.status(400).json({
        error: 'template and stageType are required',
      });
    }

    // Validate template structure
    const validation = PromptTemplateService.validateTemplate(template);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid template structure',
        errors: validation.errors,
      });
    }

    let result;

    if (isProjectOverride && projectId) {
      // Save as project-specific override
      const configRef = db.collection('project_ai_config').doc(projectId);
      const updates = {
        [`promptOverrides.${stageType}`]: {
          prompts: template.prompts,
          version: template.version || 1,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      await configRef.set(updates, { merge: true });

      result = {
        success: true,
        message: 'Project prompt override saved',
        type: 'project_override',
      };
    } else {
      // Save as global template
      const userId = req.user?.uid || 'system';
      const templateId = await PromptTemplateService.createTemplate(
        {
          stageType,
          name: template.name || `${stageType} template`,
          description: template.description || '',
          prompts: template.prompts,
          isDefault: false,
        },
        userId,
        db
      );

      result = {
        success: true,
        message: 'Template created',
        templateId,
        type: 'global_template',
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error saving prompt template:', error);
    res.status(500).json({
      error: 'Failed to save prompt template',
      message: error.message,
    });
  }
});

/**
 * PUT /api/prompts/templates/:templateId
 * Update an existing template
 */
router.put('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({
        error: 'updates are required',
      });
    }

    await PromptTemplateService.updateTemplate(templateId, updates, db);

    res.json({
      success: true,
      message: 'Template updated',
    });
  } catch (error) {
    console.error('Error updating prompt template:', error);
    res.status(500).json({
      error: 'Failed to update prompt template',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/prompts/templates/:templateId
 * Delete a template
 */
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    await PromptTemplateService.deleteTemplate(templateId, db);

    res.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('Error deleting prompt template:', error);
    res.status(500).json({
      error: 'Failed to delete prompt template',
      message: error.message,
    });
  }
});

/**
 * POST /api/prompts/override
 * Save project-specific prompt override (alternative endpoint)
 */
router.post('/override', async (req, res) => {
  try {
    const { projectId, stageType, promptTemplate } = req.body;

    if (!projectId || !stageType || !promptTemplate) {
      return res.status(400).json({
        error: 'projectId, stageType, and promptTemplate are required',
      });
    }

    const PromptManager = require('./services/PromptManager');
    await PromptManager.savePromptOverride(projectId, stageType, promptTemplate, db);

    res.json({
      success: true,
      message: 'Prompt override saved',
    });
  } catch (error) {
    console.error('Error saving prompt override:', error);
    res.status(500).json({
      error: 'Failed to save prompt override',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/prompts/override
 * Remove project-specific prompt override
 */
router.delete('/override', async (req, res) => {
  try {
    const { projectId, stageType } = req.query;

    if (!projectId || !stageType) {
      return res.status(400).json({
        error: 'projectId and stageType are required',
      });
    }

    const PromptManager = require('./services/PromptManager');
    await PromptManager.removePromptOverride(projectId, stageType, db);

    res.json({
      success: true,
      message: 'Prompt override removed',
    });
  } catch (error) {
    console.error('Error removing prompt override:', error);
    res.status(500).json({
      error: 'Failed to remove prompt override',
      message: error.message,
    });
  }
});

/**
 * GET /api/prompts/variables
 * Get available variables for a stage
 */
router.get('/variables', async (req, res) => {
  try {
    const { stageType } = req.query;

    if (!stageType) {
      return res.status(400).json({
        error: 'stageType is required',
      });
    }

    // Define standard variables for each stage
    const stageVariables = {
      stage_2_personas: [
        { name: 'productDescription', description: 'Description of the product' },
        { name: 'targetAudience', description: 'Target audience information' },
        { name: 'numberOfPersonas', description: 'Number of personas to generate' },
      ],
      stage_3_narratives: [
        { name: 'productDescription', description: 'Description of the product' },
        { name: 'targetAudience', description: 'Target audience information' },
        { name: 'numberOfNarratives', description: 'Number of narrative themes' },
        { name: 'selectedPersonas', description: 'Selected personas information' },
      ],
      stage_4_storyboard: [
        { name: 'productDescription', description: 'Description of the product' },
        { name: 'targetAudience', description: 'Target audience information' },
        { name: 'selectedPersonaName', description: 'Name of selected persona' },
        { name: 'narrativeTheme', description: 'Narrative theme' },
        { name: 'numberOfScenes', description: 'Number of scenes' },
      ],
      stage_5_screenplay: [
        { name: 'storyboardScenes', description: 'Storyboard scenes' },
        { name: 'selectedPersonaName', description: 'Name of main character' },
        { name: 'videoDuration', description: 'Total video duration' },
      ],
      stage_6_video: [
        { name: 'sceneNumber', description: 'Scene number' },
        { name: 'visual', description: 'Visual description' },
        { name: 'cameraFlow', description: 'Camera movements' },
        { name: 'duration', description: 'Scene duration' },
      ],
    };

    const variables = stageVariables[stageType] || [];

    res.json({ variables });
  } catch (error) {
    console.error('Error loading variables:', error);
    res.status(500).json({
      error: 'Failed to load variables',
      message: error.message,
    });
  }
});

module.exports = router;
