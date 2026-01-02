/**
 * Migration Script: Add Versioning to Prompt Templates
 *
 * This script migrates existing prompts to support versioning:
 * 1. Creates a versions sub-collection under each prompt_templates document
 * 2. Saves current prompt content as version 1
 * 3. Adds currentVersion and latestVersion fields to each prompt
 *
 * Run with: node scripts/migratePromptsToVersioning.js
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load service account
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKeyGoogle.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
}

// Get database - use dev database by default
const databaseId = process.env.STORYLAB_DATABASE_ID || 'pixology-storylab-dev';
const db = getFirestore(admin.app(), databaseId);

console.log(`\n🔧 Migrating prompts to versioning in database: ${databaseId}\n`);

async function migratePromptsToVersioning() {
  try {
    // Get all prompt template documents
    const templatesSnapshot = await db.collection('prompt_templates').get();

    if (templatesSnapshot.empty) {
      console.log('❌ No prompt templates found. Please seed prompts first.');
      return;
    }

    console.log(`📋 Found ${templatesSnapshot.size} stage templates to migrate\n`);

    let totalPrompts = 0;
    let migratedPrompts = 0;
    let skippedPrompts = 0;

    for (const templateDoc of templatesSnapshot.docs) {
      const stageType = templateDoc.id;
      const templateData = templateDoc.data();
      const prompts = templateData.prompts || [];

      console.log(`\n📂 Processing stage: ${stageType} (${prompts.length} prompts)`);

      const updatedPrompts = [];

      for (const prompt of prompts) {
        totalPrompts++;

        // Check if already migrated (has currentVersion)
        if (prompt.currentVersion !== undefined) {
          console.log(`  ⏭️  Skipping ${prompt.id} - already has versioning`);
          updatedPrompts.push(prompt);
          skippedPrompts++;
          continue;
        }

        // Create version 1 document in sub-collection
        const versionDocId = `${prompt.id}_v1`;
        const versionData = {
          promptId: prompt.id,
          version: 1,
          capability: prompt.capability,
          name: prompt.name,
          description: prompt.description || '',
          systemPrompt: prompt.systemPrompt || '',
          userPromptTemplate: prompt.userPromptTemplate || '',
          outputFormat: prompt.outputFormat || 'json',
          variables: prompt.variables || [],
          modelConfig: prompt.modelConfig || null,
          versionNote: 'Initial version (migrated)',
          isChosen: true, // This is the active version
          createdAt: prompt.createdAt || new Date().toISOString(),
          createdBy: prompt.createdBy || 'system',
        };

        // Save version document
        await db
          .collection('prompt_templates')
          .doc(stageType)
          .collection('versions')
          .doc(versionDocId)
          .set(versionData);

        // Update prompt with versioning fields
        const updatedPrompt = {
          ...prompt,
          currentVersion: 1,
          latestVersion: 1,
        };

        updatedPrompts.push(updatedPrompt);
        migratedPrompts++;

        console.log(`  ✅ Migrated ${prompt.id} → v1`);
      }

      // Update the stage template with versioned prompts
      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        migratedToVersioning: true,
        migrationDate: new Date().toISOString(),
      });

      console.log(`  📦 Updated stage template: ${stageType}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   Total prompts: ${totalPrompts}`);
    console.log(`   Migrated: ${migratedPrompts}`);
    console.log(`   Skipped (already versioned): ${skippedPrompts}`);
    console.log('='.repeat(50));
    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migratePromptsToVersioning()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
