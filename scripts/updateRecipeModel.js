#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

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

async function updateRecipe() {
  try {
    console.log('🔄 Updating recipe model to gemini-2.5-flash-image...\n');

    // Update the specific node's AI model
    await db.collection('recipes').doc('recipe_persona_generation_v1').update({
      'nodes.1.aiModel.provider': 'gemini',
      'nodes.1.aiModel.modelName': 'gemini-2.5-flash-image',
      'metadata.updatedAt': new Date(),
    });

    console.log('✅ Recipe updated successfully!');
    console.log('   Model changed from: dall-e-3');
    console.log('   Model changed to: gemini-2.5-flash-image');
    console.log('   Provider changed to: gemini\n');

    // Verify the update
    const doc = await db.collection('recipes').doc('recipe_persona_generation_v1').get();
    if (doc.exists) {
      const node = doc.data().nodes[1];
      console.log('✨ Verified:');
      console.log('   Node:', node.name);
      console.log('   Provider:', node.aiModel.provider);
      console.log('   Model:', node.aiModel.modelName);
    }

    await admin.app().delete();
  } catch (error) {
    console.error('❌ Error updating recipe:', error.message);
    process.exit(1);
  }
}

updateRecipe();
