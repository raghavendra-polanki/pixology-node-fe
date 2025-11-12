#!/usr/bin/env node

/**
 * Validation Script: AI Adaptor Architecture Configuration
 *
 * Validates that all projects are properly configured for the new architecture
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

const STAGES = [
  'stage_2_personas',
  'stage_3_narratives',
  'stage_4_storyboard',
  'stage_5_screenplay',
  'stage_6_video',
];

/**
 * Validate single project configuration
 */
async function validateProject(projectId) {
  const issues = [];
  const warnings = [];

  try {
    // Check AI config exists
    const configDoc = await db.collection('project_ai_config').doc(projectId).get();
    if (!configDoc.exists) {
      issues.push('project_ai_config document not found');
      return { status: 'error', issues };
    }

    const config = configDoc.data();

    // Check stage configurations
    for (const stage of STAGES) {
      const stageConfig = config.stageAdaptors?.[stage];

      if (!stageConfig) {
        warnings.push(`No configuration for ${stage}`);
        continue;
      }

      const textGen = stageConfig.textGeneration;
      if (!textGen) {
        warnings.push(`${stage}: No text generation adaptor configured`);
      } else {
        if (!textGen.adaptorId) {
          issues.push(`${stage}: Missing adaptorId for text generation`);
        }
        if (!textGen.modelId) {
          issues.push(`${stage}: Missing modelId for text generation`);
        }
      }
    }

    return {
      status: issues.length === 0 ? (warnings.length === 0 ? 'valid' : 'warning') : 'error',
      issues,
      warnings,
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Validate all projects
 */
async function validateAllProjects() {
  try {
    console.log('🔍 Validating AI Adaptor Architecture Configuration\n');

    const projectsSnapshot = await db.collection('projects').get();

    if (projectsSnapshot.empty) {
      console.log('No projects found');
      return;
    }

    console.log(`Found ${projectsSnapshot.size} projects\n`);

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const result = await validateProject(projectId);

      const statusSymbol = {
        valid: '✅',
        warning: '⚠️',
        error: '❌',
      }[result.status];

      console.log(`${statusSymbol} ${projectId}`);

      if (result.issues && result.issues.length > 0) {
        result.issues.forEach((issue) => console.log(`    ✗ ${issue}`));
        errorCount++;
      } else if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning) => console.log(`    ⚠ ${warning}`));
        warningCount++;
      } else {
        validCount++;
      }

      if (result.error) {
        console.log(`    ✗ ${result.error}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Valid: ${validCount} | ⚠️ Warnings: ${warningCount} | ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('Fatal error during validation:', error);
    process.exit(1);
  }
}

/**
 * Main validation flow
 */
async function main() {
  try {
    await validateAllProjects();
    await admin.app().delete();
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
