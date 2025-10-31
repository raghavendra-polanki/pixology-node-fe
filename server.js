import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Start of Firestore Credentials Fix ---
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable to point to the service account key.
// This ensures the Firebase Admin SDK can authenticate correctly.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'serviceAccountKey.json');
}
// --- End of Firestore Credentials Fix ---

// Load environment variables from .env.local or .env
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config(); // Fallback to .env

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import authRouter from './api/auth.js';
import allowlistRouter from './api/allowlist.js';
import projectsRouter from './api/projects.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:3000",      // Backend
        "http://localhost:8080",      // Vite dev server
        "https://accounts.google.com/gsi/", // GSI connect endpoint
        "https://www.googleapis.com", // For token verification
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
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

// SPA fallback - serve index.html for all non-static routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📦 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
