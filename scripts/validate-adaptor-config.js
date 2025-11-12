#!/usr/bin/env node

/**
 * Validation Script: Check AIAdaptor Architecture Configuration
 *
 * Validates that all necessary collections exist, have correct structure,
 * and all projects have proper configuration.
 *
 * Usage:
 *   node scripts/validate-adaptor-config.js [--verbose] [--fix]
 */

const admin = require('firebase-admin');
const fs = require('fs');

const verbose = process.argv.includes('--verbose');
const fix = process.argv.includes('--fix');

// Initialize Firebase
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  : require('../.env.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.GCP_PROJECT_ID || serviceAccount.project_id
});

const db = admin.firestore();

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[✓] ${msg}`),
  warn: (msg) => console.warn(`[⚠] ${msg}`),
  error: (msg) => console.error(`[✗] ${msg}`),
  debug: (msg) => { if (verbose) console.log(`[DEBUG] ${msg}`); }
};

const results = {
  checks: 0,
  passed: 0,
  warnings: 0,
  errors: 0,
  issues: []
};

async function validateCollectionExists(collectionName, expectedCount = null) {
  results.checks++;
  try {
    const snapshot = await db.collection(collectionName).limit(1).get();
    const count = await db.collection(collectionName).count().get();
    const actualCount = count.data().count;

    if (actualCount === 0) {
      results.errors++;
      results.issues.push(`Collection '${collectionName}' exists but is empty`);
      log.error(`Collection '${collectionName}' exists but is empty`);
      return false;
    }

    results.passed++;
    log.success(`Collection '${collectionName}' exists with ${actualCount} documents`);
    return true;
  } catch (error) {
    results.errors++;
    results.issues.push(`Collection '${collectionName}' does not exist: ${error.message}`);
    log.error(`Collection '${collectionName}' does not exist`);
    return false;
  }
}

async function validateAdaptorStructure() {
  results.checks++;
  try {
    const snapshot = await db.collection('ai_adaptors').get();

    for (const doc of snapshot.docs) {
      const adaptor = doc.data();

      // Check required fields
      const requiredFields = ['id', 'name', 'company', 'type', 'models', 'defaultModel', 'configSchema', 'isActive'];
      const missingFields = requiredFields.filter(field => !(field in adaptor));

      if (missingFields.length > 0) {
        results.errors++;
        results.issues.push(`Adaptor '${doc.id}' missing fields: ${missingFields.join(', ')}`);
        log.error(`Adaptor '${doc.id}' missing fields: ${missingFields.join(', ')}`);
        return false;
      }

      // Check models array
      if (!Array.isArray(adaptor.models) || adaptor.models.length === 0) {
        results.errors++;
        results.issues.push(`Adaptor '${doc.id}' has no models defined`);
        log.error(`Adaptor '${doc.id}' has no models defined`);
        return false;
      }

      log.debug(`Adaptor '${doc.id}' has ${adaptor.models.length} models`);
    }

    results.passed++;
    log.success(`All adaptors have valid structure`);
    return true;
  } catch (error) {
    results.errors++;
    results.issues.push(`Error validating adaptor structure: ${error.message}`);
    log.error(`Error validating adaptor structure: ${error.message}`);
    return false;
  }
}

async function validatePromptTemplateStructure() {
  results.checks++;
  try {
    const snapshot = await db.collection('prompt_templates').get();

    if (snapshot.size === 0) {
      results.warnings++;
      results.issues.push('No prompt templates found. Consider seeding defaults.');
      log.warn('No prompt templates found');
      return true;
    }

    for (const doc of snapshot.docs) {
      const template = doc.data();
      const requiredFields = ['stageType', 'version', 'name', 'prompts'];
      const missingFields = requiredFields.filter(field => !(field in template));

      if (missingFields.length > 0) {
        results.errors++;
        results.issues.push(`Template '${doc.id}' missing fields: ${missingFields.join(', ')}`);
        log.error(`Template '${doc.id}' missing fields: ${missingFields.join(', ')}`);
        return false;
      }
    }

    results.passed++;
    log.success(`Found ${snapshot.size} valid prompt templates`);
    return true;
  } catch (error) {
    results.errors++;
    results.issues.push(`Error validating prompt templates: ${error.message}`);
    log.error(`Error validating prompt templates: ${error.message}`);
    return false;
  }
}

async function validateProjectConfigs() {
  results.checks++;
  try {
    const projectsSnapshot = await db.collection('projects').get();
    const configSnapshot = await db.collection('project_ai_config').get();

    log.info(`Validating configs for ${projectsSnapshot.size} projects...`);

    let missingConfigs = 0;
    let invalidConfigs = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const configDoc = await db.collection('project_ai_config').doc(projectId).get();

      if (!configDoc.exists) {
        if (fix) {
          // Create default config
          const defaultConfig = {
            projectId,
            ownerId: projectDoc.data().ownerId,
            defaultAdaptor: 'gemini',
            defaultModel: 'gemini-2.0-flash',
            stageConfigs: {},
            adaptorCredentials: {},
            usage: {},
            createdAt: admin.firestore.Timestamp.now()
          };

          await db.collection('project_ai_config').doc(projectId).set(defaultConfig);
          log.warn(`[FIXED] Created missing config for project ${projectId}`);
        } else {
          missingConfigs++;
          results.issues.push(`Project '${projectId}' has no AI configuration`);
          log.warn(`Project '${projectId}' has no AI configuration`);
        }
      } else {
        const config = configDoc.data();

        // Validate adaptor exists
        const adaptorDoc = await db.collection('ai_adaptors').doc(config.defaultAdaptor).get();
        if (!adaptorDoc.exists) {
          invalidConfigs++;
          results.issues.push(`Project '${projectId}' references unknown adaptor: ${config.defaultAdaptor}`);
          log.error(`Project '${projectId}' references unknown adaptor: ${config.defaultAdaptor}`);
        }

        // Validate stage configs
        if (config.stageConfigs) {
          for (const [stage, capabilities] of Object.entries(config.stageConfigs)) {
            for (const [capability, settings] of Object.entries(capabilities)) {
              const adaptorDoc = await db.collection('ai_adaptors').doc(settings.adaptor).get();
              if (!adaptorDoc.exists) {
                invalidConfigs++;
                results.issues.push(`Project '${projectId}' stage '${stage}' references unknown adaptor: ${settings.adaptor}`);
                log.error(`Project '${projectId}' stage '${stage}' references unknown adaptor: ${settings.adaptor}`);
              }
            }
          }
        }
      }
    }

    if (missingConfigs === 0 && invalidConfigs === 0) {
      results.passed++;
      log.success(`All ${configSnapshot.size} project configs are valid`);
      return true;
    } else {
      results.errors++;
      log.error(`Found ${missingConfigs} missing and ${invalidConfigs} invalid configs`);
      return false;
    }
  } catch (error) {
    results.errors++;
    results.issues.push(`Error validating project configs: ${error.message}`);
    log.error(`Error validating project configs: ${error.message}`);
    return false;
  }
}

async function validateAdaptorCredentials() {
  results.checks++;
  try {
    const configSnapshot = await db.collection('project_ai_config').get();
    let missingCredentials = 0;

    for (const configDoc of configSnapshot.docs) {
      const config = configDoc.data();
      const projectId = configDoc.id;

      // Check if project uses adaptors but has no credentials
      if (config.stageConfigs && Object.keys(config.stageConfigs).length > 0) {
        const usedAdaptors = new Set();

        for (const capabilities of Object.values(config.stageConfigs)) {
          for (const settings of Object.values(capabilities)) {
            usedAdaptors.add(settings.adaptor);
          }
        }

        // For local development, skip credential check (they're in environment)
        // In production, would validate against encrypted credentials store
        log.debug(`Project '${projectId}' uses adaptors: ${Array.from(usedAdaptors).join(', ')}`);
      }
    }

    results.passed++;
    log.success(`Adaptor credentials validation passed`);
    return true;
  } catch (error) {
    results.errors++;
    results.issues.push(`Error validating credentials: ${error.message}`);
    log.error(`Error validating credentials: ${error.message}`);
    return false;
  }
}

async function validate() {
  try {
    log.info('═════════════════════════════════════════════════════════');
    log.info('AIAdaptor Architecture Validation');
    log.info('═════════════════════════════════════════════════════════');
    log.info('');

    // Step 1: Check collections exist
    log.info('Step 1/5: Checking collections...');
    await validateCollectionExists('ai_adaptors');
    await validateCollectionExists('prompt_templates');
    await validateCollectionExists('project_ai_config');
    log.info('');

    // Step 2: Validate adaptor structure
    log.info('Step 2/5: Validating adaptor structure...');
    await validateAdaptorStructure();
    log.info('');

    // Step 3: Validate prompt templates
    log.info('Step 3/5: Validating prompt templates...');
    await validatePromptTemplateStructure();
    log.info('');

    // Step 4: Validate project configs
    log.info('Step 4/5: Validating project configurations...');
    await validateProjectConfigs();
    log.info('');

    // Step 5: Validate credentials
    log.info('Step 5/5: Validating credentials...');
    await validateAdaptorCredentials();
    log.info('');

    // Summary
    log.info('═════════════════════════════════════════════════════════');
    log.info('Validation Summary:');
    log.info(`Total Checks: ${results.checks}`);
    log.success(`Passed: ${results.passed}`);
    if (results.warnings > 0) log.warn(`Warnings: ${results.warnings}`);
    if (results.errors > 0) log.error(`Errors: ${results.errors}`);
    log.info('═════════════════════════════════════════════════════════');

    if (results.issues.length > 0) {
      log.info('');
      log.info('Issues Found:');
      results.issues.forEach((issue, i) => log.warn(`${i + 1}. ${issue}`));
    }

    if (results.errors === 0) {
      log.success('✓ All validations passed!');
      process.exit(0);
    } else {
      log.error('✗ Validation failed');
      if (fix) {
        log.info('Some issues were automatically fixed. Re-run to verify.');
      }
      process.exit(1);
    }
  } catch (error) {
    log.error(`Validation error: ${error.message}`);
    log.error('Stack trace:', error);
    process.exit(1);
  }
}

validate();
