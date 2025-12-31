import jwt from 'jsonwebtoken';

// JWT configuration - must match api/auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'pixology-secret-key-change-in-production';

/**
 * Middleware to verify JWT token from Authorization header
 * Extracts user ID and email from the verified token
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify our JWT token
    const payload = jwt.verify(token, JWT_SECRET);

    req.userId = payload.sub;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export default verifyToken;
