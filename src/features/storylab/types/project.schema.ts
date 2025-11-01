/**
 * Zod Validation Schemas for Project Data Model
 */

import { z } from 'zod';

// User Input Schemas
export const UserInputCampaignDetailsSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required'),
  productDescription: z.string().min(1, 'Product description is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  videoLength: z.string().min(1, 'Video length is required'),
  callToAction: z.string().min(1, 'Call to action is required'),
  budget: z.string().optional(),
  deadline: z.string().datetime().optional(),
  additionalNotes: z.string().optional(),
});

export const UserInputNarrativePreferencesSchema = z.object({
  narrativeStyle: z.string().optional(),
  tone: z.string().optional(),
  keyMessages: z.array(z.string()).optional(),
  excludedTopics: z.array(z.string()).optional(),
  storyArc: z.string().optional(),
  additionalContext: z.string().optional(),
});

export const UserInputVisualDirectionSchema = z.object({
  visualStyle: z.string().optional(),
  colorPreferences: z.array(z.string()).optional(),
  atmosphereDescription: z.string().optional(),
  settingPreferences: z.array(z.string()).optional(),
  cameraStyle: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const UserInputScriptPreferencesSchema = z.object({
  scriptTone: z.string().optional(),
  dialogueStyle: z.string().optional(),
  inclusionPreferences: z.object({
    includeDialogue: z.boolean(),
    includeVoiceover: z.boolean(),
    includeOnScreenText: z.boolean(),
  }).optional(),
  pacePreference: z.string().optional(),
  callToActionPlacement: z.string().optional(),
  additionalRequirements: z.string().optional(),
});

export const UserInputPersonaSelectionSchema = z.object({
  selectedPersonaIds: z.array(z.string()),
  customPersonas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    targetCharacteristics: z.array(z.string()).optional(),
  })).optional(),
  primaryPersonaId: z.string().optional(),
});

// AI Generated Schemas
export const AIGeneratedPersonasSchema = z.object({
  personas: z.array(z.any()),
  generatedAt: z.date(),
  generationRecipeId: z.string(),
  generationExecutionId: z.string(),
  model: z.string(),
  temperature: z.number().optional(),
});

export const AIGeneratedNarrativeSchema = z.object({
  narrativeId: z.string(),
  synopsis: z.string(),
  fullNarrative: z.string(),
  acts: z.array(z.object({
    act: z.number(),
    description: z.string(),
    content: z.string(),
    estimatedDuration: z.string().optional(),
  })).optional(),
  themes: z.array(z.string()),
  emotionalJourney: z.string(),
  generatedAt: z.date(),
  generationRecipeId: z.string().optional(),
  generationExecutionId: z.string().optional(),
  model: z.string(),
  temperature: z.number().optional(),
});

export const StoryboardSceneSchema = z.object({
  sceneNumber: z.number(),
  title: z.string(),
  description: z.string(),
  visualDirection: z.string(),
  duration: z.string(),
  cameraInstructions: z.string().optional(),
  lighting: z.string().optional(),
  props: z.array(z.string()).optional(),
  suggestedAssets: z.array(z.string()).optional(),
  narrativeContent: z.string().optional(),
  dialogueOrVoiceover: z.string().optional(),
});

export const AIGeneratedStoryboardSchema = z.object({
  storyboardId: z.string(),
  scenes: z.array(StoryboardSceneSchema),
  totalDuration: z.string(),
  completionNotes: z.string().optional(),
  visualTheme: z.string(),
  consistencyNotes: z.string().optional(),
  generatedAt: z.date(),
  generationRecipeId: z.string().optional(),
  generationExecutionId: z.string().optional(),
  model: z.string(),
  temperature: z.number().optional(),
});

export const AIGeneratedScreenplaySchema = z.object({
  screenplayId: z.string(),
  title: z.string(),
  synopsis: z.string(),
  fullText: z.string(),
  sections: z.array(z.object({
    section: z.string(),
    content: z.string(),
    type: z.enum(['dialogue', 'voiceover', 'action', 'description']),
  })),
  callToActionIncluded: z.boolean(),
  callToActionText: z.string().optional(),
  estimatedDuration: z.string(),
  generatedAt: z.date(),
  generationRecipeId: z.string().optional(),
  generationExecutionId: z.string().optional(),
  model: z.string(),
  temperature: z.number().optional(),
});

export const VideoProductionDataSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
  videoUrl: z.string().url().optional(),
  duration: z.string(),
  format: z.string(),
  resolution: z.string().optional(),
  fileSize: z.string().optional(),
  aspectRatio: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  status: z.enum(['draft', 'rendering', 'complete', 'error']),
  productionNotes: z.string().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export const StageExecutionSchema = z.object({
  stageName: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  duration: z.number().optional(),
  executionId: z.string().optional(),
  recipeId: z.string().optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }).optional(),
  retriesCount: z.number().optional(),
  outputs: z.record(z.any()).optional(),
});

