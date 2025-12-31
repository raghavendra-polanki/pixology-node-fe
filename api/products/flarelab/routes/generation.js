/**
 * FlareLab Generation Routes
 *
 * Handles all AI generation endpoints for FlareLab stages:
 * - Theme generation (Stage 2)
 * - Player suggestion (Stage 3)
 * - Image generation (Stage 4)
 * - Video generation (Stage 5)
 */

import express from 'express';
import sharp from 'sharp';
import AIAdaptorResolver from '../../../core/services/AIAdaptorResolver.js';
import PromptManager from '../../../core/services/PromptManager.cjs';
import { uploadBase64ImageToGCS, downloadImageFromGCS } from '../../../core/services/gcsService.js';
import ThemeStreamingService from '../services/ThemeStreamingService.cjs';
import PlayerRecommendationService from '../services/PlayerRecommendationService.cjs';
import PlayerImageGenerationService from '../services/PlayerImageGenerationService.cjs';
import AnimationGenerationService from '../services/AnimationGenerationService.cjs';
import { renderTextOnImage } from '../services/CanvasTextRenderer.js';

const router = express.Router();

/**
 * POST /api/flarelab/generation/themes-stream
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
    // Get FlareLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[FlareLab Theme Generation] Database not found in request');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log('[FlareLab Theme Generation] Starting theme generation for project:', projectId);
    console.log('[FlareLab Theme Generation] Using database:', db._settings?.databaseId || 'default');
    console.log('[FlareLab Theme Generation] Input:', {
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
        console.error('[FlareLab Theme Generation] Error sending SSE event:', error);
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
          console.log(`[FlareLab Theme Generation] Theme parsed: ${data.themeNumber}/${numberOfThemes}`);
          sendEvent('theme', data);
        },

        // Called when a theme's image is generated
        onImageGenerated: (data) => {
          console.log(`[FlareLab Theme Generation] Image generated: ${data.themeNumber}/${numberOfThemes}`);
          sendEvent('image', data);
        },

        // Called for progress updates
        onProgress: (data) => {
          console.log(`[FlareLab Theme Generation] Progress: ${data.stage} - ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        // Called when all themes are complete
        onComplete: (data) => {
          console.log('[FlareLab Theme Generation] Generation complete');
          sendEvent('complete', data);
          res.end();
        },

        // Called on error
        onError: (data) => {
          console.error('[FlareLab Theme Generation] Error:', data);
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('[FlareLab Theme Generation] Unhandled error:', error);

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
      console.error('[FlareLab Theme Generation] Could not send error event:', sendError);
    }

    res.end();
  }
});

/**
 * POST /api/flarelab/generation/players-suggest
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
    // Get FlareLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[FlareLab Player Suggestions] Database not found in request');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!themes || themes.length === 0) {
      return res.status(400).json({ error: 'At least one theme is required' });
    }

    console.log('[FlareLab Player Suggestions] Generating recommendations for', themes.length, 'themes');
    console.log('[FlareLab Player Suggestions] Project ID:', projectId);

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

    console.log('[FlareLab Player Suggestions] Recommendations generated successfully');

    return res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('[FlareLab Player Suggestions] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate player recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /api/flarelab/generation/images-stream
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
    // Get FlareLab database from middleware
    const db = req.db;
    if (!db) {
      console.error('[FlareLab Image Generation] Database not found in request');
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

    console.log('[FlareLab Image Generation] Starting image generation for project:', projectId);
    console.log('[FlareLab Image Generation] Themes to process:', themeCount);

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
        console.error('[FlareLab Image Generation] Error sending SSE event:', error);
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
          console.log(`[FlareLab Image Generation] Progress: ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        // Called when an image is generated
        onImageGenerated: (data) => {
          console.log(`[FlareLab Image Generation] Image ${data.themeIndex}/${data.totalThemes} complete`);
          sendEvent('image', data);
        },

        // Called when all images are complete
        onComplete: (data) => {
          console.log('[FlareLab Image Generation] All images complete');
          sendEvent('complete', data);
          res.end();
        },

        // Called on error
        onError: (data) => {
          console.error('[FlareLab Image Generation] Error:', data);
          sendEvent('error', data);
          if (data.fatal) {
            res.end();
          }
        },
      }
    );
  } catch (error) {
    console.error('[FlareLab Image Generation] Unhandled error:', error);

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
      console.error('[FlareLab Image Generation] Could not send error event:', sendError);
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
 * POST /api/flarelab/generation/animation-screenplay
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

    console.log('[FlareLab Animation Screenplay] Generating for:', themeName);

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
    console.error('[FlareLab Animation Screenplay] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate animation screenplay',
      message: error.message,
    });
  }
});

/**
 * POST /api/flarelab/generation/animation-video
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

    console.log('[FlareLab Animation Video] Generating for:', themeName);

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
    console.error('[FlareLab Animation Video] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate animation video',
      message: error.message,
    });
  }
});

/**
 * POST /api/flarelab/generation/animations-stream
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
      console.error('[FlareLab Animation Generation] Database not found');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    console.log('[FlareLab Animation Generation] Starting for project:', projectId);
    console.log('[FlareLab Animation Generation] Images to process:', images.length);

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
        console.error('[FlareLab Animation Generation] Error sending SSE event:', error);
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
          console.log(`[FlareLab Animation Generation] Progress: ${data.message} (${data.progress}%)`);
          sendEvent('progress', data);
        },

        onAnimationComplete: (data) => {
          console.log(`[FlareLab Animation Generation] Animation ${data.imageIndex}/${data.totalImages} complete`);
          sendEvent('animation', data);
        },

        onComplete: (data) => {
          console.log('[FlareLab Animation Generation] All animations complete');
          sendEvent('complete', data);
          res.end();
        },

        onError: (data) => {
          console.error('[FlareLab Animation Generation] Error:', data);
          sendEvent('error', data);
          if (data.fatal) {
            res.end();
          }
        },
      }
    );
  } catch (error) {
    console.error('[FlareLab Animation Generation] Unhandled error:', error);

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
      console.error('[FlareLab Animation Generation] Could not send error event:', sendError);
    }

    res.end();
  }
});

/**
 * POST /api/flarelab/generation/text-suggestions
 *
 * Stage 5 Text Studio: Get AI-powered text overlay suggestions
 * Uses vision/multimodal AI to analyze the actual image and suggest:
 * - Text content (headlines, subtext, calls-to-action)
 * - Optimal positions based on image composition
 * - Font sizes based on visual hierarchy
 * - Style presets matched to the image mood
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
    console.log('[FlareLab Text Suggestions] Analyzing image:', imageUrl.substring(0, 80) + '...');

    // Get the prompt template from database using PromptManager
    const promptTemplate = await PromptManager.getPromptByCapability(
      'stage_5_text',
      'textGeneration',
      projectId,
      db
    );

    console.log('[FlareLab Text Suggestions] Loaded prompt template:', promptTemplate?.id || 'default');

    // Get text generation adaptor with model config from prompt
    const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId,
      'stage_5_text',
      'textGeneration',
      db,
      promptTemplate.modelConfig
    );

    if (!textAdaptor || !textAdaptor.adaptor) {
      throw new Error('Text generation adaptor not available');
    }

    console.log(`[FlareLab Text Suggestions] Using adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

    // Build context for AI
    const playerNames = players.map(p => `${p.name} (#${p.number})`).join(', ');
    const contextPills = contextBrief.contextPills || [];

    // Determine mood/theme keywords for style matching
    const themeKeywords = extractThemeKeywords(themeName, themeDescription, themeCategory, contextPills);

    // Build prompt variables for template resolution
    const variables = {
      themeName: themeName || 'Sports Theme',
      themeDescription: themeDescription || '',
      themeCategory: themeCategory || 'general',
      sportType: contextBrief.sportType || 'Hockey',
      homeTeam: contextBrief.homeTeam?.name || contextBrief.homeTeam || 'Home Team',
      awayTeam: contextBrief.awayTeam?.name || contextBrief.awayTeam || 'Away Team',
      playerNames: playerNames || 'Team players',
      contextPills: contextPills.join(', ') || 'Game day excitement',
      campaignGoal: contextBrief.campaignGoal || 'Social Hype',
    };

    // Resolve the prompt template with variables
    const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
    const fullPrompt = promptTemplate.systemPrompt
      ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
      : resolvedPrompt.userPrompt;

    console.log('[FlareLab Text Suggestions] Prompt resolved, sending with image for analysis...');

    // Send the prompt WITH the image for visual analysis
    const response = await textAdaptor.adaptor.generateText(fullPrompt, {
      referenceImageUrl: imageUrl,
      responseFormat: 'json',
    });

    console.log('[FlareLab Text Suggestions] Raw response received');

    // Parse the response
    let result;
    try {
      const responseText = typeof response === 'string' ? response : response.text || JSON.stringify(response);
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ||
                        responseText.match(/```\s*([\s\S]*?)```/) ||
                        [null, responseText];
      const jsonText = jsonMatch[1] || responseText;
      const cleanJson = jsonText.match(/\{[\s\S]*\}/);
      if (cleanJson) {
        result = JSON.parse(cleanJson[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[FlareLab Text Suggestions] Parse error:', parseError);
      console.error('[FlareLab Text Suggestions] Raw response:', response);

      // Create intelligent fallback based on theme
      const fallbackPreset = themeKeywords.includes('ice') || themeKeywords.includes('cold') ? 'frozen-ice' :
                            themeKeywords.includes('fire') || themeKeywords.includes('heat') ? 'fire-intensity' :
                            themeKeywords.includes('rivalry') ? 'rivalry-clash' :
                            themeKeywords.includes('playoff') ? 'metallic-gold' : 'broadcast-clean';

      result = {
        imageAnalysis: {
          composition: 'Unable to analyze - using context-based suggestions',
          colorPalette: 'Unknown',
          mood: contextPills.join(', ') || 'Sports excitement',
          bestTextAreas: 'Bottom third recommended'
        },
        suggestions: [
          {
            id: 'headline',
            purpose: 'Primary headline',
            text: themeName?.toUpperCase() || 'GAME ON',
            presetId: fallbackPreset,
            position: { x: 50, y: 20 },
            fontSize: 96,
            reasoning: 'Fallback: Using theme name as headline with style matched to context',
          },
          {
            id: 'subtext',
            purpose: 'Supporting text',
            text: `${contextBrief.homeTeam?.name || 'HOME'} VS ${contextBrief.awayTeam?.name || 'AWAY'}`.toUpperCase(),
            presetId: 'sports-bold',
            position: { x: 50, y: 85 },
            fontSize: 48,
            reasoning: 'Fallback: Team matchup in lower third',
          },
        ],
      };
    }

    console.log('[FlareLab Text Suggestions] Generated', result.suggestions?.length || 0, 'suggestions');
    console.log('[FlareLab Text Suggestions] Image analysis:', result.imageAnalysis?.mood || 'N/A');

    return res.json({
      success: true,
      data: {
        suggestions: result.suggestions || [],
        imageAnalysis: result.imageAnalysis || {},
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
 * POST /api/flarelab/generation/rasterize-text
 *
 * Stage 5 Text Studio: Server-side rasterization of text overlays onto images
 * This avoids CORS issues with client-side canvas operations on GCS images
 *
 * Request Body:
 * {
 *   projectId: string,
 *   themeId: string,
 *   imageUrl: string (GCS URL of the base image),
 *   overlays: Array<TextOverlay> (text overlays to render)
 * }
 */
