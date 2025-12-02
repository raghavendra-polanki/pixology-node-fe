/**
 * Script to seed GameLab Stage 3 Player Recommendation prompt template
 *
 * Run: node scripts/seedGameLabStage3PlayerPrompt.js
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { STAGE_3_PLAYER_SUGGESTION_TEMPLATE } from '../api/products/gamelab/prompts/seedData.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    await import('fs').then(fs =>
      fs.promises.readFile('./serviceAccountKeyGoogle.json', 'utf8')
    )
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Use GameLab database - MUST be pixology-gamelab
const GAMELAB_DB_ID = process.env.GAMELAB_DATABASE_ID || 'pixology-gamelab';
console.log('📦 Using GameLab database:', GAMELAB_DB_ID);

// Get the GameLab-specific Firestore instance
const gamelabDb = admin.firestore();
gamelabDb.settings({ databaseId: GAMELAB_DB_ID });

async function seedStage3PlayerPrompt() {
  try {
    console.log('\n🌱 Seeding GameLab Stage 3 Player Recommendation Prompt Template...\n');

    const template = STAGE_3_PLAYER_SUGGESTION_TEMPLATE;

    // Reference to the prompt templates collection in GameLab database
    const promptTemplatesRef = gamelabDb.collection('prompt_templates');

    // Check if already exists
    const existingDoc = await promptTemplatesRef.doc(template.id).get();

    if (existingDoc.exists) {
      console.log(`⚠️  Prompt template "${template.id}" already exists. Updating...`);
    } else {
      console.log(`✨ Creating new prompt template "${template.id}"...`);
    }

    // Prepare the template document
    const templateDoc = {
      id: template.id,
      stageType: template.stageType,
      prompts: template.prompts,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await promptTemplatesRef.doc(template.id).set(templateDoc, { merge: true });

    console.log(`✅ Successfully seeded prompt template: ${template.id}`);
    console.log(`   - Stage Type: ${template.stageType}`);
    console.log(`   - Number of prompts: ${template.prompts.length}`);

    template.prompts.forEach((prompt, index) => {
      console.log(`   - Prompt ${index + 1}: ${prompt.name} (${prompt.capability})`);
      console.log(`     Model: ${prompt.modelConfig.adaptorId}/${prompt.modelConfig.modelId}`);
    });

    console.log('\n✨ Stage 3 Player Recommendation prompt template seeded successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding prompt template:', error);
    process.exit(1);
  }
}

// Run the seeding
seedStage3PlayerPrompt();
