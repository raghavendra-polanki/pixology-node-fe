import express from 'express';
import https from 'https';

const router = express.Router();

/**
 * GET /api/videos/download
 * Download video from GCS bypassing CORS restrictions
 *
 * Query parameters:
 * - url: The GCS public URL to download (URL encoded)
 * - filename: Optional filename for the downloaded file
 *
 * Example: /api/videos/download?url=https://storage.googleapis.com/...&filename=scene-1.mp4
 *
 * Note: Video generation has been moved to /api/generation/video endpoint
 * using the AI adaptor architecture.
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
