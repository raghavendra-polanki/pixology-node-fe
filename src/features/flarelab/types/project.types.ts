// FlareLab Project Types

export interface FlareLabProject {
  id: string;
  name: string; // User-facing name
  title: string; // Backend field (same as name)
  status: 'draft' | 'generating' | 'complete';
  currentStageIndex: number; // 0-5 for stages 1-6
  completionPercentage: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  userId: string;
  ownerId?: string; // Owner of the project (for sharing)
  ownerName?: string;
  sportType?: string; // e.g., "Hockey", "Basketball", "Football", etc.

  // Stage Data
  contextBrief?: ContextBriefData;
  conceptGallery?: ConceptGalleryData;
  castingCall?: CastingCallData;
  highFidelityCapture?: HighFidelityCaptureData;
  kineticActivation?: KineticActivationData;
  polishDownload?: PolishDownloadData;

  // Stage execution tracking
  stageExecutions: Record<string, StageExecution>;

  // Metadata
  metadata?: {
    tags?: string[];
    notes?: string;
    lastEditedBy?: string;
    lastEditedAt?: Date;
  };
}

// Stage execution tracking
export interface StageExecution {
  stageName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  data?: Record<string, any>;
  error?: any;
}

// Stage 1: Context Brief
export interface ContextBrief {
  homeTeam: Team;
  awayTeam: Team;
  contextPills: ContextPill[];
  campaignGoal: CampaignGoal;
  updatedAt?: Date;
}

// Type alias for service compatibility
export type ContextBriefData = ContextBrief;

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export type ContextPill = 'Playoff Intensity' | 'Rivalry' | 'Holiday' | 'Buzzer Beater';
export type CampaignGoal = 'Social Hype' | 'Broadcast B-Roll' | 'Stadium Ribbon';

// Stage 2: Concept Gallery (Themes)
export interface ConceptGallery {
  // Multi-selection support
  selectedStyles?: string[]; // Array of selected theme IDs
  selectedThemes?: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    thumbnailUrl?: string;
    tags?: string[];
  }>;
  availableStyles: StyleCard[];
  selectedAt?: Date;

  // AI-generated themes
  aiGeneratedThemes?: AIGeneratedThemes;

  // Legacy single selection (for backward compatibility)
  selectedStyle?: StyleCard;
}

// Type alias for service compatibility
export type ConceptGalleryData = ConceptGallery;

export interface StyleCard {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  tags: string[];
}

// Theme Categories
export type ThemeCategoryId = 'home-team' | 'away-team' | 'rivalry' | 'posed' | 'broadcast';

export interface ThemeCategory {
  id: ThemeCategoryId;
  name: string;
  description: string;
  icon: string;
  promptModifier?: string; // Additional context for AI prompt
}

// Category definitions
export const THEME_CATEGORIES: Record<ThemeCategoryId, ThemeCategory> = {
  'home-team': {
    id: 'home-team',
    name: 'Home Team Focus',
    description: 'Dramatic player portraits featuring home team colors and branding',
    icon: '🏠',
    promptModifier: 'Focus exclusively on the home team. Emphasize their colors, jersey, and branding. Create powerful, heroic imagery that celebrates the home team.',
  },
  'away-team': {
    id: 'away-team',
    name: 'Away Team Focus',
    description: 'Powerful imagery showcasing away team identity',
    icon: '✈️',
    promptModifier: 'Focus exclusively on the away team. Emphasize their colors, jersey, and branding. Create bold, confident imagery that represents the visiting team.',
  },
  'rivalry': {
    id: 'rivalry',
    name: 'Rivalry / Both Teams',
    description: 'Face-off imagery combining both teams in dramatic confrontation',
    icon: '⚔️',
    promptModifier: 'Feature both teams in a rivalry context. Show split-screen compositions, face-to-face confrontations, or side-by-side comparisons. Emphasize the competitive intensity between both teams.',
  },
  'posed': {
    id: 'posed',
    name: 'Posed Matchups',
    description: 'Specific action poses: face-offs, celebrations, high-fives, arms folded',
    icon: '🤝',
    promptModifier: 'Create themes based on specific poses and actions: players facing each other with arms folded, high-fiving teammates, intense staredowns, celebration poses, or back-to-back stances. Focus on dynamic body language.',
  },
  'broadcast': {
    id: 'broadcast',
    name: 'Broadcast Graphics',
    description: 'TV-ready graphics: split-screen, stats overlay, scoreboard style',
    icon: '📺',
    promptModifier: 'Design broadcast-ready graphics with split-screen layouts, stat overlays, scoreboard aesthetics, or TV lower-third style compositions. Professional broadcast quality with clean, legible text areas.',
  },
};

