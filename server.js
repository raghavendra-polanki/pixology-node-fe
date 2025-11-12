import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Start of Environment Variable Loading ---
// Load environment variables from a file based on NODE_ENV.
// This is the backward-compatible method for older Node.js versions.
// PM2 sets NODE_ENV from the --env flag (e.g., 'production').
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.join(__dirname, envFile);

dotenv.config({ path: envPath });

console.log(`✅ Attempting to load environment variables from: ${envPath}`);
// --- End of Environment Variable Loading ---

// --- Start of Firestore Credentials Configuration ---
// GOOGLE_APPLICATION_CREDENTIALS environment variable MUST be set
// This ensures the Firebase Admin SDK can authenticate correctly.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.error('   Set it in .env or your environment to point to the service account key file');
  console.error('   Example: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKeyGoogle.json');
  process.exit(1);
} else {
  console.log(`✓ Using GOOGLE_APPLICATION_CREDENTIALS from environment: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
}
// --- End of Firestore Credentials Configuration ---

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import authRouter from './api/auth.js';
import allowlistRouter from './api/allowlist.js';
import projectsRouter from './api/projects.js';
import personasRouter from './api/personas.js';
import recipesRouter from './api/recipes.js';
import videosRouter from './api/videos.js';

// New AI Adaptor Architecture routes
import adaptorsRouter from './api/adaptors.js';
import promptsRouter from './api/prompts.js';
import usageRouter from './api/usage.js';
import generationRouter from './api/generation.js';

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

// Authentication API routes
app.use('/api/auth', authRouter);

// Allowlist management routes
app.use('/api/allowlist', allowlistRouter);

// Projects API routes
app.use('/api/projects', projectsRouter);

// Personas generation API routes
app.use('/api/personas', personasRouter);

// Recipe management API routes
app.use('/api/recipes', recipesRouter);

// Video generation API routes
app.use('/api/videos', videosRouter);

// AI Adaptor management API routes
app.use('/api/adaptors', adaptorsRouter);

// Prompt template management API routes
app.use('/api/prompts', promptsRouter);

// Usage tracking and analytics API routes
app.use('/api/usage', usageRouter);

// V2 Generation API routes (adaptor-aware generation)
app.use('/api/generation', generationRouter);

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
