#!/usr/bin/env node

/**
 * Seed Recipes Script
 * Directly adds recipe templates to Firestore
 * Run: node scripts/seedRecipes.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

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

// Persona Generation Recipe Template
const PERSONA_GENERATION_RECIPE = {
  id: 'recipe_persona_generation_v1',
  name: 'Persona Generation Pipeline',
  description: 'Generate persona details and images for Stage 2',
  stageType: 'stage_2_personas',
  version: 1,

  nodes: [
    {
      id: 'generate_persona_details',
      name: 'Generate Persona Details',
      type: 'text_generation',
      order: 1,

      inputMapping: {
        productDescription: 'external_input.productDescription',
        targetAudience: 'external_input.targetAudience',
        numberOfPersonas: 'external_input.numberOfPersonas',
      },
      outputKey: 'personaDetails',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 2000,
      },

      prompt: `
You are an expert Casting Director and Consumer Psychologist. Your task is to create detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators who would authentically recommend this product.

**PRODUCT CONTEXT:**
Product Description: {productDescription}
Target Audience: {targetAudience}

**YOUR TASK:**
Create {numberOfPersonas} UNIQUE personas with DIVERSE characteristics who would genuinely recommend this product. Each person should feel real, relatable, and authentic with distinct demographics, personalities, and backgrounds.

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "coreIdentity": {
      "name": "A realistic first name",
      "age": "Age as number between 18-65",
      "demographic": "Brief demographic description",
      "motivation": "Why would this person use/recommend this product?",
      "bio": "A 2-3 sentence biography"
    },
    "physicalAppearance": {
      "general": "Overall appearance description",
      "hair": "Hair color, style, and texture",
      "build": "Body type and build",
      "clothingAesthetic": "Their style of dress",
      "signatureDetails": "Distinctive features or accessories"
    },
    "personalityAndCommunication": {
      "demeanor": "How they present themselves",
      "energyLevel": "Their natural energy",
      "speechPatterns": "How they talk",
      "values": "Core values they care about"
    },
    "lifestyleAndWorldview": {
      "profession": "What they do for work",
      "hobbies": "3-4 hobbies or interests",
      "lifestyleChoices": "How they spend their time and money",
      "socialMediaHabits": "How they use social media"
    },
    "whyAndCredibility": {
      "whyTheyUseProduct": "Their genuine reason for using this product",
      "credibility": "Why their recommendation would be credible",
      "influenceStyle": "How they influence others"
    }
  }
]

**IMPORTANT:** Return ONLY the JSON array, no additional text.
      `.trim(),

      promptTemplate:
        'Generate {numberOfPersonas} personas for {productDescription} targeting {targetAudience}',

      parameters: {
        numberOfPersonas: 3,
        diversityFocus: true,
        jsonFormat: true,
      },

      dependencies: [],
      errorHandling: {
        onError: 'fail',
        retryCount: 2,
        timeout: 30000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates diverse persona descriptions using Gemini',
      },
    },

    {
      id: 'generate_persona_images',
      name: 'Generate Persona Images',
      type: 'image_generation',
      order: 2,

      inputMapping: {
        personaData: 'generate_persona_details.output',
      },
      outputKey: 'personaImages',

      aiModel: {
        provider: 'image_generator',
        modelName: 'dall-e-3',
        temperature: 0.8,
      },

      prompt: `
Create a professional UGC-style portrait photo of a person with these characteristics:

**Demographics:**
- Name: {name}
- Age: {age}
- Gender: {gender}

**Physical Appearance:**
- {general}
- Hair: {hair}
- Build: {build}
- Style: {clothingAesthetic}
- Notable features: {signatureDetails}

**Personality Vibe:**
- Demeanor: {demeanor}
- Energy: {energyLevel}

Create a realistic, detailed portrait with professional lighting and clean background.
      `.trim(),

      parameters: {
        imageFormat: 'jpg',
        resolution: '1024x1024',
      },

      dependencies: ['generate_persona_details'],
      errorHandling: {
        onError: 'skip',
        defaultOutput: null,
        timeout: 60000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates persona portrait images',
      },
    },

    {
      id: 'combine_and_upload',
      name: 'Combine Data and Upload',
      type: 'data_processing',
      order: 3,

      inputMapping: {
        personaDetails: 'generate_persona_details.output',
        personaImages: 'generate_persona_images.output',
      },
      outputKey: 'finalPersonas',

      parameters: {
        uploadService: 'gcs',
        combinationLogic: 'merge_details_with_images',
      },

      dependencies: ['generate_persona_details', 'generate_persona_images'],
      errorHandling: {
        onError: 'fail',
        timeout: 30000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Combines persona details with images and uploads to GCS',
      },
    },
  ],

  edges: [
    {
      from: 'generate_persona_details',
      to: 'generate_persona_images',
    },
    {
      from: 'generate_persona_images',
      to: 'combine_and_upload',
    },
  ],

  executionConfig: {
    timeout: 120000,
    retryPolicy: {
      maxRetries: 1,
      backoffMs: 1000,
    },
    parallelExecution: false,
    continueOnError: false,
  },

  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
    tags: ['persona', 'generation', 'stage2'],
  },
};

async function seedRecipes() {
  try {
    console.log('🌱 Starting recipe seeding...\n');

    // Check if recipe already exists
    const existingDoc = await db
      .collection('recipes')
      .doc(PERSONA_GENERATION_RECIPE.id)
      .get();

    if (existingDoc.exists) {
      console.log('⚠️  Recipe already exists in Firestore');
      console.log('   ID:', PERSONA_GENERATION_RECIPE.id);
      console.log('   Name:', PERSONA_GENERATION_RECIPE.name);
      console.log('\n✅ No changes made.\n');
      return;
    }

    // Create the recipe
    console.log('📝 Creating recipe: Persona Generation Pipeline');
    await db
      .collection('recipes')
      .doc(PERSONA_GENERATION_RECIPE.id)
      .set(PERSONA_GENERATION_RECIPE);

    console.log('✅ Recipe created successfully!\n');

    // Verify it was created
    const verifyDoc = await db
      .collection('recipes')
      .doc(PERSONA_GENERATION_RECIPE.id)
      .get();

    if (verifyDoc.exists) {
      console.log('✨ Verification successful:');
      console.log('   ID:', verifyDoc.id);
      console.log('   Name:', verifyDoc.data().name);
      console.log('   Stage Type:', verifyDoc.data().stageType);
      console.log('   Nodes:', verifyDoc.data().nodes.length);
      console.log('   Edges:', verifyDoc.data().edges.length);
      console.log('\n🎉 Recipe is ready to use!');
      console.log('\n📋 Next steps:');
      console.log('   1. Refresh your browser');
      console.log('   2. Go to Stage 2: Personas');
      console.log('   3. Click "Edit Recipe" button');
      console.log('   4. You should see the recipe loaded\n');
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
