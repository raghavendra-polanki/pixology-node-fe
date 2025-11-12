/**
 * Adaptor Context
 * Provides adaptor configuration and selection state across the application
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import AdaptorService, { AdaptorConfig } from '@/shared/services/adaptorService';

interface AdaptorSelection {
  adaptorId: string;
  modelId: string;
  capability: 'textGeneration' | 'imageGeneration' | 'videoGeneration';
  stageType: string;
}

interface AdaptorContextType {
  // Selected adaptor info
  selectedAdaptor: AdaptorSelection | null;
  selectedConfig: AdaptorConfig | null;

  // Methods
  selectAdaptor: (selection: AdaptorSelection) => Promise<void>;
  updateConfig: (config: AdaptorConfig) => Promise<void>;
  getAdaptorSelection: (stageType: string, capability: string) => AdaptorSelection | null;
  clearSelection: () => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const AdaptorContext = createContext<AdaptorContextType | undefined>(undefined);

interface AdaptorProviderProps {
  projectId: string;
  children: ReactNode;
}

export function AdaptorProvider({ projectId, children }: AdaptorProviderProps) {
  const [selectedAdaptor, setSelectedAdaptor] = useState<AdaptorSelection | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AdaptorConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adaptorService = new AdaptorService();

  const selectAdaptor = useCallback(
    async (selection: AdaptorSelection) => {
      try {
        setIsLoading(true);
        setError(null);

        // Save the selection
        await adaptorService.saveAdaptorSelection(
          projectId,
          selection.stageType,
          selection.capability,
          selection.adaptorId,
          selection.modelId
        );

        setSelectedAdaptor(selection);

        // Load the config
        const config = await adaptorService.getAdaptorConfig(
          projectId,
          selection.stageType,
          selection.adaptorId
        );
        setSelectedConfig(config);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to select adaptor';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const updateConfig = useCallback(
    async (config: AdaptorConfig) => {
      if (!selectedAdaptor) {
        throw new Error('No adaptor selected');
      }

      try {
        setIsLoading(true);
        setError(null);

        await adaptorService.saveAdaptorParameters(
          projectId,
          selectedAdaptor.stageType,
          selectedAdaptor.adaptorId,
          config
        );

        setSelectedConfig(config);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update config';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, selectedAdaptor]
  );

  const getAdaptorSelection = useCallback(
    (stageType: string, capability: string): AdaptorSelection | null => {
      if (
        selectedAdaptor &&
        selectedAdaptor.stageType === stageType &&
        selectedAdaptor.capability === capability
      ) {
        return selectedAdaptor;
      }
      return null;
    },
    [selectedAdaptor]
  );

  const clearSelection = useCallback(() => {
    setSelectedAdaptor(null);
    setSelectedConfig(null);
    setError(null);
  }, []);

  const value: AdaptorContextType = {
    selectedAdaptor,
    selectedConfig,
    selectAdaptor,
    updateConfig,
    getAdaptorSelection,
    clearSelection,
    isLoading,
    error,
  };

  return <AdaptorContext.Provider value={value}>{children}</AdaptorContext.Provider>;
}

export function useAdaptorContext(): AdaptorContextType {
  const context = useContext(AdaptorContext);
  if (!context) {
    throw new Error('useAdaptorContext must be used within AdaptorProvider');
  }
  return context;
}
