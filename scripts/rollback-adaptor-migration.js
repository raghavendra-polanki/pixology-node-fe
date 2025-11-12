#!/usr/bin/env node

/**
 * Rollback Script: Revert from AIAdaptor Architecture to Previous State
 *
 * Usage:
 *   node scripts/rollback-adaptor-migration.js --backup-dir <path>
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const backupDirArg = process.argv.find(arg => arg.startsWith('--backup-dir'));
const force = process.argv.includes('--force');

if (!backupDirArg) {
  console.error('Error: --backup-dir argument is required');
  console.error('Usage: node scripts/rollback-adaptor-migration.js --backup-dir <path>');
  process.exit(1);
}

const backupDir = backupDirArg.split('=')[1];

if (!fs.existsSync(backupDir)) {
  console.error(`Backup directory not found: ${backupDir}`);
  process.exit(1);
}

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
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[✓] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[⚠] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[✗] ${new Date().toISOString()} - ${msg}`)
};

async function rollback() {
  try {
    log.info('═════════════════════════════════════════════════════════');
    log.info('Starting AIAdaptor Architecture Rollback');
    log.info(`Backup Directory: ${backupDir}`);
    log.info('═════════════════════════════════════════════════════════');

    // Read metadata
    const metadataPath = path.join(backupDir, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    log.info(`Backup created at: ${metadata.timestamp}`);
    log.info(`Rolling back changes...`);

    // Step 1: Delete new collections
    log.info('Step 1/3: Deleting new collections...');

    const newCollections = ['ai_adaptors', 'prompt_templates', 'project_ai_config'];

    for (const collectionName of newCollections) {
      const snapshot = await db.collection(collectionName).get();
      let deleted = 0;

      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deleted++;
      }

      log.success(`Deleted ${deleted} documents from ${collectionName}`);
    }

    // Step 2: Verify deletion
    log.info('Step 2/3: Verifying deletion...');

    for (const collectionName of newCollections) {
      const snapshot = await db.collection(collectionName).get();
      if (snapshot.size === 0) {
        log.success(`✓ ${collectionName} is empty`);
      } else {
        log.warn(`⚠ ${collectionName} still has ${snapshot.size} documents`);
      }
    }

    // Step 3: Restore routing to old services
    log.info('Step 3/3: Reverting code changes...');
    log.info('Note: Code reversion requires git checkout. Run:');
    log.info('  git checkout HEAD -- api/services/ActionExecutor.js');
    log.info('  git checkout HEAD -- api/services/*.js');

    log.info('');
    log.success('═════════════════════════════════════════════════════════');
    log.success('Rollback completed!');
    log.success('═════════════════════════════════════════════════════════');
    log.info('');
    log.info('Next steps:');
    log.info('1. Revert code changes: git reset --hard HEAD');
    log.info('2. Restart application: pm2 restart pixology');
    log.info('3. Verify functionality: npm test');

    process.exit(0);
  } catch (error) {
    log.error(`Rollback failed: ${error.message}`);
    log.error('Stack trace:', error);
    log.warn('');
    log.warn('Rollback incomplete. Manual intervention may be required.');
    log.warn('Contact DevOps team immediately.');
    process.exit(1);
  }
}

rollback();
