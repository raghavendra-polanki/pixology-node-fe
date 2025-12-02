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
import PlayerRecommendationService from '../services/PlayerRecommendationService.cjs';
import PlayerImageGenerationService from '../services/PlayerImageGenerationService.cjs';
import AnimationGenerationService from '../services/AnimationGenerationService.cjs';

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
  const {
    projectId,
    sportType,
    homeTeam,
    awayTeam,
    contextPills,
    campaignGoal,
    category = 'home-team',
    categoryName = 'Home Team Focus',
    categoryModifier = '',
    numberOfThemes = 5,
    mode = 'replace' // 'replace' or 'append'
  } = req.body;

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
        category,
        categoryName,
        categoryModifier,
        numberOfThemes,
        mode,
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
 * POST /api/gamelab/generation/players-suggest
 *
 * Get AI-powered player recommendations for selected themes
 *
 * Request Body:
 * {
 *   projectId: string,
 *   themes: Array<{ id, title, description, category }>,
 *   availablePlayers: Array<Player>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/players-suggest', async (req, res) => {
  const {
    projectId,
    themes = [],
    availablePlayers = [],
    contextBrief = {},
  } = req.body;

  try {
    // Get GameLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[GameLab Player Suggestions] Database not found in request');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!themes || themes.length === 0) {
      return res.status(400).json({ error: 'At least one theme is required' });
    }

    console.log('[GameLab Player Suggestions] Generating recommendations for', themes.length, 'themes');
    console.log('[GameLab Player Suggestions] Project ID:', projectId);

    // Generate recommendations for all themes
    const recommendations = await PlayerRecommendationService.recommendPlayersForMultipleThemes(
      projectId,
      {
        themes,
        availablePlayers,
        contextBrief,
      },
      db,
      AIAdaptorResolver
    );

    console.log('[GameLab Player Suggestions] Recommendations generated successfully');

    return res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('[GameLab Player Suggestions] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate player recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /api/gamelab/generation/images-stream
 *
 * Generate composite player images for all selected themes with SSE streaming
 *
 * Request Body:
 * {
 *   projectId: string,
 *   themePlayerMappings: Record<themeId, { themeId, themeName, themeCategory, thumbnailUrl, selectedPlayers }>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/images-stream', async (req, res) => {
  const {
    projectId,
    themePlayerMappings = {},
    contextBrief = {},
  } = req.body;

  try {
    // Get GameLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[GameLab Image Generation] Database not found in request');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const themeCount = Object.keys(themePlayerMappings).length;
    if (themeCount === 0) {
      return res.status(400).json({ error: 'At least one theme-player mapping is required' });
    }

    console.log('[GameLab Image Generation] Starting image generation for project:', projectId);
    console.log('[GameLab Image Generation] Themes to process:', themeCount);

    // Setup Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
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
        console.error('[GameLab Image Generation] Error sending SSE event:', error);
      }
    };

    // Send start event
    sendEvent('start', { message: 'Starting image generation', totalThemes: themeCount });

    // Call image generation service with callbacks
    await PlayerImageGenerationService.generateImagesForAllThemes(
      projectId,
      {
        themePlayerMappings,
        contextBrief,
      },
      db,
      AIAdaptorResolver,
      {
        // Called for progress updates
        onProgress: (data) => {
          console.log(`[GameLab Image Generation] Progress: ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        // Called when an image is generated
        onImageGenerated: (data) => {
          console.log(`[GameLab Image Generation] Image ${data.themeIndex}/${data.totalThemes} complete`);
          sendEvent('image', data);
        },

        // Called when all images are complete
        onComplete: (data) => {
          console.log('[GameLab Image Generation] All images complete');
          sendEvent('complete', data);
          res.end();
        },

        // Called on error
        onError: (data) => {
          console.error('[GameLab Image Generation] Error:', data);
          sendEvent('error', data);
          if (data.fatal) {
            res.end();
          }
        },
      }
    );
  } catch (error) {
    console.error('[GameLab Image Generation] Unhandled error:', error);

    // Try to send error event if connection still open
    try {
      const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      };

      sendEvent('error', {
        message: error.message || 'Failed to generate images',
        error: error.toString(),
        fatal: true,
      });
    } catch (sendError) {
      console.error('[GameLab Image Generation] Could not send error event:', sendError);
    }

    res.end();
  }
});

/**
 * POST /api/flarelab/generation/animation-recommendations
 *
 * Step 1 (New Flow): Analyze image and get multiple animation style recommendations
 *
 * Request Body:
 * {
 *   projectId: string,
 *   imageUrl: string,
 *   themeId: string,
 *   themeName: string,
 *   themeDescription: string,
 *   themeCategory: string,
 *   players: Array<Player>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/animation-recommendations', async (req, res) => {
  const {
    projectId,
    imageUrl,
    themeId,
    themeName,
    themeDescription,
    themeCategory,
    players = [],
    contextBrief = {},
  } = req.body;

  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!projectId || !imageUrl) {
      return res.status(400).json({ error: 'Project ID and image URL are required' });
    }

    console.log('[FlareLab Animation Recommendations] Getting recommendations for:', themeName);

    const result = await AnimationGenerationService.getAnimationRecommendations(
      projectId,
      {
        imageUrl,
        themeId,
        themeName,
        themeDescription,
        themeCategory,
        players,
        contextBrief,
      },
      db,
      AIAdaptorResolver
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[FlareLab Animation Recommendations] Error:', error);
    return res.status(500).json({
      error: 'Failed to get animation recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /api/gamelab/generation/animation-screenplay
 *
 * Step 1 (Legacy): Analyze image and generate animation screenplay/prompt
 *
 * Request Body:
 * {
 *   projectId: string,
 *   imageUrl: string,
 *   themeId: string,
 *   themeName: string,
 *   themeDescription: string,
 *   themeCategory: string,
 *   players: Array<Player>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/animation-screenplay', async (req, res) => {
  const {
    projectId,
    imageUrl,
    themeId,
    themeName,
    themeDescription,
    themeCategory,
    players = [],
    contextBrief = {},
  } = req.body;

  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!projectId || !imageUrl) {
      return res.status(400).json({ error: 'Project ID and image URL are required' });
    }

    console.log('[GameLab Animation Screenplay] Generating for:', themeName);

    const result = await AnimationGenerationService.generateScreenplay(
      projectId,
      {
        imageUrl,
        themeId,
        themeName,
        themeDescription,
        themeCategory,
        players,
        contextBrief,
      },
      db,
      AIAdaptorResolver
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[GameLab Animation Screenplay] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate animation screenplay',
      message: error.message,
    });
  }
});

/**
 * POST /api/gamelab/generation/animation-video
 *
 * Step 2: Generate video from screenplay
 *
 * Request Body:
 * {
 *   projectId: string,
 *   imageUrl: string,
 *   themeId: string,
 *   themeName: string,
 *   screenplay: { imageAnalysis, animationConcept, screenplay, videoGenerationPrompt },
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/animation-video', async (req, res) => {
  const {
    projectId,
    imageUrl,
    themeId,
    themeName,
    screenplay,
    contextBrief = {},
  } = req.body;

  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!projectId || !imageUrl || !screenplay) {
      return res.status(400).json({ error: 'Project ID, image URL, and screenplay are required' });
    }

    console.log('[GameLab Animation Video] Generating for:', themeName);

    const result = await AnimationGenerationService.generateVideo(
      projectId,
      {
        imageUrl,
        themeId,
        themeName,
        screenplay,
        contextBrief,
      },
      db,
      AIAdaptorResolver
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[GameLab Animation Video] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate animation video',
      message: error.message,
    });
  }
});

/**
 * POST /api/gamelab/generation/animations-stream
 *
 * Generate animations for all selected images with SSE streaming
 *
 * Request Body:
 * {
 *   projectId: string,
 *   images: Array<{ themeId, themeName, themeDescription, themeCategory, url, players }>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/animations-stream', async (req, res) => {
  const {
    projectId,
    images = [],
    contextBrief = {},
  } = req.body;

  try {
    const db = req.db;
    if (!db) {
      console.error('[GameLab Animation Generation] Database not found');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    console.log('[GameLab Animation Generation] Starting for project:', projectId);
    console.log('[GameLab Animation Generation] Images to process:', images.length);

    // Setup Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (eventType, data) => {
      try {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      } catch (error) {
        console.error('[GameLab Animation Generation] Error sending SSE event:', error);
      }
    };

    sendEvent('start', { message: 'Starting animation generation', totalImages: images.length });

    await AnimationGenerationService.generateAnimationsForAll(
      projectId,
      {
        images,
        contextBrief,
      },
      db,
      AIAdaptorResolver,
      {
        onProgress: (data) => {
          console.log(`[GameLab Animation Generation] Progress: ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        onAnimationComplete: (data) => {
          console.log(`[GameLab Animation Generation] Animation ${data.imageIndex}/${data.totalImages} complete`);
          sendEvent('animation', data);
        },

        onComplete: (data) => {
          console.log('[GameLab Animation Generation] All animations complete');
          sendEvent('complete', data);
          res.end();
        },

        onError: (data) => {
          console.error('[GameLab Animation Generation] Error:', data);
          sendEvent('error', data);
          if (data.fatal) {
            res.end();
          }
        },
      }
    );
  } catch (error) {
    console.error('[GameLab Animation Generation] Unhandled error:', error);

    try {
      const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      };

      sendEvent('error', {
        message: error.message || 'Failed to generate animations',
        error: error.toString(),
        fatal: true,
      });
    } catch (sendError) {
      console.error('[GameLab Animation Generation] Could not send error event:', sendError);
    }

    res.end();
  }
});

export default router;
