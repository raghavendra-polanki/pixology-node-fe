/**
 * GameLab Generation Routes
 *
 * Handles all AI generation endpoints for GameLab stages:
 * - Theme generation (Stage 2)
 * - Player suggestion (Stage 3)
 * - Image generation (Stage 4)
 * - Video generation (Stage 5)
 */

import express from 'express';
import AIAdaptorResolver from '../../../core/services/AIAdaptorResolver.js';
import ThemeStreamingService from '../services/ThemeStreamingService.cjs';

const router = express.Router();

/**
 * POST /api/gamelab/generation/themes-stream
 *
 * Generate themes progressively with Server-Sent Events (SSE)
 * Follows the same streaming pattern as StoryLab storyboard generation
 *
 * Request Body:
 * {
 *   projectId: string,
 *   sportType: string,
 *   homeTeam: string,
 *   awayTeam: string,
 *   contextPills: string[],
 *   campaignGoal: string,
 *   numberOfThemes: number (default: 6)
 * }
 */
router.post('/themes-stream', async (req, res) => {
  const { projectId, sportType, homeTeam, awayTeam, contextPills, campaignGoal, numberOfThemes = 6 } = req.body;

  try {
    // Get GameLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[GameLab Theme Generation] Database not found in request');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log('[GameLab Theme Generation] Starting theme generation for project:', projectId);
    console.log('[GameLab Theme Generation] Using database:', db._settings?.databaseId || 'default');
    console.log('[GameLab Theme Generation] Input:', {
      sportType,
      homeTeam,
      awayTeam,
      contextPills,
      campaignGoal,
      numberOfThemes,
    });

    // Setup Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    /**
     * Helper to send SSE events
     */
    const sendEvent = (eventType, data) => {
      try {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      } catch (error) {
        console.error('[GameLab Theme Generation] Error sending SSE event:', error);
      }
    };

    // Send start event
    sendEvent('start', { message: 'Starting theme generation' });

    // Call streaming service with callbacks
    await ThemeStreamingService.generateThemesProgressive(
      projectId,
      {
        sportType,
        homeTeam,
        awayTeam,
        contextPills,
        campaignGoal,
        numberOfThemes,
      },
      db,
      AIAdaptorResolver,
      {
        // Called when a theme's text is generated
        onThemeParsed: (data) => {
          console.log(`[GameLab Theme Generation] Theme parsed: ${data.themeNumber}/${numberOfThemes}`);
          sendEvent('theme', data);
        },

        // Called when a theme's image is generated
        onImageGenerated: (data) => {
          console.log(`[GameLab Theme Generation] Image generated: ${data.themeNumber}/${numberOfThemes}`);
          sendEvent('image', data);
        },

        // Called for progress updates
        onProgress: (data) => {
          console.log(`[GameLab Theme Generation] Progress: ${data.stage} - ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        // Called when all themes are complete
        onComplete: (data) => {
          console.log('[GameLab Theme Generation] Generation complete');
          sendEvent('complete', data);
          res.end();
        },

        // Called on error
        onError: (data) => {
          console.error('[GameLab Theme Generation] Error:', data);
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('[GameLab Theme Generation] Unhandled error:', error);

    // Try to send error event if connection still open
    try {
      const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      };

      sendEvent('error', {
        message: error.message || 'Failed to generate themes',
        error: error.toString(),
      });
    } catch (sendError) {
      console.error('[GameLab Theme Generation] Could not send error event:', sendError);
    }

    res.end();
  }
});

/**
 * TODO: Add other generation endpoints
 *
 * POST /api/gamelab/generation/players-suggest
 * POST /api/gamelab/generation/images-create
 * POST /api/gamelab/generation/videos-animate
 */

export default router;
