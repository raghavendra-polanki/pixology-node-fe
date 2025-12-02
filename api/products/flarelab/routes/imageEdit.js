/**
 * FlareLab Image Edit API
 * Endpoints for AI-powered image editing
 */

import express from 'express';
import AIAdaptorResolver from '../../../core/services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GCSService = require('../../../core/services/gcsService');
const PromptManager = require('../../../core/services/PromptManager.cjs');

const router = express.Router();

/**
 * POST /api/flarelab/image-edit/edit
 * Edit an image with AI based on user instructions
 */
router.post('/edit', async (req, res) => {
  try {
    const {
      projectId,
      imageUrl,
      editPrompt,
      context = {},
      stageType = 'stage_2_themes',
    } = req.body;

    if (!projectId || !imageUrl || !editPrompt) {
      return res.status(400).json({
        error: 'projectId, imageUrl, and editPrompt are required',
      });
    }

    console.log(`[FlareLab ImageEdit] Editing image for project ${projectId}`);
    console.log(`[FlareLab ImageEdit] Edit request: ${editPrompt}`);
    console.log(`[FlareLab ImageEdit] Stage type: ${stageType}`);

    // Get prompt template for image editing capability
    // First try to get an imageEditing prompt, fall back to imageGeneration if not available
    let promptTemplate;
    try {
      promptTemplate = await PromptManager.getPromptByCapability(
        stageType,
        'imageEditing',
        projectId,
        req.db
      );
    } catch (e) {
      console.log(`[FlareLab ImageEdit] No imageEditing prompt found, using imageGeneration`);
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

    console.log(`[FlareLab ImageEdit] Using adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`);

    // Build the edit prompt
    // Combine context information with the user's edit instructions
    let contextInfo = '';
    if (context.themeName) {
      contextInfo += `Theme: ${context.themeName}\n`;
    }
    if (context.themeDescription) {
      contextInfo += `Theme Description: ${context.themeDescription}\n`;
    }
    if (context.category) {
      contextInfo += `Category: ${context.category}\n`;
    }
    if (context.sportType) {
      contextInfo += `Sport: ${context.sportType}\n`;
    }
    if (context.homeTeam || context.awayTeam) {
      contextInfo += `Teams: ${context.homeTeam || ''} vs ${context.awayTeam || ''}\n`;
    }

    // Build the final prompt for image generation/editing
    const fullPrompt = `You are editing an existing broadcast sports graphic image.

${contextInfo ? `CONTEXT:\n${contextInfo}\n` : ''}
ORIGINAL IMAGE: The image being edited is provided as a reference.

USER EDIT REQUEST:
${editPrompt}

Generate a new image that applies the requested changes while maintaining the overall broadcast-quality aesthetic and theme style. Keep the core visual identity but incorporate the specified modifications.`;

    console.log(`[FlareLab ImageEdit] Full prompt (first 200 chars): ${fullPrompt.substring(0, 200)}...`);

    // Generate the edited image with the original as reference
    const imageResult = await imageAdaptor.adaptor.generateImage(fullPrompt, {
      size: '1024x1024',
      quality: 'hd',
      referenceImageUrl: [imageUrl], // Use original image as reference
    });

    // Handle image URL - convert data URLs to GCS URLs if needed
    let newImageUrl = imageResult.imageUrl;

    if (newImageUrl && newImageUrl.startsWith('data:')) {
      try {
        const base64Data = newImageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `edited_${Date.now()}`;
        newImageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, filename);
        console.log(`[FlareLab ImageEdit] Uploaded edited image to GCS`);
      } catch (uploadError) {
        console.warn(`[FlareLab ImageEdit] Failed to upload to GCS: ${uploadError.message}`);
        // Keep the data URL if upload fails
      }
    }

    console.log(`[FlareLab ImageEdit] Image edit completed successfully`);

    res.json({
      success: true,
      imageUrl: newImageUrl,
      adaptor: imageAdaptor.adaptorId,
      model: imageAdaptor.modelId,
      message: 'Image edited successfully',
    });
  } catch (error) {
    console.error('[FlareLab ImageEdit] Error editing image:', error);
    res.status(500).json({
      error: 'Failed to edit image',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/flarelab/image-edit/save
 * Save the edited image to the project (update theme or generated image)
 */
router.post('/save', async (req, res) => {
  try {
    const {
      projectId,
      imageUrl,
      targetType, // 'theme' or 'generated-image'
      targetId,   // theme ID or generated image ID
      stageType,  // 'stage_2_themes' or 'stage_4_images'
    } = req.body;

    if (!projectId || !imageUrl || !targetType || !targetId) {
      return res.status(400).json({
        error: 'projectId, imageUrl, targetType, and targetId are required',
      });
    }

    console.log(`[FlareLab ImageEdit] Saving edited image for ${targetType}:${targetId}`);

    const projectRef = req.db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = projectDoc.data();

    if (targetType === 'theme' && stageType === 'stage_2_themes') {
      // Update theme image in conceptGallery.aiGeneratedThemes
      const aiThemes = projectData?.conceptGallery?.aiGeneratedThemes;
      if (aiThemes?.categorizedThemes) {
        // Find and update the theme in categorized themes
        let updated = false;
        for (const [catId, catData] of Object.entries(aiThemes.categorizedThemes)) {
          const themes = catData.themes || [];
          const themeIndex = themes.findIndex(t => t.id === targetId);
          if (themeIndex !== -1) {
            themes[themeIndex].image = { url: imageUrl };
            updated = true;
            break;
          }
        }

        if (updated) {
          await projectRef.set({
            conceptGallery: {
              ...projectData.conceptGallery,
              aiGeneratedThemes: aiThemes,
            },
            updatedAt: new Date(),
          }, { merge: true });

          console.log(`[FlareLab ImageEdit] Updated theme ${targetId} with new image`);
        }
      }
    } else if (targetType === 'generated-image' && stageType === 'stage_4_images') {
      // Update generated image in highFidelityCapture
      const generatedImages = projectData?.highFidelityCapture?.generatedImages || [];
      const imageIndex = generatedImages.findIndex(img => img.id === targetId);

      if (imageIndex !== -1) {
        generatedImages[imageIndex].url = imageUrl;
        generatedImages[imageIndex].editedAt = new Date().toISOString();

        await projectRef.set({
          highFidelityCapture: {
            ...projectData.highFidelityCapture,
            generatedImages,
          },
          updatedAt: new Date(),
        }, { merge: true });

        console.log(`[FlareLab ImageEdit] Updated generated image ${targetId} with new image`);
      }
    }

    res.json({
      success: true,
      message: 'Image saved successfully',
    });
  } catch (error) {
    console.error('[FlareLab ImageEdit] Error saving image:', error);
    res.status(500).json({
      error: 'Failed to save image',
      message: error.message,
    });
  }
});

export default router;
