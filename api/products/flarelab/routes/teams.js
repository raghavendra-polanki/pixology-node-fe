/**
 * Teams API Routes
 * Endpoints for managing sports teams and players
 */

import express from 'express';
import admin from 'firebase-admin';
import multer from 'multer';
import { uploadTeamPlayerAsset } from '../../../core/services/gcsService.js';
import { verifyToken } from '../../../core/middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/teams/sports
 * Get all available sports
 */
router.get('/sports', verifyToken, async (req, res) => {
  try {
    // Use req.db provided by productContext middleware
    const db = req.db;

    // Get hockey metadata from Firestore
    const hockeyRef = db.collection('sports_teams').doc('hockey');
    const hockeyDoc = await hockeyRef.get();
    const hockeyData = hockeyDoc.exists ? hockeyDoc.data() : null;

    // Get actual team count and total players
    let teamsCount = hockeyData?.teamsCount || 0;
    let playersCount = 0;

    // If we have the index, count players from there
    if (hockeyData?.teams) {
      // Get actual player counts from teams collection
      const teamsSnapshot = await db.collection('sports_teams/hockey/teams').get();
      teamsCount = teamsSnapshot.size;

      teamsSnapshot.forEach((doc) => {
        const teamData = doc.data();
        playersCount += teamData.players?.length || 0;
      });
    }

    const sports = [
      {
        id: 'hockey',
        name: 'Hockey',
        icon: '🏒',
        teamsCount,
        playersCount,
        league: hockeyData?.league || 'NHL',
        season: hockeyData?.season || '2024-2025',
      },
    ];

    res.json({ sports });
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ error: 'Failed to fetch sports' });
  }
});

/**
 * GET /api/teams/:sport
 * Get all teams for a specific sport
 */
router.get('/:sport', verifyToken, async (req, res) => {
  try {
    const { sport } = req.params;
    const db = req.db;

    // Query teams collection
    const teamsRef = db.collection(`sports_teams/${sport}/teams`);
    const snapshot = await teamsRef.get();

    if (snapshot.empty) {
      return res.json({ teams: [] });
    }

    const teams = [];
    snapshot.forEach((doc) => {
      teams.push(doc.data());
    });

    res.json({ teams });
  } catch (error) {
    console.error(`Error fetching teams for sport ${req.params.sport}:`, error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * GET /api/teams/:sport/:teamId
 * Get a specific team with all players
 */
router.get('/:sport/:teamId', verifyToken, async (req, res) => {
  try {
    const { sport, teamId } = req.params;
    const db = req.db;

    // Query all teams and find the one with matching teamId
    const teamsRef = db.collection(`sports_teams/${sport}/teams`);
    const snapshot = await teamsRef.get();

    let team = null;
    snapshot.forEach((doc) => {
      const teamData = doc.data();
      if (teamData.teamId === teamId) {
        team = teamData;
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team });
  } catch (error) {
    console.error(`Error fetching team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * GET /api/teams/:sport/:teamId/players
 * Get all players for a specific team
 */
router.get('/:sport/:teamId/players', verifyToken, async (req, res) => {
  try {
    const { sport, teamId } = req.params;
    const db = req.db;

    // Query all teams and find the one with matching teamId
    const teamsRef = db.collection(`sports_teams/${sport}/teams`);
    const snapshot = await teamsRef.get();

    let team = null;
    snapshot.forEach((doc) => {
      const teamData = doc.data();
      if (teamData.teamId === teamId) {
        team = teamData;
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ players: team.players || [] });
  } catch (error) {
    console.error(`Error fetching players for team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * PUT /api/teams/:sport/:teamId
 * Update a team's data
 */
router.put('/:sport/:teamId', verifyToken, async (req, res) => {
  try {
    const { sport, teamId } = req.params;
    const updateData = req.body;
    const db = req.db;

    // Find the team document
    const teamsRef = db.collection(`sports_teams/${sport}/teams`);
    const snapshot = await teamsRef.where('teamId', '==', teamId).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Update the team document
    const docRef = snapshot.docs[0].ref;
    await docRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    // Get the updated team
    const updatedDoc = await docRef.get();
    const updatedTeam = updatedDoc.data();

    console.log(`Updated team ${teamId}:`, updatedTeam);
    res.json({ team: updatedTeam });
  } catch (error) {
    console.error(`Error updating team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to update team', details: error.message });
  }
});

/**
 * POST /api/teams/upload-asset
 * Upload team logo or player headshot to GCS
 * Body (multipart/form-data):
 *   - image: File
 *   - assetType: 'team-logo' | 'player-headshot'
 *   - entityId: string (teamId or playerId)
 *   - oldImageUrl: string (optional, for cleanup)
 */
router.post('/upload-asset', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { assetType, entityId, oldImageUrl } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!assetType || !entityId) {
      return res.status(400).json({ error: 'Missing assetType or entityId' });
    }

    // Validate assetType
    if (!['team-logo', 'player-headshot'].includes(assetType)) {
      return res.status(400).json({ error: 'Invalid assetType. Must be team-logo or player-headshot' });
    }

    // Get file extension from mimetype
    const extensionMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const fileExtension = extensionMap[imageFile.mimetype] || 'png';

    // Upload to GCS
    const publicUrl = await uploadTeamPlayerAsset(
      imageFile.buffer,
      assetType,
      entityId,
      fileExtension,
      oldImageUrl
    );

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({
      error: 'Failed to upload asset',
      details: error.message,
      bucket: process.env.GCS_BUCKET_NAME || 'pixology-personas'
    });
  }
});

export default router;
