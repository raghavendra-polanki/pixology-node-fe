/**
 * Prompts API
 * Endpoints for managing prompt templates
 */

import express from 'express';
import { db } from '../../../core/config/firestore.js';
import PromptTemplateService from '../../../core/services/PromptTemplateService.js';
import PromptManager from '../../../core/services/PromptManager.cjs';
import AIAdaptorResolver from '../../../core/services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getAvailableModelsForCapability } = require('../../../core/config/availableModels.cjs');

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
 * GET /api/prompts/templates/:stageType
 * Get a specific stage template (now uses stageType as ID)
 */
router.get('/templates/:stageType', async (req, res) => {
  try {
    const { stageType } = req.params;

    const template = await PromptTemplateService.getStageTemplate(stageType, db);

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
 * Add a new prompt to a stage
 */
router.post('/templates', async (req, res) => {
  try {
    const { stageType, prompt } = req.body;

    if (!prompt || !stageType) {
      return res.status(400).json({
        error: 'prompt and stageType are required',
      });
    }

    // Validate prompt structure
    const validation = PromptTemplateService.validatePrompt(prompt);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid prompt structure',
        errors: validation.errors,
      });
    }

    const promptId = await PromptTemplateService.addPrompt(
      stageType,
      prompt,
      'system',
      db
    );

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[API] Cleared PromptManager cache after adding prompt');

    res.json({
      success: true,
      message: 'Prompt added',
      promptId,
    });
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({
      error: 'Failed to save prompt',
      message: error.message,
    });
  }
});

/**
 * PUT /api/prompts/templates/:stageType/:promptId
 * Update a specific prompt in a stage
 */
