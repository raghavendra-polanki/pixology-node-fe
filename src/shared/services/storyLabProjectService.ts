/**
 * StoryLab Project Service
 * Complete CRUD operations for the new StoryLabProject data model
 */

import {
  StoryLabProject,
  CreateProjectInput,
  UpdateProjectInput,
  UpdateStageInput,
  ProjectListResponse,
  UserInputCampaignDetails,
  AIGeneratedPersonas,
  AIGeneratedNarrative,
  AIGeneratedNarratives,
  AIGeneratedStoryboard,
  AIGeneratedScreenplay,
  VideoProductionData,
  StageExecution,
  DEFAULT_WORKFLOW_STAGES,
} from '@/features/storylab/types/project.types';

class StoryLabProjectService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Get authorization header with token
   */
  private getAuthHeader(): Record<string, string> {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * ========== CREATE OPERATIONS ==========
   */

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<StoryLabProject> {
    // Map CreateProjectInput to API format (name -> title)
    // Initialize stage executions for new projects
    const stageExecutions: Record<string, any> = {};
    DEFAULT_WORKFLOW_STAGES.forEach((stage) => {
      stageExecutions[stage.name] = {
        stageName: stage.name,
        status: 'pending',
      };
    });

    const apiPayload = {
      title: input.name,
      description: input.description || '',
      status: 'draft',
      currentStageIndex: 0,
      completionPercentage: 0,
      stageExecutions,
      ...input, // This includes campaignDetails and any other fields
    };
    delete (apiPayload as any).name; // Remove name field, use title instead

    const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * ========== READ OPERATIONS ==========
   */

  /**
   * Get all projects for the authenticated user
   */
  async getProjects(filters?: { status?: string; tags?: string[]; page?: number; limit?: number }): Promise<ProjectListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${this.apiBaseUrl}/api/projects${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch projects');
    }

    const data = await response.json();
    return {
      projects: (data.projects || []).map((p: any) => this.parseProjectResponse(p)),
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 10,
    };
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<StoryLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * Get project by ID with full data (all stages)
   */
  async getProjectFull(projectId: string): Promise<StoryLabProject> {
    return this.getProject(projectId);
  }

  /**
   * ========== UPDATE OPERATIONS ==========
   */

  /**
   * Update project (partial update)
   */
  async updateProject(projectId: string, updates: UpdateProjectInput): Promise<StoryLabProject> {
    // Map UpdateProjectInput to API format (name -> title)
    const apiPayload = { ...updates };
    if ('name' in apiPayload) {
      (apiPayload as any).title = (apiPayload as any).name;
      delete (apiPayload as any).name;
    }

    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * Update campaign details
   */
  async updateCampaignDetails(projectId: string, details: Partial<UserInputCampaignDetails>): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      campaignDetails: details,
    });
  }

  /**
   * Update narrative preferences
   */
  async updateNarrativePreferences(projectId: string, preferences: any): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      narrativePreferences: preferences,
    });
  }

  /**
   * Update visual direction
   */
  async updateVisualDirection(projectId: string, direction: any): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      visualDirection: direction,
    });
  }

  /**
   * Update script preferences
   */
  async updateScriptPreferences(projectId: string, preferences: any): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      scriptPreferences: preferences,
    });
  }

  /**
   * Update AI-generated personas
   */
  async updateAIPersonas(projectId: string, personas: AIGeneratedPersonas): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      aiGeneratedPersonas: personas,
    });
  }

  /**
   * Update user persona selection
   */
  async updatePersonaSelection(projectId: string, selection: any): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      userPersonaSelection: selection,
    });
  }

  /**
   * Update AI-generated narrative
   */
  async updateAINarrative(projectId: string, narrative: AIGeneratedNarrative): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      aiGeneratedNarrative: narrative,
    });
  }

  /**
   * Update AI-generated storyboard
   */
  async updateAIStoryboard(projectId: string, storyboard: AIGeneratedStoryboard): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      aiGeneratedStoryboard: storyboard,
    });
  }

  /**
   * Update storyboard customizations
   */
  async updateStoryboardCustomizations(
    projectId: string,
    customizations: StoryLabProject['storyboardCustomizations'],
  ): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      storyboardCustomizations: customizations,
    });
  }

  /**
   * Update AI-generated screenplay
   */
  async updateAIScreenplay(projectId: string, screenplay: AIGeneratedScreenplay): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      aiGeneratedScreenplay: screenplay,
    });
  }

  /**
   * Update AI-generated videos
   */
  async updateAIVideos(projectId: string, videos: any): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      aiGeneratedVideos: videos,
    });
  }

  /**
   * Update screenplay customizations
   */
  async updateScreenplayCustomizations(
    projectId: string,
    customizations: StoryLabProject['screenplayCustomizations'],
  ): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      screenplayCustomizations: customizations,
    });
  }

  /**
   * Update video production data
   */
  async updateVideoProduction(projectId: string, video: VideoProductionData): Promise<StoryLabProject> {
    return this.updateProject(projectId, {
      videoProduction: video,
    });
  }

  /**
   * Update project metadata
   */
  async updateMetadata(projectId: string, metadata: Partial<StoryLabProject['metadata']>): Promise<StoryLabProject> {
    return this.updateProject(projectId, { metadata });
  }

  /**
   * Update project status
   */
  async updateStatus(projectId: string, status: StoryLabProject['status']): Promise<StoryLabProject> {
    return this.updateProject(projectId, { status });
  }

  /**
   * Update current stage index
   */
  async updateCurrentStage(projectId: string, stageIndex: number): Promise<StoryLabProject> {
    return this.updateProject(projectId, { currentStageIndex: stageIndex });
  }

  /**
   * ========== STAGE EXECUTION OPERATIONS ==========
   */

  /**
   * Update stage execution status
   */
  async updateStageExecution(projectId: string, stageUpdate: UpdateStageInput): Promise<StoryLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/stages/${stageUpdate.stageName}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify(stageUpdate),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update stage execution');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * Mark stage as in progress
   */
  async markStageInProgress(projectId: string, stageName: string): Promise<StoryLabProject> {
    return this.updateStageExecution(projectId, {
      stageName,
      status: 'in_progress',
    });
  }

  /**
   * Mark stage as completed
   */
  async markStageCompleted(projectId: string, stageName: string, data?: Record<string, any>): Promise<StoryLabProject> {
    return this.updateStageExecution(projectId, {
      stageName,
      status: 'completed',
      data,
    });
  }

  /**
   * Mark stage as failed
   */
  async markStageFailed(projectId: string, stageName: string, error: any): Promise<StoryLabProject> {
    return this.updateStageExecution(projectId, {
      stageName,
      status: 'failed',
      error,
    });
  }

  /**
   * ========== DELETE OPERATIONS ==========
   */

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
  }

  /**
   * ========== UTILITY OPERATIONS ==========
   */

  /**
   * Clone/duplicate a project
   */
  async cloneProject(projectId: string, newName: string): Promise<StoryLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/clone`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to clone project');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * Export project data
   */
  async exportProject(projectId: string, format: 'json' | 'pdf' = 'json'): Promise<Blob> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/export?format=${format}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export project');
    }

    return response.blob();
  }

  /**
   * Share project with users
   */
  async shareProject(projectId: string, userIds: string[], permission: 'viewer' | 'editor'): Promise<StoryLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/share`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({ userIds, permission }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share project');
    }

    const data = await response.json();
    return this.parseProjectResponse(data.project);
  }

  /**
   * ========== HELPER METHODS ==========
   */

  /**
   * Parse project response from API
   * Converts date strings to Date objects
   */
  private parseProjectResponse(data: any): StoryLabProject {
    return {
      ...data,
      // Map API's title field to our internal name field
      name: data.title || data.name || '',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      aiGeneratedPersonas: data.aiGeneratedPersonas
        ? {
            ...data.aiGeneratedPersonas,
            generatedAt: new Date(data.aiGeneratedPersonas.generatedAt),
          }
        : undefined,
      aiGeneratedNarrative: data.aiGeneratedNarrative
        ? {
            ...data.aiGeneratedNarrative,
            generatedAt: new Date(data.aiGeneratedNarrative.generatedAt),
          }
        : undefined,
      aiGeneratedNarratives: data.aiGeneratedNarratives
        ? {
            ...data.aiGeneratedNarratives,
            generatedAt: new Date(data.aiGeneratedNarratives.generatedAt),
          }
        : undefined,
      aiGeneratedStoryboard: data.aiGeneratedStoryboard
        ? {
            ...data.aiGeneratedStoryboard,
            generatedAt: new Date(data.aiGeneratedStoryboard.generatedAt),
          }
        : undefined,
      aiGeneratedScreenplay: data.aiGeneratedScreenplay
        ? {
            ...data.aiGeneratedScreenplay,
            generatedAt: new Date(data.aiGeneratedScreenplay.generatedAt),
          }
        : undefined,
      videoProduction: data.videoProduction
        ? {
            ...data.videoProduction,
            createdAt: new Date(data.videoProduction.createdAt),
            completedAt: data.videoProduction.completedAt
              ? new Date(data.videoProduction.completedAt)
              : undefined,
          }
        : undefined,
      stageExecutions: Object.entries(data.stageExecutions || {}).reduce(
        (acc, [key, execution]: [string, any]) => ({
          ...acc,
          [key]: {
            ...execution,
            startedAt: execution.startedAt ? new Date(execution.startedAt) : undefined,
            completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
          },
        }),
        {},
      ),
    };
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletionPercentage(project: StoryLabProject): number {
    const totalStages = DEFAULT_WORKFLOW_STAGES.length;
    const completedStages = Object.values(project.stageExecutions || {}).filter(
      (execution) => execution.status === 'completed',
    ).length;
    return Math.round((completedStages / totalStages) * 100);
  }

  /**
   * Get next stage
   */
  getNextStage(currentStageIndex: number): { index: number; stage: typeof DEFAULT_WORKFLOW_STAGES[0] } | null {
    if (currentStageIndex >= DEFAULT_WORKFLOW_STAGES.length - 1) return null;
    const nextIndex = currentStageIndex + 1;
    return {
      index: nextIndex,
      stage: DEFAULT_WORKFLOW_STAGES[nextIndex],
    };
  }

  /**
   * Get previous stage
   */
  getPreviousStage(currentStageIndex: number): { index: number; stage: typeof DEFAULT_WORKFLOW_STAGES[0] } | null {
    if (currentStageIndex <= 0) return null;
    const prevIndex = currentStageIndex - 1;
    return {
      index: prevIndex,
      stage: DEFAULT_WORKFLOW_STAGES[prevIndex],
    };
  }

  /**
   * Check if stage can be accessed
   */
  canAccessStage(project: StoryLabProject, stageIndex: number): boolean {
    const stage = DEFAULT_WORKFLOW_STAGES[stageIndex];
    if (!stage) return false;
    if (!stage.requiresPreviousCompletion) return true;

    const previousStage = DEFAULT_WORKFLOW_STAGES[stageIndex - 1];
    if (!previousStage) return true;

    const previousExecution = project.stageExecutions[previousStage.name];
    return previousExecution?.status === 'completed';
  }

  /**
   * Get workflow stages
   */
  getWorkflowStages() {
    return DEFAULT_WORKFLOW_STAGES;
  }
}

export default StoryLabProjectService;
