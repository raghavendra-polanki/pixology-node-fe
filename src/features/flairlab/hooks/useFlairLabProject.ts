/**
 * FlairLab Project Hook
 * Central state management for FlairLab projects
 * Based on the same pattern as useStoryLabProject
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import FlairLabProjectService from '@/shared/services/flairLabProjectService';
import {
  FlairLabProject,
  CreateProjectInput,
  UpdateProjectInput,
  ContextBriefData,
  ConceptGalleryData,
  CastingCallData,
  HighFidelityCaptureData,
  KineticActivationData,
  PolishDownloadData,
  DEFAULT_WORKFLOW_STAGES,
} from '../types/project.types';

export interface UseFlairLabProjectOptions {
  autoLoad?: boolean;
  projectId?: string;
  onProjectChange?: (project: FlairLabProject | null) => void;
  onError?: (error: Error) => void;
}

export interface UseFlairLabProjectResult {
  // State
  project: FlairLabProject | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  hasUnsavedChanges: boolean;

  // CRUD Operations
  createProject: (input: CreateProjectInput) => Promise<FlairLabProject | null>;
  loadProject: (projectId: string) => Promise<FlairLabProject | null>;
  saveProject: () => Promise<FlairLabProject | null>;
  deleteProject: (projectId?: string) => Promise<void>;
  updateProject: (updates: UpdateProjectInput, projectId?: string) => Promise<FlairLabProject | null>;

  // Stage-specific updates
  updateContextBrief: (contextBrief: Partial<ContextBriefData>, projectId?: string) => Promise<FlairLabProject | null>;
  updateConceptGallery: (conceptGallery: Partial<ConceptGalleryData>, projectId?: string) => Promise<FlairLabProject | null>;
  updateCastingCall: (castingCall: Partial<CastingCallData>, projectId?: string) => Promise<FlairLabProject | null>;
  updateHighFidelityCapture: (capture: Partial<HighFidelityCaptureData>, projectId?: string) => Promise<FlairLabProject | null>;
  updateKineticActivation: (activation: Partial<KineticActivationData>, projectId?: string) => Promise<FlairLabProject | null>;
  updatePolishDownload: (polish: Partial<PolishDownloadData>, projectId?: string) => Promise<FlairLabProject | null>;

  // Stage execution operations
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: UpdateProjectInput) => Promise<FlairLabProject | null>;
  markStageInProgress: (stageName: string) => Promise<FlairLabProject | null>;
  markStageFailed: (stageName: string, error: any) => Promise<FlairLabProject | null>;
  advanceToNextStage: () => Promise<FlairLabProject | null>;

  // Utility methods
  resetError: () => void;
  clearProject: () => void;
}

const TOTAL_STAGES = DEFAULT_WORKFLOW_STAGES.length;

export function useFlairLabProject(options: UseFlairLabProjectOptions = {}): UseFlairLabProjectResult {
  const { autoLoad = false, projectId, onProjectChange, onError } = options;

  // Service instance (singleton per hook instance)
  const projectService = useRef(new FlairLabProjectService());

  // State
  const [project, setProject] = useState<FlairLabProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-load project on mount if projectId is provided
  useEffect(() => {
    if (autoLoad && projectId) {
      // Don't try to load temp projects from database - they don't exist yet
      if (projectId.startsWith('temp-')) {
        setProject(null);
        setIsLoading(false);
      } else {
        // Load the project from the API
        (async () => {
          try {
            setIsLoading(true);
            setError(null);
            const loadedProject = await projectService.current.getProject(projectId);
            setProject(loadedProject);
            setHasUnsavedChanges(false);
          } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load project');
            setError(error);
          } finally {
            setIsLoading(false);
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, projectId]);

  // Notify parent when project changes
  useEffect(() => {
    if (onProjectChange) {
      onProjectChange(project);
    }
  }, [project, onProjectChange]);

  // Notify parent when error occurs
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  /**
   * ========== CRUD OPERATIONS ==========
   */

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const newProject = await projectService.current.createProject(input);
        setProject(newProject);
        setHasUnsavedChanges(false);

        return newProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create project');
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadProject = useCallback(
    async (projectId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedProject = await projectService.current.getProject(projectId);
        setProject(loadedProject);
        setHasUnsavedChanges(false);

        return loadedProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load project');
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateProject = useCallback(
    async (updates: UpdateProjectInput, projectId?: string) => {
      const targetProjectId = projectId || project?.id;
      if (!targetProjectId) {
        const error = new Error('No project ID available for update');
        setError(error);
        return null;
      }

      try {
        setIsSaving(true);
        setError(null);

        const updatedProject = await projectService.current.updateProject(targetProjectId, updates);
        setProject(updatedProject);
        setHasUnsavedChanges(false);

        return updatedProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update project');
        setError(error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [project?.id],
  );

  const saveProject = useCallback(
    async () => {
      if (!project) {
        const error = new Error('No project to save');
        setError(error);
        return null;
      }

      return updateProject({}, project.id);
    },
    [project, updateProject],
  );

  const deleteProject = useCallback(
    async (projectId?: string) => {
      const targetProjectId = projectId || project?.id;
      if (!targetProjectId) {
        throw new Error('No project ID available for deletion');
      }

      try {
        setIsLoading(true);
        setError(null);

        await projectService.current.deleteProject(targetProjectId);
        setProject(null);
        setHasUnsavedChanges(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete project');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [project?.id],
  );

  /**
   * ========== STAGE-SPECIFIC UPDATES ==========
   */

  const updateContextBrief = useCallback(
    async (contextBrief: Partial<ContextBriefData>, projectId?: string) => {
      return updateProject({ contextBrief }, projectId);
    },
    [updateProject],
  );

  const updateConceptGallery = useCallback(
    async (conceptGallery: Partial<ConceptGalleryData>, projectId?: string) => {
      return updateProject({ conceptGallery }, projectId);
    },
    [updateProject],
  );

  const updateCastingCall = useCallback(
    async (castingCall: Partial<CastingCallData>, projectId?: string) => {
      return updateProject({ castingCall }, projectId);
    },
    [updateProject],
  );

  const updateHighFidelityCapture = useCallback(
    async (capture: Partial<HighFidelityCaptureData>, projectId?: string) => {
      return updateProject({ highFidelityCapture: capture }, projectId);
    },
    [updateProject],
  );

  const updateKineticActivation = useCallback(
    async (activation: Partial<KineticActivationData>, projectId?: string) => {
      return updateProject({ kineticActivation: activation }, projectId);
    },
    [updateProject],
  );

  const updatePolishDownload = useCallback(
    async (polish: Partial<PolishDownloadData>, projectId?: string) => {
      return updateProject({ polishDownload: polish }, projectId);
    },
    [updateProject],
  );

  /**
   * ========== STAGE EXECUTION OPERATIONS ==========
   */

  const markStageCompleted = useCallback(
    async (
      stageName: string,
      data?: any,
      additionalUpdates?: UpdateProjectInput,
    ) => {
      if (!project) {
        const error = new Error('No project available for stage completion');
        setError(error);
        return null;
      }

      try {
        setIsSaving(true);
        setError(null);

        const stageIndex = DEFAULT_WORKFLOW_STAGES.findIndex(s => s.name === stageName);
        if (stageIndex === -1) {
          throw new Error(`Invalid stage name: ${stageName}`);
        }

        // Build updated stageExecutions
        const updatedStageExecutions = { ...project.stageExecutions };

        // Mark current stage as completed
        updatedStageExecutions[stageName] = {
          ...updatedStageExecutions[stageName],
          stageName,
          status: 'completed',
          startedAt: updatedStageExecutions[stageName]?.startedAt || new Date(),
          completedAt: new Date(),
          ...(data && { data }),
        };

        // Determine if we should advance to next stage
        let shouldUpdateStageIndex = false;
        let nextStageIndex = project.currentStageIndex;

        // If completing the CURRENT stage -> advance to next
        if (stageIndex === project.currentStageIndex) {
          shouldUpdateStageIndex = true;
          nextStageIndex = Math.min(stageIndex + 1, TOTAL_STAGES - 1);
        }
        // If re-editing a PREVIOUS stage -> mark downstream stages as pending
        else if (stageIndex < project.currentStageIndex) {
          for (let i = stageIndex + 1; i < DEFAULT_WORKFLOW_STAGES.length; i++) {
            const downstreamStageName = DEFAULT_WORKFLOW_STAGES[i].name;
            updatedStageExecutions[downstreamStageName] = {
              ...updatedStageExecutions[downstreamStageName],
              stageName: downstreamStageName,
              status: 'pending', // Mark as needing regeneration
            };
          }
          // Don't advance - stay at current stage
          shouldUpdateStageIndex = false;
        }

        // Calculate completion percentage
        const completedStages = Object.values(updatedStageExecutions).filter(
          execution => execution.status === 'completed'
        ).length;
        const completionPercentage = Math.round((completedStages / TOTAL_STAGES) * 100);

        // Single batched update with all changes
        const updates: UpdateProjectInput = {
          ...additionalUpdates,
          stageExecutions: updatedStageExecutions,
          completionPercentage,
          ...(shouldUpdateStageIndex && { currentStageIndex: nextStageIndex }),
        };

        const updatedProject = await projectService.current.updateProject(project.id, updates);
        setProject(updatedProject);
        setHasUnsavedChanges(false);

        return updatedProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to mark stage as completed');
        setError(error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [project],
  );

  const markStageInProgress = useCallback(
    async (stageName: string) => {
      if (!project) {
        const error = new Error('No project available');
        setError(error);
        return null;
      }

      try {
        setIsSaving(true);
        setError(null);

        const updatedStageExecutions = { ...project.stageExecutions };
        updatedStageExecutions[stageName] = {
          ...updatedStageExecutions[stageName],
          stageName,
          status: 'in_progress',
          startedAt: updatedStageExecutions[stageName]?.startedAt || new Date(),
        };

        const updatedProject = await projectService.current.updateProject(project.id, {
          stageExecutions: updatedStageExecutions,
        });
        setProject(updatedProject);
        setHasUnsavedChanges(false);

        return updatedProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to mark stage as in progress');
        setError(error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [project],
  );

  const markStageFailed = useCallback(
    async (stageName: string, errorData: any) => {
      if (!project) {
        const error = new Error('No project available');
        setError(error);
        return null;
      }

      try {
        setIsSaving(true);
        setError(null);

        const updatedStageExecutions = { ...project.stageExecutions };
        updatedStageExecutions[stageName] = {
          ...updatedStageExecutions[stageName],
          stageName,
          status: 'failed',
          error: errorData,
        };

        const updatedProject = await projectService.current.updateProject(project.id, {
          stageExecutions: updatedStageExecutions,
        });
        setProject(updatedProject);
        setHasUnsavedChanges(false);

        return updatedProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to mark stage as failed');
        setError(error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [project],
  );

  const advanceToNextStage = useCallback(
    async () => {
      if (!project) {
        const error = new Error('No project available');
        setError(error);
        return null;
      }

      const nextStageIndex = Math.min(project.currentStageIndex + 1, TOTAL_STAGES - 1);
      return updateProject({ currentStageIndex: nextStageIndex });
    },
    [project, updateProject],
  );

  /**
   * ========== UTILITY METHODS ==========
   */

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const clearProject = useCallback(() => {
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
    hasUnsavedChanges,

    // CRUD operations
    createProject,
    loadProject,
    saveProject,
    deleteProject,
    updateProject,

    // Stage-specific updates
    updateContextBrief,
    updateConceptGallery,
    updateCastingCall,
    updateHighFidelityCapture,
    updateKineticActivation,
    updatePolishDownload,

    // Stage execution operations
    markStageCompleted,
    markStageInProgress,
    markStageFailed,
    advanceToNextStage,

    // Utility methods
    resetError,
    clearProject,
  };
}
