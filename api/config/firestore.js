import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Support two methods for service account authentication:
// 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (file path)
// 2. Direct JSON service account (for containerized environments)
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

let credential;

try {
  if (serviceAccountJson) {
    // Parse JSON string from environment variable
    console.log('✓ Using GOOGLE_SERVICE_ACCOUNT_JSON from environment');
    const serviceAccount = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(serviceAccount);
  } else if (serviceAccountPath) {
    // Read and parse service account from file path
    console.log(`✓ Reading service account from: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Use application default credentials (for deployment environments with proper IAM roles)
    console.log('✓ Using Application Default Credentials (ADC)');
    credential = admin.credential.applicationDefault();
  }
} catch (error) {
  console.error('❌ Error loading service account credentials:', error.message);
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
  console.log('✓ Firebase Admin SDK initialized successfully');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, continue
    console.log('✓ Firebase app already initialized');
  } else {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

// Get Firestore instance
// NOTE: To use pixology-v2 database, you need to either:
// 1. Upgrade firebase-admin to v11+ which supports database IDs: admin.firestore('pixology-v2')
// 2. Configure your service account JSON to use pixology-v2 as the default database
// 3. Use gcloud commands: gcloud config set firestore/database pixology-v2
//
// For now, using default database from service account configuration
const db = admin.firestore();

console.log(`✓ Using Firestore (default database from service account config)`);

// Enable offline persistence for development
if (process.env.NODE_ENV === 'development') {
  db.settings({
    ignoreUndefinedProperties: true,
  });
}

export { db, admin };