// AI-Generated Themes Structure (now organized by category)
export interface AIGeneratedThemes {
  // Themes organized by category
  categorizedThemes: Record<ThemeCategoryId, CategoryThemes>;

  // Legacy flat array for backward compatibility
  themes?: Theme[];

  generatedAt: Date;
  model?: string;
  count: number;
}

export interface CategoryThemes {
  category: ThemeCategoryId;
  themes: Theme[];
  generatedAt: Date;
  isCollapsed?: boolean; // UI state for accordion
}

export interface Theme {
  id: string;
  title: string;
  description: string;
  category: ThemeCategoryId; // New: which category this theme belongs to
  playerCount?: number; // Number of players required for this theme (1 or 2)
  imagePrompt?: string; // The prompt used for image generation
  image?: {
    url: string;
    metadata?: any;
  };
  tags?: string[];
  // Metadata from Stage 1 context
  contextMetadata?: {
    sportType?: string;
    homeTeam?: string;
    awayTeam?: string;
    contextPills?: string[];
    campaignGoal?: string;
  };
}

// Stage 3: Casting Call
export interface CastingCall {
  // AI Recommendations (saved to avoid re-generating)
  aiRecommendations?: Record<string, {
    themeId: string;
    themeName: string;
    playerCount: number;
    recommendedPlayers: Array<{
      playerId: string;
      name: string;
      reason: string;
    }>;
    reasoning: string;
  }>;
  recommendationsGeneratedAt?: Date;

  // Theme-to-player mappings (NEW: multi-theme support)
  themePlayerMappings?: Record<string, {
    themeId: string;
    themeName: string;
    themeCategory: string;
    playerCount: number;
    selectedPlayers: Player[];
  }>;

  // Legacy fields (for backward compatibility)
  selectedPlayers: Player[];
  availablePlayers: Player[];
  selectedAt?: Date;
}

// Type alias for service compatibility
export type CastingCallData = CastingCall;

export interface Player {
  id: string;
  name: string;
  number: string;
  position: string;
  teamId: string;
  photoUrl?: string;
  performanceScore?: number; // 0-100
  socialSentiment?: number; // 0-100
  isHighlighted?: boolean; // "Fire" icon indicator
}

// Stage 4: High-Fidelity Capture
export interface HighFidelityCapture {
  generatedImages: GeneratedImage[];
  selectedForExport?: string[]; // Theme IDs selected for export (Stage 6)
  selectedForAnimation?: string[]; // Theme IDs selected for animation (Stage 5)
  generatedAt?: Date;
}

// Type alias for service compatibility
export type HighFidelityCaptureData = HighFidelityCapture;

export interface GeneratedImage {
  id: string;
  themeId?: string;
  themeName?: string;
  themeCategory?: string;
  thumbnailUrl?: string;
  url: string;
  players?: Array<{
    id: string;
    name: string;
    number: string;
  }>;
  hasAlphaChannel: boolean;
  resolution: string;
  generatedAt: string;
  error?: string;
}

// Stage 5: Kinetic Activation
export interface KineticActivation {
  // New animation-based approach
  animations?: AnimationResult[];
  selectedForExport?: string[]; // Theme IDs of videos selected for export to Stage 6
  generatedAt?: Date;
  successCount?: number;
  errorCount?: number;
  // Legacy motion preset approach (kept for backward compatibility)
  selectedMotion?: MotionPreset;
  speed?: number; // 0.5 - 2.0
  intensity?: number; // 0-100
  previewUrl?: string;
  appliedAt?: Date;
}

export interface AnimationResult {
  themeId: string;
  themeName: string;
  imageUrl: string;
  // New: AI-generated style recommendations
  recommendations?: AnimationRecommendation[];
  imageAnalysis?: string;
  // Selected style (from recommendations or custom)
  selectedStyle?: AnimationRecommendation | null;
  customPrompt?: string;
  // Screenplay (legacy or from selected style)
  screenplay?: AnimationScreenplay;
  video?: {
    videoUrl: string;
    duration: string;
    resolution?: string;
    aspectRatio?: string;
    generatedAt: string;
    metadata?: {
      model?: string;
      backend?: string;
      operationName?: string;
      screenplay?: AnimationScreenplay;
    };
  };
  error?: string;
  generatedAt?: string;
}

