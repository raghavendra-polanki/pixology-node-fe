#!/usr/bin/env node

/**
 * Seed Recipes Script
 * Directly adds recipe templates to Firestore
 * Run: node scripts/seedRecipes.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import {
  PERSONA_GENERATION_RECIPE,
  NARRATIVE_GENERATION_RECIPE,
  STORYBOARD_GENERATION_RECIPE,
  SCREENPLAY_GENERATION_RECIPE,
  VIDEO_GENERATION_RECIPE,
} from '../api/services/RecipeSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Read service account path from environment variable, fallback to default
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../serviceAccountKey.json');

console.log(`Using service account: ${serviceAccountPath}`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// List of all recipes to seed
const RECIPES = [
  PERSONA_GENERATION_RECIPE,
  NARRATIVE_GENERATION_RECIPE,
  STORYBOARD_GENERATION_RECIPE,
  SCREENPLAY_GENERATION_RECIPE,
  VIDEO_GENERATION_RECIPE,
];

async function seedRecipes() {
  try {
    console.log('🌱 Starting recipe seeding...\n');

    const results = {
      created: [],
      skipped: [],
      failed: [],
    };

    // Seed each recipe
    for (const recipe of RECIPES) {
      try {
        console.log(`Processing: ${recipe.name} (${recipe.id})`);

        // Check if recipe already exists
        const existingDoc = await db.collection('recipes').doc(recipe.id).get();

        if (existingDoc.exists) {
          console.log('  ⚠️  Already exists - skipping');
          results.skipped.push(recipe.id);
          continue;
        }

        // Create the recipe
        console.log('  📝 Creating recipe...');
        await db.collection('recipes').doc(recipe.id).set(recipe);

        // Verify it was created
        const verifyDoc = await db.collection('recipes').doc(recipe.id).get();

        if (verifyDoc.exists) {
          console.log('  ✅ Created successfully!');
          results.created.push(recipe.id);
        }
      } catch (recipeError) {
        console.error(`  ❌ Error: ${recipeError.message}`);
        results.failed.push(recipe.id);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Seeding Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Created: ${results.created.length}`);
    if (results.created.length > 0) {
      results.created.forEach(id => console.log(`   - ${id}`));
    }
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    if (results.skipped.length > 0) {
      results.skipped.forEach(id => console.log(`   - ${id}`));
    }
    console.log(`❌ Failed: ${results.failed.length}`);
    if (results.failed.length > 0) {
      results.failed.forEach(id => console.log(`   - ${id}`));
    }

    if (results.created.length > 0) {
      console.log('\n🎉 Recipes are ready to use!');
      console.log('\n📋 Next steps:');
      console.log('   1. Refresh your browser');
      console.log('   2. Navigate to any stage');
      console.log('   3. Click "Edit Recipe" to use the recipe\n');
    }

    if (results.failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error seeding recipes:');
    console.error('   ', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

seedRecipes();
