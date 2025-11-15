/**
 * Generation API
 * Exposes generation services that use AI adaptor architecture
 * Replaces recipe-based generation with adaptor-aware services
 */

import express from 'express';
import { db } from './config/firestore.js';
import AIAdaptorResolver from './services/AIAdaptorResolver.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PersonaGenerationService = require('./services/PersonaGenerationService.cjs');
const PersonaStreamingService = require('./services/PersonaStreamingService.cjs');
const NarrativeGenerationService = require('./services/NarrativeGenerationService.cjs');
const NarrativeStreamingService = require('./services/NarrativeStreamingService.cjs');
const StoryboardGenerationService = require('./services/StoryboardGenerationService.cjs');
const StoryboardStreamingService = require('./services/StoryboardStreamingService.cjs');
const ScreenplayGenerationService = require('./services/ScreenplayGenerationService.cjs');
const ScreenplayStreamingService = require('./services/ScreenplayStreamingService.cjs');
const VideoGenerationService = require('./services/VideoGenerationService.cjs');

const router = express.Router();

/**
 * POST /api/generation/personas
 * Generate personas using configured AI adaptor
 */
router.post('/personas', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      numberOfPersonas = 3,
      productImageUrl,
    } = req.body;

    if (!projectId || !productDescription || !targetAudience) {
      return res.status(400).json({
        error: 'projectId, productDescription, and targetAudience are required',
      });
    }

    console.log(`[Generation] Generating ${numberOfPersonas} personas for project ${projectId}`);

    const input = {
      productDescription,
      targetAudience,
      numberOfPersonas,
      productImageUrl,
    };

    const result = await PersonaGenerationService.generatePersonas(projectId, input, db, AIAdaptorResolver);

    res.json({
      success: true,
      data: result,
      message: 'Personas generated successfully',
    });
  } catch (error) {
    console.error('Error generating personas:', error);
    res.status(500).json({
      error: 'Failed to generate personas',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/generation/personas-stream
 * Generate personas with Server-Sent Events (SSE) streaming
 * Provides real-time updates as personas and images are generated
 */
router.post('/personas-stream', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      numberOfPersonas = 3,
      productImageUrl,
    } = req.body;

    if (!projectId || !productDescription || !targetAudience) {
      return res.status(400).json({
        error: 'projectId, productDescription, and targetAudience are required',
      });
    }

    console.log(`[Generation] Starting streaming persona generation for project ${projectId}`);

    // Bypass compression for SSE
    req.shouldCompress = false;

    // Setup Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Content-Encoding', 'none'); // Disable compression

    // Ensure response is not buffered
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (eventType, data) => {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);

      // Explicitly flush if available
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Send initial start event
    sendEvent('start', {
      message: 'Starting persona generation',
      projectId,
      numberOfPersonas,
    });

    const input = {
      productDescription,
      targetAudience,
      numberOfPersonas,
      productImageUrl,
    };

    // Start progressive generation with callbacks
    await PersonaStreamingService.generatePersonasProgressive(
      projectId,
      input,
      db,
      AIAdaptorResolver,
      {
        onPersonaParsed: (data) => {
          sendEvent('persona', data);
        },
        onImageGenerated: (data) => {
          sendEvent('image', data);
        },
        onProgress: (data) => {
          sendEvent('progress', data);
        },
        onComplete: (data) => {
          sendEvent('complete', data);
          res.end();
        },
        onError: (data) => {
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('Error in streaming persona generation:', error);

    // Try to send error event if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start persona streaming',
        message: error.message,
      });
    } else {
      // Send error event via SSE
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message, stage: 'initialization' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/generation/narratives
 * Generate narrative themes using configured AI adaptor
 */
router.post('/narratives', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      numberOfNarratives = 6,
      selectedPersonas = [],
    } = req.body;

    if (!projectId || !productDescription || !targetAudience) {
      return res.status(400).json({
        error: 'projectId, productDescription, and targetAudience are required',
      });
    }

    console.log(`[Generation] Generating ${numberOfNarratives} narratives for project ${projectId}`);

    const input = {
      productDescription,
      targetAudience,
      numberOfNarratives,
      selectedPersonas,
    };

    const result = await NarrativeGenerationService.generateNarratives(projectId, input, db, AIAdaptorResolver);

    res.json({
      success: true,
      data: result,
      message: 'Narratives generated successfully',
    });
  } catch (error) {
    console.error('Error generating narratives:', error);
    res.status(500).json({
      error: 'Failed to generate narratives',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/generation/narratives-stream
 * Generate narratives with Server-Sent Events (SSE) streaming
 * Provides real-time updates as narratives are generated
 */
router.post('/narratives-stream', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      numberOfNarratives = 6,
      selectedPersonas = [],
    } = req.body;

    if (!projectId || !productDescription || !targetAudience) {
      return res.status(400).json({
        error: 'projectId, productDescription, and targetAudience are required',
      });
    }

    console.log(`[Generation] Starting streaming narrative generation for project ${projectId}`);

    // Bypass compression for SSE
    req.shouldCompress = false;

    // Setup Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');

    // Ensure response is not buffered
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (eventType, data) => {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);

      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Send initial start event
    sendEvent('start', {
      message: 'Starting narrative generation',
      projectId,
      numberOfNarratives,
    });

    const input = {
      productDescription,
      targetAudience,
      numberOfNarratives,
      selectedPersonas,
    };

    // Start progressive generation with callbacks
    await NarrativeStreamingService.generateNarrativesProgressive(
      projectId,
      input,
      db,
      AIAdaptorResolver,
      {
        onNarrativeParsed: (data) => {
          sendEvent('narrative', data);
        },
        onProgress: (data) => {
          sendEvent('progress', data);
        },
        onComplete: (data) => {
          sendEvent('complete', data);
          res.end();
        },
        onError: (data) => {
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('Error in streaming narrative generation:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start narrative streaming',
        message: error.message,
      });
    } else {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message, stage: 'initialization' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/generation/storyboard
 * Generate storyboard scenes using configured AI adaptor
 */
router.post('/storyboard', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      selectedPersonaName,
      selectedPersonaDescription,
      selectedPersonaImage,
      productImageUrl,
      narrativeTheme,
      narrativeStructure,
      numberOfScenes = 5,
      videoDuration = '30s',
    } = req.body;

    if (
      !projectId ||
      !productDescription ||
      !targetAudience ||
      !selectedPersonaName ||
      !narrativeTheme
    ) {
      return res.status(400).json({
        error:
          'projectId, productDescription, targetAudience, selectedPersonaName, and narrativeTheme are required',
      });
    }

    console.log(`[Generation] Generating ${numberOfScenes} storyboard scenes for project ${projectId}`);

    const input = {
      productDescription,
      targetAudience,
      selectedPersonaName,
      selectedPersonaDescription,
      selectedPersonaImage,
      productImageUrl,
      narrativeTheme,
      narrativeStructure,
      numberOfScenes,
      videoDuration,
    };

    const result = await StoryboardGenerationService.generateStoryboardScenes(projectId, input, db, AIAdaptorResolver);

    res.json({
      success: true,
      data: result,
      message: 'Storyboard generated successfully',
    });
  } catch (error) {
    console.error('Error generating storyboard:', error);
    res.status(500).json({
      error: 'Failed to generate storyboard',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/generation/storyboard-stream
 * Generate storyboard with Server-Sent Events (SSE) streaming
 * Provides real-time updates as scenes and images are generated
 */
router.post('/storyboard-stream', async (req, res) => {
  try {
    const {
      projectId,
      productDescription,
      targetAudience,
      selectedPersonaName,
      selectedPersonaDescription,
      selectedPersonaImage,
      productImageUrl,
      narrativeTheme,
      narrativeStructure,
      numberOfScenes = 5,
      videoDuration = '30s',
    } = req.body;

    if (
      !projectId ||
      !productDescription ||
      !targetAudience ||
      !selectedPersonaName ||
      !narrativeTheme
    ) {
      return res.status(400).json({
        error:
          'projectId, productDescription, targetAudience, selectedPersonaName, and narrativeTheme are required',
      });
    }

    console.log(`[Generation] Starting streaming storyboard generation for project ${projectId}`);

    // Bypass compression for SSE
    req.shouldCompress = false;

    // Setup Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Content-Encoding', 'none'); // Disable compression

    // Ensure response is not buffered
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (eventType, data) => {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);

      // Explicitly flush if available
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Send initial start event
    sendEvent('start', {
      message: 'Starting storyboard generation',
      projectId,
      numberOfScenes,
    });

    const input = {
      productDescription,
      targetAudience,
      selectedPersonaName,
      selectedPersonaDescription,
      selectedPersonaImage,
      productImageUrl,
      narrativeTheme,
      narrativeStructure,
      numberOfScenes,
      videoDuration,
    };

    // Start progressive generation with callbacks
    await StoryboardStreamingService.generateStoryboardProgressive(
      projectId,
      input,
      db,
      AIAdaptorResolver,
      {
        onSceneParsed: (data) => {
          sendEvent('scene', data);
        },
        onImageGenerated: (data) => {
          sendEvent('image', data);
        },
        onProgress: (data) => {
          sendEvent('progress', data);
        },
        onComplete: (data) => {
          sendEvent('complete', data);
          res.end();
        },
        onError: (data) => {
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('Error in streaming storyboard generation:', error);

    // Try to send error event if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start storyboard streaming',
        message: error.message,
      });
    } else {
      // Send error event via SSE
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message, stage: 'initialization' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/generation/screenplay
 * Generate screenplay from storyboard using configured AI adaptor
 */
router.post('/screenplay', async (req, res) => {
  try {
    const {
      projectId,
      storyboardScenes,
      videoDuration = '30s',
      selectedPersonaName,
    } = req.body;

    if (!projectId || !storyboardScenes || storyboardScenes.length === 0) {
      return res.status(400).json({
        error: 'projectId and storyboardScenes array are required',
      });
    }

    console.log(`[Generation] Generating screenplay for project ${projectId}`);

    const input = {
      storyboardScenes,
      videoDuration,
      selectedPersonaName,
    };

    const result = await ScreenplayGenerationService.generateScreenplay(projectId, input, db, AIAdaptorResolver);

    res.json({
      success: true,
      data: result,
      message: 'Screenplay generated successfully',
    });
  } catch (error) {
    console.error('Error generating screenplay:', error);
    res.status(500).json({
      error: 'Failed to generate screenplay',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/generation/screenplay-stream
 * Generate screenplay with Server-Sent Events (SSE) streaming
 * Provides real-time updates as screenplay entries are generated
 */
router.post('/screenplay-stream', async (req, res) => {
  try {
    const {
      projectId,
      storyboardScenes,
      videoDuration = '30s',
      selectedPersonaName,
    } = req.body;

    if (!projectId || !storyboardScenes || storyboardScenes.length === 0) {
      return res.status(400).json({
        error: 'projectId and storyboardScenes array are required',
      });
    }

    console.log(`[Generation] Starting streaming screenplay generation for project ${projectId}`);

    // Bypass compression for SSE
    req.shouldCompress = false;

    // Setup Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');

    // Ensure response is not buffered
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (eventType, data) => {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(eventData);

      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Send initial start event
    sendEvent('start', {
      message: 'Starting screenplay generation',
      projectId,
      numberOfEntries: storyboardScenes.length,
    });

    const input = {
      storyboardScenes,
      videoDuration,
      selectedPersonaName,
    };

    // Start progressive generation with callbacks
    await ScreenplayStreamingService.generateScreenplayProgressive(
      projectId,
      input,
      db,
      AIAdaptorResolver,
      {
        onScreenplayEntryParsed: (data) => {
          sendEvent('entry', data);
        },
        onProgress: (data) => {
          sendEvent('progress', data);
        },
        onComplete: (data) => {
          sendEvent('complete', data);
          res.end();
        },
        onError: (data) => {
          sendEvent('error', data);
          res.end();
        },
      }
    );
  } catch (error) {
    console.error('Error in streaming screenplay generation:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start screenplay streaming',
        message: error.message,
      });
    } else {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message, stage: 'initialization' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/generation/video
 * Generate video using configured AI adaptor
 */
router.post('/video', async (req, res) => {
  try {
    const {
      projectId,
      screenplayEntries,
      storyboardScenes,
      videoDuration = '30s',
      aspectRatio = '16:9',
      resolution = '1080p',
    } = req.body;

    if (!projectId || !screenplayEntries || screenplayEntries.length === 0) {
      return res.status(400).json({
        error: 'projectId and screenplayEntries array are required',
      });
    }

    console.log(`[Generation] Generating video for project ${projectId}`);

    const input = {
      screenplayScenes: screenplayEntries,
      storyboardScenes,
      videoDuration,
      aspectRatio,
      resolution,
    };

    const result = await VideoGenerationService.generateVideos(projectId, input, db, AIAdaptorResolver);

    res.json({
      success: true,
      data: result.videos,
      message: 'Video generation started',
    });
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({
      error: 'Failed to generate video',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/generation/status/:executionId
 * Get status of generation execution
 */
router.get('/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    if (!executionId) {
      return res.status(400).json({
        error: 'executionId is required',
      });
    }

    // Get execution status from Firestore or cache
    const executionDoc = await db.collection('generation_executions').doc(executionId).get();

    if (!executionDoc.exists) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    const execution = executionDoc.data();

    res.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('Error getting execution status:', error);
    res.status(500).json({
      error: 'Failed to get execution status',
      message: error.message,
    });
  }
});

export default router;