export interface AnimationScreenplay {
  imageAnalysis: string;
  animationConcept: string;
  screenplay: {
    second1: string;
    second2: string;
    second3: string;
    second4: string;
  };
  videoGenerationPrompt: string;
}

// Animation style category types
export type AnimationStyleCategory = 'subtle' | 'celebratory' | 'intense' | 'atmospheric';

// Animation style recommendation from AI
export interface AnimationRecommendation {
  id: string;
  styleName: string;
  category: AnimationStyleCategory;
  description: string;
  whyItWorks: string;
  isRecommended: boolean;
  screenplay: {
    animationConcept: string;
    second1: string;
    second2: string;
    second3: string;
    second4: string;
  };
  videoGenerationPrompt: string;
}

export type MotionPreset = 'Loop' | 'Slow Zoom' | 'Action Pan';

// Type alias for service compatibility
export type KineticActivationData = KineticActivation;

// Stage 6: Polish & Download
export interface PolishData {
  format: ExportFormat;
  metadata: VideoMetadata;
  downloadUrl?: string;
  status: 'pending' | 'encoding' | 'ready' | 'failed';
  progress?: number; // 0-100
  exportedAt?: Date;
}

export type ExportFormat = 'ProRes 4444' | 'H.264 MP4';

export interface VideoMetadata {
  player: string;
  team: string;
  action: string;
  duration?: number;
  resolution?: string;
}

// Type alias for service compatibility
export type PolishDownloadData = PolishData;

// ========== API Input/Output Types ==========

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  contextBrief?: Partial<ContextBriefData>;
}

/**
 * Input for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'generating' | 'complete';
  currentStageIndex?: number;
  completionPercentage?: number;
  contextBrief?: Partial<ContextBriefData>;
  conceptGallery?: Partial<ConceptGalleryData>;
  castingCall?: Partial<CastingCallData>;
  highFidelityCapture?: Partial<HighFidelityCaptureData>;
  kineticActivation?: Partial<KineticActivationData>;
  polishDownload?: Partial<PolishDownloadData>;
  stageExecutions?: Record<string, StageExecution>;
  metadata?: Partial<FlareLabProject['metadata']>;
}

/**
 * Input for updating stage execution
 */
export interface UpdateStageInput {
  stageName: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: Record<string, any>;
  error?: any;
}

/**
 * Response for list of projects
 */
export interface ProjectListResponse {
  projects: FlareLabProject[];
  total: number;
  page: number;
  limit: number;
}

// ========== Workflow Configuration ==========

/**
 * Workflow stage definition
 */
export interface WorkflowStage {
  id: number;
  name: string;
  title: string;
  description: string;
  requiresPreviousCompletion: boolean;
}

/**
 * Default workflow stages for FlareLab
 */
export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 1,
    name: 'context-brief',
    title: 'Setup Project',
    description: 'Define campaign context and goals',
    requiresPreviousCompletion: false,
  },
  {
    id: 2,
    name: 'concept-gallery',
    title: 'Generate Themes',
    description: 'Select visual style and concept',
    requiresPreviousCompletion: true,
  },
  {
    id: 3,
    name: 'casting-call',
    title: 'Suggest Players',
    description: 'Choose players for the campaign',
    requiresPreviousCompletion: true,
  },
  {
    id: 4,
    name: 'high-fidelity-capture',
    title: 'Create Images',
    description: 'Generate high-quality player images',
    requiresPreviousCompletion: true,
  },
  {
    id: 5,
    name: 'kinetic-activation',
    title: 'Animate Videos',
    description: 'Apply motion and animation effects',
    requiresPreviousCompletion: true,
  },
  {
    id: 6,
    name: 'polish-download',
    title: 'Export',
    description: 'Finalize and export your campaign',
    requiresPreviousCompletion: true,
  },
];

/**
 * Stage name mapping (for easy access)
 */
export const STAGE_NAMES = DEFAULT_WORKFLOW_STAGES.map(stage => stage.name);
