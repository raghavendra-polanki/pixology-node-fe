import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { searchUsers, getUser } from '../utils/firestoreUtils.js';

const router = express.Router();

// Initialize Google OAuth2 Client
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

/**
 * Middleware to verify Google token from Authorization header
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    req.userId = payload.sub;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * GET /api/users/search
 * Search users by email or name (for share dialog auto-suggest)
 * Query params: q (search query), limit (optional, default 10)
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        users: [],
        message: 'Query must be at least 2 characters',
      });
    }

    const users = await searchUsers(q, parseInt(limit) || 10);

    // Filter out the current user from results
    const filteredUsers = users.filter((user) => user.id !== req.userId);

    return res.status(200).json({
      success: true,
      users: filteredUsers,
      count: filteredUsers.length,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search users',
    });
  }
});

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id || req.userId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

export default router;
