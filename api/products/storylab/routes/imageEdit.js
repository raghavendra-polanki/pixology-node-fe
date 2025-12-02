/**
 * StoryLab Image Edit API
 * Endpoints for AI-powered image editing (compatible with AIImageEditor component)
 */

import express from 'express';
import AIAdaptorResolver from '../../../core/services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GCSService = require('../../../core/services/gcsService');
const PromptManager = require('../../../core/services/PromptManager.cjs');

const router = express.Router();

/**
 * POST /api/storylab/image-edit/edit
 * Edit an image with AI based on user instructions
 * Compatible with the shared AIImageEditor component
 */
router.post('/edit', async (req, res) => {
  try {
    const {
      projectId,
      imageUrl,
      editPrompt,
      context = {},
      stageType = 'stage_4_storyboard',
    } = req.body;

    if (!projectId || !imageUrl || !editPrompt) {
      return res.status(400).json({
        error: 'projectId, imageUrl, and editPrompt are required',
      });
    }

    console.log(`[StoryLab ImageEdit] Editing image for project ${projectId}`);
    console.log(`[StoryLab ImageEdit] Edit request: ${editPrompt}`);
    console.log(`[StoryLab ImageEdit] Stage type: ${stageType}`);

    // Get prompt template for image editing/generation capability
    let promptTemplate;
    try {
      promptTemplate = await PromptManager.getPromptByCapability(
        stageType,
        'imageEditing',
        projectId,
        req.db
      );
    } catch (e) {
      console.log(`[StoryLab ImageEdit] No imageEditing prompt found, using imageGeneration`);
      promptTemplate = await PromptManager.getPromptByCapability(
        stageType,
        'imageGeneration',
        projectId,
        req.db
      );
    }

    // Resolve image generation adaptor
    const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      stageType,
      'imageGeneration',
      req.db,
      promptTemplate?.modelConfig || null
    );

    console.log(`[StoryLab ImageEdit] Using adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`);

    // Build context information for the prompt
    let contextInfo = '';
    if (context.sceneTitle) {
      contextInfo += `Scene: ${context.sceneTitle}\n`;
    }
    if (context.sceneDescription) {
      contextInfo += `Scene Description: ${context.sceneDescription}\n`;
    }
    if (context.campaignDescription) {
      contextInfo += `Campaign: ${context.campaignDescription}\n`;
    }
    if (context.productDescription) {
      contextInfo += `Product: ${context.productDescription}\n`;
    }
    if (context.targetAudience) {
      contextInfo += `Target Audience: ${context.targetAudience}\n`;
    }
    if (context.narrativeTheme) {
      contextInfo += `Narrative Theme: ${context.narrativeTheme}\n`;
    }
    if (context.personaName) {
      contextInfo += `Persona: ${context.personaName}\n`;
    }

    // Build the final prompt for image editing
    const fullPrompt = `You are editing an existing marketing storyboard image for a video advertisement.

${contextInfo ? `CONTEXT:\n${contextInfo}\n` : ''}
ORIGINAL IMAGE: The image being edited is provided as a reference.

USER EDIT REQUEST:
${editPrompt}

Generate a new image that applies the requested changes while maintaining:
- The overall composition and framing
- The marketing/commercial aesthetic quality
- Consistency with the brand and campaign tone
- Professional, polished look suitable for video storyboards

Apply the specified modifications while keeping the scene recognizable and cohesive.`;

    console.log(`[StoryLab ImageEdit] Full prompt (first 200 chars): ${fullPrompt.substring(0, 200)}...`);

    // Collect reference images
    const referenceImages = [imageUrl]; // Original image as primary reference

    // Add product image if available
    if (context.productImageUrl) {
      referenceImages.push(context.productImageUrl);
      console.log(`[StoryLab ImageEdit] Added product image as reference`);
    }

    // Add persona image if available
    if (context.personaImageUrl) {
      referenceImages.push(context.personaImageUrl);
      console.log(`[StoryLab ImageEdit] Added persona image as reference`);
    }

    // Generate the edited image
    const imageResult = await imageAdaptor.adaptor.generateImage(fullPrompt, {
      size: '1024x1024',
      quality: 'hd',
      referenceImageUrl: referenceImages,
    });

    // Handle image URL - convert data URLs to GCS URLs if needed
    let newImageUrl = imageResult.imageUrl;

    if (newImageUrl && newImageUrl.startsWith('data:')) {
      try {
        const base64Data = newImageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `edited_${Date.now()}`;
        newImageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, filename);
        console.log(`[StoryLab ImageEdit] Uploaded edited image to GCS`);
      } catch (uploadError) {
        console.warn(`[StoryLab ImageEdit] Failed to upload to GCS: ${uploadError.message}`);
        // Keep the data URL if upload fails
      }
    }

    console.log(`[StoryLab ImageEdit] Image edit completed successfully`);

    res.json({
      success: true,
      imageUrl: newImageUrl,
      adaptor: imageAdaptor.adaptorId,
      model: imageAdaptor.modelId,
      message: 'Image edited successfully',
    });
  } catch (error) {
    console.error('[StoryLab ImageEdit] Error editing image:', error);
    res.status(500).json({
      error: 'Failed to edit image',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/storylab/image-edit/save
 * Save the edited image to the project (update storyboard scene)
 */
router.post('/save', async (req, res) => {
  try {
    const {
      projectId,
      imageUrl,
      targetType, // 'scene'
      targetId,   // scene number/ID
      stageType,  // 'stage_4_storyboard'
    } = req.body;

    if (!projectId || !imageUrl || !targetId) {
      return res.status(400).json({
        error: 'projectId, imageUrl, and targetId are required',
      });
    }

    console.log(`[StoryLab ImageEdit] Saving edited image for scene ${targetId}`);

    const projectRef = req.db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = projectDoc.data();

    if (targetType === 'scene' && stageType === 'stage_4_storyboard') {
      // Update scene image in aiGeneratedStoryboard
      const storyboard = projectData?.aiGeneratedStoryboard;
      if (storyboard?.scenes) {
        const scenes = storyboard.scenes.map(scene => {
          if (scene.sceneNumber?.toString() === targetId?.toString()) {
            return {
              ...scene,
              image: { ...scene.image, url: imageUrl },
            };
          }
          return scene;
        });

        await projectRef.set({
          aiGeneratedStoryboard: {
            ...storyboard,
            scenes,
          },
          updatedAt: new Date(),
        }, { merge: true });

        console.log(`[StoryLab ImageEdit] Updated scene ${targetId} with new image`);
      }
    }

    res.json({
      success: true,
      message: 'Image saved successfully',
    });
  } catch (error) {
    console.error('[StoryLab ImageEdit] Error saving image:', error);
    res.status(500).json({
      error: 'Failed to save image',
      message: error.message,
    });
  }
});

export default router;
