#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { VIDEO_GENERATION_RECIPE } from '../api/services/RecipeSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read service account path from environment variable, fallback to default
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../serviceAccountKey.json');

console.log(`Using service account: ${serviceAccountPath}`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function reseedVideoRecipe() {
  try {
    console.log('🗑️  Deleting old video recipe...');
    await db.collection('recipes').doc(VIDEO_GENERATION_RECIPE.id).delete();
    console.log('✅ Deleted: ' + VIDEO_GENERATION_RECIPE.id);

    console.log('\n🌱 Creating new video recipe...');
    await db.collection('recipes').doc(VIDEO_GENERATION_RECIPE.id).set(VIDEO_GENERATION_RECIPE);
    console.log('✅ Created: ' + VIDEO_GENERATION_RECIPE.id);

    console.log('\n🎉 Video recipe reseeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

reseedVideoRecipe();
