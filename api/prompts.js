/**
 * Prompts API
 * Endpoints for managing prompt templates
 */

import express from 'express';
import { db } from './config/firestore.js';
import PromptTemplateService from './services/PromptTemplateService.js';
import PromptManager from './services/PromptManager.cjs';
import AIAdaptorResolver from './services/AIAdaptorResolver.js';

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
    const { stageType, projectId, capability, variables, customPrompt } = req.body;

    if (!stageType || !capability || !variables) {
      return res.status(400).json({
        error: 'stageType, capability, and variables are required',
      });
    }

    console.log(`[API] /test: Testing prompt for ${stageType}/${capability}`);

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
      db
    );

    console.log(`[API] /test: Using adaptor '${resolution.adaptorId}' with model '${resolution.modelId}'`);

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

export default router;
