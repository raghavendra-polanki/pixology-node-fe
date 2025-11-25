/**
 * Real Personas API
 * Endpoints for managing real personas (global, available across all projects)
 */

import express from 'express';
import multer from 'multer';
import { db } from '../../../core/config/firestore.js';
import {
  getAllRealPersonas,
  getRealPersonaById,
  createRealPersona,
  updateRealPersona,
  deleteRealPersona,
  uploadRealPersonaImage,
  convertRealPersonaToPersonaData,
} from '../services/RealPersonaService.js';

const router = express.Router();

// Configure multer for image uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

/**
 * GET /api/real-personas
 * Get all real personas
 */
router.get('/', async (req, res) => {
  try {
    console.log('[API] /real-personas: Getting all real personas');

    const personas = await getAllRealPersonas(db);

    console.log(`[API] /real-personas: Found ${personas.length} real personas`);

    res.json({ personas });
  } catch (error) {
    console.error('[API] /real-personas: Error getting real personas:', error);
    res.status(500).json({
      error: 'Failed to get real personas',
      message: error.message,
    });
  }
});

/**
 * GET /api/real-personas/:id
 * Get a specific real persona
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[API] /real-personas/${id}: Getting real persona`);

    const persona = await getRealPersonaById(id, db);

    if (!persona) {
      return res.status(404).json({
        error: 'Real persona not found',
      });
    }

    res.json({ persona });
  } catch (error) {
    console.error(`[API] /real-personas/${req.params.id}: Error getting real persona:`, error);
    res.status(500).json({
      error: 'Failed to get real persona',
      message: error.message,
    });
  }
});

/**
 * GET /api/real-personas/:id/persona-data
 * Get real persona converted to PersonaData format
 */
router.get('/:id/persona-data', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageIndex } = req.query;

    console.log(`[API] /real-personas/${id}/persona-data: Converting to PersonaData format`);

    const realPersona = await getRealPersonaById(id, db);

    if (!realPersona) {
      return res.status(404).json({
        error: 'Real persona not found',
      });
    }

    const personaData = convertRealPersonaToPersonaData(
      realPersona,
      imageIndex ? parseInt(imageIndex) : 0
    );

    res.json({ personaData });
  } catch (error) {
    console.error(`[API] /real-personas/${req.params.id}/persona-data: Error converting:`, error);
    res.status(500).json({
      error: 'Failed to convert real persona',
      message: error.message,
    });
  }
});

/**
 * POST /api/real-personas/upload-image
 * Upload an image for a real persona
 */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { personaName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    if (!personaName) {
      return res.status(400).json({
        error: 'Persona name is required',
      });
    }

    console.log(`[API] /real-personas/upload-image: Uploading image for ${personaName}`);

    const imageUrl = await uploadRealPersonaImage(req.file.buffer, personaName);

    console.log(`[API] /real-personas/upload-image: Image uploaded successfully`);

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error('[API] /real-personas/upload-image: Error uploading image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      message: error.message,
    });
  }
});

/**
 * POST /api/real-personas
 * Create a new real persona
 */
router.post('/', async (req, res) => {
  try {
    const { personaData } = req.body;

    if (!personaData) {
      return res.status(400).json({
        error: 'personaData is required',
      });
    }

    console.log(`[API] /real-personas: Creating new real persona: ${personaData.name}`);

    const persona = await createRealPersona(personaData, db);

    console.log(`[API] /real-personas: Real persona created: ${persona.id}`);

    res.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error('[API] /real-personas: Error creating real persona:', error);
    res.status(500).json({
      error: 'Failed to create real persona',
      message: error.message,
    });
  }
});

/**
 * PUT /api/real-personas/:id
 * Update a real persona
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({
        error: 'updates are required',
      });
    }

    console.log(`[API] /real-personas/${id}: Updating real persona`);

    const persona = await updateRealPersona(id, updates, db);

    console.log(`[API] /real-personas/${id}: Real persona updated`);

    res.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error(`[API] /real-personas/${req.params.id}: Error updating real persona:`, error);
    res.status(500).json({
      error: 'Failed to update real persona',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/real-personas/:id
 * Delete a real persona
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[API] /real-personas/${id}: Deleting real persona`);

    await deleteRealPersona(id, db);

    console.log(`[API] /real-personas/${id}: Real persona deleted`);

    res.json({
      success: true,
      message: 'Real persona deleted',
    });
  } catch (error) {
    console.error(`[API] /real-personas/${req.params.id}: Error deleting real persona:`, error);
    res.status(500).json({
      error: 'Failed to delete real persona',
      message: error.message,
    });
  }
});

export default router;
