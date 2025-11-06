import express from 'express';
import { generateVideoWithVeo3DirectAPI } from './services/videoGenerationService.js';

const router = express.Router();

/**
 * POST /api/videos/generate-veo3
 * Generate video using Vertex AI Veo 3 Direct API
 *
 * Videos are stored in GCS with organized structure:
 * gs://pixology-personas/videos/{projectId}/scene_{sceneNumber}/{video_filename}
 *
 * Veo 3.1 Constraints:
 * - Duration: 4, 6, or 8 seconds (default: 6)
 * - Resolution: 720p or 1080p format (default: 720p)
 * - Aspect ratio: 16:9 recommended
 */
router.post('/generate-veo3', async (req, res) => {
  try {
    const {
      sceneImageGcsUri,
      prompt,
      sceneData = {},
      screenplayEntry = {},
      durationSeconds = 6,
      aspectRatio = '16:9',
      resolution = '720p',
      projectId,
      sceneNumber,
    } = req.body;

    // Validate required parameters
    if (!sceneImageGcsUri) {
      return res.status(400).json({ error: 'sceneImageGcsUri is required' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    console.log(`[Videos API] Received request to generate video for Scene ${sceneNumber}`);
    console.log(`  Image: ${sceneImageGcsUri}`);
    console.log(`  Duration: ${durationSeconds}s`);

    // Call Veo 3 Direct API
    const result = await generateVideoWithVeo3DirectAPI({
      sceneImageGcsUri,
      prompt,
      sceneData,
      durationSeconds,
      aspectRatio,
      resolution,
      projectId,
    });

    console.log(`[Videos API] Successfully generated video for Scene ${sceneNumber}`);

    // Return the result
    return res.status(200).json({
      success: true,
      sceneNumber: result.sceneNumber,
      sceneTitle: result.sceneTitle,
      videoUrl: result.videoUrl,
      videoFormat: result.videoFormat,
      duration: result.duration,
      resolution: result.resolution,
      aspectRatio: result.aspectRatio,
      generatedAt: result.generatedAt,
      uploadedToGCS: result.uploadedToGCS,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[Videos API] Error generating video:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('timeout') ? 504 : 500;

    return res.status(statusCode).json({
      error: errorMessage,
      code: statusCode === 504 ? 'OPERATION_TIMEOUT' : 'VIDEO_GENERATION_ERROR',
    });
  }
});

/**
 * POST /api/videos/generate-veo2
 * Alternative: Generate video using Veo 2 (if needed)
 * Currently just redirects to Veo 3
 */
router.post('/generate-veo2', async (req, res) => {
  // For now, redirect to Veo 3 implementation
  // In future, can switch to veo-2.0-generate-exp model
  return router._router?.stack.find(r => r.route?.path === '/generate-veo3')?.handle(req, res);
});

export default router;
