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
import { uploadBase64ImageToGCS } from '../../../core/services/gcsService.js';
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

/**
 * POST /api/flarelab/generation/text-suggestions
 *
 * Stage 5 Text Studio: Get AI-powered text overlay suggestions
 * Analyzes the image and theme context to suggest appropriate text content
 * and style presets that match the visual mood.
 *
 * Request Body:
 * {
 *   projectId: string,
 *   imageUrl: string,
 *   themeId: string,
 *   themeName: string,
 *   themeDescription: string,
 *   themeCategory: string,
 *   players: Array<{ name, number, position }>,
 *   contextBrief: { sportType, homeTeam, awayTeam, contextPills, campaignGoal }
 * }
 */
router.post('/text-suggestions', async (req, res) => {
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

    console.log('[FlareLab Text Suggestions] Getting suggestions for:', themeName);

    // Get the text generation AI adaptor
    const textAdaptor = await AIAdaptorResolver.getAdaptor('text-generation');
    if (!textAdaptor) {
      throw new Error('Text generation adaptor not available');
    }

    // Build context for AI
    const playerNames = players.map(p => p.name).join(', ');
    const contextPills = contextBrief.contextPills || [];

    // Determine mood/theme keywords for style matching
    const themeKeywords = extractThemeKeywords(themeName, themeDescription, themeCategory, contextPills);

    const prompt = `You are a broadcast graphics designer creating text overlays for sports promotional images.

IMAGE CONTEXT:
- Theme Name: ${themeName}
- Theme Description: ${themeDescription || 'Not provided'}
- Category: ${themeCategory}
- Sport: ${contextBrief.sportType || 'Hockey'}
- Teams: ${contextBrief.homeTeam || 'Home Team'} vs ${contextBrief.awayTeam || 'Away Team'}
- Players Featured: ${playerNames || 'Unknown'}
- Context/Mood: ${contextPills.join(', ') || 'General sports'}
- Campaign Goal: ${contextBrief.campaignGoal || 'Social Hype'}

Based on this context, suggest 3 text overlay options. Each should include:
1. The text content (short, impactful, uppercase preferred)
2. A recommended style preset from this list based on the visual mood:
   - "frozen-ice" or "arctic-blast" (for icy, cold, winter themes)
   - "fire-intensity" or "inferno" (for hot, intense, fiery themes)
   - "metallic-gold" (for championship, winning, premium themes)
   - "chrome-steel" (for modern, tech, sleek themes)
   - "bronze-glory" (for classic, heritage themes)
   - "neon-electric" or "cyber-blue" or "toxic-green" (for energetic, nightlife themes)
   - "broadcast-clean" or "sports-bold" or "headline-impact" (for professional broadcast look)
   - "team-primary" (for team-focused messaging)
   - "rivalry-clash" (for versus/rivalry matchups)
   - "epic-cinematic" or "dark-knight" (for dramatic, movie-style looks)

3. Why this text and style works for the image

Respond in JSON format:
{
  "suggestions": [
    {
      "id": "suggestion-1",
      "text": "THE TEXT CONTENT",
      "presetId": "preset-id-from-list",
      "position": { "x": 50, "y": 85 },
      "reasoning": "Why this works"
    }
  ],
  "imageAnalysis": "Brief analysis of the image mood and visual elements"
}`;

    const response = await textAdaptor.generateText({
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
      responseFormat: 'json',
    });

    // Parse the response
    let suggestions;
    try {
      // Handle both string and object responses
      const responseText = typeof response === 'string' ? response : response.text || JSON.stringify(response);
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[FlareLab Text Suggestions] Parse error:', parseError);
      // Return default suggestions if parsing fails
      suggestions = {
        suggestions: [
          {
            id: 'suggestion-1',
            text: themeName?.toUpperCase() || 'GAME DAY',
            presetId: 'broadcast-clean',
            position: { x: 50, y: 85 },
            reasoning: 'Default suggestion based on theme name',
          },
        ],
        imageAnalysis: 'Unable to analyze image',
      };
    }

    console.log('[FlareLab Text Suggestions] Generated suggestions:', suggestions.suggestions?.length || 0);

    return res.json({
      success: true,
      data: {
        suggestions: suggestions.suggestions || [],
        imageAnalysis: suggestions.imageAnalysis || '',
        themeKeywords,
      },
    });
  } catch (error) {
    console.error('[FlareLab Text Suggestions] Error:', error);
    return res.status(500).json({
      error: 'Failed to get text suggestions',
      message: error.message,
    });
  }
});

/**
 * POST /api/flarelab/generation/upload-composited
 *
 * Stage 5 Text Studio: Upload a client-side composited image (with text overlays)
 *
 * Request Body:
 * {
 *   projectId: string,
 *   themeId: string,
 *   imageData: string (base64 data URL)
 * }
 */
router.post('/upload-composited', async (req, res) => {
  const { projectId, themeId, imageData } = req.body;

  try {
    if (!projectId || !themeId || !imageData) {
      return res.status(400).json({
        error: 'Missing required parameters: projectId, themeId, imageData',
      });
    }

    console.log('[FlareLab Composited Upload] Uploading for theme:', themeId);

    // Upload the base64 image to GCS
    const publicUrl = await uploadBase64ImageToGCS(imageData, projectId, themeId, 'composited');

    console.log('[FlareLab Composited Upload] Uploaded:', publicUrl);

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        themeId,
      },
    });
  } catch (error) {
    console.error('[FlareLab Composited Upload] Error:', error);
    return res.status(500).json({
      error: 'Failed to upload composited image',
      message: error.message,
    });
  }
});

/**
 * Helper: Extract keywords from theme for style matching
 */
function extractThemeKeywords(themeName, description, category, contextPills) {
  const keywords = new Set();

  // Extract from theme name
  const nameWords = (themeName || '').toLowerCase().split(/[\s-_]+/);
  nameWords.forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  // Extract from description
  const descWords = (description || '').toLowerCase().split(/[\s-_]+/);
  descWords.forEach(word => {
    if (word.length > 3) keywords.add(word);
  });

  // Add category
  if (category) keywords.add(category.toLowerCase());

  // Add context pills
  contextPills.forEach(pill => {
    keywords.add(pill.toLowerCase());
  });

  // Common theme mappings
  const themeMap = {
    ice: ['frozen', 'cold', 'winter', 'arctic', 'frost', 'avalanche', 'chill'],
    fire: ['hot', 'flame', 'blaze', 'heat', 'inferno', 'burn', 'intensity'],
    rivalry: ['versus', 'vs', 'clash', 'battle', 'showdown', 'matchup'],
    championship: ['winner', 'champion', 'gold', 'trophy', 'victory'],
    playoff: ['elimination', 'finals', 'intense', 'crucial'],
  };

  // Add related keywords based on matches
  Object.entries(themeMap).forEach(([theme, related]) => {
    if (related.some(r => keywords.has(r))) {
      keywords.add(theme);
    }
  });

  return Array.from(keywords);
}

export default router;
