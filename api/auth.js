import express from 'express';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();

// Initialize Google OAuth2 Client
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

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

    // TODO: Save user to database if doesn't exist
    // Example:
    // const user = await User.findOrCreate({
    //   email,
    //   userId,
    //   name,
    //   picture,
    // });

    // Create a session token (you can use JWT here)
    // For now, we'll return the Google token itself
    // In production, create your own JWT token
    const authToken = token;
    const expiresIn = 3600; // 1 hour

    // Set httpOnly cookie for added security (optional)
    res.cookie('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: expiresIn * 1000, // Convert to milliseconds
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
      expiresIn,
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

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

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
