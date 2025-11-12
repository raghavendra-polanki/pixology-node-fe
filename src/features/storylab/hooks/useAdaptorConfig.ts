/**
 * React Hook for Adaptor Configuration Management
 * Manages adaptor selection, configuration, and usage tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AdaptorService, { AdaptorInfo, AdaptorConfig, PromptTemplate, UsageStats } from '@/shared/services/adaptorService';
import type { AdaptorInfo as AdaptorInfoType } from '@/shared/services/adaptorService';

interface UseAdaptorConfigOptions {
  projectId?: string;
  stageType?: string;
  capability?: 'textGeneration' | 'imageGeneration' | 'videoGeneration';
}

interface UseAdaptorConfigResult {
  // State
  adaptors: AdaptorInfoType[];
  selectedAdaptorId: string | null;
  selectedModelId: string | null;
  config: AdaptorConfig | null;
  usageStats: UsageStats[] | null;
  promptTemplates: PromptTemplate[];
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;

  // Adaptor operations
  loadAdaptors: (capability: 'textGeneration' | 'imageGeneration' | 'videoGeneration') => Promise<void>;
  selectAdaptor: (adaptorId: string, modelId: string) => Promise<void>;
  updateAdaptorConfig: (newConfig: AdaptorConfig) => Promise<void>;
  loadUsageStats: (period?: 'day' | 'week' | 'month' | 'all') => Promise<void>;

  // Prompt template operations
  loadPromptTemplates: () => Promise<void>;
  savePromptTemplate: (template: PromptTemplate) => Promise<void>;
  deletePromptTemplate: (templateId: string) => Promise<void>;

  // State reset
  reset: () => void;
}

export function useAdaptorConfig(options: UseAdaptorConfigOptions = {}): UseAdaptorConfigResult {
  const adaptorService = useRef(new AdaptorService());
  const { projectId, stageType, capability } = options;

  // State
  const [adaptors, setAdaptors] = useState<AdaptorInfoType[]>([]);
  const [selectedAdaptorId, setSelectedAdaptorId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [config, setConfig] = useState<AdaptorConfig | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[] | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load adaptors
  const loadAdaptors = useCallback(
    async (cap: 'textGeneration' | 'imageGeneration' | 'videoGeneration') => {
      if (!projectId) {
        setError(new Error('Project ID is required'));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await adaptorService.current.getAvailableAdaptors(projectId, cap);
        setAdaptors(data);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to load adaptors');
        setError(errorObj);
        console.error('Error loading adaptors:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // Select adaptor and load its config
  const selectAdaptor = useCallback(
    async (adaptorId: string, modelId: string) => {
      if (!projectId || !stageType || !capability) {
        setError(new Error('Project ID, stage type, and capability are required'));
        return;
      }

      try {
        setIsSaving(true);
        setError(null);

        // Save selection
        await adaptorService.current.saveAdaptorSelection(
          projectId,
          stageType,
          capability,
          adaptorId,
          modelId
        );

        // Load config
        const configData = await adaptorService.current.getAdaptorConfig(
          projectId,
          stageType,
          adaptorId
        );

        setSelectedAdaptorId(adaptorId);
        setSelectedModelId(modelId);
        setConfig(configData);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to select adaptor');
        setError(errorObj);
        console.error('Error selecting adaptor:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, stageType, capability]
  );

  // Update adaptor config
  const updateAdaptorConfig = useCallback(
    async (newConfig: AdaptorConfig) => {
      if (!projectId || !stageType || !selectedAdaptorId) {
        setError(new Error('Project ID, stage type, and selected adaptor are required'));
        return;
      }

      try {
        setIsSaving(true);
        setError(null);

        await adaptorService.current.saveAdaptorParameters(
          projectId,
          stageType,
          selectedAdaptorId,
          newConfig
        );

        setConfig(newConfig);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to update config');
        setError(errorObj);
        console.error('Error updating config:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, stageType, selectedAdaptorId]
  );

  // Load usage stats
  const loadUsageStats = useCallback(
    async (period: 'day' | 'week' | 'month' | 'all' = 'month') => {
      if (!projectId) {
        setError(new Error('Project ID is required'));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await adaptorService.current.getUsageStats(projectId, period);
        setUsageStats(data);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to load usage stats');
        setError(errorObj);
        console.error('Error loading usage stats:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  // Load prompt templates
  const loadPromptTemplates = useCallback(
    async () => {
      if (!projectId || !stageType) {
        setError(new Error('Project ID and stage type are required'));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await adaptorService.current.listPromptTemplates(projectId, stageType);
        setPromptTemplates(data);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to load templates');
        setError(errorObj);
        console.error('Error loading templates:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, stageType]
  );

  // Save prompt template
  const savePromptTemplate = useCallback(
    async (template: PromptTemplate) => {
      if (!projectId || !stageType) {
        setError(new Error('Project ID and stage type are required'));
        return;
      }

      try {
        setIsSaving(true);
        setError(null);
        const saved = await adaptorService.current.savePromptTemplate(projectId, stageType, template);

        // Update list
        setPromptTemplates((prev) => {
          const index = prev.findIndex((t) => t.id === saved.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = saved;
            return updated;
          }
          return [...prev, saved];
        });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to save template');
        setError(errorObj);
        console.error('Error saving template:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, stageType]
  );

  // Delete prompt template
  const deletePromptTemplate = useCallback(
    async (templateId: string) => {
      if (!projectId) {
        setError(new Error('Project ID is required'));
        return;
      }

      try {
        setIsSaving(true);
        setError(null);
        await adaptorService.current.deletePromptTemplate(projectId, templateId);

        setPromptTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to delete template');
        setError(errorObj);
        console.error('Error deleting template:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  // Reset state
  const reset = useCallback(() => {
    setAdaptors([]);
    setSelectedAdaptorId(null);
    setSelectedModelId(null);
    setConfig(null);
    setUsageStats(null);
    setPromptTemplates([]);
    setError(null);
  }, []);

  return {
    // State
    adaptors,
    selectedAdaptorId,
    selectedModelId,
    config,
    usageStats,
    promptTemplates,
    isLoading,
    isSaving,
    error,

    // Operations
    loadAdaptors,
    selectAdaptor,
    updateAdaptorConfig,
    loadUsageStats,
    loadPromptTemplates,
    savePromptTemplate,
    deletePromptTemplate,
    reset,
  };
}
