/**
 * Unified Prompt Template Seed Data
 * Imports prompt templates from all products (StoryLab, GameLab, etc.)
 */

// Import StoryLab prompts
import {
  STAGE_2_PERSONAS_TEMPLATE,
  STAGE_3_NARRATIVES_TEMPLATE,
  STAGE_4_STORYBOARD_TEMPLATE,
  STAGE_5_SCREENPLAY_TEMPLATE,
  STAGE_6_VIDEO_TEMPLATE,
} from '../products/storylab/prompts/seedData.js';

// Import GameLab prompts
import {
  STAGE_2_THEME_GENERATION_TEMPLATE,
  STAGE_3_PLAYER_SUGGESTION_TEMPLATE,
} from '../products/gamelab/prompts/seedData.js';

// Combine all prompt templates
export const ALL_PROMPT_TEMPLATES = [
  // StoryLab templates
  STAGE_2_PERSONAS_TEMPLATE,
  STAGE_3_NARRATIVES_TEMPLATE,
  STAGE_4_STORYBOARD_TEMPLATE,
  STAGE_5_SCREENPLAY_TEMPLATE,
  STAGE_6_VIDEO_TEMPLATE,

  // GameLab templates
  STAGE_2_THEME_GENERATION_TEMPLATE,
  STAGE_3_PLAYER_SUGGESTION_TEMPLATE,
];

export default ALL_PROMPT_TEMPLATES;
