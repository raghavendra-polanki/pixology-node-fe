/**
 * Prompts API
 * Endpoints for managing prompt templates
 */

import express from 'express';
import { db } from './config/firestore.js';
import PromptTemplateService from './services/PromptTemplateService.js';
import PromptManager from './services/PromptManager.cjs';

const router = express.Router();

/**
 * GET /api/prompts/templates
 * Get prompt templates for a stage
 */
router.get('/templates', async (req, res) => {
  try {
    const { stageType, projectId } = req.query;

    if (!stageType) {
      console.warn('[API] /templates: stageType is required');
      return res.status(400).json({
        error: 'stageType is required',
      });
    }

    console.log(`[API] /templates: Loading template for stage: ${stageType}`);

    // Get template using PromptManager (same as persona generation)
    const template = await PromptManager.getPromptTemplate(stageType, projectId, db);

    // Return as array for UI consistency
    const templates = template && template.prompts ? [template] : [];

    console.log(`[API] /templates: Returning ${templates.length} templates for stage: ${stageType}`);
    res.json({ templates });
  } catch (error) {
    console.error('[API] /templates: Error loading prompt template:', error);
    res.status(500).json({
      error: 'Failed to load prompt template',
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
    const { projectId, stageType, template } = req.body;

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

    const templateId = await PromptTemplateService.createTemplate(
      {
        stageType,
        name: template.name || `${stageType} template`,
        description: template.description || '',
        prompts: template.prompts,
        isDefault: false,
      },
      'system',
      db
    );

    res.json({
      success: true,
      message: 'Template created',
      templateId,
    });
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
    const body = req.body;

    // Support both formats: { updates: {...} } and direct template object
    const updates = body.updates || {
      stageType: body.stageType,
      name: body.name,
      description: body.description,
      prompts: body.prompts,
    };

    if (!updates || !updates.prompts) {
      return res.status(400).json({
        error: 'prompts are required',
      });
    }

    await PromptTemplateService.updateTemplate(templateId, updates, db);

    res.json({
      success: true,
      message: 'Template updated',
      templateId,
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
 * POST /api/prompts/override
 * Save project-specific prompt override
 */
router.post('/override', async (req, res) => {
  try {
    const { projectId, stageType, promptTemplate } = req.body;

    if (!projectId || !stageType || !promptTemplate) {
      return res.status(400).json({
        error: 'projectId, stageType, and promptTemplate are required',
      });
    }

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
      ],
      stage_3_narratives: [
        { name: 'productDescription', description: 'Description of the product' },
        { name: 'targetAudience', description: 'Target audience information' },
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

export default router;
