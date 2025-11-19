/**
 * Storyboard API
 * Endpoints for storyboard image operations
 */

import express from 'express';
import multer from 'multer';
import { db } from './config/firestore.js';
import AIAdaptorResolver from './services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GCSService = require('./services/gcsService');
const PromptManager = require('./services/PromptManager.cjs');
const StoryboardGenerationService = require('./services/StoryboardGenerationService.cjs');

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

/**
 * POST /api/storyboard/edit-image
 * Edit a storyboard scene image with AI
 */
router.post('/edit-image', async (req, res) => {
  try {
    const {
      projectId,
      sceneNumber,
      sceneData,
      editPrompt,
    } = req.body;

    if (!projectId || !sceneNumber || !sceneData || !editPrompt) {
      return res.status(400).json({
        error: 'projectId, sceneNumber, sceneData, and editPrompt are required',
      });
    }

    console.log(`[Storyboard] Editing image for scene ${sceneNumber} in project ${projectId}`);
    console.log(`[Storyboard] Edit request: ${editPrompt}`);

    // Fetch project data to get product image and all scenes
    const projectDoc = await db.collection('projects').doc(projectId).get();
    const projectData = projectDoc.data();
    const productImageUrl = projectData?.campaignDetails?.productImageUrl;
    const allScenes = projectData?.aiGeneratedStoryboard?.scenes || [];

    // Build previous scenes context for visual continuity
    let previousScenesContext = '';
    const currentSceneIndex = allScenes.findIndex(s => s.sceneNumber?.toString() === sceneNumber.toString());

    if (currentSceneIndex > 0) {
      const previousScenes = allScenes.slice(0, currentSceneIndex);

      if (previousScenes.length > 0) {
        previousScenesContext = '**Previous Scenes for Reference:**\n\n';
        previousScenes.forEach((prevScene, idx) => {
          previousScenesContext += `**Scene ${idx + 1}: ${prevScene.title || `Scene ${idx + 1}`}**\n`;
          previousScenesContext += `- Description: ${prevScene.description || 'N/A'}\n`;
          previousScenesContext += `- Location: ${prevScene.location || 'N/A'}\n`;
          previousScenesContext += `- Visual Elements: ${prevScene.visualElements || 'N/A'}\n`;
          previousScenesContext += `- Key Frame: ${prevScene.keyFrameDescription || 'N/A'}\n`;
          if (prevScene.image && prevScene.image.url) {
            previousScenesContext += `- Reference Image: Provided as visual reference\n`;
          }
          previousScenesContext += '\n';
        });
      } else {
        previousScenesContext = 'This is the first scene in the sequence. No previous scenes available for reference.';
      }
    } else {
      previousScenesContext = 'This is the first scene in the sequence. No previous scenes available for reference.';
    }

    // Get prompt template for image editing capability (includes modelConfig)
    const imageEditPromptTemplate = await PromptManager.getPromptByCapability(
      'stage_4_storyboard',
      'imageEditing',
      projectId,
      db
    );

    // Resolve image generation adaptor with model config from prompt
    const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      'stage_4_storyboard',
      'imageGeneration',
      db,
      imageEditPromptTemplate.modelConfig  // Pass model config from prompt
    );

    console.log(`[Storyboard] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId} (source: ${imageAdaptor.source})`);

    // Build variables for the prompt
    const variables = {
      previousScenesContext,
      title: sceneData.title || '',
      description: sceneData.description || '',
      location: sceneData.location || '',
      visualElements: sceneData.visualElements || '',
      cameraWork: sceneData.cameraWork || '',
      keyFrameDescription: sceneData.keyFrameDescription || '',
      editPrompt: editPrompt,
    };

    // Resolve prompt template with variables
    const resolvedPrompt = PromptManager.resolvePrompt(
      imageEditPromptTemplate,
      variables
    );

    const enhancedPrompt = resolvedPrompt.systemPrompt
      ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
      : resolvedPrompt.userPrompt;

    console.log(`[Storyboard] Generated edit prompt (first 200 chars): ${enhancedPrompt.substring(0, 200)}...`);

    // Collect reference images (original scene, product, and previous scenes)
    const referenceImages = [];
    const originalImageUrl = sceneData.image?.url || sceneData.image;
    if (originalImageUrl) {
      referenceImages.push(originalImageUrl);
      console.log(`[Storyboard] Using original scene image reference`);
    }
    if (productImageUrl) {
      referenceImages.push(productImageUrl);
      console.log(`[Storyboard] Using product image reference`);
    }
    // Add previous scene images for visual continuity
    if (currentSceneIndex > 0) {
      const previousScenes = allScenes.slice(0, currentSceneIndex);
      previousScenes.forEach((prevScene, idx) => {
        if (prevScene.image && prevScene.image.url) {
          referenceImages.push(prevScene.image.url);
          console.log(`[Storyboard] Using previous scene ${idx + 1} image as reference`);
        }
      });
    }

    // Generate new image using adaptor with reference images
    const imageResult = await imageAdaptor.adaptor.generateImage(enhancedPrompt, {
      size: '1024x1024',
      quality: 'standard',
      referenceImageUrl: referenceImages.length > 0 ? referenceImages : undefined, // Pass original scene and product images
    });

    // Handle image URL - convert data URLs to GCS URLs if needed
    let imageUrl = imageResult.imageUrl;

    if (imageUrl && imageUrl.startsWith('data:')) {
      try {
        const base64Data = imageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const sceneTitleSafe = (sceneData.title || `scene_${sceneNumber}`).replace(/\s+/g, '_');
        imageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, `${sceneTitleSafe}_edited`);
        console.log(`[Storyboard] Uploaded edited image to GCS: ${imageUrl}`);
      } catch (uploadError) {
        console.warn(`[Storyboard] Failed to upload image to GCS: ${uploadError.message}`);
      }
    }

    console.log(`[Storyboard] Image edit completed successfully`);

    res.json({
      success: true,
      imageUrl: imageUrl,
      adaptor: imageAdaptor.adaptorId,
      model: imageAdaptor.modelId,
      message: 'Image edited successfully',
    });
  } catch (error) {
    console.error('[Storyboard] Error editing image:', error);
    res.status(500).json({
      error: 'Failed to edit image',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/storyboard/upload-scene-image
 * Upload a new image for a storyboard scene (replaces existing image)
 */
router.post('/upload-scene-image', upload.single('image'), async (req, res) => {
  try {
    const { projectId, sceneId, oldImageUrl } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    if (!projectId || !sceneId) {
      return res.status(400).json({
        error: 'projectId and sceneId are required',
      });
    }

    console.log(`[Storyboard] Uploading new image for scene ${sceneId} in project ${projectId}`);

    // Upload the new image and optionally delete the old one
    const imageUrl = await StoryboardGenerationService.uploadSceneImage(
      req.file.buffer,
      projectId,
      sceneId,
      oldImageUrl
    );

    console.log(`[Storyboard] Scene image uploaded successfully: ${imageUrl}`);

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error('[Storyboard] Error uploading scene image:', error);
    res.status(500).json({
      error: 'Failed to upload scene image',
      message: error.message,
    });
  }
});

export default router;
