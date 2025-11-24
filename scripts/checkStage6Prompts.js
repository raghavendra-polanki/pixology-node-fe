/**
 * Check Stage 6 prompts in database
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

console.log(`📊 Using Firestore database: ${databaseId}\n`);

async function checkStage6Prompts() {
  try {
    const promptRef = db.collection('prompt_templates').doc('stage_6_video');
    const doc = await promptRef.get();

    if (!doc.exists) {
      console.log('❌ stage_6_video template NOT FOUND in database!');
      console.log('\nChecking all prompt_templates:');
      const allTemplates = await db.collection('prompt_templates').get();
      console.log(`Total templates: ${allTemplates.size}`);
      allTemplates.forEach(doc => {
        console.log(`  - ${doc.id}`);
      });
      return;
    }

    const data = doc.data();
    console.log('✅ stage_6_video template found!\n');
    console.log('Template data:');
    console.log(`  ID: ${data.id}`);
    console.log(`  Stage Type: ${data.stageType}`);
    console.log(`  Prompts count: ${data.prompts?.length || 0}\n`);

    if (data.prompts && data.prompts.length > 0) {
      console.log('Prompts:');
      data.prompts.forEach((prompt, index) => {
        console.log(`\n  [${index + 1}] ${prompt.name}`);
        console.log(`      ID: ${prompt.id}`);
        console.log(`      Capability: ${prompt.capability}`);
        console.log(`      Model Config: ${JSON.stringify(prompt.modelConfig || {})}`);
        console.log(`      Is Default: ${prompt.isDefault}`);
        console.log(`      Is Active: ${prompt.isActive}`);
      });
    } else {
      console.log('⚠️  No prompts in template!');
    }

  } catch (error) {
    console.error('❌ Error checking Stage 6 prompts:', error);
    throw error;
  }
}

// Run the check
checkStage6Prompts()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
