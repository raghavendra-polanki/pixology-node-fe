#!/usr/bin/env node

/**
 * Seed GameLab Prompt Templates Script
 * Populates Firestore with GameLab prompt templates
 * Run: node scripts/seedGameLabPrompts.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import admin from 'firebase-admin';
import { GAMELAB_PROMPT_TEMPLATES } from '../api/products/flarelab/prompts/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

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
const gamelabDatabaseId = process.env.GAMELAB_DATABASE_ID || 'pixology-gamelab';
db.settings({ databaseId: gamelabDatabaseId });

async function seedGameLabPrompts() {
  try {
    console.log('🎮 Starting GameLab prompt template seeding...\n');
    console.log(`Database: ${gamelabDatabaseId}`);
    console.log('This will create/update GameLab prompt templates');
    console.log(`Total templates to process: ${GAMELAB_PROMPT_TEMPLATES.length}\n`);

    const results = {
      created: [],
      updated: [],
      failed: [],
    };

    // Seed each GameLab template
    for (const template of GAMELAB_PROMPT_TEMPLATES) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing: ${template.stageType}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Template ID: ${template.id}`);
        console.log(`Prompts count: ${template.prompts.length}`);

        // List all prompts in this template
        console.log(`\nPrompts:`);
        template.prompts.forEach((prompt, idx) => {
          console.log(`  ${idx + 1}. [${prompt.capability}] ${prompt.name}`);
          console.log(`     Model: ${prompt.modelConfig?.adaptorId || 'default'}/${prompt.modelConfig?.modelId || 'default'}`);
        });

        // Check if template already exists
        const existingDoc = await db.collection('prompt_templates').doc(template.id).get();

        if (existingDoc.exists) {
          console.log('\n⚠️  Template already exists - updating...');

          // Update existing template
          await db.collection('prompt_templates').doc(template.id).set(
            {
              ...template,
              updatedAt: new Date().toISOString(),
            },
            { merge: false } // Replace entire document
          );

          // Verify update
          const verifyDoc = await db.collection('prompt_templates').doc(template.id).get();
          if (verifyDoc.exists) {
            const data = verifyDoc.data();
            console.log(`✅ Updated successfully!`);
            console.log(`   Verified prompt count: ${data.prompts?.length || 0}`);
            results.updated.push(template.id);
          }
        } else {
          console.log('\n📝 Creating new template...');

          // Create new template
          await db.collection('prompt_templates').doc(template.id).set(template);

          // Verify creation
          const verifyDoc = await db.collection('prompt_templates').doc(template.id).get();
          if (verifyDoc.exists) {
            const data = verifyDoc.data();
            console.log(`✅ Created successfully!`);
            console.log(`   Verified prompt count: ${data.prompts?.length || 0}`);
            results.created.push(template.id);
          }
        }

      } catch (templateError) {
        console.error(`\n❌ Error processing ${template.id}:`, templateError.message);
        results.failed.push(template.id);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GAMELAB SEEDING SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n✅ Created: ${results.created.length}`);
    if (results.created.length > 0) {
      results.created.forEach((id) => console.log(`   - ${id}`));
    }

    console.log(`\n🔄 Updated: ${results.updated.length}`);
    if (results.updated.length > 0) {
      results.updated.forEach((id) => console.log(`   - ${id}`));
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length}`);
      results.failed.forEach((id) => console.log(`   - ${id}`));
    }

    console.log('\n✨ GameLab prompt template seeding complete!\n');

    // Additional verification - show all GameLab templates
    console.log('🔍 Verification: Listing all GameLab prompt templates...\n');
    const allTemplates = await db.collection('prompt_templates').get();
    const gamelabTemplates = allTemplates.docs.filter(doc => doc.id.startsWith('stage_') && !doc.id.includes('persona') && !doc.id.includes('narrative') && !doc.id.includes('storyboard') && !doc.id.includes('screenplay') && !doc.id.includes('video'));

    console.log(`Total GameLab templates in database: ${GAMELAB_PROMPT_TEMPLATES.length}`);
    GAMELAB_PROMPT_TEMPLATES.forEach(template => {
      console.log(`  - ${template.id}: ${template.prompts.length} prompts`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeding
seedGameLabPrompts();