router.post('/rasterize-text', async (req, res) => {
  const { projectId, themeId, imageUrl, overlays, previewWidth } = req.body;

  try {
    if (!projectId || !themeId || !imageUrl) {
      return res.status(400).json({
        error: 'Missing required parameters: projectId, themeId, imageUrl',
      });
    }

    console.log('[FlareLab Rasterize] Starting rasterization for theme:', themeId);
    console.log('[FlareLab Rasterize] Overlays to render:', overlays?.length || 0);
    console.log('[FlareLab Rasterize] Preview width from frontend:', previewWidth);
    console.log('[FlareLab Rasterize] Overlay data:', JSON.stringify(overlays, null, 2));

    // If no overlays, just return the original image URL
    if (!overlays || overlays.length === 0) {
      console.log('[FlareLab Rasterize] No overlays, returning original image');
      return res.json({
        success: true,
        data: {
          url: imageUrl,
          themeId,
          hasOverlays: false,
        },
      });
    }

    // Download the base image
    console.log('[FlareLab Rasterize] Downloading base image...');
    const imageBuffer = await downloadImageFromGCS(imageUrl);
    console.log('[FlareLab Rasterize] Downloaded image:', imageBuffer.length, 'bytes');

    // Get image dimensions
    const imageMetadata = await sharp(imageBuffer).metadata();
    const { width, height } = imageMetadata;
    console.log('[FlareLab Rasterize] Image dimensions:', width, 'x', height);

    // Use Canvas 2D renderer for pixel-perfect text (same as frontend)
    // Pass previewWidth so text is rendered at same size user saw in Stage 5
    console.log('[FlareLab Rasterize] Rendering with Canvas 2D...');
    const compositedBuffer = await renderTextOnImage(imageBuffer, overlays, width, height, previewWidth || 0);
    console.log('[FlareLab Rasterize] Canvas rendered:', compositedBuffer.length, 'bytes');

    // Convert to base64 data URL and upload to GCS
    const base64Data = `data:image/png;base64,${compositedBuffer.toString('base64')}`;
    const publicUrl = await uploadBase64ImageToGCS(base64Data, projectId, themeId, 'composited');

    console.log('[FlareLab Rasterize] Uploaded composited image:', publicUrl);

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        themeId,
        hasOverlays: true,
        overlayCount: overlays.length,
      },
    });
  } catch (error) {
    console.error('[FlareLab Rasterize] Error:', error);
    return res.status(500).json({
      error: 'Failed to rasterize text overlays',
      message: error.message,
    });
  }
});

