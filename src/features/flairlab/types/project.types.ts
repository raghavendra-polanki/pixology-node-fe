// FlairLab Project Types

export interface FlairLabProject {
  id: string;
  title: string;
  status: 'draft' | 'generating' | 'complete';
  currentStageIndex: number; // 0-5 for stages 1-6
  createdAt: string | Date;
  updatedAt: string | Date;
  userId: string;

  // Stage Data
  contextBrief?: ContextBrief;
  conceptGallery?: ConceptGallery;
  castingCall?: CastingCall;
  highFidelityCapture?: HighFidelityCapture;
  kineticActivation?: KineticActivation;
  polish?: PolishData;
}

// Stage 1: Context Brief
export interface ContextBrief {
  homeTeam: Team;
  awayTeam: Team;
  contextPills: ContextPill[];
  campaignGoal: CampaignGoal;
}

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
}

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
}

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
}

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
}

export type MotionPreset = 'Loop' | 'Slow Zoom' | 'Action Pan';

// Stage 6: Polish & Download
export interface PolishData {
  format: ExportFormat;
  metadata: VideoMetadata;
  downloadUrl?: string;
  status: 'pending' | 'encoding' | 'ready' | 'failed';
  progress?: number; // 0-100
}

export type ExportFormat = 'ProRes 4444' | 'H.264 MP4';

export interface VideoMetadata {
  player: string;
  team: string;
  action: string;
  duration?: number;
  resolution?: string;
}
