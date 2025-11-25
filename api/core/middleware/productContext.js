import { firestoreManager } from '../config/firestore.js';

/**
 * Product Context Middleware
 * Identifies the product from the request path and attaches:
 * - req.productId: 'storylab' or 'gamelab'
 * - req.db: Product-specific Firestore database instance
 *
 * Expected path format: /api/{productId}/*
 * Example: /api/storylab/projects -> productId = 'storylab'
 *          /api/gamelab/generation/themes -> productId = 'gamelab'
 */
export function productContext(req, res, next) {
  try {
    // Extract product ID from baseUrl: /api/{productId}
    // When mounted at app.use('/api/gamelab', ...), baseUrl = '/api/gamelab'
    const baseUrlParts = req.baseUrl.split('/').filter(part => part.length > 0);

    // baseUrl should be /api/{productId}
    if (baseUrlParts.length < 2) {
      return res.status(400).json({
        error: 'Invalid request path',
        message: 'Request path must include product identifier',
        expectedFormat: '/api/{productId}/*',
        validProducts: ['storylab', 'gamelab'],
        receivedBaseUrl: req.baseUrl,
      });
    }

    // Product ID is the second part: /api/{productId}
    const productId = baseUrlParts[1];

    // Validate product ID
    if (!['storylab', 'gamelab'].includes(productId)) {
      return res.status(400).json({
        error: 'Invalid product identifier',
        message: `Product '${productId}' is not recognized`,
        validProducts: ['storylab', 'gamelab'],
        receivedBaseUrl: req.baseUrl,
        receivedPath: req.path,
      });
    }

    // Get product-specific database
    try {
      const db = firestoreManager.getDatabase(productId);

      // Attach to request object
      req.productId = productId;
      req.db = db;

      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProductContext] ${req.method} ${req.path} -> product: ${productId}, database: ${firestoreManager.getDatabaseId(productId)}`);
      }

      next();
    } catch (dbError) {
      console.error(`[ProductContext] Database connection error for ${productId}:`, dbError.message);
      return res.status(500).json({
        error: 'Database configuration error',
        message: `Failed to connect to ${productId} database`,
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
      });
    }
  } catch (error) {
    console.error('[ProductContext] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process product context',
    });
  }
}

/**
 * Legacy Product Context Middleware
 * For backward compatibility with existing StoryLab routes that don't include /storylab prefix
 * Forces productId to 'storylab' for legacy routes like /api/projects, /api/generation, etc.
 */
export function legacyStoryLabContext(req, res, next) {
  try {
    const db = firestoreManager.getDatabase('storylab');

    req.productId = 'storylab';
    req.db = db;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[LegacyContext] ${req.method} ${req.path} -> product: storylab (legacy)`);
    }

    next();
  } catch (error) {
    console.error('[LegacyContext] Database connection error:', error.message);
    return res.status(500).json({
      error: 'Database configuration error',
      message: 'Failed to connect to StoryLab database',
    });
  }
}
