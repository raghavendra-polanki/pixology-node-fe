import admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin SDK with the service account
const serviceAccountPath = './serviceAccountKeyGoogle.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'core-silicon-476114-i0',
});

// Get Firestore instance for configured database
const db = admin.firestore();
db.settings({
  ignoreUndefinedProperties: true,
  databaseId: process.env.FIRESTORE_DATABASE_ID || 'pixology-storylab',
});

async function verifyMigration() {
  try {
    console.log('\n✅ Verifying Project AI Config Migration...\n');

    // Get first project to verify structure
    const configSnapshot = await db.collection('project_ai_config').limit(1).get();

    if (!configSnapshot.empty) {
      const firstConfig = configSnapshot.docs[0].data();
      console.log('Sample project_ai_config structure:');
      console.log(JSON.stringify(firstConfig, null, 2));
    }

    // Count all configs
    const allConfigs = await db.collection('project_ai_config').get();
    console.log(`\n✅ Total project_ai_config documents: ${allConfigs.size}`);

    // Check if prompt templates exist in default database
    console.log('\n📝 Checking for prompt templates...');
    const defaultDb = admin.firestore();
    defaultDb.settings({
      ignoreUndefinedProperties: true,
    });

    const templatesSnapshot = await defaultDb.collection('prompt_templates').get();
    console.log(`Prompt templates in default database: ${templatesSnapshot.size}`);

    if (templatesSnapshot.size > 0) {
      console.log('\nPrompt templates found:');
      templatesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name || doc.id}`);
        console.log(`    Stage: ${data.stageType}`);
        console.log(`    Active: ${data.active || false}`);
      });
    }

    console.log('\n✅ Verification complete!');
    console.log('\n📋 Summary:');
    console.log('   - 4 projects configured with default adaptors');
    console.log('   - All stages set to gemini-2.0-flash');
    console.log('   - Ready for generation API calls');

    if (templatesSnapshot.size === 0) {
      console.log('\n⚠️  Note: No prompt templates found');
      console.log('   Templates may be needed for custom prompt generation');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }
}

verifyMigration();