/**
 * CSS Text Presets - same as frontend htmlTextRenderer.ts
 * Maps cssPresetId to gradient and style info for SVG generation
 */
const CSS_PRESET_GRADIENTS = {
  'frozen-knightfall': {
    gradient: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 20%, #c0c0c0 50%, #909090 80%, #606060 100%)',
    stroke: { color: '#1a1a1a', width: 1 },
  },
  'ice-storm': {
    gradient: 'linear-gradient(180deg, #ffffff 0%, #e0f7fa 20%, #80deea 50%, #26c6da 80%, #00838f 100%)',
    stroke: { color: '#004d5a', width: 1 },
  },
  'championship-gold': {
    gradient: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 15%, #fcd34d 40%, #f59e0b 60%, #d97706 80%, #b45309 100%)',
    stroke: { color: '#78350f', width: 1 },
  },
  'fire-rivalry': {
    gradient: 'linear-gradient(180deg, #fef08a 0%, #fde047 20%, #fb923c 50%, #ea580c 75%, #9a3412 100%)',
    stroke: { color: '#7c2d12', width: 1 },
  },
  'electric-blue': {
    gradient: 'linear-gradient(180deg, #ffffff 0%, #bfdbfe 20%, #60a5fa 50%, #2563eb 75%, #1e40af 100%)',
    stroke: { color: '#1e3a8a', width: 1 },
  },
  'neon-green': {
    gradient: 'linear-gradient(180deg, #ecfdf5 0%, #a7f3d0 20%, #34d399 50%, #059669 75%, #065f46 100%)',
    stroke: { color: '#064e3b', width: 1 },
  },
  'broadcast-clean': {
    gradient: null, // Solid white
    fillColor: '#ffffff',
    stroke: { color: '#000000', width: 2 },
  },
  'sports-bold': {
    gradient: null,
    fillColor: '#ffffff',
    stroke: { color: '#1a1a1a', width: 3 },
  },
  'rivalry-clash': {
    gradient: 'linear-gradient(180deg, #fee2e2 0%, #fca5a5 25%, #ef4444 50%, #b91c1c 75%, #7f1d1d 100%)',
    stroke: { color: '#450a0a', width: 1 },
  },
  'metallic-gold': {
    gradient: 'linear-gradient(180deg, #fef3c7 0%, #fcd34d 30%, #f59e0b 50%, #d97706 70%, #92400e 100%)',
    stroke: { color: '#78350f', width: 1 },
  },
  'frozen-ice': {
    gradient: 'linear-gradient(180deg, #f0f9ff 0%, #bae6fd 25%, #38bdf8 50%, #0284c7 75%, #075985 100%)',
    stroke: { color: '#0c4a6e', width: 1 },
  },
  'fire-intensity': {
    gradient: 'linear-gradient(180deg, #fef08a 0%, #facc15 25%, #f97316 50%, #dc2626 75%, #991b1b 100%)',
    stroke: { color: '#7c2d12', width: 1 },
  },
};

