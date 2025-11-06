import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Read service account path from environment variable, fallback to default
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../../serviceAccountKey.json');

console.log(`Firebase using service account: ${serviceAccountPath}`);

// Check if service account key exists
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
  console.log('✓ Firebase Admin SDK initialized successfully');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, continue
    console.log('Firebase app already initialized');
  } else {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

// Get Firestore instance
const db = admin.firestore();

// Enable offline persistence for development
if (process.env.NODE_ENV === 'development') {
  db.settings({
    ignoreUndefinedProperties: true,
  });
}

export { db, admin };
