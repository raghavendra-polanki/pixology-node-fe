/**
 * Comprehensive Project Data Model
 * Clear separation between user input, AI-generated data, and metadata
 */

// Persona type - avoid circular imports by using any for now
export interface PersonaData {
  id: string;
  type: 'mainstream' | 'expert' | 'relatable';
  coreIdentity: any;
  physicalAppearance: any;
  personalityAndCommunication: any;
  lifestyleAndWorldview: any;
  credibility: any;
  image: any;
}

/**
 * ============================================================================
 * USER INPUT DATA MODELS
 * Data provided directly by the user through the UI
 * ============================================================================
 */

/**
 * Stage 1: Campaign Details
 * User provides basic information about the campaign
 */
export interface UserInputCampaignDetails {
  campaignName: string;
  productDescription: string;
  targetAudience: string;
  videoLength: string;
  callToAction: string;
  budget?: string;
  deadline?: string;
  additionalNotes?: string;
  productImageUrl?: string;
}

/**
 * Stage 2: Personas Selection
 * User selects which personas to focus on
 */
export interface UserInputPersonaSelection {
  selectedPersonaIds: string[];
  customPersonas?: {
    id: string;
    name: string;
    description: string;
    targetCharacteristics?: string[];
  }[];
  primaryPersonaId?: string;
}

/**
 * Stage 3: Narrative Preferences
 * User provides preferences for story direction
 */
export interface UserInputNarrativePreferences {
  narrativeStyle?: string;
  tone?: string;
  keyMessages?: string[];
  excludedTopics?: string[];
  storyArc?: string;
  additionalContext?: string;
}

/**
 * Stage 4: Visual Direction
 * User provides visual preferences for storyboard
 */
export interface UserInputVisualDirection {
  visualStyle?: string;
  colorPreferences?: string[];
  atmosphereDescription?: string;
  settingPreferences?: string[];
  cameraStyle?: string;
  additionalNotes?: string;
}

/**
 * Stage 5: Script Preferences
 * User provides preferences for the script
 */
export interface UserInputScriptPreferences {
  scriptTone?: string;
  dialogueStyle?: string;
  inclusionPreferences?: {
    includeDialogue: boolean;
    includeVoiceover: boolean;
    includeOnScreenText: boolean;
  };
  pacePreference?: string;
  callToActionPlacement?: string;
  additionalRequirements?: string;
}

/**
 * ============================================================================
 * AI GENERATED DATA MODELS
 * Data produced by AI models at various stages
 * ============================================================================
 */

/**
 * Stage 2: AI-Generated Personas
 */
export interface AIGeneratedPersonas {
  personas: PersonaData[];
  generatedAt: Date;
  generationRecipeId: string;
  generationExecutionId: string;
  model: string;
  temperature?: number;
}

/**
 * Stage 3: AI-Generated Narrative Theme (individual theme from generation)
 */
export interface AIGeneratedNarrative {
  narrativeId: string;
  synopsis: string;
  fullNarrative: string;
  acts?: {
    act: number;
    description: string;
    content: string;
    estimatedDuration?: string;
  }[];
  themes: string[];
  emotionalJourney: string;
  generatedAt: Date;
  generationRecipeId?: string;
  generationExecutionId?: string;
  model: string;
  temperature?: number;
}

/**
 * Stage 3: AI-Generated Narratives (collection of theme options)
 */
export interface AIGeneratedNarratives {
  narratives: {
    id: string;
    title: string;
    description: string;
    structure: string;
    gradient: string;
    patternColor: string;
    ringColor: string;
    detailedExplanation?: string;
  }[];
  generatedAt: Date;
  generationRecipeId: string;
  generationExecutionId: string;
  model: string;
  count: number;
}

/**
 * Stage 4: AI-Generated Storyboard
 */
export interface StoryboardScene {
  sceneNumber: number;
  title: string;
  description: string;
  duration: string;
  location?: string;
  persona?: string;
  product?: string;
  visualElements?: string;
  dialogue?: string;
  cameraWork?: string;
  keyFrameDescription?: string;
  visualDirection?: string;
  cameraInstructions?: string;
  lighting?: string;
  props?: string[];
  suggestedAssets?: string[];
  narrativeContent?: string;
  dialogueOrVoiceover?: string;
  image?: {
    url: string;
    uploadedAt?: Date;
  } | string;
  referenceImage?: {
    url: string;
    uploadedAt?: Date;
  } | string;
}

