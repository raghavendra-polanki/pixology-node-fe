// GameLab Project Types

export interface GameLabProject {
  id: string;
  name: string; // User-facing name
  title: string; // Backend field (same as name)
  status: 'draft' | 'generating' | 'complete';
  currentStageIndex: number; // 0-5 for stages 1-6
  completionPercentage: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  userId: string;
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

// Stage 2: Concept Gallery
export interface ConceptGallery {
  selectedStyle?: StyleCard;
  availableStyles: StyleCard[];
  selectedAt?: Date;
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

// Stage 3: Casting Call
export interface CastingCall {
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
  generatedAt?: Date;
}

// Type alias for service compatibility
export type HighFidelityCaptureData = HighFidelityCapture;

export interface GeneratedImage {
  id: string;
  url: string;
  hasAlphaChannel: boolean;
  resolution: string;
  generatedAt: string;
}

// Stage 5: Kinetic Activation
export interface KineticActivation {
  selectedMotion: MotionPreset;
  speed: number; // 0.5 - 2.0
  intensity: number; // 0-100
  previewUrl?: string;
  appliedAt?: Date;
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
  metadata?: Partial<GameLabProject['metadata']>;
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
  projects: GameLabProject[];
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
 * Default workflow stages for GameLab
 */
export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 1,
    name: 'context-brief',
    title: 'Context Brief',
    description: 'Define campaign context and goals',
    requiresPreviousCompletion: false,
  },
  {
    id: 2,
    name: 'concept-gallery',
    title: 'Concept Gallery',
    description: 'Select visual style and concept',
    requiresPreviousCompletion: true,
  },
  {
    id: 3,
    name: 'casting-call',
    title: 'Casting Call',
    description: 'Choose players for the campaign',
    requiresPreviousCompletion: true,
  },
  {
    id: 4,
    name: 'high-fidelity-capture',
    title: 'High-Fidelity Capture',
    description: 'Generate high-quality player images',
    requiresPreviousCompletion: true,
  },
  {
    id: 5,
    name: 'kinetic-activation',
    title: 'Kinetic Activation',
    description: 'Apply motion and animation effects',
    requiresPreviousCompletion: true,
  },
  {
    id: 6,
    name: 'polish-download',
    title: 'Polish & Download',
    description: 'Finalize and export your campaign',
    requiresPreviousCompletion: true,
  },
];

/**
 * Stage name mapping (for easy access)
 */
export const STAGE_NAMES = DEFAULT_WORKFLOW_STAGES.map(stage => stage.name);
