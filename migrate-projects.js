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
  databaseId: process.env.FIRESTORE_DATABASE_ID || 'pixology-v2',
});

async function migrateProjects() {
  try {
    console.log(`\n📊 Exploring ${process.env.FIRESTORE_DATABASE_ID || 'pixology-v2'} database...\n`);

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    console.log(`Found ${projectsSnapshot.size} projects\n`);

    let migratedCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();

      console.log(`\n📋 Project: ${projectData.name || projectId}`);
      console.log(`   ID: ${projectId}`);
      console.log(`   Stages: ${projectData.completedStages?.length || 0} completed`);

      // Check if project_ai_config exists
      const configDoc = await db.collection('project_ai_config').doc(projectId).get();

      if (configDoc.exists) {
        console.log(`   ✓ Already has AI config`);
      } else {
        console.log(`   ⚠️  Creating default AI config...`);

        // Create default adaptor configuration
        const defaultConfig = {
          projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stageAdaptors: {
            stage_2_personas: {
              textGeneration: {
                adaptorId: 'gemini',
                modelId: 'gemini-2.0-flash',
                setAt: new Date().toISOString(),
              },
            },
            stage_3_narratives: {
              textGeneration: {
                adaptorId: 'gemini',
                modelId: 'gemini-2.0-flash',
                setAt: new Date().toISOString(),
              },
            },
            stage_4_storyboard: {
              textGeneration: {
                adaptorId: 'gemini',
                modelId: 'gemini-2.0-flash',
                setAt: new Date().toISOString(),
              },
            },
            stage_5_screenplay: {
              textGeneration: {
                adaptorId: 'gemini',
                modelId: 'gemini-2.0-flash',
                setAt: new Date().toISOString(),
              },
            },
            stage_6_video: {
              textGeneration: {
                adaptorId: 'gemini',
                modelId: 'gemini-2.0-flash',
                setAt: new Date().toISOString(),
              },
            },
          },
        };

        await db.collection('project_ai_config').doc(projectId).set(defaultConfig);
        console.log(`   ✓ Created default config (gemini-2.0-flash for all stages)`);
        migratedCount++;
      }
    }

    console.log(`\n✅ Migration Summary:`);
    console.log(`   Total projects: ${projectsSnapshot.size}`);
    console.log(`   Configured: ${migratedCount}`);
    console.log(`   Already configured: ${projectsSnapshot.size - migratedCount}\n`);

    // Also check prompt templates
    console.log(`\n📝 Checking prompt templates...`);
    const templatesSnapshot = await db.collection('prompt_templates').get();
    console.log(`Found ${templatesSnapshot.size} prompt templates\n`);

    for (const templateDoc of templatesSnapshot.docs) {
      const templateData = templateDoc.data();
      console.log(`   - ${templateData.name || templateDoc.id} (Stage: ${templateData.stageType})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateProjects();