export interface AIGeneratedStoryboard {
  storyboardId?: string;
  scenes: StoryboardScene[];
  totalDuration?: string;
  completionNotes?: string;
  visualTheme?: string;
  consistencyNotes?: string;
  generatedAt?: Date;
  generationRecipeId?: string;
  generationExecutionId?: string;
  model?: string;
  count?: number;
  temperature?: number;
}

/**
 * Stage 5: AI-Generated Screenplay/Script
 */
export interface AIGeneratedScreenplay {
  screenplayId: string;
  title: string;
  synopsis: string;
  fullText: string;
  sections: {
    section: string;
    content: string;
    type: 'dialogue' | 'voiceover' | 'action' | 'description';
  }[];
  callToActionIncluded: boolean;
  callToActionText?: string;
  estimatedDuration: string;
  generatedAt: Date;
  generationRecipeId?: string;
  generationExecutionId?: string;
  model: string;
  temperature?: number;
}

/**
 * Stage 6: AI-Generated Video (individual scene video)
 */
export interface AIGeneratedVideo {
  videoId: string;
  sceneNumber: number;
  sceneTitle: string;
  videoUrl: string;
  gcsUri?: string;
  duration: string;
  resolution: string;
  format: string;
  fileSize?: string;
  aspectRatio?: string;
  status: 'complete' | 'error';
  generatedAt: Date;
  generationRecipeId?: string;
  generationExecutionId?: string;
  model: string;
  temperature?: number;
  prompt?: string;
  errorMessage?: string;
}

/**
 * Stage 6: AI-Generated Videos (collection of scene videos)
 */
export interface AIGeneratedVideos {
  videoCollectionId: string;
  title: string;
  synopsis?: string;
  videos: AIGeneratedVideo[];
  totalDuration?: string;
  completionNotes?: string;
  qualityNotes?: string;
  generatedAt: Date;
  generationRecipeId?: string;
  generationExecutionId?: string;
  model: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  temperature?: number;
}

/**
 * Stage 6: Video Production Data (legacy - for backward compatibility)
 */
export interface VideoProductionData {
  videoId: string;
  title: string;
  description: string;
  videoUrl?: string;
  duration: string;
  format: string;
  resolution?: string;
  fileSize?: string;
  aspectRatio?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'rendering' | 'complete' | 'error';
  productionNotes?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * ============================================================================
 * STAGE EXECUTION TRACKING
 * ============================================================================
 */

export interface StageExecution {
  stageName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  executionId?: string;
  recipeId?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  retriesCount?: number;
  outputs?: Record<string, any>;
}

/**
 * ============================================================================
 * MAIN PROJECT MODEL
 * ============================================================================
 */

export interface StoryLabProject {
  // IDENTIFICATION & OWNERSHIP
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members?: Record<string, 'owner' | 'editor' | 'viewer'>;
  createdAt: Date;
  updatedAt: Date;

  // PROJECT STATUS
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  currentStageIndex: number;
  completionPercentage: number;

  // STAGE EXECUTION HISTORY
  stageExecutions: Record<string, StageExecution>;

  // STAGE 1: CAMPAIGN DETAILS - USER INPUT
  campaignDetails: UserInputCampaignDetails;

  // STAGE 2: PERSONAS
  aiGeneratedPersonas?: AIGeneratedPersonas;
  userPersonaSelection?: UserInputPersonaSelection;
  selectedRealPersonaId?: string; // Reference to a real persona from the global realPersonas collection

  // STAGE 3: NARRATIVE
  narrativePreferences?: UserInputNarrativePreferences;
  aiGeneratedNarrative?: AIGeneratedNarrative;
  aiGeneratedNarratives?: AIGeneratedNarratives;

  // STAGE 4: STORYBOARD
  visualDirection?: UserInputVisualDirection;
  aiGeneratedStoryboard?: AIGeneratedStoryboard;
  storyboardCustomizations?: {
    editedScenes?: StoryboardScene[];
    customNotes?: string;
    lastEditedAt?: Date;
  };

  // STAGE 5: SCREENPLAY
  scriptPreferences?: UserInputScriptPreferences;
  aiGeneratedScreenplay?: AIGeneratedScreenplay;
  screenplayCustomizations?: {
    editedText?: string;
    customNotes?: string;
    lastEditedAt?: Date;
  };

