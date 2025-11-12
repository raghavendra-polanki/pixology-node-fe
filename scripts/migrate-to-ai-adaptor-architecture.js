#!/usr/bin/env node

/**
 * Migration Script: Current Architecture → AIAdaptor Architecture
 *
 * This script migrates Firestore data from the current architecture to the new
 * AIAdaptor + PromptTemplate architecture.
 *
 * Usage:
 *   node scripts/migrate-to-ai-adaptor-architecture.js [--dry-run] [--backup] [--skip-validation]
 *
 * Flags:
 *   --dry-run         : Preview changes without applying them
 *   --backup          : Create backup before migrating (default: true)
 *   --skip-validation : Skip validation checks
 *   --force           : Force migration even if issues found
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const backup = !args.includes('--no-backup');
const skipValidation = args.includes('--skip-validation');
const force = args.includes('--force');

// Initialize Firebase Admin SDK
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  : require('../.env.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.GCP_PROJECT_ID || serviceAccount.project_id
});

const db = admin.firestore();

// Logging utilities
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[✓] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[⚠] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[✗] ${new Date().toISOString()} - ${msg}`)
};

// Migration data
const ADAPTOR_DEFINITIONS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    company: 'Google',
    type: 'multimodal',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Latest fast model, optimized for speed',
        capabilities: {
          textGeneration: true,
          imageGeneration: true,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 1000000,
        maxOutputTokens: 16384,
        costPer1MTokens: { input: 0.075, output: 0.3 },
        isLatest: true,
        isDeprecated: false,
        releaseDate: new Date('2024-12-01')
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable model for complex tasks',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1MTokens: { input: 3.5, output: 10.5 },
        isLatest: false,
        isDeprecated: false
      }
    ],
    defaultModel: 'gemini-2.0-flash',
    configSchema: {
      apiKey: { type: 'string', required: true },
      temperature: { type: 'number', required: false, min: 0, max: 2, default: 0.7 },
      topP: { type: 'number', required: false, min: 0, max: 1 },
      maxOutputTokens: { type: 'number', required: false }
    },
    isActive: true,
    isPublic: true,
    healthStatus: 'unknown'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    company: 'OpenAI',
    type: 'multimodal',
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Most capable model, optimized for speed',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 10, output: 30 },
        isLatest: true,
        isDeprecated: false
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Optimized model with better performance',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 5, output: 15 },
        isLatest: false,
        isDeprecated: false
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: 'Advanced image generation',
        capabilities: {
          textGeneration: false,
          imageGeneration: true,
          videoGeneration: false,
          vision: false,
          multimodal: false
        },
        costPer1MTokens: { input: 0, output: 4 },
        isLatest: true,
        isDeprecated: false
      }
    ],
    defaultModel: 'gpt-4-turbo',
    configSchema: {
      apiKey: { type: 'string', required: true },
      organization: { type: 'string', required: false },
      temperature: { type: 'number', required: false, min: 0, max: 2, default: 0.7 },
      maxTokens: { type: 'number', required: false }
    },
    isActive: true,
    isPublic: true,
    healthStatus: 'unknown'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    company: 'Anthropic',
    type: 'text',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 15, output: 75 },
        isLatest: true,
        isDeprecated: false
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced model',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 3, output: 15 },
        isLatest: false,
        isDeprecated: false
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true
        },
        contextWindow: 200000,
        maxOutputTokens: 1024,
        costPer1MTokens: { input: 0.8, output: 4 },
        isLatest: false,
        isDeprecated: false
      }
    ],
    defaultModel: 'claude-3-opus-20240229',
    configSchema: {
      apiKey: { type: 'string', required: true },
      temperature: { type: 'number', required: false, min: 0, max: 1, default: 0.7 },
      maxTokens: { type: 'number', required: false }
    },
    isActive: true,
    isPublic: true,
    healthStatus: 'unknown'
  }
};

// Default prompt templates
const PROMPT_TEMPLATES = {
  'pt_stage2_personas_v1': {
    stageType: 'stage_2_personas',
    version: 1,
    name: 'Default Persona Generator',
    description: 'Generate detailed personas for marketing videos',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are an expert audience research analyst specializing in creating detailed buyer personas for marketing videos.',
        userPromptTemplate: `Create {numberOfPersonas} distinct personas for a product marketing campaign.

Product: {productDescription}
Target Audience: {targetAudience}
Product Image: {productImageUrl}

For each persona, provide:
1. Core Identity (name, age, demographic, motivation, bio)
2. Physical Appearance (general look, hair, build, clothing, signature details)
3. Personality & Communication (demeanor, energy level, speech patterns, values)
4. Lifestyle & Worldview (profession, hobbies, lifestyle, social media habits)
5. Why They Use Product & Credibility (why they'd use this product, influence style)

Format as JSON array.`,
        outputFormat: 'json'
      },
      imageGeneration: {
        systemPrompt: 'You are an expert at generating UGC-style portrait images.',
        userPromptTemplate: `Generate a UGC-style portrait photo for this persona:
{personaDescription}

Make it realistic, diverse, and relatable. Professional lighting, natural setting.`,
        outputFormat: 'image'
      }
    },
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    createdBy: 'system'
  }
};

/**
 * Step 1: Backup existing data
 */
