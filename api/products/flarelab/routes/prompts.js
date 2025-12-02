/**
 * FlareLab Prompts API
 * Endpoints for managing prompt templates
 */

import express from 'express';
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
      console.warn('[FlareLab API] /templates: stageType is required');
      return res.status(400).json({
        error: 'stageType is required',
      });
    }

    console.log(`[FlareLab API] /templates: Loading template for stage: ${stageType}`);

    // Get template using PromptManager
    const template = await PromptManager.getPromptTemplate(stageType, projectId, req.db);

    // Return as array for UI consistency
    const templates = template && template.prompts ? [template] : [];

    console.log(`[FlareLab API] /templates: Returning ${templates.length} templates for stage: ${stageType}`);
    res.json({ templates });
  } catch (error) {
    console.error('[FlareLab API] /templates: Error loading prompt template:', error);
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

    const template = await PromptTemplateService.getStageTemplate(stageType, req.db);

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
      req.db
    );

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[FlareLab API] Cleared PromptManager cache after adding prompt');

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

    await PromptTemplateService.updatePrompt(stageType, promptId, updates, 'system', req.db);

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[FlareLab API] Cleared PromptManager cache after updating prompt');

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

    await PromptManager.savePromptOverride(projectId, stageType, promptTemplate, req.db);

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[FlareLab API] Cleared PromptManager cache after saving prompt override');

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

    // Define standard variables for FlareLab stages
    const stageVariables = {
      stage_2_themes: [
        { name: 'homeTeamName', description: 'Name of the home team' },
        { name: 'awayTeamName', description: 'Name of the away team' },
        { name: 'contextPills', description: 'Selected context pills' },
        { name: 'campaignGoal', description: 'Campaign goal' },
      ],
      stage_3_players: [
        { name: 'themeName', description: 'Name of the theme' },
        { name: 'themeDescription', description: 'Theme description' },
        { name: 'imageUrl', description: 'Theme image URL' },
        { name: 'playerCount', description: 'Number of players needed' },
      ],
      stage_4_images: [
        { name: 'playerName', description: 'Name of the player' },
        { name: 'themeName', description: 'Name of the theme' },
        { name: 'headshotUrl', description: 'Player headshot URL' },
      ],
      stage_5_animation: [
        { name: 'imageUrl', description: 'Generated image URL' },
        { name: 'playerName', description: 'Name of the player' },
        { name: 'themeName', description: 'Name of the theme' },
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

    console.log(`[FlareLab API] /test: Testing prompt for ${stageType}/${capability}`);
    if (modelConfig) {
      console.log(`[FlareLab API] /test: Using custom model config: ${modelConfig.adaptorId}/${modelConfig.modelId}`);
    }

    let fullPrompt;

    if (customPrompt) {
      // Use the custom prompt from the editor (live editing)
      console.log(`[FlareLab API] /test: Using custom prompt from editor`);

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
        req.db
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

    console.log(`[FlareLab API] /test: Resolved prompt: ${fullPrompt.substring(0, 100)}...`);

    // Resolve which AI adaptor to use
    console.log(`[FlareLab API] /test: Resolving adaptor for capability: ${capability}`);
    const resolution = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      stageType,
      capability,
      req.db,
      modelConfig || null  // Use custom model config from editor if provided
    );

    console.log(`[FlareLab API] /test: Using adaptor '${resolution.adaptorId}' with model '${resolution.modelId}' (source: ${resolution.source})`);

    // Call the appropriate AI adaptor method based on capability
    let result;
    let output;

    if (capability === 'textGeneration' || capability === 'themeGeneration' || capability === 'imageAnalysisAndRecommendation' || capability === 'animationScreenplay') {
      // Text-based capabilities
      const options = {
        temperature: 0.7,
        maxTokens: 2048,
      };

      // Add reference image for image analysis
      if (capability === 'imageAnalysisAndRecommendation' && variables.imageUrl) {
        options.referenceImageUrl = variables.imageUrl;
        console.log(`[FlareLab API] /test: Using reference image: ${variables.imageUrl}`);
      }

      result = await resolution.adaptor.generateText(fullPrompt, options);
      output = result.text;
      console.log(`[FlareLab API] /test: Text generation completed. Tokens - Input: ${result.usage?.inputTokens}, Output: ${result.usage?.outputTokens}`);
    } else if (capability === 'imageGeneration') {
      // Collect reference images from variables
      const referenceImages = [];

      // Theme reference image
      if (variables.themeImageUrl) {
        referenceImages.push(variables.themeImageUrl);
        console.log(`[FlareLab API] /test: Found theme image reference`);
      }

      // Legacy headshotUrl support
      if (variables.headshotUrl) {
        referenceImages.push(variables.headshotUrl);
        console.log(`[FlareLab API] /test: Found headshot reference`);
      }

      // Collect all player headshots (player1Headshot, player2Headshot, etc.)
      const playerHeadshots = [];
      Object.entries(variables).forEach(([key, value]) => {
        if (key.match(/^player\d+Headshot$/) && value && typeof value === 'string' && value.startsWith('http')) {
          referenceImages.push(value);
          playerHeadshots.push(key);
        }
      });
      if (playerHeadshots.length > 0) {
        console.log(`[FlareLab API] /test: Found ${playerHeadshots.length} player headshots: ${playerHeadshots.join(', ')}`);
      }

      console.log(`[FlareLab API] /test: Total reference images: ${referenceImages.length}`);

      result = await resolution.adaptor.generateImage(fullPrompt, {
        size: '1024x1024',
        quality: 'standard',
        referenceImageUrl: referenceImages.length > 0 ? referenceImages : undefined,
      });
      output = result.imageUrl;
      console.log(`[FlareLab API] /test: Image generation completed`);
    } else if (capability === 'videoGeneration') {
      result = await resolution.adaptor.generateVideo(fullPrompt, {
        duration: 5,
        quality: 'standard',
      });
      output = result.videoUrl;
      console.log(`[FlareLab API] /test: Video generation completed`);
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
    console.error('[FlareLab API] /test: Error testing prompt:', error);
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
    console.error('[FlareLab API] /available-models: Error loading available models:', error);
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

    console.log(`[FlareLab API] /model-config: Updating model config for ${stageType}/${capability} to ${modelConfig.adaptorId}/${modelConfig.modelId}`);

    await PromptManager.updatePromptModelConfig(
      stageType,
      capability,
      modelConfig,
      projectId || null,
      req.db
    );

    // Clear the PromptManager cache to ensure fresh data on next load
    PromptManager.clearCache();
    console.log('[FlareLab API] Cleared PromptManager cache after updating model config');

    res.json({
      success: true,
      message: 'Model configuration updated',
      stageType,
      capability,
      modelConfig,
    });
  } catch (error) {
    console.error('[FlareLab API] /model-config: Error updating model config:', error);
    res.status(500).json({
      error: 'Failed to update model configuration',
      message: error.message,
    });
  }
});

export default router;
