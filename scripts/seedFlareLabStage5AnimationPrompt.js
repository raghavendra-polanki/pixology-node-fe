#!/usr/bin/env node

/**
 * Seed GameLab Stage 5 Animation Prompt Templates
 * Seeds both the screenplay (textGeneration) and video (videoGeneration) prompts
 * Run: node scripts/seedGameLabStage5AnimationPrompt.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import admin from 'firebase-admin';
import { STAGE_5_ANIMATION_TEMPLATE } from '../api/products/flarelab/prompts/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
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
const flarelabDatabaseId = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
db.settings({ databaseId: flarelabDatabaseId });

async function seedStage5AnimationPrompt() {
  try {
    console.log('\n🎬 Seeding FlareLab Stage 5 Animation Prompts...\n');
    console.log(`Database: ${flarelabDatabaseId}`);
    console.log(`Template ID: ${STAGE_5_ANIMATION_TEMPLATE.id}`);
    console.log(`Stage Type: ${STAGE_5_ANIMATION_TEMPLATE.stageType}`);
    console.log(`Prompts count: ${STAGE_5_ANIMATION_TEMPLATE.prompts.length}`);

    // List prompts
    console.log('\nPrompts:');
    STAGE_5_ANIMATION_TEMPLATE.prompts.forEach((prompt, idx) => {
      console.log(`  ${idx + 1}. [${prompt.capability}] ${prompt.name}`);
      console.log(`     ID: ${prompt.id}`);
      console.log(`     Model: ${prompt.modelConfig?.adaptorId || 'default'}/${prompt.modelConfig?.modelId || 'default'}`);
    });

    // Check if template exists
    const existingDoc = await db.collection('prompt_templates').doc(STAGE_5_ANIMATION_TEMPLATE.id).get();

    if (existingDoc.exists) {
      console.log('\n⚠️  Template already exists - updating...');
      await db.collection('prompt_templates').doc(STAGE_5_ANIMATION_TEMPLATE.id).set(
        {
          ...STAGE_5_ANIMATION_TEMPLATE,
          updatedAt: new Date().toISOString(),
        },
        { merge: false }
      );
      console.log('✅ Template updated!');
    } else {
      console.log('\n📝 Creating new template...');
      await db.collection('prompt_templates').doc(STAGE_5_ANIMATION_TEMPLATE.id).set({
        ...STAGE_5_ANIMATION_TEMPLATE,
        createdAt: new Date().toISOString(),
      });
      console.log('✅ Template created!');
    }

    // Verify
    const verifyDoc = await db.collection('prompt_templates').doc(STAGE_5_ANIMATION_TEMPLATE.id).get();
    if (verifyDoc.exists) {
      const data = verifyDoc.data();
      console.log('\n🔍 Verification:');
      console.log(`   Template ID: ${data.id}`);
      console.log(`   Stage Type: ${data.stageType}`);
      console.log(`   Prompts: ${data.prompts?.length || 0}`);
      data.prompts?.forEach((p, i) => {
        console.log(`     ${i + 1}. [${p.capability}] ${p.id}`);
      });
    }

    console.log('\n✨ Stage 5 Animation prompt seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding Stage 5 Animation prompt:', error);
    process.exit(1);
  }
}

seedStage5AnimationPrompt();