/**
 * Parse CSS linear-gradient to SVG gradient stops
 * Input: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 50%, #606060 100%)'
 * Output: { angle: 180, stops: [{ color: '#ffffff', position: 0 }, ...] }
 */
function parseCSSGradient(cssGradient) {
  if (!cssGradient) return null;

  // Extract angle and color stops
  const match = cssGradient.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
  if (!match) return null;

  const angle = parseInt(match[1], 10);
  const stopsStr = match[2];

  // Parse color stops: "#ffffff 0%, #c0c0c0 50%"
  const stopRegex = /(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb\([^)]+\)|rgba\([^)]+\))\s*(\d+)%/g;
  const stops = [];
  let stopMatch;

  while ((stopMatch = stopRegex.exec(stopsStr)) !== null) {
    stops.push({
      color: stopMatch[1],
      position: parseInt(stopMatch[2], 10),
    });
  }

  return { angle, stops };
}

/**
 * Helper: Generate SVG content from text overlays
 * Converts TextOverlay objects to SVG text elements with proper styling
 *
 * TextStyle properties:
 * - fillType: 'solid' | 'gradient'
 * - fillColor: string (for solid fills)
 * - gradient: { type, angle, stops: [{ offset, color }] }
 * - strokeColor, strokeWidth
 * - shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY
 * - glowColor, glowBlur
 *
 * Also supports cssPresetId for broadcast-quality presets
 */
