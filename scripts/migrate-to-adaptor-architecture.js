#!/usr/bin/env node

/**
 * Migration Script: Firestore to AI Adaptor Architecture
 *
 * Migrates existing projects to the new AI adaptor architecture
 * Performs safe, non-destructive updates to Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Configuration
const DEFAULT_ADAPTOR = 'gemini';
const STAGES = [
  'stage_2_personas',
  'stage_3_narratives',
  'stage_4_storyboard',
  'stage_5_screenplay',
  'stage_6_video',
];

const CAPABILITIES = [
  'textGeneration',
  'imageGeneration',
  'videoGeneration',
];

const MODEL_MAPPING = {
  gemini: {
    textGeneration: 'gemini-2.0-flash',
    imageGeneration: null, // Gemini doesn't support image gen
    videoGeneration: null,
  },
  openai: {
    textGeneration: 'gpt-4-turbo',
    imageGeneration: 'dall-e-3',
    videoGeneration: null,
  },
  anthropic: {
    textGeneration: 'claude-opus',
    imageGeneration: null,
    videoGeneration: null,
  },
};

/**
 * Create default prompt templates
 */
async function seedPromptTemplates() {
  console.log('📝 Seeding default prompt templates...');

  const templates = [
    {
      stageType: 'stage_2_personas',
      name: 'Default Persona Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are an expert Casting Director and Consumer Psychologist.',
          userPromptTemplate: 'Create {numberOfPersonas} diverse personas for a product: {productDescription}. Target audience: {targetAudience}',
          outputFormat: 'json',
        },
      },
    },
    {
      stageType: 'stage_3_narratives',
      name: 'Default Narrative Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a creative narrative strategist specializing in UGC video content.',
          userPromptTemplate: 'Create {numberOfNarratives} narrative themes for: {productDescription}. Audience: {targetAudience}',
          outputFormat: 'json',
        },
      },
    },
    {
      stageType: 'stage_4_storyboard',
      name: 'Default Storyboard Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a professional film director creating storyboards.',
          userPromptTemplate: 'Create {numberOfScenes} scenes featuring {selectedPersonaName}. Product: {productDescription}',
          outputFormat: 'json',
        },
      },
    },
    {
      stageType: 'stage_5_screenplay',
      name: 'Default Screenplay Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a professional screenwriter creating detailed screenplays.',
          userPromptTemplate: 'Create a screenplay for {videoDuration} video from these scenes: {storyboardScenes}',
          outputFormat: 'json',
        },
      },
    },
    {
      stageType: 'stage_6_video',
      name: 'Default Video Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a video production specialist.',
          userPromptTemplate: 'Generate video prompt for scene: {visual}. Camera: {cameraFlow}',
          outputFormat: 'text',
        },
      },
    },
  ];

  let created = 0;
  for (const template of templates) {
    try {
      const templateId = `pt_${template.stageType}_v1_default`;
      const existingDoc = await db.collection('prompt_templates').doc(templateId).get();

      if (!existingDoc.exists) {
        await db.collection('prompt_templates').doc(templateId).set({
          id: templateId,
          stageType: template.stageType,
          name: template.name,
          description: template.name,
          version: 1,
          prompts: template.prompts,
          variables: [],
          isDefault: true,
          isActive: true,
          createdBy: 'migration',
          createdAt: new Date().toISOString(),
        });
        created++;
        console.log(`  ✓ Created template for ${template.stageType}`);
      } else {
        console.log(`  ⊘ Template already exists for ${template.stageType}`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating template for ${template.stageType}:`, error.message);
    }
  }

  console.log(`✓ Seeded ${created} prompt templates\n`);
}

/**
 * Migrate project to new architecture
 */
async function migrateProject(projectId) {
  try {
    console.log(`\n🔄 Migrating project: ${projectId}`);

    // Check if already migrated
    const configRef = db.collection('project_ai_config').doc(projectId);
    const existingConfig = await configRef.get();

    if (existingConfig.exists) {
      console.log(`  ⊘ Project already configured`);
      return { status: 'skipped', reason: 'already_configured' };
    }

    // Create default configuration
    const config = {
      projectId,
      stageAdaptors: {},
      adaptorParameters: {},
      promptOverrides: {},
      createdAt: new Date().toISOString(),
      migratedFrom: 'gemini-only',
    };

    // Set default adaptor for each stage
    for (const stage of STAGES) {
      config.stageAdaptors[stage] = {};

      // Set text generation adaptor
      const textModel = MODEL_MAPPING[DEFAULT_ADAPTOR].textGeneration;
      if (textModel) {
        config.stageAdaptors[stage].textGeneration = {
          adaptorId: DEFAULT_ADAPTOR,
          modelId: textModel,
          setAt: new Date().toISOString(),
        };
      }

      // Set image generation adaptor
      const imageModel = MODEL_MAPPING[DEFAULT_ADAPTOR].imageGeneration;
      if (imageModel) {
        config.stageAdaptors[stage].imageGeneration = {
          adaptorId: DEFAULT_ADAPTOR,
          modelId: imageModel,
          setAt: new Date().toISOString(),
        };
      }

      // Set video generation adaptor
      const videoModel = MODEL_MAPPING[DEFAULT_ADAPTOR].videoGeneration;
      if (videoModel) {
        config.stageAdaptors[stage].videoGeneration = {
          adaptorId: DEFAULT_ADAPTOR,
          modelId: videoModel,
          setAt: new Date().toISOString(),
        };
      }
    }

    // Save configuration
    await configRef.set(config);

    console.log(`  ✓ Created project AI configuration`);
    console.log(`  ✓ Set default adaptor: ${DEFAULT_ADAPTOR}`);

    return { status: 'success' };
  } catch (error) {
    console.error(`  ✗ Error migrating project ${projectId}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Migrate all projects
 */
async function migrateAllProjects() {
  try {
    console.log('📊 Fetching all projects...\n');

    const projectsSnapshot = await db.collection('projects').get();

    if (projectsSnapshot.empty) {
      console.log('No projects found');
      return;
    }

    console.log(`Found ${projectsSnapshot.size} projects\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const result = await migrateProject(projectDoc.id);

      if (result.status === 'success') {
        successCount++;
      } else if (result.status === 'skipped') {
        skippedCount++;
      } else {
        errorCount++;
      }

      // Add delay to avoid overwhelming Firestore
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`  ✓ Successful: ${successCount}`);
    console.log(`  ⊘ Skipped: ${skippedCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  }
}

/**
 * Verify migration
 */
async function verifyMigration(projectId) {
  try {
    console.log(`\n✓ Verifying migration for ${projectId}...`);

    const configDoc = await db.collection('project_ai_config').doc(projectId).get();

    if (!configDoc.exists) {
      console.log('  ✗ Configuration not found');
      return false;
    }

    const config = configDoc.data();
    let allConfigured = true;

    for (const stage of STAGES) {
      const textGen = config.stageAdaptors?.[stage]?.textGeneration;
      if (textGen && textGen.adaptorId && textGen.modelId) {
        console.log(`  ✓ ${stage}: ${textGen.adaptorId}/${textGen.modelId}`);
      } else {
        console.log(`  ⊘ ${stage}: Not configured`);
        allConfigured = false;
      }
    }

    if (allConfigured) {
      console.log(`\n✅ Project ${projectId} successfully migrated`);
      return true;
    } else {
      console.log(`\n⚠️ Project ${projectId} partially configured`);
      return false;
    }
  } catch (error) {
    console.error('Error verifying migration:', error);
    return false;
  }
}

/**
 * Main migration flow
 */
async function main() {
  console.log('🚀 Starting migration to AI Adaptor Architecture\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Seed prompt templates
    await seedPromptTemplates();

    // Step 2: Migrate all projects
    await migrateAllProjects();

    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Update API server to mount new routes (adaptors.js, prompts.js, usage.js)');
    console.log('2. Test adaptor resolution with a sample project');
    console.log('3. Update recipe definitions to use V2 services');
    console.log('4. Deploy to production with full testing');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Run migration
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