router.put('/templates/:stageType/:promptId', async (req, res) => {
  try {
    const { stageType, promptId } = req.params;
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({
        error: 'updates are required',
      });
    }

    await PromptTemplateService.updatePrompt(stageType, promptId, updates, 'system', db);

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[API] Cleared PromptManager cache after updating prompt');

    res.json({
      success: true,
      message: 'Prompt updated',
      stageType,
      promptId,
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      error: 'Failed to update prompt',
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

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[API] Cleared PromptManager cache after saving prompt override');

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

/**
 * POST /api/prompts/test
 * Test a prompt with given variables and get output from AI
 * Note: This is stateless - outputs are not saved
 */
router.post('/test', async (req, res) => {
  try {
    const { stageType, projectId, capability, variables, customPrompt, modelConfig } = req.body;

    if (!stageType || !capability || !variables) {
      return res.status(400).json({
        error: 'stageType, capability, and variables are required',
      });
    }

    console.log(`[API] /test: Testing prompt for ${stageType}/${capability}`);
    if (modelConfig) {
      console.log(`[API] /test: Using custom model config: ${modelConfig.adaptorId}/${modelConfig.modelId}`);
    }

    let fullPrompt;

    if (customPrompt) {
      // Use the custom prompt from the editor (live editing)
      console.log(`[API] /test: Using custom prompt from editor`);

      // Manually resolve variables in the custom prompt
      let resolvedCustomPrompt = customPrompt;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        resolvedCustomPrompt = resolvedCustomPrompt.replace(regex, String(value));
      });

      fullPrompt = resolvedCustomPrompt;
    } else {
      // Use the saved prompt from database
      // Get the prompt for the specific capability
      const promptConfig = await PromptManager.getPromptByCapability(
        stageType,
        capability,
        projectId,
        db
      );

      if (!promptConfig) {
        return res.status(404).json({
          error: `No prompt found for ${stageType}/${capability}`,
        });
      }

      // Resolve prompt template with variables
      const resolvedPrompt = PromptManager.resolvePrompt(
        promptConfig,
        variables
      );

      // Combine system and user prompts
      const systemPrompt = resolvedPrompt.systemPrompt || '';
      const userPrompt = resolvedPrompt.userPrompt || '';
      fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${userPrompt}`
        : userPrompt;
    }

    console.log(`[API] /test: Resolved prompt: ${fullPrompt.substring(0, 100)}...`);

    // Resolve which AI adaptor to use
    console.log(`[API] /test: Resolving adaptor for capability: ${capability}`);
    const resolution = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      stageType,
      capability,
      db,
      modelConfig || null  // Use custom model config from editor if provided
    );

    console.log(`[API] /test: Using adaptor '${resolution.adaptorId}' with model '${resolution.modelId}' (source: ${resolution.source})`);

    // Call the appropriate AI adaptor method based on capability
    let result;
    let output;

    if (capability === 'textGeneration') {
      result = await resolution.adaptor.generateText(fullPrompt, {
        temperature: 0.7,
        maxTokens: 2048,
      });
      output = result.text;
      console.log(`[API] /test: Text generation completed. Tokens - Input: ${result.usage?.inputTokens}, Output: ${result.usage?.outputTokens}`);
    } else if (capability === 'imageGeneration') {
      // Collect reference images from variables (persona and product images)
      const referenceImages = [];
      if (variables.personaImageUrl) {
        referenceImages.push(variables.personaImageUrl);
        console.log(`[API] /test: Using persona image reference: ${variables.personaImageUrl}`);
      }
      if (variables.productImageUrl) {
        referenceImages.push(variables.productImageUrl);
        console.log(`[API] /test: Using product image reference: ${variables.productImageUrl}`);
      }

      result = await resolution.adaptor.generateImage(fullPrompt, {
        size: '1024x1024',
        quality: 'standard',
        referenceImageUrl: referenceImages.length > 0 ? referenceImages : undefined,
      });
      output = result.imageUrl;
      console.log(`[API] /test: Image generation completed. Image URL: ${result.imageUrl}`);
    } else if (capability === 'videoGeneration') {
      result = await resolution.adaptor.generateVideo(fullPrompt, {
        duration: 5,
        quality: 'standard',
      });
      output = result.videoUrl;
      console.log(`[API] /test: Video generation completed. Video URL: ${result.videoUrl}`);
    } else {
      throw new Error(`Unsupported capability: ${capability}`);
    }

    // Return the actual AI-generated output (stateless - not saved)
    res.json({
      success: true,
      output: output,
      model: result.model,
      adaptorId: resolution.adaptorId,
      usage: result.usage,
      message: `Prompt test completed with ${capability}`,
    });
  } catch (error) {
    console.error('[API] /test: Error testing prompt:', error);
    res.status(500).json({
      error: 'Failed to test prompt',
      message: error.message,
    });
  }
});

/**
 * GET /api/prompts/available-models
 * Get available AI models for a specific capability
 */
router.get('/available-models', async (req, res) => {
  try {
    const { capability, adaptorId } = req.query;

    if (!capability) {
      return res.status(400).json({
        error: 'capability is required',
      });
    }

    const models = getAvailableModelsForCapability(capability, adaptorId || null);

    res.json({
      success: true,
      capability,
      models,
    });
  } catch (error) {
    console.error('[API] /available-models: Error loading available models:', error);
    res.status(500).json({
      error: 'Failed to load available models',
      message: error.message,
    });
  }
});

/**
 * PUT /api/prompts/model-config
 * Update model configuration for a specific prompt
 */
router.put('/model-config', async (req, res) => {
  try {
    const { stageType, capability, modelConfig, projectId } = req.body;

    if (!stageType || !capability || !modelConfig) {
      return res.status(400).json({
        error: 'stageType, capability, and modelConfig are required',
      });
    }

    if (!modelConfig.adaptorId || !modelConfig.modelId) {
      return res.status(400).json({
        error: 'modelConfig must include adaptorId and modelId',
      });
    }

    console.log(`[API] /model-config: Updating model config for ${stageType}/${capability} to ${modelConfig.adaptorId}/${modelConfig.modelId}`);

    await PromptManager.updatePromptModelConfig(
      stageType,
      capability,
      modelConfig,
      projectId || null,
      db
    );

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[API] Cleared PromptManager cache after updating model config');

    res.json({
      success: true,
      message: 'Model configuration updated',
      stageType,
      capability,
      modelConfig,
    });
  } catch (error) {
    console.error('[API] /model-config: Error updating model config:', error);
    res.status(500).json({
      error: 'Failed to update model configuration',
      message: error.message,
    });
  }
});

// ============================================
// VERSION MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/prompts/templates/:stageType/:promptId/versions
 * List all versions for a specific prompt
 */
router.get('/templates/:stageType/:promptId/versions', async (req, res) => {
  try {
    const { stageType, promptId } = req.params;

    console.log(`[API] Getting versions for ${stageType}:${promptId}`);

    const versions = await PromptTemplateService.getVersionHistory(stageType, promptId, db);

    res.json({
      success: true,
      stageType,
      promptId,
      versions,
    });
  } catch (error) {
    console.error('[API] Error getting version history:', error);
    res.status(500).json({
      error: 'Failed to get version history',
      message: error.message,
    });
  }
});

/**
 * GET /api/prompts/templates/:stageType/:promptId/versions/:version
 * Get a specific version
 */
router.get('/templates/:stageType/:promptId/versions/:version', async (req, res) => {
  try {
    const { stageType, promptId, version } = req.params;

    const versionData = await PromptTemplateService.getVersion(
      stageType,
      promptId,
      parseInt(version, 10),
      db
    );

    if (!versionData) {
      return res.status(404).json({
        error: `Version ${version} not found`,
      });
    }

    res.json({
      success: true,
      version: versionData,
    });
  } catch (error) {
    console.error('[API] Error getting version:', error);
    res.status(500).json({
      error: 'Failed to get version',
      message: error.message,
    });
  }
});

/**
 * POST /api/prompts/templates/:stageType/:promptId/versions
 * Create a new version
 */
router.post('/templates/:stageType/:promptId/versions', async (req, res) => {
  try {
    const { stageType, promptId } = req.params;
    const { promptData, versionNote, activateImmediately } = req.body;

    if (!promptData) {
      return res.status(400).json({
        error: 'promptData is required',
      });
    }

    console.log(`[API] Creating new version for ${stageType}:${promptId}`);

    const newVersion = await PromptTemplateService.saveAsNewVersion(
      stageType,
      promptId,
      promptData,
      versionNote || '',
      req.userId || 'system',
      activateImmediately || false,
      db
    );

    // Clear the PromptManager cache
    PromptManager.clearCache();

    res.json({
      success: true,
      message: `Created version ${newVersion}`,
      stageType,
      promptId,
      version: newVersion,
      activated: activateImmediately || false,
    });
  } catch (error) {
    console.error('[API] Error creating version:', error);
    res.status(500).json({
      error: 'Failed to create version',
      message: error.message,
    });
  }
});

/**
 * POST /api/prompts/templates/:stageType/:promptId/versions/:version/activate
 * Activate a specific version
 */
router.post('/templates/:stageType/:promptId/versions/:version/activate', async (req, res) => {
  try {
    const { stageType, promptId, version } = req.params;

    console.log(`[API] Activating version ${version} for ${stageType}:${promptId}`);

    await PromptTemplateService.activateVersion(
      stageType,
      promptId,
      parseInt(version, 10),
      req.userId || 'system',
      db
    );

    // Clear the PromptManager cache
    PromptManager.clearCache();

    res.json({
      success: true,
      message: `Activated version ${version}`,
      stageType,
      promptId,
      version: parseInt(version, 10),
    });
  } catch (error) {
    console.error('[API] Error activating version:', error);
    res.status(500).json({
      error: 'Failed to activate version',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/prompts/templates/:stageType/:promptId/versions/:version
 * Delete a specific version (cannot delete active version)
 */
router.delete('/templates/:stageType/:promptId/versions/:version', async (req, res) => {
  try {
    const { stageType, promptId, version } = req.params;

    console.log(`[API] Deleting version ${version} for ${stageType}:${promptId}`);

    await PromptTemplateService.deleteVersion(
      stageType,
      promptId,
      parseInt(version, 10),
      req.userId || 'system',
      db
    );

    res.json({
      success: true,
      message: `Deleted version ${version}`,
      stageType,
      promptId,
      version: parseInt(version, 10),
    });
  } catch (error) {
    console.error('[API] Error deleting version:', error);
    res.status(500).json({
      error: 'Failed to delete version',
      message: error.message,
    });
  }
});

export default router;
