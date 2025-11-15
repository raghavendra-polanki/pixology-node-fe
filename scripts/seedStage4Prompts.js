#!/usr/bin/env node

/**
 * Seed Stage 4 Storyboard Prompt Templates Script
 * Populates Firestore with Stage 4 storyboard prompt templates only
 * Run: node scripts/seedStage4Prompts.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { STAGE_4_STORYBOARD_TEMPLATE } from '../api/services/PromptTemplateSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
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
db.settings({ databaseId: 'pixology-v2' });

async function seedStage4Prompts() {
  try {
    console.log('🌱 Starting Stage 4 storyboard prompt template seeding...\n');
    console.log('Database: pixology-v2');
    console.log('This will create/update prompt templates for Stage 4 only');
    console.log(`Document ID: ${STAGE_4_STORYBOARD_TEMPLATE.id}\n`);

    const template = STAGE_4_STORYBOARD_TEMPLATE;

    console.log(`Processing: ${template.stageType}`);
    console.log(`  Prompts to seed: ${template.prompts.length}`);

    // Check if template already exists
    const existingDoc = await db.collection('prompt_templates').doc(template.id).get();

    if (existingDoc.exists) {
      console.log('  ⚠️  Already exists - updating...');

      // Update existing template
      await db.collection('prompt_templates').doc(template.id).set(
        {
          ...template,
          updatedAt: new Date().toISOString(),
        },
        { merge: false } // Replace entire document
      );

      console.log(`  ✅ Updated successfully!`);
    } else {
      console.log('  📝 Creating new template...');

      // Create new template
      await db.collection('prompt_templates').doc(template.id).set(template);

      console.log(`  ✅ Created successfully!`);
    }

    // Verify and list prompts
    const doc = await db.collection('prompt_templates').doc(template.id).get();
    const data = doc.data();

    console.log(`\n  📋 Prompts in ${template.id}:`);
    (data.prompts || []).forEach((prompt, idx) => {
      console.log(`     ${idx + 1}. [${prompt.capability}] ${prompt.name}`);
      if (prompt.description) {
        console.log(`        ${prompt.description}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Stage 4 storyboard template updated`);
    console.log(`   - Document ID: ${template.id}`);
    console.log(`   - Prompt count: ${data.prompts?.length || 0}`);
    console.log('\n✨ Stage 4 prompt template seeding complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedStage4Prompts();
