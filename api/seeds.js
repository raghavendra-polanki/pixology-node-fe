/**
 * Seeds API
 * Endpoints for seeding database collections
 */

import express from 'express';
import { db } from './config/firestore.js';
import {
  PERSONA_GENERATION_RECIPE,
  NARRATIVE_GENERATION_RECIPE,
  STORYBOARD_GENERATION_RECIPE,
  SCREENPLAY_GENERATION_RECIPE,
  VIDEO_GENERATION_RECIPE
} from './services/RecipeSeedData.js';

const router = express.Router();

/**
 * Extract prompt templates from recipes
 * Maps recipe nodes containing prompts to prompt_templates collection
 * Extracts all node types (text_generation, image_generation, video_generation)
 */
function extractPromptsFromRecipes() {
  const promptTemplates = {};

  // Stage 2: Persona Generation (Text + Image)
  const personaTextNode = PERSONA_GENERATION_RECIPE.nodes.find(n => n.type === 'text_generation');
  const personaImageNode = PERSONA_GENERATION_RECIPE.nodes.find(n => n.type === 'image_generation');

  if (personaTextNode?.prompt || personaImageNode?.prompt) {
    promptTemplates['stage_2_personas'] = {
      stageType: 'stage_2_personas',
      templateId: 'stage_2_personas',
      version: 1,
      name: 'Persona Generation',
      prompts: {}
    };

    if (personaTextNode?.prompt) {
      promptTemplates['stage_2_personas'].prompts.textGeneration = {
        systemPrompt: 'You are an expert Casting Director and Consumer Psychologist. Your task is to create detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators.',
        userPromptTemplate: personaTextNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}')
      };
    }

    if (personaImageNode?.prompt) {
      promptTemplates['stage_2_personas'].prompts.imageGeneration = {
        systemPrompt: 'You are an expert at generating realistic and diverse professional portrait photos for UGC creators.',
        userPromptTemplate: personaImageNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}'),
        aiModel: personaImageNode.aiModel || {}
      };
    }
  }

  // Stage 3: Narrative Generation (Text only)
  const narrativeNode = NARRATIVE_GENERATION_RECIPE.nodes.find(n => n.type === 'text_generation');
  if (narrativeNode?.prompt) {
    promptTemplates['stage_3_narratives'] = {
      stageType: 'stage_3_narratives',
      templateId: 'stage_3_narratives',
      version: 1,
      name: 'Narrative Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a creative storyteller and marketing narrative expert for video content.',
          userPromptTemplate: narrativeNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}')
        }
      }
    };
  }

  // Stage 4: Storyboard Generation (Text + Image)
  const storyboardTextNode = STORYBOARD_GENERATION_RECIPE.nodes.find(n => n.type === 'text_generation');
  const storyboardImageNode = STORYBOARD_GENERATION_RECIPE.nodes.find(n => n.type === 'image_generation');

  if (storyboardTextNode?.prompt || storyboardImageNode?.prompt) {
    promptTemplates['stage_4_storyboard'] = {
      stageType: 'stage_4_storyboard',
      templateId: 'stage_4_storyboard',
      version: 1,
      name: 'Storyboard Generation',
      prompts: {}
    };

    if (storyboardTextNode?.prompt) {
      promptTemplates['stage_4_storyboard'].prompts.textGeneration = {
        systemPrompt: 'You are an expert storyboard designer for video marketing.',
        userPromptTemplate: storyboardTextNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}')
      };
    }

    if (storyboardImageNode?.prompt) {
      promptTemplates['stage_4_storyboard'].prompts.imageGeneration = {
        systemPrompt: 'You are an expert at generating professional storyboard visuals for UGC marketing videos with consistent character representation.',
        userPromptTemplate: storyboardImageNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}'),
        aiModel: storyboardImageNode.aiModel || {}
      };
    }
  }

  // Stage 5: Screenplay Generation (Text only)
  const screenplayNode = SCREENPLAY_GENERATION_RECIPE.nodes.find(n => n.type === 'text_generation');
  if (screenplayNode?.prompt) {
    promptTemplates['stage_5_screenplay'] = {
      stageType: 'stage_5_screenplay',
      templateId: 'stage_5_screenplay',
      version: 1,
      name: 'Screenplay Generation',
      prompts: {
        textGeneration: {
          systemPrompt: 'You are a professional screenwriter and video production specialist.',
          userPromptTemplate: screenplayNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}')
        }
      }
    };
  }

  // Stage 6: Video Generation (Video type)
  const videoNode = VIDEO_GENERATION_RECIPE.nodes.find(n => n.type === 'video_generation');

  if (videoNode?.prompt) {
    promptTemplates['stage_6_video'] = {
      stageType: 'stage_6_video',
      templateId: 'stage_6_video',
      version: 1,
      name: 'Video Generation',
      prompts: {
        videoGeneration: {
          systemPrompt: 'You are a professional video production director specializing in UGC-style marketing videos.',
          userPromptTemplate: videoNode.prompt.replace(/\{/g, '{{').replace(/\}/g, '}}'),
          aiModel: videoNode.aiModel || {}
        }
      }
    };
  }

  return promptTemplates;
}

