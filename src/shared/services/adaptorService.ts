/**
 * Adaptor Service
 * Handles all API calls related to the new AI adaptor architecture
 */

interface AdaptorInfo {
  id: string;
  name: string;
  description: string;
  models: string[];
  capabilities: string[];
  isHealthy: boolean;
  lastHealthCheck?: string;
}

interface AdaptorConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryAttempts?: number;
  customParameters?: Record<string, string>;
}

interface PromptTemplate {
  id: string;
  stageType: string;
  name: string;
  description: string;
  version: number;
  prompts: {
    [capability: string]: {
      systemPrompt: string;
      userPromptTemplate: string;
      outputFormat: 'text' | 'json';
    };
  };
  variables: Array<{
    name: string;
    description: string;
    placeholder?: string;
  }>;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
}

interface UsageStats {
  adaptorId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  lastUsed: string;
  period: 'day' | 'week' | 'month' | 'all';
}

class AdaptorService {
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
   * Get available adaptors for a specific capability
   */
  async getAvailableAdaptors(
    projectId: string,
    capability: 'textGeneration' | 'imageGeneration' | 'videoGeneration'
  ): Promise<AdaptorInfo[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/adaptors/available?projectId=${projectId}&capability=${capability}`,
      {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch adaptors');
    }

    const data = await response.json();
    return data.adaptors || [];
  }

  /**
   * Get adaptor configuration for a stage
   */
  async getAdaptorConfig(
    projectId: string,
    stageType: string,
    adaptorId: string
  ): Promise<AdaptorConfig> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/adaptors/config?projectId=${projectId}&stageType=${stageType}&adaptorId=${adaptorId}`,
      {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch adaptor config');
    }

    const data = await response.json();
    return data.config || {};
  }

  /**
   * Save adaptor selection for a stage
   */
  async saveAdaptorSelection(
    projectId: string,
    stageType: string,
    capability: 'textGeneration' | 'imageGeneration' | 'videoGeneration',
    adaptorId: string,
    modelId: string
  ): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/adaptors/config`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({
        projectId,
        stageType,
        capability,
        adaptorId,
        modelId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save adaptor selection');
    }
  }

  /**
   * Save adaptor parameters/configuration
   */
  async saveAdaptorParameters(
    projectId: string,
    stageType: string,
    adaptorId: string,
    config: AdaptorConfig
  ): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/adaptors/config/parameters`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({
        projectId,
        stageType,
        adaptorId,
        config,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save adaptor parameters');
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    projectId: string,
    period: 'day' | 'week' | 'month' | 'all' = 'month'
  ): Promise<UsageStats[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/usage/stats?projectId=${projectId}&period=${period}`,
      {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch usage statistics');
    }

    const data = await response.json();
    return data.stats || [];
  }

  /**
   * Save or update prompt template
   */
  async savePromptTemplate(
    projectId: string,
    stageType: string,
    template: PromptTemplate
  ): Promise<PromptTemplate> {
    const response = await fetch(`${this.apiBaseUrl}/api/prompts/templates`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      credentials: 'include',
      body: JSON.stringify({
        projectId,
        stageType,
        template,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save prompt template');
    }

    const data = await response.json();
    return data.template || template;
  }

  /**
   * Get prompt template by ID or stage
   */
  async getPromptTemplate(
    projectId: string,
    stageType: string,
    templateId?: string
  ): Promise<PromptTemplate> {
    const query = templateId
      ? `?projectId=${projectId}&stageType=${stageType}&templateId=${templateId}`
      : `?projectId=${projectId}&stageType=${stageType}`;

    const response = await fetch(`${this.apiBaseUrl}/api/prompts/templates${query}`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch prompt template');
    }

    const data = await response.json();
    return data.template;
  }

  /**
   * List all prompt templates for a stage
   */
  async listPromptTemplates(
    projectId: string,
    stageType: string
  ): Promise<PromptTemplate[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/prompts/templates/list?projectId=${projectId}&stageType=${stageType}`,
      {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch prompt templates');
    }

    const data = await response.json();
    return data.templates || [];
  }

  /**
   * Delete prompt template
   */
  async deletePromptTemplate(projectId: string, templateId: string): Promise<void> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/prompts/templates/${templateId}?projectId=${projectId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete prompt template');
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(adaptorId: string, modelId: string) {
    const response = await fetch(
      `${this.apiBaseUrl}/api/adaptors/${adaptorId}/models/${modelId}`,
      {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch model info');
    }

    const data = await response.json();
    return data.model;
  }

  /**
   * Get all adaptors
   */
  async getAllAdaptors(): Promise<AdaptorInfo[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/adaptors`, {
      method: 'GET',
      headers: this.getAuthHeader(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch adaptors');
    }

    const data = await response.json();
    return data.adaptors || [];
  }
}

export default AdaptorService;
export type { AdaptorInfo, AdaptorConfig, PromptTemplate, UsageStats };
