/**
 * React Hook for StoryLab Project Management
 * Manages project state and syncs with the data model
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import StoryLabProjectService from '@/shared/services/storyLabProjectService';
import {
  StoryLabProject,
  CreateProjectInput,
  UpdateProjectInput,
  UpdateStageInput,
  DEFAULT_WORKFLOW_STAGES,
  UserInputCampaignDetails,
  AIGeneratedPersonas,
  AIGeneratedNarrative,
  AIGeneratedStoryboard,
  AIGeneratedScreenplay,
  VideoProductionData,
} from '../types/project.types';

interface UseStoryLabProjectOptions {
  projectId?: string;
  autoLoad?: boolean;
}

interface UseStoryLabProjectResult {
  // State
  project: StoryLabProject | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;

  // Project operations
  createProject: (input: CreateProjectInput) => Promise<StoryLabProject>;
  loadProject: (projectId: string) => Promise<StoryLabProject>;
  saveProject: () => Promise<StoryLabProject>;
  deleteProject: (projectId: string) => Promise<void>;

  // Update operations
  updateProject: (updates: UpdateProjectInput) => Promise<StoryLabProject>;
  updateCampaignDetails: (details: Partial<UserInputCampaignDetails>) => Promise<void>;
  updateNarrativePreferences: (preferences: any) => Promise<void>;
  updateVisualDirection: (direction: any) => Promise<void>;
  updateScriptPreferences: (preferences: any) => Promise<void>;
  updateAIPersonas: (personas: AIGeneratedPersonas) => Promise<void>;
  updatePersonaSelection: (selection: any) => Promise<void>;
  updateAINarrative: (narrative: AIGeneratedNarrative) => Promise<void>;
  updateAIStoryboard: (storyboard: AIGeneratedStoryboard) => Promise<void>;
  updateAIScreenplay: (screenplay: AIGeneratedScreenplay) => Promise<void>;
  updateVideoProduction: (video: VideoProductionData) => Promise<void>;

  // Stage operations
  updateStageStatus: (stageName: string, status: string, data?: any) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  markStageFailed: (stageName: string, error: any) => Promise<void>;
  advanceToNextStage: () => Promise<void>;

  // UI helpers
  getCurrentStage: () => (typeof DEFAULT_WORKFLOW_STAGES)[0] | null;
  canAdvanceToNextStage: () => boolean;
  getCompletionPercentage: () => number;

  // State management
  resetProject: () => void;
}

export function useStoryLabProject(options: UseStoryLabProjectOptions = {}): UseStoryLabProjectResult {
  const projectService = useRef(new StoryLabProjectService());

  const [project, setProject] = useState<StoryLabProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create new project
  const createProject = useCallback(async (input: CreateProjectInput): Promise<StoryLabProject> => {
    try {
      setIsLoading(true);
      setError(null);
      const newProject = await projectService.current.createProject(input);
      setProject(newProject);
      setHasUnsavedChanges(false);
      return newProject;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load existing project
  const loadProject = useCallback(async (projectId: string): Promise<StoryLabProject> => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedProject = await projectService.current.getProject(projectId);
      setProject(loadedProject);
      setHasUnsavedChanges(false);
      return loadedProject;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load project on mount if projectId provided
  useEffect(() => {
    if (options.autoLoad && options.projectId) {
      // Don't try to load temp projects from database - they don't exist yet
      if (options.projectId.startsWith('temp-')) {
        setProject(null);
        setIsLoading(false);
      } else {
        loadProject(options.projectId);
      }
    }
  }, [options.autoLoad, options.projectId, loadProject]);

  // Save current project state
  const saveProject = useCallback(async (): Promise<StoryLabProject> => {
    if (!project) throw new Error('No project loaded');

    try {
      setIsSaving(true);
      setError(null);
      const updated = await projectService.current.updateProject(project.id, project);
      setProject(updated);
      setHasUnsavedChanges(false);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  // Update project
  const updateProject = useCallback(
    async (updates: UpdateProjectInput, projectIdOverride?: string): Promise<StoryLabProject> => {
      // Use provided projectId or fall back to current project's id
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');

      try {
        setIsSaving(true);
        setError(null);
        const updated = await projectService.current.updateProject(projectId, updates);
        setProject(updated);
        setHasUnsavedChanges(false);
        return updated;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [project],
  );

  // Delete project
  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await projectService.current.deleteProject(projectId);
      if (project?.id === projectId) {
        setProject(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  // Update campaign details
  const updateCampaignDetails = useCallback(
    async (details: Partial<UserInputCampaignDetails>) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ campaignDetails: details });
    },
    [updateProject, project],
  );

  // Update narrative preferences
  const updateNarrativePreferences = useCallback(
    async (preferences: any) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ narrativePreferences: preferences });
    },
    [updateProject, project],
  );

  // Update visual direction
  const updateVisualDirection = useCallback(
    async (direction: any) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ visualDirection: direction });
    },
    [updateProject, project],
  );

  // Update script preferences
  const updateScriptPreferences = useCallback(
    async (preferences: any) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ scriptPreferences: preferences });
    },
    [updateProject, project],
  );

  // Update AI personas
  const updateAIPersonas = useCallback(
    async (personas: AIGeneratedPersonas) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ aiGeneratedPersonas: personas });
    },
    [updateProject, project],
  );

  // Update persona selection
  const updatePersonaSelection = useCallback(
    async (selection: any) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ userPersonaSelection: selection });
    },
    [updateProject, project],
  );

  // Update AI narrative
  const updateAINarrative = useCallback(
    async (narrative: AIGeneratedNarrative) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ aiGeneratedNarrative: narrative });
    },
    [updateProject, project],
  );

  // Update AI storyboard
  const updateAIStoryboard = useCallback(
    async (storyboard: AIGeneratedStoryboard) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ aiGeneratedStoryboard: storyboard });
    },
    [updateProject, project],
  );

  // Update AI screenplay
  const updateAIScreenplay = useCallback(
    async (screenplay: AIGeneratedScreenplay) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ aiGeneratedScreenplay: screenplay });
    },
    [updateProject, project],
  );

  // Update video production
  const updateVideoProduction = useCallback(
    async (video: VideoProductionData) => {
      if (!project) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ videoProduction: video });
    },
    [updateProject, project],
  );

  // Update stage status
  const updateStageStatus = useCallback(
    async (stageName: string, status: string, data?: any) => {
      if (!project) throw new Error('No project loaded');
      await projectService.current.updateStageExecution(project.id, {
        stageName,
        status: status as any,
        data,
      });
      // Reload project to get updated stage executions
      await loadProject(project.id);
    },
    [project, loadProject],
  );

  // Mark stage as completed
  const markStageCompleted = useCallback(
    async (stageName: string, data?: any) => {
      await updateStageStatus(stageName, 'completed', data);
    },
    [updateStageStatus],
  );

  // Mark stage as failed
  const markStageFailed = useCallback(
    async (stageName: string, error: any) => {
      if (!project) throw new Error('No project loaded');
      await projectService.current.markStageFailed(project.id, stageName, error);
      await loadProject(project.id);
    },
    [project, loadProject],
  );

  // Advance to next stage
  const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
    // Use provided project or fall back to current project in state
    const projectData = projectToAdvance || project;
    if (!projectData) throw new Error('No project loaded');

    const next = projectService.current.getNextStage(projectData.currentStageIndex);
    if (!next) throw new Error('No next stage available');

    // Update currentStageIndex and preserve campaign details
    // Pass projectId explicitly to avoid closure issues
    await updateProject(
      {
        currentStageIndex: next.index,
        campaignDetails: projectData.campaignDetails,
      },
      projectData.id  // Pass project ID explicitly
    );
  }, [project, updateProject]);

  // Get current stage
  const getCurrentStage = useCallback(() => {
    if (!project) return null;
    return DEFAULT_WORKFLOW_STAGES[project.currentStageIndex] || null;
  }, [project]);

  // Check if can advance to next stage
  const canAdvanceToNextStage = useCallback(() => {
    if (!project) return false;
    const currentStage = DEFAULT_WORKFLOW_STAGES[project.currentStageIndex];
    if (!currentStage) return false;

    const stageExecution = project.stageExecutions[currentStage.name];
    return stageExecution?.status === 'completed';
  }, [project]);

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (!project) return 0;
    return projectService.current.calculateCompletionPercentage(project);
  }, [project]);

  // Reset project
  const resetProject = useCallback(() => {
    setProject(null);
    setError(null);
    setHasUnsavedChanges(false);
  }, []);

  return {
    // State
    project,
    isLoading,
    isSaving,
    error,

    // Operations
    createProject,
    loadProject,
    saveProject,
    deleteProject,
    updateProject,
    updateCampaignDetails,
    updateNarrativePreferences,
    updateVisualDirection,
    updateScriptPreferences,
    updateAIPersonas,
    updatePersonaSelection,
    updateAINarrative,
    updateAIStoryboard,
    updateAIScreenplay,
    updateVideoProduction,

    // Stage operations
    updateStageStatus,
    markStageCompleted,
    markStageFailed,
    advanceToNextStage,

    // UI helpers
    getCurrentStage,
    canAdvanceToNextStage,
    getCompletionPercentage,
    resetProject,
  };
}
