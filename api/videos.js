import express from 'express';
import https from 'https';
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

/**
 * GET /api/videos/download
 * Download video from GCS bypassing CORS restrictions
 *
 * Query parameters:
 * - url: The GCS public URL to download (URL encoded)
 * - filename: Optional filename for the downloaded file
 *
 * Example: /api/videos/download?url=https://storage.googleapis.com/...&filename=scene-1.mp4
 */
router.get('/download', async (req, res) => {
  try {
    const { url, filename } = req.query;

    // Validate URL parameter
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate it's a GCS URL
    if (!url.includes('storage.googleapis.com')) {
      return res.status(400).json({ error: 'Invalid URL: must be a Google Cloud Storage URL' });
    }

    console.log(`[Videos API] Downloading video: ${url.substring(0, 80)}...`);

    // Fetch the video from GCS
    https.get(url, (gcsResponse) => {
      // Check for errors
      if (gcsResponse.statusCode !== 200) {
        console.error(`[Videos API] GCS returned status ${gcsResponse.statusCode}`);
        return res.status(gcsResponse.statusCode).json({
          error: `Failed to download video from GCS: ${gcsResponse.statusCode}`,
        });
      }

      // Set response headers for download
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Pipe the GCS response to the client
      gcsResponse.pipe(res);

      // Handle errors during piping
      gcsResponse.on('error', (error) => {
        console.error('[Videos API] Error streaming video from GCS:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream video' });
        }
      });
    }).on('error', (error) => {
      console.error('[Videos API] Error fetching from GCS:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch video from GCS' });
      }
    });
  } catch (error) {
    console.error('[Videos API] Error in download handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
});

export default router;
