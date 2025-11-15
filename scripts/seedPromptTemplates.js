#!/usr/bin/env node

/**
 * Seed Prompt Templates Script
 * Populates Firestore with default prompt templates for all stages
 * Run: node scripts/seedPromptTemplates.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { ALL_PROMPT_TEMPLATES } from '../api/services/PromptTemplateSeedData.js';

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

async function seedPromptTemplates() {
  try {
    console.log('🌱 Starting prompt template seeding...\n');
    console.log('Database: pixology-v2');
    console.log('This will create/update prompt templates for all stages');
    console.log('Document IDs will be stage names (e.g., "stage_2_personas")\n');

    const results = {
      created: [],
      updated: [],
      failed: [],
    };

    // Seed each stage template
    for (const template of ALL_PROMPT_TEMPLATES) {
      try {
        console.log(`\nProcessing: ${template.stageType}`);
        console.log(`  Prompts: ${template.prompts.length}`);

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

          // Verify update
          const verifyDoc = await db.collection('prompt_templates').doc(template.id).get();
          if (verifyDoc.exists) {
            const data = verifyDoc.data();
            console.log(`  ✅ Updated successfully!`);
            console.log(`     - Prompt count: ${data.prompts?.length || 0}`);
            results.updated.push(template.id);
          }
        } else {
          console.log('  📝 Creating new template...');

          // Create new template
          await db.collection('prompt_templates').doc(template.id).set(template);

          // Verify creation
          const verifyDoc = await db.collection('prompt_templates').doc(template.id).get();
          if (verifyDoc.exists) {
            const data = verifyDoc.data();
            console.log(`  ✅ Created successfully!`);
            console.log(`     - Prompt count: ${data.prompts?.length || 0}`);
            results.created.push(template.id);
          }
        }

        // List prompts for this stage
        const doc = await db.collection('prompt_templates').doc(template.id).get();
        const data = doc.data();
        console.log(`  📋 Prompts in ${template.id}:`);
        (data.prompts || []).forEach((prompt, idx) => {
          console.log(`     ${idx + 1}. [${prompt.capability}] ${prompt.name}`);
        });

      } catch (templateError) {
        console.error(`  ❌ Error: ${templateError.message}`);
        results.failed.push(template.id);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${results.created.length}`);
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

    console.log('\n✨ Prompt template seeding complete!\n');

    // Additional verification
    console.log('🔍 Verification: Listing all prompt templates...\n');
    const allTemplates = await db.collection('prompt_templates').get();
    console.log(`Total templates in database: ${allTemplates.docs.length}`);
    allTemplates.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.prompts?.length || 0} prompts`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedPromptTemplates();