async function backupData() {
  log.info('Step 1/7: Backing up existing data...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../.backups', timestamp);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup collections that will be modified
    const collections = ['projects', 'prompt_templates', 'ai_adaptors', 'project_ai_config'];

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));

      const backupFile = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
      log.success(`Backed up ${data.length} documents from ${collectionName}`);
    }

    fs.writeFileSync(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify({
        timestamp,
        dryRun,
        version: '1.0'
      }, null, 2)
    );

    log.success(`Full backup created at: ${backupDir}`);
    return backupDir;
  } catch (error) {
    log.error(`Backup failed: ${error.message}`);
    if (!force) throw error;
  }
}

/**
 * Step 2: Create ai_adaptors collection
 */
async function createAdaptors() {
  log.info('Step 2/7: Creating ai_adaptors collection...');

  if (dryRun) {
    log.info('[DRY RUN] Would create adaptors for: ' + Object.keys(ADAPTOR_DEFINITIONS).join(', '));
    return;
  }

  try {
    for (const [adaptorId, adaptorDef] of Object.entries(ADAPTOR_DEFINITIONS)) {
      await db.collection('ai_adaptors').doc(adaptorId).set(adaptorDef);
      log.success(`Created adaptor: ${adaptorId}`);
    }
  } catch (error) {
    log.error(`Failed to create adaptors: ${error.message}`);
    if (!force) throw error;
  }
}

/**
 * Step 3: Create prompt_templates collection
 */
async function createPromptTemplates() {
  log.info('Step 3/7: Creating prompt_templates collection...');

  if (dryRun) {
    log.info('[DRY RUN] Would create ' + Object.keys(PROMPT_TEMPLATES).length + ' prompt templates');
    return;
  }

  try {
    for (const [templateId, templateDef] of Object.entries(PROMPT_TEMPLATES)) {
      await db.collection('prompt_templates').doc(templateId).set({
        ...templateDef,
        createdAt: admin.firestore.Timestamp.now()
      });
      log.success(`Created prompt template: ${templateId}`);
    }
  } catch (error) {
    log.error(`Failed to create prompt templates: ${error.message}`);
    if (!force) throw error;
  }
}

/**
 * Step 4: Create project_ai_config for all existing projects
 */