  // STAGE 6: VIDEO GENERATION
  aiGeneratedVideos?: AIGeneratedVideos;
  videoProduction?: VideoProductionData; // Legacy field for backward compatibility

  // METADATA & TRACKING
  metadata?: {
    tags?: string[];
    categories?: string[];
    notes?: string;
    estimatedBudget?: string;
    actualBudget?: string;
    deadline?: Date;
    completionDate?: Date;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvalNotes?: string;
  };

  // VERSIONING
  versions?: {
    versionNumber: number;
    createdAt: Date;
    description: string;
    createdBy: string;
    snapshotId: string;
  }[];

  // ANALYTICS
  analytics?: {
    viewCount?: number;
    shareCount?: number;
    downloadCount?: number;
    lastViewedAt?: Date;
    lastEditedAt?: Date;
  };
}

/**
 * ============================================================================
 * UTILITY TYPES FOR CRUD OPERATIONS
 * ============================================================================
 */

export interface CreateProjectInput {
  name: string;
  description?: string;
  campaignDetails: UserInputCampaignDetails;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  campaignDetails?: Partial<UserInputCampaignDetails>;
  narrativePreferences?: Partial<UserInputNarrativePreferences>;
  visualDirection?: Partial<UserInputVisualDirection>;
  scriptPreferences?: Partial<UserInputScriptPreferences>;
  userPersonaSelection?: UserInputPersonaSelection;
  aiGeneratedPersonas?: AIGeneratedPersonas;
  aiGeneratedNarrative?: AIGeneratedNarrative;
  aiGeneratedNarratives?: AIGeneratedNarratives;
  aiGeneratedStoryboard?: AIGeneratedStoryboard;
  aiGeneratedScreenplay?: AIGeneratedScreenplay;
  aiGeneratedVideos?: AIGeneratedVideos;
  videoProduction?: VideoProductionData;
  storyboardCustomizations?: StoryLabProject['storyboardCustomizations'];
  screenplayCustomizations?: StoryLabProject['screenplayCustomizations'];
  metadata?: Partial<StoryLabProject['metadata']>;
}

export interface UpdateStageInput {
  stageName: string;
  status: StageExecution['status'];
  data?: Record<string, any>;
  error?: StageExecution['error'];
  executionId?: string;
}

export interface ProjectListResponse {
  projects: StoryLabProject[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectExport {
  project: StoryLabProject;
  exportedAt: Date;
  format: 'json' | 'pdf';
  includeAssets: boolean;
}

export interface WorkflowStage {
  id: string;
  name: string;
  displayName: string;
  description: string;
  index: number;
  requiresPreviousCompletion: boolean;
  recipeName?: string;
  estimatedDuration?: number;
  isUserInput: boolean;
  allowsCustomization: boolean;
}

export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'campaign-details',
    name: 'campaign-details',
    displayName: 'Campaign Details',
    description: 'Provide basic campaign information',
    index: 0,
    requiresPreviousCompletion: false,
    isUserInput: true,
    allowsCustomization: true,
  },
  {
    id: 'personas',
    name: 'personas',
    displayName: 'Generate Personas',
    description: 'AI generates personas for your campaign',
    index: 1,
    requiresPreviousCompletion: true,
    recipeName: 'recipe_persona_generation',
    estimatedDuration: 30,
    isUserInput: false,
    allowsCustomization: false,
  },
  {
    id: 'narrative',
    name: 'narrative',
    displayName: 'Narrative',
    description: 'Generate story based on personas',
    index: 2,
    requiresPreviousCompletion: true,
    estimatedDuration: 45,
    isUserInput: false,
    allowsCustomization: true,
  },
  {
    id: 'storyboard',
    name: 'storyboard',
    displayName: 'Storyboard',
    description: 'Create visual breakdown of story',
    index: 3,
    requiresPreviousCompletion: true,
    estimatedDuration: 60,
    isUserInput: false,
    allowsCustomization: true,
  },
  {
    id: 'screenplay',
    name: 'screenplay',
    displayName: 'Screenplay',
    description: 'Generate detailed script',
    index: 4,
    requiresPreviousCompletion: true,
    estimatedDuration: 45,
    isUserInput: false,
    allowsCustomization: true,
  },
  {
    id: 'video',
    name: 'video',
    displayName: 'Video',
    description: 'Finalize and export video',
    index: 5,
    requiresPreviousCompletion: true,
    estimatedDuration: 120,
    isUserInput: true,
    allowsCustomization: true,
  },
];
