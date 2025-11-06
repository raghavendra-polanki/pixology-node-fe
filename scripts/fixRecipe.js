#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { PERSONA_GENERATION_RECIPE } from '../api/services/RecipeSeedData.js';

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

async function fixRecipe() {
  try {
    console.log('🗑️  Deleting recipe with old input mappings...');
    await db.collection('recipes').doc('recipe_persona_generation_v1').delete();
    console.log('✅ Deleted\n');

    console.log('🌱 Reseeding recipe with corrected input mappings...');
    await db.collection('recipes').doc(PERSONA_GENERATION_RECIPE.id).set(PERSONA_GENERATION_RECIPE);
    console.log('✅ Recipe reseeded successfully!\n');

    // Verify
    const doc = await db.collection('recipes').doc('recipe_persona_generation_v1').get();
    if (doc.exists) {
      const data = doc.data();
      console.log('✨ Verification:');
      console.log('   Nodes type:', Array.isArray(data.nodes) ? 'Array ✓' : 'Object ✗');
      console.log('   Nodes count:', data.nodes.length);
      console.log('   Node 1 outputKey:', data.nodes[0].outputKey);
      console.log('   Node 2 inputMapping:', JSON.stringify(data.nodes[1].inputMapping));
      console.log('   Node 3 inputMapping:', JSON.stringify(data.nodes[2].inputMapping));
    }

    await admin.app().delete();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixRecipe();
