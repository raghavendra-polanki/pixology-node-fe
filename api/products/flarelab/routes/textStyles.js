/**
 * Text Styles API Routes
 * Endpoints for managing text style presets in the Style Library
 */

import express from 'express';
import { verifyToken } from '../../../core/middleware/authMiddleware.js';

const router = express.Router();

/**
 * Helper to resolve inherited properties
 * If a style has a parentId, merge parent properties with child overrides
 */
const resolveInheritance = async (style, db) => {
  if (!style.parentId) {
    return style;
  }

  try {
    const parentDoc = await db.collection('text_styles').doc(style.parentId).get();
    if (!parentDoc.exists) {
      return style;
    }

    const parentStyle = parentDoc.data();
    // Child properties override parent properties
    return {
      ...parentStyle,
      ...style,
      // Preserve child's identity
      id: style.id,
      name: style.name,
      parentId: style.parentId,
      isSystem: style.isSystem,
      createdAt: style.createdAt,
      updatedAt: style.updatedAt,
      createdBy: style.createdBy,
    };
  } catch (error) {
    console.error('Error resolving inheritance:', error);
    return style;
  }
};

/**
 * GET /api/flarelab/text-styles
 * Get all text styles (system + user-created)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const { category, favorites, search, limit } = req.query;

    let query = db.collection('text_styles');

    // Filter by category if specified (single field filter is fine)
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    // NOTE: We do NOT filter favorites in Firestore query to avoid requiring composite index
    // Instead, we filter in-memory after fetching

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    let styles = [];
    for (const doc of snapshot.docs) {
      const style = { id: doc.id, ...doc.data() };
      // Resolve inheritance for each style
      const resolvedStyle = await resolveInheritance(style, db);
      styles.push(resolvedStyle);
    }

    // Filter favorites in-memory (avoids Firestore composite index requirement)
    if (favorites === 'true') {
      styles = styles.filter(s => s.isFavorite === true);
    }

    // Filter by search term if specified (case-insensitive name search)
    if (search) {
      const searchLower = search.toLowerCase();
      styles = styles.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort: favorites first, then system, then by name
    styles.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Apply limit if specified
    if (limit && !isNaN(parseInt(limit))) {
      styles = styles.slice(0, parseInt(limit));
    }

    res.json({ styles, total: styles.length });
  } catch (error) {
    console.error('Error fetching text styles:', error);
    res.status(500).json({ error: 'Failed to fetch text styles' });
  }
});

/**
 * GET /api/flarelab/text-styles/:id
 * Get a single text style by ID
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const doc = await db.collection('text_styles').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Text style not found' });
    }

    const style = { id: doc.id, ...doc.data() };
    const resolvedStyle = await resolveInheritance(style, db);

    res.json({ style: resolvedStyle });
  } catch (error) {
    console.error('Error fetching text style:', error);
    res.status(500).json({ error: 'Failed to fetch text style' });
  }
});

/**
 * POST /api/flarelab/text-styles
 * Create a new text style
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const styleData = req.body;

    // Validate required fields
    if (!styleData.name) {
      return res.status(400).json({ error: 'Style name is required' });
    }

    // Create the new style document
    const newStyle = {
      name: styleData.name,
      category: styleData.category || 'custom',
      description: styleData.description || '',
      parentId: styleData.parentId || null,
      isSystem: false, // User-created styles are never system styles
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      // Typography
      fontFamily: styleData.fontFamily || 'Bebas Neue',
      fontWeight: styleData.fontWeight || 700,
      fontSize: styleData.fontSize || 72,
      letterSpacing: styleData.letterSpacing || 0,
      textTransform: styleData.textTransform || 'uppercase',
      // Fill
      fill: styleData.fill || { type: 'solid', color: '#FFFFFF' },
      // Stroke (optional)
      stroke: styleData.stroke || null,
      // Shadows
      shadows: styleData.shadows || [],
      // Glow (optional)
      glow: styleData.glow || null,
      // Opacity
      opacity: styleData.opacity ?? 100,
    };

    const docRef = await db.collection('text_styles').add(newStyle);
    const createdStyle = { id: docRef.id, ...newStyle };

    res.status(201).json({ style: createdStyle });
  } catch (error) {
    console.error('Error creating text style:', error);
    res.status(500).json({ error: 'Failed to create text style' });
  }
});

/**
 * PUT /api/flarelab/text-styles/:id
 * Update an existing text style
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const updateData = req.body;

    const docRef = db.collection('text_styles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Text style not found' });
    }

    const existingStyle = doc.data();

    // Prevent editing system styles (except favorites)
    if (existingStyle.isSystem && Object.keys(updateData).some(k => k !== 'isFavorite')) {
      return res.status(403).json({ error: 'System styles cannot be modified. Duplicate to create your own version.' });
    }

    // Update the style
    const updatedData = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(updatedData);

    const updatedDoc = await docRef.get();
    const updatedStyle = { id: updatedDoc.id, ...updatedDoc.data() };

    res.json({ style: updatedStyle });
  } catch (error) {
    console.error('Error updating text style:', error);
    res.status(500).json({ error: 'Failed to update text style' });
  }
});

/**
 * DELETE /api/flarelab/text-styles/:id
 * Delete a text style
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const docRef = db.collection('text_styles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Text style not found' });
    }

    const style = doc.data();

    // Prevent deleting system styles
    if (style.isSystem) {
      return res.status(403).json({ error: 'System styles cannot be deleted' });
    }

    await docRef.delete();

    res.json({ success: true, message: 'Text style deleted' });
  } catch (error) {
    console.error('Error deleting text style:', error);
    res.status(500).json({ error: 'Failed to delete text style' });
  }
});

/**
 * POST /api/flarelab/text-styles/:id/duplicate
 * Duplicate a text style (works for both system and user styles)
 */
router.post('/:id/duplicate', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    const doc = await db.collection('text_styles').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Text style not found' });
    }

    const originalStyle = doc.data();

    // Create duplicate with new name
    const duplicatedStyle = {
      ...originalStyle,
      name: name || `${originalStyle.name} Copy`,
      isSystem: false,
      isFavorite: false,
      parentId: originalStyle.isSystem ? id : originalStyle.parentId, // Inherit from original if it's a system style
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    const docRef = await db.collection('text_styles').add(duplicatedStyle);
    const createdStyle = { id: docRef.id, ...duplicatedStyle };

    res.status(201).json({ style: createdStyle });
  } catch (error) {
    console.error('Error duplicating text style:', error);
    res.status(500).json({ error: 'Failed to duplicate text style' });
  }
});

/**
 * POST /api/flarelab/text-styles/:id/favorite
 * Toggle favorite status for a text style
 */
router.post('/:id/favorite', verifyToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const docRef = db.collection('text_styles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Text style not found' });
    }

    const style = doc.data();
    const newFavoriteStatus = !style.isFavorite;

    await docRef.update({
      isFavorite: newFavoriteStatus,
      updatedAt: new Date(),
    });

    res.json({ success: true, isFavorite: newFavoriteStatus });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

export default router;
