/**
 * FlairLab Project Service
 * Complete CRUD operations for FlairLab projects
 */

import {
  FlairLabProject,
  CreateProjectInput,
  UpdateProjectInput,
  UpdateStageInput,
  ProjectListResponse,
  ContextBriefData,
  ConceptGalleryData,
  CastingCallData,
  HighFidelityCaptureData,
  KineticActivationData,
  PolishDownloadData,
  StageExecution,
  DEFAULT_WORKFLOW_STAGES,
} from '@/features/flairlab/types/project.types';

class FlairLabProjectService {
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
  async createProject(input: CreateProjectInput): Promise<FlairLabProject> {
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
      ...input, // This includes contextBrief and any other fields
    };
    delete (apiPayload as any).name; // Remove name field, use title instead

    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects`, {
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

    const url = `${this.apiBaseUrl}/api/flairlab/projects${params.toString() ? '?' + params.toString() : ''}`;

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
  async getProject(projectId: string): Promise<FlairLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}`, {
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
   * ========== UPDATE OPERATIONS ==========
   */

  /**
   * Update project (partial update)
   */
  async updateProject(projectId: string, updates: UpdateProjectInput): Promise<FlairLabProject> {
    // Map UpdateProjectInput to API format (name -> title)
    const apiPayload = { ...updates };
    if ('name' in apiPayload) {
      (apiPayload as any).title = (apiPayload as any).name;
      delete (apiPayload as any).name;
    }

    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}`, {
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
   * Update context brief
   */
  async updateContextBrief(projectId: string, contextBrief: Partial<ContextBriefData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      contextBrief,
    });
  }

  /**
   * Update concept gallery
   */
  async updateConceptGallery(projectId: string, conceptGallery: Partial<ConceptGalleryData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      conceptGallery,
    });
  }

  /**
   * Update casting call
   */
  async updateCastingCall(projectId: string, castingCall: Partial<CastingCallData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      castingCall,
    });
  }

  /**
   * Update high fidelity capture
   */
  async updateHighFidelityCapture(projectId: string, highFidelityCapture: Partial<HighFidelityCaptureData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      highFidelityCapture,
    });
  }

  /**
   * Update kinetic activation
   */
  async updateKineticActivation(projectId: string, kineticActivation: Partial<KineticActivationData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      kineticActivation,
    });
  }

  /**
   * Update polish & download
   */
  async updatePolishDownload(projectId: string, polishDownload: Partial<PolishDownloadData>): Promise<FlairLabProject> {
    return this.updateProject(projectId, {
      polishDownload,
    });
  }

  /**
   * Update project metadata
   */
  async updateMetadata(projectId: string, metadata: Partial<FlairLabProject['metadata']>): Promise<FlairLabProject> {
    return this.updateProject(projectId, { metadata });
  }

  /**
   * Update project status
   */
  async updateStatus(projectId: string, status: FlairLabProject['status']): Promise<FlairLabProject> {
    return this.updateProject(projectId, { status });
  }

  /**
   * Update current stage index
   */
  async updateCurrentStage(projectId: string, stageIndex: number): Promise<FlairLabProject> {
    return this.updateProject(projectId, { currentStageIndex: stageIndex });
  }

  /**
   * ========== STAGE EXECUTION OPERATIONS ==========
   */

  /**
   * Update stage execution status
   */
  async updateStageExecution(projectId: string, stageUpdate: UpdateStageInput): Promise<FlairLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}/stages/${stageUpdate.stageName}`, {
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
  async markStageInProgress(projectId: string, stageName: string): Promise<FlairLabProject> {
    return this.updateStageExecution(projectId, {
      stageName,
      status: 'in_progress',
    });
  }

  /**
   * Mark stage as completed
   */
  async markStageCompleted(projectId: string, stageName: string, data?: Record<string, any>): Promise<FlairLabProject> {
    return this.updateStageExecution(projectId, {
      stageName,
      status: 'completed',
      data,
    });
  }

  /**
   * Mark stage as failed
   */
  async markStageFailed(projectId: string, stageName: string, error: any): Promise<FlairLabProject> {
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
    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}`, {
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
  async cloneProject(projectId: string, newName: string): Promise<FlairLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}/clone`, {
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
    const response = await fetch(`${this.apiBaseUrl}/api/flairlab/projects/${projectId}/export?format=${format}`, {
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
   * ========== HELPER METHODS ==========
   */

  /**
   * Parse project response from API
   * Converts date strings to Date objects
   */
  private parseProjectResponse(data: any): FlairLabProject {
    return {
      ...data,
      // Map API's title field to our internal name field
      name: data.title || data.name || '',
      // Dates are now ISO strings from the backend, no conversion needed
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletionPercentage(project: FlairLabProject): number {
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
  canAccessStage(project: FlairLabProject, stageIndex: number): boolean {
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

export default FlairLabProjectService;
