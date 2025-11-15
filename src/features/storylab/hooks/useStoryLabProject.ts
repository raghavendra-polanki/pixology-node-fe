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
  updateAINarratives: (narratives: any) => Promise<void>;
  updateAINarrative: (narrative: AIGeneratedNarrative) => Promise<void>;
  updateAIStoryboard: (storyboard: AIGeneratedStoryboard, projectIdOverride?: string) => Promise<StoryLabProject | void>;
  updateStoryboardCustomizations: (customizations: any, projectIdOverride?: string) => Promise<void>;
  updateAIScreenplay: (screenplay: AIGeneratedScreenplay) => Promise<void>;
  updateScreenplayCustomizations: (customizations: any, projectIdOverride?: string) => Promise<void>;
  updateAIVideos: (videos: any, projectIdOverride?: string) => Promise<void>;
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

        console.log('updateProject called with:', { projectId, updateKeys: Object.keys(updates) });

        const updated = await projectService.current.updateProject(projectId, updates);

        console.log('updateProject service returned:', {
          hasProject: !!updated,
          hasAIGeneratedNarratives: !!updated?.aiGeneratedNarratives,
          narrativeCount: updated?.aiGeneratedNarratives?.narratives?.length,
        });

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
    async (details: Partial<UserInputCampaignDetails>, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ campaignDetails: details }, projectId);
    },
    [updateProject, project],
  );

  // Update narrative preferences
  const updateNarrativePreferences = useCallback(
    async (preferences: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ narrativePreferences: preferences }, projectId);
    },
    [updateProject, project],
  );

  // Update visual direction
  const updateVisualDirection = useCallback(
    async (direction: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ visualDirection: direction }, projectId);
    },
    [updateProject, project],
  );

  // Update script preferences
  const updateScriptPreferences = useCallback(
    async (preferences: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ scriptPreferences: preferences }, projectId);
    },
    [updateProject, project],
  );

  // Update AI personas
  const updateAIPersonas = useCallback(
    async (personas: AIGeneratedPersonas, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ aiGeneratedPersonas: personas }, projectId);
    },
    [updateProject, project],
  );

  // Update persona selection
  const updatePersonaSelection = useCallback(
    async (selection: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ userPersonaSelection: selection }, projectId);
    },
    [updateProject, project],
  );

  // Update AI generated narratives
  const updateAINarratives = useCallback(
    async (narratives: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);

      console.log('updateAINarratives called with:', { projectId, narrativeCount: narratives.narratives?.length });

      try {
        const result = await updateProject({ aiGeneratedNarratives: narratives }, projectId);
        console.log('updateAINarratives returned:', result?.aiGeneratedNarratives);
        return result;
      } catch (error) {
        console.error('updateAINarratives error:', error);
        throw error;
      }
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
    async (storyboard: AIGeneratedStoryboard, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);

      console.log('updateAIStoryboard called with:', { projectId, sceneCount: storyboard.scenes?.length });

      try {
        const result = await updateProject({ aiGeneratedStoryboard: storyboard }, projectId);
        console.log('updateAIStoryboard returned:', result?.aiGeneratedStoryboard);
        return result;
      } catch (error) {
        console.error('updateAIStoryboard error:', error);
        throw error;
      }
    },
    [updateProject, project],
  );

  // Update storyboard customizations (scene edits)
  const updateStoryboardCustomizations = useCallback(
    async (customizations: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ storyboardCustomizations: customizations }, projectId);
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

  // Update screenplay customizations (screenplay edits)
  const updateScreenplayCustomizations = useCallback(
    async (customizations: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      await updateProject({ screenplayCustomizations: customizations }, projectId);
    },
    [updateProject, project],
  );

  // Update AI-generated videos
  const updateAIVideos = useCallback(
    async (videos: any, projectIdOverride?: string) => {
      const projectId = projectIdOverride || project?.id;
      if (!projectId) throw new Error('No project loaded');
      setHasUnsavedChanges(true);
      console.log('updateAIVideos called with:', { projectId, videoCount: videos?.videos?.length });
      await updateProject({ aiGeneratedVideos: videos }, projectId);
      console.log('updateAIVideos completed');
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
      await loadProject(project.id);
    },
    [project, loadProject],
  );

  // Mark stage as completed
  const markStageCompleted = useCallback(
    async (stageName: string, data?: any, additionalUpdates?: UpdateProjectInput): Promise<StoryLabProject | null> => {
      if (!project) return null;

      // First, find the index of the stage being completed
      const stageIndex = DEFAULT_WORKFLOW_STAGES.findIndex(s => s.name === stageName);
      if (stageIndex === -1) return null;

      console.log(`markStageCompleted: Completed stage '${stageName}' (index=${stageIndex}), current=${project.currentStageIndex}`);

      // Build the updated stageExecutions object
      const updatedStageExecutions = { ...project.stageExecutions };

      // Mark the current stage as completed
      updatedStageExecutions[stageName] = {
        ...updatedStageExecutions[stageName],
        stageName,
        status: 'completed' as const,
        startedAt: updatedStageExecutions[stageName]?.startedAt || new Date(),
        completedAt: new Date(),
        ...(data && { data }),
      };

      // Determine if we should advance and handle downstream stages
      let shouldUpdateStageIndex = false;
      let nextStageIndex = project.currentStageIndex;

      if (stageIndex === project.currentStageIndex) {
        // Normal progression: completing the current stage, advance to next
        shouldUpdateStageIndex = true;
        nextStageIndex = Math.min(stageIndex + 1, DEFAULT_WORKFLOW_STAGES.length - 1);
        console.log(`markStageCompleted: Stage ${stageIndex} is current, advancing to ${nextStageIndex}`);
      } else if (stageIndex > project.currentStageIndex) {
        // Completing a future stage (shouldn't happen normally), advance to next
        shouldUpdateStageIndex = true;
        nextStageIndex = Math.min(stageIndex + 1, DEFAULT_WORKFLOW_STAGES.length - 1);
        console.log(`markStageCompleted: Stage ${stageIndex} is ahead of current, advancing to ${nextStageIndex}`);
      } else {
        // Editing a PREVIOUS stage - mark all downstream stages as "pending" but DON'T change currentStageIndex
        console.log(`markStageCompleted: Re-editing previous stage ${stageIndex} (current is ${project.currentStageIndex}), marking downstream stages as pending`);

        for (let i = stageIndex + 1; i < DEFAULT_WORKFLOW_STAGES.length; i++) {
          const downstreamStageName = DEFAULT_WORKFLOW_STAGES[i].name;
          console.log(`markStageCompleted: Marking stage ${i} (${downstreamStageName}) as pending`);

          updatedStageExecutions[downstreamStageName] = {
            ...updatedStageExecutions[downstreamStageName],
            stageName: downstreamStageName,
            status: 'pending' as const,
            startedAt: updatedStageExecutions[downstreamStageName]?.startedAt || new Date(),
            // Preserve existing data - not cleared
          };
        }

        // Don't advance currentStageIndex when re-editing previous stages
        shouldUpdateStageIndex = false;
        console.log(`markStageCompleted: Keeping currentStageIndex at ${project.currentStageIndex} (not advancing)`);
      }

      // Single batched update with all changes
      const updates: any = {
        ...additionalUpdates, // Include any additional updates (like screenplayCustomizations)
        stageExecutions: updatedStageExecutions,
      };

      if (shouldUpdateStageIndex) {
        updates.currentStageIndex = nextStageIndex;
      }

      console.log(`markStageCompleted: Performing single batched update with:`, {
        hasCustomizations: !!additionalUpdates,
        stageExecutionsKeys: Object.keys(updatedStageExecutions),
        willUpdateStageIndex: shouldUpdateStageIndex,
        currentStageIndex: updates.currentStageIndex,
        updateKeys: Object.keys(updates),
      });
      const updatedProject = await updateProject(updates, project.id);
      console.log(`markStageCompleted: Batched update complete. Stage index ${shouldUpdateStageIndex ? `advanced from ${stageIndex} to ${nextStageIndex}` : `kept at ${project.currentStageIndex}`}. New project currentStageIndex:`, updatedProject.currentStageIndex);

      return updatedProject;
    },
    [updateProject, project],
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

    console.log(`advanceToNextStage: Using currentStageIndex=${projectData.currentStageIndex}`);

    const next = projectService.current.getNextStage(projectData.currentStageIndex);
    if (!next) {
      console.error(`advanceToNextStage: No next stage available for index ${projectData.currentStageIndex}`);
      throw new Error(`No next stage available (currentStageIndex=${projectData.currentStageIndex})`);
    }

    console.log(`advanceToNextStage: Advancing from stage index ${projectData.currentStageIndex} to ${next.index}`);

    // Update currentStageIndex and preserve campaign details
    // Pass projectId explicitly to avoid closure issues
    await updateProject(
      {
        currentStageIndex: next.index,
        campaignDetails: projectData.campaignDetails,
      },
      projectData.id  // Pass project ID explicitly
    );

    console.log(`advanceToNextStage: Successfully advanced to stage index ${next.index}`);
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
    updateAINarratives,
    updateAINarrative,
    updateAIStoryboard,
    updateStoryboardCustomizations,
    updateAIScreenplay,
    updateScreenplayCustomizations,
    updateAIVideos,
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
