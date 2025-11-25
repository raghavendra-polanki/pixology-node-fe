// --- CRITICAL: Load environment variables FIRST before any imports ---
// ES6 imports are hoisted, so we need to load env vars before importing modules
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from a file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
const envPath = path.join(__dirname, envFile);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Error loading env file from ${envPath}:`, result.error.message);
} else {
  console.log(`✅ Loaded environment variables from: ${envPath}`);
}

// Debug: Check if database vars are loaded
console.log(`DEBUG: STORYLAB_DATABASE_ID = ${process.env.STORYLAB_DATABASE_ID}`);
console.log(`DEBUG: FLAIRLAB_DATABASE_ID = ${process.env.FLAIRLAB_DATABASE_ID}`);

// Validate critical environment variables
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON must be set');
  console.error('   Example: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKeyGoogle.json');
  process.exit(1);
}

if (!process.env.STORYLAB_DATABASE_ID || !process.env.FLAIRLAB_DATABASE_ID) {
  console.error('❌ Database environment variables are required:');
  console.error('   - STORYLAB_DATABASE_ID');
  console.error('   - FLAIRLAB_DATABASE_ID');
  process.exit(1);
}

console.log(`✓ StoryLab Database: ${process.env.STORYLAB_DATABASE_ID}`);
console.log(`✓ FlairLab Database: ${process.env.FLAIRLAB_DATABASE_ID}`);

// --- Now safe to import other modules ---
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';

// Shared routes (product-agnostic)
import authRouter from './api/auth.js';
import allowlistRouter from './api/allowlist.js';
import adaptorsRouter from './api/adaptors.js';

// Product context middleware
import { productContext, legacyStoryLabContext } from './api/core/middleware/productContext.js';

// Product-specific route modules
import storylabRoutes from './api/products/storylab/routes/index.js';
import flairlabRoutes from './api/products/flairlab/routes/index.js';

// Individual StoryLab routers for legacy routes (direct mounting)
import projectsRouter from './api/products/storylab/routes/projects.js';
import generationRouter from './api/products/storylab/routes/generation.js';
import storyboardRouter from './api/products/storylab/routes/storyboard.js';
import promptsRouter from './api/products/storylab/routes/prompts.js';
import videosRouter from './api/products/storylab/routes/videos.js';
import realPersonasRouter from './api/products/storylab/routes/realPersonas.js';

// AI Adaptor initialization
import { initializeAdaptors } from './api/core/adaptors/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware - Increase limit to handle large persona image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware - Allow frontend dev server and production domains
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',  // Production build
    'http://localhost:8080',  // Vite dev server
    'https://pixology.ai',
    'https://www.pixology.ai',
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: [
        "'self'",
        "https://accounts.google.com/gsi/client", // Specific GSI client script
      ],
      imgSrc: ["'self'", "data:", "https:", "https://storage.googleapis.com"],
      connectSrc: [
        "'self'",
        "http://localhost:3000",      // Backend
        "http://localhost:8080",      // Vite dev server
        "https://accounts.google.com/gsi/", // GSI connect endpoint
        "https://www.googleapis.com", // For token verification
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://storage.googleapis.com"],
      frameSrc: [
        "https://accounts.google.com",
      ],
      // This is the key fix: Allow Google's auth iframe to be embedded.
      frameAncestors: [
        "'self'",
        "https://accounts.google.com",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
  // This is the key fix for the prevailing issue.
  // The default COOP policy ('same-origin') blocks the Google OAuth popup from communicating with your app.
  // 'same-origin-allow-popups' allows the popup to work correctly.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

}));

// Compression middleware
app.use(compression());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    // Cache static assets aggressively
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Don't cache HTML
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize AI adaptors at startup
console.log('[Server] Initializing AI adaptors...');
try {
  initializeAdaptors();
} catch (error) {
  console.error('[Server] Failed to initialize adaptors:', error.message);
  console.error('[Server] Continuing with server startup - generation endpoints may not work');
}

// ===== Shared Routes (Product-Agnostic) =====
// Authentication API routes
app.use('/api/auth', authRouter);

// Allowlist management routes
app.use('/api/allowlist', allowlistRouter);

// AI Adaptor management API routes
app.use('/api/adaptors', adaptorsRouter);

// ===== Product-Scoped Routes =====
// StoryLab routes (with product context middleware)
app.use('/api/storylab', productContext, storylabRoutes);

// FlairLab routes (with product context middleware)
app.use('/api/flairlab', productContext, flairlabRoutes);

// ===== Legacy Routes (Backward Compatibility) =====
// Map legacy routes to StoryLab for existing clients
// These routes automatically use the StoryLab database
// Mount individual routers directly to avoid double-pathing
app.use('/api/projects', legacyStoryLabContext, projectsRouter);
app.use('/api/generation', legacyStoryLabContext, generationRouter);
app.use('/api/storyboard', legacyStoryLabContext, storyboardRouter);
app.use('/api/prompts', legacyStoryLabContext, promptsRouter);
app.use('/api/videos', legacyStoryLabContext, videosRouter);
app.use('/api/real-personas', legacyStoryLabContext, realPersonasRouter);

// SPA fallback - serve index.html for all non-static routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📦 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Set socket timeout to 5 minutes (300 seconds) to allow long-running recipe executions
// This prevents "504 Gateway Timeout" errors on operations like storyboard generation
server.setTimeout(300000); // 300 seconds = 5 minutes
server.keepAliveTimeout = 310000; // Keep-alive must be higher than socket timeout (310 seconds)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
