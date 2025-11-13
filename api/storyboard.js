/**
 * Storyboard API
 * Endpoints for storyboard image operations
 */

import express from 'express';
import { db } from './config/firestore.js';
import AIAdaptorResolver from './services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GCSService = require('./services/gcsService');

const router = express.Router();

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

    // Resolve image generation adaptor
    const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      'stage_4_storyboard',
      'imageGeneration',
      db
    );

    console.log(`[Storyboard] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`);

    // Build enhanced prompt that combines original scene with edit request
    const enhancedPrompt = buildImageEditPrompt(sceneData, editPrompt);

    console.log(`[Storyboard] Generated edit prompt (first 200 chars): ${enhancedPrompt.substring(0, 200)}...`);

    // Extract original image URL for reference
    const originalImageUrl = sceneData.image?.url || sceneData.image;
    if (originalImageUrl) {
      console.log(`[Storyboard] Using reference image: ${originalImageUrl}`);
    }

    // Generate new image using adaptor with original image as reference
    const imageResult = await imageAdaptor.adaptor.generateImage(enhancedPrompt, {
      size: '1024x1024',
      quality: 'standard',
      referenceImageUrl: originalImageUrl, // Pass original image for visual consistency
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
 * Build image edit prompt by combining original scene data with edit request
 * @private
 */
function buildImageEditPrompt(sceneData, editPrompt) {
  const {
    title = '',
    description = '',
    location = '',
    visualElements = '',
    cameraWork = '',
    keyFrameDescription = '',
  } = sceneData;

  return `Generate a professional UGC-style scene image for a marketing video with the following modifications:

**Original Scene Reference:**
A reference image of the original scene is provided for your visual context.
Title: ${title}
Description: ${description}
Location/Setting: ${location}
Visual Elements: ${visualElements}
Camera Work: ${cameraWork}
Key Frame Description: ${keyFrameDescription}

**Requested Changes:**
${editPrompt}

**Instructions:**
Using the provided reference image as a visual guide, apply the requested changes while maintaining the overall style, composition, and quality of the original scene. The edited image should:
- Keep the same visual style and cinematography as the reference image
- Maintain consistent lighting, color grading, and composition
- Apply ONLY the specific changes requested in the edit prompt
- Preserve all other elements that are not mentioned in the edit request
- Remain high-quality, cinematic, and professional
- Continue to be authentic and suitable for UGC marketing

Generate the edited scene image that seamlessly incorporates only the requested changes while keeping everything else consistent with the reference image.`;
}

export default router;
