import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKeyGoogle.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pixology-1b0f4'
});

const db = admin.firestore();
db.settings({ databaseId: process.env.FIRESTORE_DATABASE_ID || 'pixology-v2' });

// Import the recipe data to extract prompts
const RecipeSeedDataPath = path.join(__dirname, 'api/services/RecipeSeedData.js');
const RecipeSeedDataContent = readFileSync(RecipeSeedDataPath, 'utf8');

// Extract prompts from recipes manually
const prompts = {
  'stage_2_personas': {
    templateId: 'stage_2_personas_v1',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are an expert Casting Director and Consumer Psychologist.',
        userPromptTemplate: `You are an expert Casting Director and Consumer Psychologist. Your task is to create detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators who would authentically recommend this product.

PRODUCT CONTEXT:
Product Description: {{productDescription}}
Target Audience: {{targetAudience}}
Product Image URL: {{productImageUrl}}

IMAGE ANALYSIS INSTRUCTION:
If a Product Image URL is provided, analyze it carefully to understand:
- The visual design, color scheme, and aesthetic of the product
- The product category, quality indicators, and positioning
- The target market indicated by the visual design
- Design elements that appeal to specific demographics
Use these visual insights to create personas who would be authentically attracted to this product's visual and design aesthetic.

YOUR TASK:
Create {{numberOfPersonas}} UNIQUE personas with DIVERSE characteristics who would genuinely recommend this product based on both the description AND the visual presentation.

RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):
[{
  "coreIdentity": {"name": "", "age": 0, "demographic": "", "motivation": "", "bio": ""},
  "physicalAppearance": {"general": "", "hair": "", "build": "", "clothingAesthetic": "", "signatureDetails": ""},
  "personalityAndCommunication": {"demeanor": "", "energyLevel": "", "speechPatterns": "", "values": []},
  "lifestyleAndWorldview": {"profession": "", "hobbies": [], "lifestyleChoices": "", "socialMediaHabits": ""},
  "whyAndCredibility": {"whyTheyUseProduct": "", "credibility": "", "influenceStyle": ""}
}]`
      }
    }
  },
  'stage_3_narratives': {
    templateId: 'stage_3_narratives_v1',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are a creative storyteller and marketing narrative expert for video content.',
        userPromptTemplate: `You are a creative storyteller and marketing narrative expert for video content. Generate compelling narrative themes and story arcs for marketing videos.

PRODUCT CONTEXT:
Product: {{productDescription}}
Target Audience: {{targetAudience}}
Selected Personas: {{selectedPersonas}}

YOUR TASK:
Generate {{numberOfNarratives}} unique narrative themes that would resonate with the target audience and personas. Each narrative should have a compelling story arc.

RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):
[{
  "id": "",
  "title": "",
  "description": "",
  "structure": "",
  "gradient": "",
  "patternColor": "",
  "ringColor": ""
}]`
      }
    }
  },
  'stage_4_storyboard': {
    templateId: 'stage_4_storyboard_v1',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are an expert storyboard designer for video marketing.',
        userPromptTemplate: `You are an expert storyboard designer for video marketing. Create detailed storyboard scenes for a video advertisement.

PRODUCT CONTEXT:
Product: {{productDescription}}
Target Audience: {{targetAudience}}
Video Duration: {{videoDuration}}
Number of Scenes: {{numberOfScenes}}

PERSONA:
Name: {{selectedPersonaName}}
Description: {{selectedPersonaDescription}}

NARRATIVE:
Theme: {{narrativeTheme}}
Structure: {{narrativeStructure}}

YOUR TASK:
Create {{numberOfScenes}} detailed storyboard scenes that form a compelling narrative arc.

RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):
[{
  "sceneNumber": 1,
  "title": "",
  "description": "",
  "location": "",
  "persona": "",
  "product": "",
  "visualElements": "",
  "cameraWork": "",
  "keyFrameDescription": ""
}]`
      }
    }
  },
  'stage_5_screenplay': {
    templateId: 'stage_5_screenplay_v1',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are a professional screenwriter and video production specialist.',
        userPromptTemplate: `You are a professional screenwriter and video production specialist. Convert storyboard scenes into a detailed screenplay format.

STORYBOARD SCENES:
{{storyboardScenes}}

PERSONA: {{selectedPersonaName}}
VIDEO DURATION: {{videoDuration}}

YOUR TASK:
Create a detailed screenplay with timings, dialogue, and production notes.

RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):
[{
  "sceneNumber": 1,
  "timeStart": "0:00",
  "timeEnd": "0:05",
  "visual": "",
  "cameraFlow": "",
  "script": "",
  "backgroundMusic": "",
  "transition": ""
}]`
      }
    }
  },
  'stage_6_video': {
    templateId: 'stage_6_video_v1',
    prompts: {
      textGeneration: {
        systemPrompt: 'You are a professional video production director.',
        userPromptTemplate: `You are a professional video production director. Generate video production specifications from screenplay.

SCENE NUMBER: {{sceneNumber}}
VISUAL: {{visual}}
CAMERA FLOW: {{cameraFlow}}
SCRIPT: {{script}}
BACKGROUND MUSIC: {{backgroundMusic}}
DURATION: {{duration}}

YOUR TASK:
Generate detailed video production instructions and parameters.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "sceneNumber": {{sceneNumber}},
  "videoSpecs": {},
  "productPlacement": {},
  "audioMix": {},
  "timing": {},
  "technicalNotes": ""
}`
      }
    }
  }
};

async function migratePrompts() {
  try {
    const promptTemplatesRef = db.collection('prompt_templates');

    for (const [stageId, data] of Object.entries(prompts)) {
      // Check if template already exists
      const existingQuery = await promptTemplatesRef
        .where('stageType', '==', stageId)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        console.log(`⊘ Skipping ${stageId} - already exists`);
        continue;
      }

      const docRef = await promptTemplatesRef.add({
        stageType: stageId,
        templateId: data.templateId,
        version: 1,
        prompts: data.prompts,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        active: true,
        source: 'recipe_migration'
      });

      console.log(`✓ Created prompt template: ${stageId} (ID: ${docRef.id})`);
    }

    console.log('\n✓ Prompt migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating prompts:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migratePrompts();