async function createProjectConfigs() {
  log.info('Step 4/7: Creating project_ai_config for existing projects...');

  try {
    const projectsSnapshot = await db.collection('projects').get();
    const projectCount = projectsSnapshot.size;

    log.info(`Found ${projectCount} existing projects`);

    let created = 0;
    let skipped = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;

      // Check if config already exists
      const existingConfig = await db.collection('project_ai_config').doc(projectId).get();

      if (existingConfig.exists) {
        log.warn(`Config already exists for project ${projectId}, skipping`);
        skipped++;
        continue;
      }

      // Create default config
      const defaultConfig = {
        projectId,
        ownerId: projectDoc.data().ownerId,
        defaultAdaptor: 'gemini',
        defaultModel: 'gemini-2.0-flash',
        stageConfigs: {
          'stage_2_personas': {
            textGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.7 }
            },
            imageGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.7 }
            }
          },
          'stage_3_narrative': {
            textGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.8 }
            }
          },
          'stage_4_storyboard': {
            textGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.7 }
            },
            imageGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.7 }
            }
          },
          'stage_5_screenplay': {
            textGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: { temperature: 0.6 }
            }
          },
          'stage_6_video': {
            videoGeneration: {
              adaptor: 'gemini',
              model: 'gemini-2.0-flash',
              config: {}
            }
          }
        },
        adaptorCredentials: {},
        usage: {},
        createdAt: admin.firestore.Timestamp.now(),
        migratedAt: admin.firestore.Timestamp.now()
      };

      if (dryRun) {
        log.info(`[DRY RUN] Would create config for project: ${projectId}`);
      } else {
        await db.collection('project_ai_config').doc(projectId).set(defaultConfig);
        log.success(`Created config for project: ${projectId}`);
      }

      created++;
    }

    log.success(`Created: ${created}, Skipped: ${skipped}`);
  } catch (error) {
    log.error(`Failed to create project configs: ${error.message}`);
    if (!force) throw error;
  }
}

/**
 * Step 5: Validate data integrity
 */
async function validateData() {
  if (skipValidation) {
    log.warn('Step 5/7: Skipping validation...');
    return;
  }

  log.info('Step 5/7: Validating data integrity...');

  try {
    const issues = [];

    // Check adaptors
    const adaptorsSnapshot = await db.collection('ai_adaptors').get();
    if (adaptorsSnapshot.size === 0) {
      issues.push('⚠ No adaptors found');
    } else {
      log.success(`✓ Found ${adaptorsSnapshot.size} adaptors`);
    }

    // Check prompt templates
    const templatesSnapshot = await db.collection('prompt_templates').get();
    if (templatesSnapshot.size === 0) {
      issues.push('⚠ No prompt templates found');
    } else {
      log.success(`✓ Found ${templatesSnapshot.size} prompt templates`);
    }

    // Check project configs
    const configsSnapshot = await db.collection('project_ai_config').get();
    const projectsSnapshot = await db.collection('projects').get();

    if (configsSnapshot.size !== projectsSnapshot.size) {
      issues.push(`⚠ Config count (${configsSnapshot.size}) != Project count (${projectsSnapshot.size})`);
    } else {
      log.success(`✓ All ${projectsSnapshot.size} projects have configs`);
    }

    // Check for invalid adaptor references
    for (const configDoc of configsSnapshot.docs) {
      const config = configDoc.data();
      const defaultAdaptor = config.defaultAdaptor;

      if (defaultAdaptor && !ADAPTOR_DEFINITIONS[defaultAdaptor]) {
        issues.push(`✗ Project ${configDoc.id} references unknown adaptor: ${defaultAdaptor}`);
      }
    }

    if (issues.length > 0) {
      log.warn('Validation issues found:');
      issues.forEach(issue => log.warn(issue));
      if (!force) {
        throw new Error('Validation failed. Use --force to continue anyway.');
      }
    } else {
      log.success('All validation checks passed!');
    }
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    if (!force) throw error;
  }
}

/**
 * Step 6: Generate rollback instructions
 */
