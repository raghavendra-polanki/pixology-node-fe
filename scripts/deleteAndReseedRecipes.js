#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Require service account path from environment variable
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.error('   Required for Firestore authentication');
  process.exit(1);
}

console.log(`✓ Using service account: ${serviceAccountPath}`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function deleteAndReseed() {
  try {
    console.log('🗑️  Deleting existing recipe...');
    await db.collection('recipes').doc('recipe_persona_generation_v1').delete();
    console.log('✅ Recipe deleted successfully!\n');

    console.log('🌱 Reseeding recipe with updated model...');
    const { PERSONA_GENERATION_RECIPE } = await import('./seedRecipes.js');
    // Actually, let's just call the seeding script again
    await admin.app().delete();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAndReseed();
