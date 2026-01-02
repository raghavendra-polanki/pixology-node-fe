#!/usr/bin/env node

/**
 * Sync Prompts From Database Script
 * Fetches latest prompt templates from Firestore and updates PromptTemplateSeedData.js
 * Run: node scripts/syncPromptsFromDatabase.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.error('   Required for Firestore authentication');
  process.exit(1);
}

console.log(`✓ Using service account: ${serviceAccountPath}`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();
db.settings({ databaseId: process.env.FIRESTORE_DATABASE_ID || 'pixology-storylab' });

/**
 * Convert a template object to formatted JavaScript code
 */
function templateToCode(template, constName) {
  const indent = '  ';
  const indent2 = '    ';
  const indent3 = '      ';
  const indent4 = '        ';

  let code = `export const ${constName} = {\n`;
  code += `${indent}id: '${template.id}',\n`;
  code += `${indent}stageType: '${template.stageType}',\n`;
  code += `${indent}prompts: [\n`;

  template.prompts.forEach((prompt, idx) => {
    code += `${indent2}{\n`;
    code += `${indent3}id: '${prompt.id}',\n`;
    code += `${indent3}capability: '${prompt.capability}',\n`;
    code += `${indent3}name: '${prompt.name}',\n`;
    code += `${indent3}description: '${prompt.description}',\n`;
    code += `${indent3}systemPrompt: '${escapeString(prompt.systemPrompt || '')}',\n`;
    code += `${indent3}userPromptTemplate: \`${escapeTemplate(prompt.userPromptTemplate || '')}\`,\n`;
    code += `${indent3}outputFormat: '${prompt.outputFormat}',\n`;
    code += `${indent3}variables: [\n`;

    (prompt.variables || []).forEach((variable, vIdx) => {
      code += `${indent4}{ name: '${variable.name}', description: '${escapeString(variable.description)}', placeholder: '${escapeString(variable.placeholder)}' }`;
      if (vIdx < prompt.variables.length - 1) {
        code += ',';
      }
      code += '\n';
    });

    code += `${indent3}],\n`;
    code += `${indent3}isDefault: ${prompt.isDefault},\n`;
    code += `${indent3}isActive: ${prompt.isActive},\n`;
    code += `${indent3}createdBy: '${prompt.createdBy}',\n`;
    code += `${indent3}createdAt: new Date().toISOString(),\n`;
    code += `${indent3}updatedAt: new Date().toISOString(),\n`;
    code += `${indent2}}`;

    if (idx < template.prompts.length - 1) {
      code += ',';
    }
    code += '\n';
  });

  code += `${indent}],\n`;
  code += `${indent}createdAt: new Date().toISOString(),\n`;
  code += `${indent}updatedAt: new Date().toISOString(),\n`;
  code += '};\n';

  return code;
}

/**
 * Escape single quotes in strings
 */
function escapeString(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'");
}

/**
 * Escape template literals
 */
function escapeTemplate(str) {
  if (!str) return '';
  // Escape backticks and ${} in template literals
  return str.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

async function syncPromptsFromDatabase() {
  try {
    console.log('🔄 Syncing prompts from Firestore to PromptTemplateSeedData.js...\n');
    console.log(`Database: ${process.env.FIRESTORE_DATABASE_ID || 'pixology-storylab'}\n`);

    // Fetch all prompt templates from Firestore
    const templatesSnapshot = await db.collection('prompt_templates').get();

    if (templatesSnapshot.empty) {
      console.error('❌ No prompt templates found in database');
      process.exit(1);
    }

    console.log(`Found ${templatesSnapshot.docs.length} templates in database\n`);

    // Map stage types to constant names
    const stageTypeToConstName = {
      'stage_2_personas': 'STAGE_2_PERSONAS_TEMPLATE',
      'stage_3_narratives': 'STAGE_3_NARRATIVES_TEMPLATE',
      'stage_4_storyboard': 'STAGE_4_STORYBOARD_TEMPLATE',
      'stage_5_screenplay': 'STAGE_5_SCREENPLAY_TEMPLATE',
      'stage_6_video': 'STAGE_6_VIDEO_TEMPLATE',
    };

    const templates = {};
    const allConstNames = [];

    templatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const constName = stageTypeToConstName[data.stageType];

      if (constName) {
        templates[data.stageType] = data;
        allConstNames.push(constName);
        console.log(`✓ Loaded ${data.stageType}: ${data.prompts?.length || 0} prompts`);
      } else {
        console.warn(`⚠️  Unknown stage type: ${data.stageType}`);
      }
    });

    console.log('\n📝 Generating PromptTemplateSeedData.js...\n');

    // Generate the file content
    let fileContent = `/**\n`;
    fileContent += ` * Prompt Template Seed Data\n`;
    fileContent += ` * Default prompts for all stages - synced from database\n`;
    fileContent += ` * Last synced: ${new Date().toISOString()}\n`;
    fileContent += ` */\n\n`;

    // Generate each template constant in order
    const stageOrder = ['stage_2_personas', 'stage_3_narratives', 'stage_4_storyboard', 'stage_5_screenplay', 'stage_6_video'];

    stageOrder.forEach((stageType) => {
      if (templates[stageType]) {
        const constName = stageTypeToConstName[stageType];
        fileContent += templateToCode(templates[stageType], constName);
        fileContent += '\n';
      }
    });

    // Add ALL_PROMPT_TEMPLATES array
    fileContent += `// Export all templates as an array\n`;
    fileContent += `export const ALL_PROMPT_TEMPLATES = [\n`;
    allConstNames.forEach((name, idx) => {
      fileContent += `  ${name}`;
      if (idx < allConstNames.length - 1) {
        fileContent += ',';
      }
      fileContent += '\n';
    });
    fileContent += `];\n`;

    // Write to file
    const outputPath = path.join(__dirname, '../api/services/PromptTemplateSeedData.js');
    writeFileSync(outputPath, fileContent, 'utf8');

    console.log(`✅ PromptTemplateSeedData.js updated successfully!`);
    console.log(`   Path: ${outputPath}`);
    console.log('\n✨ Sync complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the sync
syncPromptsFromDatabase();
