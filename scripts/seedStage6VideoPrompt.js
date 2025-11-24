/**
 * Seed Script for Stage 6 Video Generation Prompt Template
 * Adds the videoGeneration capability prompt to stage_6_video
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();
const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

console.log(`📊 Using Firestore database: ${databaseId}`);
if (databaseId && databaseId !== '(default)') {
  console.log(`⚠️  Connecting to non-default database: ${databaseId}`);
}

async function seedStage6VideoPrompt() {
  try {
    console.log('\n🌱 Starting Stage 6 Video Prompt seeding...\n');

    const stageId = 'stage_6_video';
    const promptRef = db.collection('prompt_templates').doc(stageId);

    // Get existing template
    const existing = await promptRef.get();

    let currentData = {};
    if (!existing.exists) {
      console.log('ℹ️  Stage 6 template does not exist, creating it...');
      currentData = {
        id: stageId,
        stageType: stageId,
        prompts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      currentData = existing.data();
      console.log(`✓ Found existing stage_6_video template with ${currentData.prompts?.length || 0} prompts`);
    }

    // Check existing prompts
    const hasVideoGen = currentData.prompts?.some(p => p.capability === 'videoGeneration');
    const hasTextGen = currentData.prompts?.some(p => p.capability === 'textGeneration');

    if (hasVideoGen) {
      console.log('ℹ️  videoGeneration prompt already exists, updating it...');
    } else {
      console.log('➕ Adding new videoGeneration prompt...');
    }

    if (!hasTextGen) {
      console.log('⚠️  textGeneration prompt missing, will add it...');
    }

    // TextGeneration prompt (for screenplay/script generation)
    const textGenPrompt = {
      id: 'prompt_textGeneration_video_default',
      capability: 'textGeneration',
      name: 'Default Video Production Specification',
      description: 'Generates detailed video production specifications from screenplay entries',
      systemPrompt: '',
      userPromptTemplate: '',
      outputFormat: 'json',
      variables: [],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.0-flash-exp'
      },
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // VideoGeneration prompt (for actual video generation)
    const videoGenPrompt = {
      id: 'prompt_videoGeneration_video_default',
      capability: 'videoGeneration',
      name: 'Video Generation Configuration',
      description: 'Configuration for AI video generation models (Veo, Sora, etc.)',
      systemPrompt: '',
      userPromptTemplate: '',
      outputFormat: 'video',
      variables: [],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.5-flash-image'
      },
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Get ALL current prompts and make sure we don't lose any
    const currentPrompts = Array.isArray(currentData.prompts) ? [...currentData.prompts] : [];

    // Handle textGeneration prompt
    const textGenIndex = currentPrompts.findIndex(p => p.capability === 'textGeneration');
    if (textGenIndex >= 0) {
      // Update existing textGeneration prompt
      currentPrompts[textGenIndex] = textGenPrompt;
    } else {
      // Add new textGeneration prompt
      currentPrompts.push(textGenPrompt);
    }

    // Handle videoGeneration prompt
    const videoGenIndex = currentPrompts.findIndex(p => p.capability === 'videoGeneration');
    if (videoGenIndex >= 0) {
      // Update existing videoGeneration prompt
      currentPrompts[videoGenIndex] = videoGenPrompt;
    } else {
      // Add new videoGeneration prompt
      currentPrompts.push(videoGenPrompt);
    }

    // Update the document using update() to ensure we don't lose other fields
    console.log(`\n📝 About to write ${currentPrompts.length} prompts to database:`);
    currentPrompts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.capability} - ${p.name}`);
    });

    await promptRef.update({
      prompts: currentPrompts,
      updatedAt: new Date().toISOString(),
    });

    console.log(`\n✅ Database update completed`);

    // Verify the write was successful
    const verifyDoc = await promptRef.get();
    const verifiedData = verifyDoc.data();
    const verifiedPrompts = verifiedData.prompts || [];

    console.log(`\n🔍 Verification: Read back from database`);
    console.log(`   Total prompts in template: ${verifiedPrompts.length}`);
    console.log(`   - textGeneration: ${verifiedPrompts.filter(p => p.capability === 'textGeneration').length}`);
    console.log(`   - videoGeneration: ${verifiedPrompts.filter(p => p.capability === 'videoGeneration').length}`);

    verifiedPrompts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.capability} - ${p.name}`);
    });

    if (verifiedPrompts.length !== 2) {
      throw new Error(`Verification failed! Expected 2 prompts but found ${verifiedPrompts.length}`);
    }

  } catch (error) {
    console.error('❌ Error seeding Stage 6 video prompt:', error);
    throw error;
  }
}

// Run the seed
seedStage6VideoPrompt()
  .then(() => {
    console.log('\n✅ Stage 6 video prompt seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
