/**
 * PROJECT DATA MODEL EXPORTS
 * Re-export the comprehensive new project types
 */

export type {
  // Main project type
  StoryLabProject,
  // User input types
  UserInputCampaignDetails,
  UserInputNarrativePreferences,
  UserInputVisualDirection,
  UserInputScriptPreferences,
  UserInputPersonaSelection,
  // AI generated types
  AIGeneratedPersonas,
  AIGeneratedNarrative,
  AIGeneratedStoryboard,
  StoryboardScene,
  AIGeneratedScreenplay,
  VideoProductionData,
  // Stage and workflow
  StageExecution,
  WorkflowStage,
  // Utility types
  CreateProjectInput,
  UpdateProjectInput,
  UpdateStageInput,
  ProjectListResponse,
  ProjectExport,
} from './types/project.types';

// Export values (not types)
export { DEFAULT_WORKFLOW_STAGES } from './types/project.types';

// Export Zod schemas
export {
  StoryLabProjectSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  validateProject,
  validateCreateProject,
  validateUpdateProject,
} from './types/project.schema';

/**
 * BACKWARD COMPATIBILITY
 * These types map the old interface to the new StoryLabProject model
 * Use the new types directly - these are for legacy code only
 */

export interface WorkflowData {
  campaignDetails?: {
    campaignName: string;
    productDescription: string;
    targetAudience: string;
    videoLength: string;
    callToAction: string;
  };
  personas?: any[];
  narrative?: any;
  storyboard?: any[];
  screenplay?: any[];
  video?: any;
}

export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'complete' | 'generating';
  currentStage: number;
  createdAt: string;
  ownerName?: string;
  data: WorkflowData;
}