function generateTextOverlaySVG(overlays, width, height) {
  // Collect all defs (gradients, filters) separately
  const allDefs = [];

  // Build SVG text elements
  const textElements = overlays.map(overlay => {
    const { text, position, style } = overlay;
    if (!text || !position) return '';

    // Convert percentage position to absolute pixels
    const x = (position.x / 100) * width;
    const y = (position.y / 100) * height;

    // Extract style properties
    const fontSize = style?.fontSize || 48;
    const fontFamily = style?.fontFamily || 'Arial, sans-serif';
    const fontWeight = style?.fontWeight || 'bold';
    const letterSpacing = style?.letterSpacing || 0;
    const textTransform = style?.textTransform || 'none';
    const opacity = (style?.opacity ?? 100) / 100;

    // Apply text transform
    let displayText = text;
    if (textTransform === 'uppercase') {
      displayText = text.toUpperCase();
    } else if (textTransform === 'lowercase') {
      displayText = text.toLowerCase();
    }

    // Escape special XML characters
    displayText = escapeXml(displayText);

    // Check for CSS preset first (broadcast-quality styling)
    const cssPresetId = overlay.cssPresetId;
    const cssPreset = cssPresetId ? CSS_PRESET_GRADIENTS[cssPresetId] : null;
    if (cssPresetId) {
      console.log(`[FlareLab Rasterize] Overlay ${overlay.id} uses cssPresetId: ${cssPresetId}, preset found: ${!!cssPreset}`);
    }

    // Build fill style
    let fillStyle = '#FFFFFF';
    const fillId = `fill-${overlay.id}`;

    if (cssPreset && cssPreset.gradient) {
      // Use CSS preset gradient
      const parsed = parseCSSGradient(cssPreset.gradient);
      if (parsed && parsed.stops.length > 0) {
        const gradientStops = parsed.stops.map(stop =>
          `<stop offset="${stop.position}%" stop-color="${stop.color}" />`
        ).join('\n        ');

        const angle = parsed.angle || 180;
        // Convert angle to x1,y1,x2,y2 for SVG linearGradient
        const angleRad = (angle - 90) * (Math.PI / 180);
        const x1 = 50 - 50 * Math.cos(angleRad);
        const y1 = 50 - 50 * Math.sin(angleRad);
        const x2 = 50 + 50 * Math.cos(angleRad);
        const y2 = 50 + 50 * Math.sin(angleRad);

        allDefs.push(`<linearGradient id="${fillId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${gradientStops}
      </linearGradient>`);
        fillStyle = `url(#${fillId})`;
      }
    } else if (cssPreset && cssPreset.fillColor) {
      // Use CSS preset solid color
      fillStyle = cssPreset.fillColor;
    } else if (style?.fillType === 'gradient' && style?.gradient) {
      // Use TextStyle gradient
      const { gradient } = style;
      const gradientStops = gradient.stops.map(stop => {
        const offsetPercent = (stop.offset !== undefined ? stop.offset * 100 : stop.position) || 0;
        return `<stop offset="${offsetPercent}%" stop-color="${stop.color}" />`;
      }).join('\n        ');

      if (gradient.type === 'linear') {
        const angle = gradient.angle || 0;
        const angleRad = (angle - 90) * (Math.PI / 180);
        const x1 = 50 - 50 * Math.cos(angleRad);
        const y1 = 50 - 50 * Math.sin(angleRad);
        const x2 = 50 + 50 * Math.cos(angleRad);
        const y2 = 50 + 50 * Math.sin(angleRad);

        allDefs.push(`<linearGradient id="${fillId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${gradientStops}
      </linearGradient>`);
      } else {
        allDefs.push(`<radialGradient id="${fillId}">
        ${gradientStops}
      </radialGradient>`);
      }
      fillStyle = `url(#${fillId})`;
    } else if (style?.fillColor) {
      fillStyle = style.fillColor;
    }

    // Build stroke style - prefer CSS preset, fallback to TextStyle
    let strokeAttr = '';
    if (cssPreset && cssPreset.stroke && cssPreset.stroke.width > 0) {
      strokeAttr = `stroke="${cssPreset.stroke.color}" stroke-width="${cssPreset.stroke.width}"`;
    } else if (style?.strokeColor && style?.strokeWidth > 0) {
      strokeAttr = `stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}"`;
    }

    // Build shadow/glow filter (TextStyle uses shadowColor/shadowBlur/shadowOffsetX/shadowOffsetY and glowColor/glowBlur)
    let filterRef = '';
    const filterId = `filter-${overlay.id}`;
    const filterEffects = [];

    // Shadow effect
    if (style?.shadowColor && style?.shadowBlur > 0) {
      const offsetX = style.shadowOffsetX || 0;
      const offsetY = style.shadowOffsetY || 0;
      const blur = style.shadowBlur || 0;
      filterEffects.push(`<feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${blur / 2}" flood-color="${style.shadowColor}" />`);
    }

    // Glow effect
    if (style?.glowColor && style?.glowBlur > 0) {
      filterEffects.push(`<feGaussianBlur in="SourceGraphic" stdDeviation="${style.glowBlur}" result="blur" />
        <feFlood flood-color="${style.glowColor}" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>`);
    }

    if (filterEffects.length > 0) {
      allDefs.push(`<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        ${filterEffects.join('\n        ')}
      </filter>`);
      filterRef = `filter="url(#${filterId})"`;
    }

    // Rotation transform
    let transformAttr = '';
    if (style?.rotation) {
      transformAttr = `transform="rotate(${style.rotation}, ${x}, ${y})"`;
    }

    return `<text
      x="${x}"
      y="${y}"
      font-family="${fontFamily}"
      font-size="${fontSize}"
      font-weight="${fontWeight}"
      letter-spacing="${letterSpacing}"
      fill="${fillStyle}"
      ${strokeAttr}
      text-anchor="middle"
      dominant-baseline="middle"
      opacity="${opacity}"
      ${filterRef}
      ${transformAttr}
    >${displayText}</text>`;
  }).join('\n    ');

  // Build complete SVG with all defs collected in one place
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      ${allDefs.join('\n      ')}
    </defs>
    ${textElements}
  </svg>`;
}

/**
 * Helper: Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