// Main Project Schema
export const StoryLabProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  members: z.record(z.enum(['owner', 'editor', 'viewer'])).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
  currentStageIndex: z.number().min(0).max(5),
  completionPercentage: z.number().min(0).max(100),
  stageExecutions: z.record(StageExecutionSchema),
  campaignDetails: UserInputCampaignDetailsSchema,
  aiGeneratedPersonas: AIGeneratedPersonasSchema.optional(),
  userPersonaSelection: UserInputPersonaSelectionSchema.optional(),
  narrativePreferences: UserInputNarrativePreferencesSchema.optional(),
  aiGeneratedNarrative: AIGeneratedNarrativeSchema.optional(),
  visualDirection: UserInputVisualDirectionSchema.optional(),
  aiGeneratedStoryboard: AIGeneratedStoryboardSchema.optional(),
  storyboardCustomizations: z.object({
    editedScenes: z.array(StoryboardSceneSchema).optional(),
    customNotes: z.string().optional(),
    lastEditedAt: z.date().optional(),
  }).optional(),
  scriptPreferences: UserInputScriptPreferencesSchema.optional(),
  aiGeneratedScreenplay: AIGeneratedScreenplaySchema.optional(),
  screenplayCustomizations: z.object({
    editedText: z.string().optional(),
    customNotes: z.string().optional(),
    lastEditedAt: z.date().optional(),
  }).optional(),
  videoProduction: VideoProductionDataSchema.optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    notes: z.string().optional(),
    estimatedBudget: z.string().optional(),
    actualBudget: z.string().optional(),
    deadline: z.date().optional(),
    completionDate: z.date().optional(),
    approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    approvalNotes: z.string().optional(),
  }).optional(),
  versions: z.array(z.object({
    versionNumber: z.number(),
    createdAt: z.date(),
    description: z.string(),
    createdBy: z.string(),
    snapshotId: z.string(),
  })).optional(),
  analytics: z.object({
    viewCount: z.number().optional(),
    shareCount: z.number().optional(),
    downloadCount: z.number().optional(),
    lastViewedAt: z.date().optional(),
    lastEditedAt: z.date().optional(),
  }).optional(),
});

// Utility Schemas
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  campaignDetails: UserInputCampaignDetailsSchema,
  tags: z.array(z.string()).optional(),
});

export const UpdateProjectInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional(),
  campaignDetails: UserInputCampaignDetailsSchema.partial().optional(),
  narrativePreferences: UserInputNarrativePreferencesSchema.optional(),
  visualDirection: UserInputVisualDirectionSchema.optional(),
  scriptPreferences: UserInputScriptPreferencesSchema.optional(),
  userPersonaSelection: UserInputPersonaSelectionSchema.optional(),
  aiGeneratedPersonas: AIGeneratedPersonasSchema.optional(),
  aiGeneratedNarrative: AIGeneratedNarrativeSchema.optional(),
  aiGeneratedStoryboard: AIGeneratedStoryboardSchema.optional(),
  aiGeneratedScreenplay: AIGeneratedScreenplaySchema.optional(),
  videoProduction: VideoProductionDataSchema.optional(),
  storyboardCustomizations: z.object({
    editedScenes: z.array(StoryboardSceneSchema).optional(),
    customNotes: z.string().optional(),
    lastEditedAt: z.date().optional(),
  }).optional(),
  screenplayCustomizations: z.object({
    editedText: z.string().optional(),
    customNotes: z.string().optional(),
    lastEditedAt: z.date().optional(),
  }).optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    notes: z.string().optional(),
    estimatedBudget: z.string().optional(),
    actualBudget: z.string().optional(),
    deadline: z.date().optional(),
    completionDate: z.date().optional(),
    approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    approvalNotes: z.string().optional(),
  }).optional(),
}).strict();

export const UpdateStageInputSchema = z.object({
  stageName: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  data: z.record(z.any()).optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }).optional(),
  executionId: z.string().optional(),
});

// Helper Functions
export function validateProject(data: unknown): { valid: boolean; errors?: string[] } {
  const result = StoryLabProjectSchema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
  };
}

export function validateCreateProject(data: unknown): { valid: boolean; errors?: string[] } {
  const result = CreateProjectInputSchema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
  };
}

export function validateUpdateProject(data: unknown): { valid: boolean; errors?: string[] } {
  const result = UpdateProjectInputSchema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
  };
}

export function validateUpdateStage(data: unknown): { valid: boolean; errors?: string[] } {
  const result = UpdateStageInputSchema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
  };
}

// Type exports for easier usage
export type StoryLabProject = z.infer<typeof StoryLabProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;
