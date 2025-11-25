import type { FlairLabProject } from './types/project.types';

// Simplified Project type for UI
export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'complete';
  currentStage: number; // 1-6
  createdAt: string;
  data: FlairLabProject;
}

export * from './types/project.types';