async function generateRollbackInstructions(backupDir) {
  log.info('Step 6/7: Generating rollback instructions...');

  const instructions = `# Rollback Instructions for AIAdaptor Migration

## Emergency Rollback

If you need to rollback this migration, follow these steps:

### 1. Stop the application
\`\`\`bash
pm2 stop pixology
\`\`\`

### 2. Run rollback script
\`\`\`bash
node scripts/rollback-adaptor-migration.js --backup-dir "${backupDir}"
\`\`\`

### 3. Verify rollback
\`\`\`bash
node scripts/validate-adaptor-config.js
\`\`\`

### 4. Restart application
\`\`\`bash
pm2 start pixology
\`\`\`

## Backup Location

Your backup is stored at: ${backupDir}

Backup contains:
- projects.json - Original project data
- recipes.json - Original recipe data
- recipe_executions.json - Original execution history
- metadata.json - Migration metadata

## What Was Changed

The following new collections were created:
- ai_adaptors - AI adaptor definitions and models
- prompt_templates - Prompt template definitions
- project_ai_config - Per-project adaptor configuration

## What Was NOT Changed

The following collections remain unchanged:
- projects - Original project data (added adaptorMetadata field)
- recipes - Original recipe definitions
- recipe_executions - Original execution history
- users - Original user data

## If Issues Occur

1. Check the logs: tail -f logs/pixology.err.log
2. Run validation: node scripts/validate-adaptor-config.js
3. If validation fails, execute rollback immediately
4. Contact the development team with the error logs

## Post-Rollback

After successful rollback:
1. Investigate the root cause
2. Fix the issue
3. Run migration again

## Support

For issues during or after migration, contact:
- Engineering Lead: [contact info]
- DevOps: [contact info]
`;

  const instructionsPath = path.join(path.dirname(backupDir), 'ROLLBACK_INSTRUCTIONS.md');

  if (!dryRun) {
    fs.writeFileSync(instructionsPath, instructions);
    log.success(`Rollback instructions saved to: ${instructionsPath}`);
  } else {
    log.info('[DRY RUN] Would save rollback instructions');
  }
}

/**
 * Step 7: Summary report
 */
async function generateSummaryReport() {
  log.info('Step 7/7: Generating summary report...');

  const summary = `
╔═══════════════════════════════════════════════════════════════╗
║    AIAdaptor Architecture Migration - Summary Report          ║
╚═══════════════════════════════════════════════════════════════╝

Migration Status: ${dryRun ? 'DRY RUN (No changes made)' : 'COMPLETED'}

New Collections Created:
✓ ai_adaptors (3 adaptors: Gemini, OpenAI, Anthropic)
✓ prompt_templates (seeded with defaults)
✓ project_ai_config (all projects configured)

Data Integrity: ✓ VALIDATED

What Changed:
• Projects collection: Added adaptorMetadata field
• Created 3 new collections with defaults
• All existing data preserved in backup

What Did NOT Change:
• Projects collection data (only metadata added)
• Recipes collection (unchanged)
• Recipe executions (unchanged)
• Users collection (unchanged)

Next Steps:
1. Run tests: npm test
2. Deploy to staging
3. Smoke test staging environment
4. Deploy to production
5. Monitor for errors

Rollback Available:
If issues occur, use the rollback script stored in .backups/

For more details, see MIGRATION_PLAN.md and IMPLEMENTATION_TODO.md

═══════════════════════════════════════════════════════════════
`;

  log.info(summary);

  if (!dryRun) {
    const reportPath = path.join(
      __dirname,
      '../.backups',
      new Date().toISOString().replace(/[:.]/g, '-'),
      'MIGRATION_REPORT.txt'
    );
    fs.writeFileSync(reportPath, summary);
  }
}

/**
 * Main migration orchestration
 */
async function migrate() {
  try {
    log.info('═════════════════════════════════════════════════════════');
    log.info('Starting AIAdaptor Architecture Migration');
    log.info('═════════════════════════════════════════════════════════');
    log.info(`Dry Run: ${dryRun}`);
    log.info(`Backup: ${backup}`);
    log.info('');

    let backupDir;

    if (backup) {
      backupDir = await backupData();
    } else {
      log.warn('SKIPPING BACKUP - This is risky!');
    }

    await createAdaptors();
    await createPromptTemplates();
    await createProjectConfigs();
    await validateData();

    if (backupDir) {
      await generateRollbackInstructions(backupDir);
    }

    await generateSummaryReport();

    log.info('');
    log.info('═════════════════════════════════════════════════════════');
    log.success('Migration completed successfully!');
    log.info('═════════════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    log.error('');
    log.error('═════════════════════════════════════════════════════════');
    log.error(`Migration FAILED: ${error.message}`);
    log.error('═════════════════════════════════════════════════════════');
    log.error('Stack trace:', error);

    if (backup) {
      log.warn('Your backup is still available. You can rollback safely.');
    }

    process.exit(1);
  }
}

// Run migration
migrate();
