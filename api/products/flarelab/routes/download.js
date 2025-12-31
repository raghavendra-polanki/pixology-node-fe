/**
 * FlareLab Download Routes
 *
 * Provides a proxy endpoint to download files from GCS,
 * avoiding CORS issues when downloading from the frontend.
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/flarelab/download/proxy
 *
 * Proxy endpoint to download files from GCS
 * Avoids CORS issues by fetching server-side
 *
 * Query params:
 * - url: The GCS URL to download
 * - filename: Optional filename for the download
 */
router.get('/proxy', async (req, res) => {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('[FlareLab Download] Proxying download:', url);

    // Validate URL is from allowed domains
    const allowedDomains = [
      'storage.googleapis.com',
      'storage.cloud.google.com',
    ];

    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({ error: 'URL domain not allowed' });
    }

    // Fetch the file from GCS
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Determine filename
    let downloadFilename = filename;
    if (!downloadFilename) {
      // Extract filename from URL
      const urlPath = urlObj.pathname;
      downloadFilename = urlPath.split('/').pop() || 'download';
    }

    // Set response headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the response body to the client
    const reader = response.body.getReader();

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(Buffer.from(value));
      }
    };

    await pump();

    console.log('[FlareLab Download] Download complete:', downloadFilename);

  } catch (error) {
    console.error('[FlareLab Download] Error:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message,
    });
  }
});

export default router;
