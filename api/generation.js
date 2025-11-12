/**
 * Generation API
 * Exposes V2 generation services that use AI adaptor architecture
 * Replaces recipe-based generation with adaptor-aware services
 */

import express from 'express';
import { db } from './config/firestore.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const PersonaGenerationServiceV2 = require('./services/PersonaGenerationServiceV2.cjs');
const NarrativeGenerationServiceV2 = require('./services/NarrativeGenerationServiceV2.cjs');
const StoryboardGenerationServiceV2 = require('./services/StoryboardGenerationServiceV2.cjs');
const ScreenplayGenerationServiceV2 = require('./services/ScreenplayGenerationServiceV2.cjs');
const VideoGenerationServiceV2 = require('./services/VideoGenerationServiceV2.cjs');

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

    const result = await PersonaGenerationServiceV2.generatePersonas(projectId, input, db);

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

    const result = await NarrativeGenerationServiceV2.generateNarratives(projectId, input, db);

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
      narrativeTheme,
      narrativeStructure,
      numberOfScenes,
      videoDuration,
    };

    const result = await StoryboardGenerationServiceV2.generateStoryboardScenes(projectId, input, db);

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

    const result = await ScreenplayGenerationServiceV2.generateScreenplay(projectId, input, db);

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
      screenplayEntries,
      storyboardScenes,
      videoDuration,
      aspectRatio,
      resolution,
    };

    const result = await VideoGenerationServiceV2.generateVideos(projectId, input, db);

    res.json({
      success: true,
      data: result,
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
