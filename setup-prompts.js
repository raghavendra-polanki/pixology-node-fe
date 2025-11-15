import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../Workspace/pixology-workspace/pixology-node-fe/serviceAccountKeyGoogle.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pixology-1b0f4'
});

const db = admin.firestore();
db.settings({ databaseId: process.env.FIRESTORE_DATABASE_ID || 'pixology-v2' });

const prompts = {
  'stage_2_personas': {
    systemPrompt: 'You are an expert in creating detailed customer personas for marketing campaigns.',
    userPromptTemplate: `Create {{numberOfPersonas}} detailed customer personas for a {{productDescription}} targeting {{targetAudience}}. 
Return a JSON array of personas with fields: name, age, role, description, goals, painPoints, preferences.`
  },
  'stage_3_narratives': {
    systemPrompt: 'You are a creative storyteller and marketing narrative expert.',
    userPromptTemplate: `Generate {{numberOfNarratives}} narrative themes for marketing a {{productDescription}} to {{targetAudience}}.
Consider personas: {{selectedPersonas}}.
Return a JSON array with fields: id, title, description, structure, gradient, patternColor, ringColor.`
  },
  'stage_4_storyboard': {
    systemPrompt: 'You are an expert storyboard designer for video marketing.',
    userPromptTemplate: `Create {{numberOfScenes}} storyboard scenes for a {{videoDuration}} video about {{productDescription}} for {{targetAudience}}.
Persona: {{selectedPersonaName}} - {{selectedPersonaDescription}}
Narrative: {{narrativeTheme}} ({{narrativeStructure}})
Return a JSON array of scenes with fields: sceneNumber, title, description, location, persona, product, visualElements, cameraWork, keyFrameDescription.`
  },
  'stage_5_screenplay': {
    systemPrompt: 'You are an expert screenplay writer for UGC marketing videos.',
    userPromptTemplate: `Create a detailed screenplay for {{videoDuration}} video from these storyboard scenes:
{{storyboardScenes}}
Persona: {{selectedPersonaName}}
Return JSON array of screenplay entries with: sceneNumber, timeStart, timeEnd, visual, cameraFlow, script, backgroundMusic, transition.`
  },
  'stage_6_video': {
    systemPrompt: 'You are an expert video production director.',
    userPromptTemplate: `Generate video production instructions for scene {{sceneNumber}}:
Visual: {{visual}}
Camera Flow: {{cameraFlow}}
Script: {{script}}
Background Music: {{backgroundMusic}}
Duration: {{duration}}
Return JSON with video generation parameters.`
  }
};

async function setupPrompts() {
  try {
    const promptTemplatesRef = db.collection('prompt_templates');
    
    for (const [stageId, promptContent] of Object.entries(prompts)) {
      const docRef = await promptTemplatesRef.add({
        stageType: stageId,
        templateId: stageId,
        version: 1,
        prompts: {
          textGeneration: {
            systemPrompt: promptContent.systemPrompt,
            userPromptTemplate: promptContent.userPromptTemplate
          }
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        active: true
      });
      
      console.log(`✓ Created prompt template: ${stageId} (ID: ${docRef.id})`);
    }
    
    console.log('\n✓ All prompt templates created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up prompts:', error);
    process.exit(1);
  }
}

setupPrompts();
