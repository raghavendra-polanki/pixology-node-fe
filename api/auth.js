import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { saveUser, getUser, isUserAllowed } from './core/utils/firestoreUtils.js';

const router = express.Router();

// Initialize Google OAuth2 Client
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

// JWT configuration - 24 hours session
const JWT_SECRET = process.env.JWT_SECRET || 'pixology-secret-key-change-in-production';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * POST /api/auth/google
 * Verifies the Google JWT token and returns user info
 *
 * Request body:
 * {
 *   token: "Google JWT token from client"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   user: {
 *     id: "user_id",
 *     email: "user@example.com",
 *     name: "User Name",
 *     picture: "https://..."
 *   },
 *   authToken: "JWT token to store in client",
 *   expiresIn: 3600
 * }
 */
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    // Extract user information
    const userId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user is in the allowlist
    const allowed = await isUserAllowed(email);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Your email is not authorized to access Pixology. Please contact support.',
        email: email,
      });
    }

    // Save or update user in Firestore
    await saveUser(userId, {
      id: userId,
      email,
      name,
      picture,
      lastLogin: new Date(),
    });

    // Create our own JWT with 24-hour expiry
    const authToken = jwt.sign(
      {
        sub: userId,
        email,
        name,
        picture,
      },
      JWT_SECRET,
      { expiresIn: SESSION_DURATION }
    );

    // Set httpOnly cookie for added security (optional)
    res.cookie('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: SESSION_DURATION * 1000, // Convert to milliseconds
    });

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        picture,
      },
      authToken,
      expiresIn: SESSION_DURATION,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token verification failed',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verifies if the user is authenticated
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   success: true,
 *   authenticated: true,
 *   user: { id, email, name, picture }
 * }
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify our own JWT token
    const payload = jwt.verify(token, JWT_SECRET);

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Invalid or expired token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth token
 *
 * Response:
 * {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 */
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