/**
 * POST /api/seeds/prompts
 * Seeds prompt templates from recipes to Firestore
 */
router.post('/prompts', async (req, res) => {
  try {
    const promptTemplates = extractPromptsFromRecipes();
    const promptCollectionRef = db.collection('prompt_templates');

    let createdCount = 0;
    const results = [];

    for (const [stageId, template] of Object.entries(promptTemplates)) {
      try {
        // Check if template already exists
        const existing = await promptCollectionRef
          .where('stageType', '==', stageId)
          .limit(1)
          .get();

        if (!existing.empty) {
          results.push({
            stage: stageId,
            status: 'skipped',
            reason: 'Template already exists'
          });
          continue;
        }

        // Create new template
        const docRef = await promptCollectionRef.add({
          ...template,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
          source: 'recipe_migration'
        });

        createdCount++;
        results.push({
          stage: stageId,
          status: 'created',
          id: docRef.id
        });
      } catch (error) {
        results.push({
          stage: stageId,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Seeded ${createdCount} prompt templates from recipes`,
      results
    });
  } catch (error) {
    console.error('Error seeding prompts:', error);
    res.status(500).json({
      error: 'Failed to seed prompts',
      message: error.message
    });
  }
});

/**
 * DELETE /api/seeds/prompts
 * Delete all existing prompt templates
 */
router.delete('/prompts', async (req, res) => {
  try {
    const promptCollectionRef = db.collection('prompt_templates');
    const snapshot = await promptCollectionRef.get();

    const batch = db.batch();
    let deletedCount = 0;

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    res.json({
      success: true,
      message: `Deleted ${deletedCount} prompt templates`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error deleting prompts:', error);
    res.status(500).json({
      error: 'Failed to delete prompts',
      message: error.message
    });
  }
});

/**
 * GET /api/seeds/status
 * Check which prompt templates exist
 */
router.get('/status', async (req, res) => {
  try {
    const promptCollectionRef = db.collection('prompt_templates');
    const snapshot = await promptCollectionRef.get();

    const templates = {};
    snapshot.forEach(doc => {
      templates[doc.data().stageType] = {
        id: doc.id,
        version: doc.data().version,
        createdAt: doc.data().createdAt,
        source: doc.data().source
      };
    });

    const stages = [
      'stage_2_personas',
      'stage_3_narratives',
      'stage_4_storyboard',
      'stage_5_screenplay',
      'stage_6_video'
    ];

    const status = stages.map(stage => ({
      stage,
      exists: !!templates[stage],
      details: templates[stage] || null
    }));

    res.json({
      success: true,
      status,
      summary: `${status.filter(s => s.exists).length}/${stages.length} templates seeded`
    });
  } catch (error) {
    console.error('Error checking seed status:', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: error.message
    });
  }
});

export default router;
