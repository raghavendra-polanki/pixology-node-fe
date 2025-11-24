/**
 * Available AI Models Configuration
 * Defines which models are available for each capability across different adaptors
 */

const AVAILABLE_MODELS = {
  // Gemini models
  gemini: {
    adaptorId: 'gemini',
    adaptorName: 'Google Gemini',
    capabilities: {
      textGeneration: {
        models: [
          {
            modelId: 'gemini-2.0-flash-exp',
            displayName: 'Gemini 2.0 Flash (Experimental)',
            description: 'Fast and efficient text generation',
            isDefault: true,
            contextWindow: 1000000,
            maxOutputTokens: 8192,
          },
          {
            modelId: 'gemini-3-pro-preview',
            displayName: 'Gemini 3.0 Pro (Preview)',
            description: 'Advanced text generation with enhanced capabilities',
            isDefault: false,
            contextWindow: 2000000,
            maxOutputTokens: 8192,
          },
        ],
      },
      imageGeneration: {
        models: [
          {
            modelId: 'imagen-3.0-generate-001',
            displayName: 'Imagen 3.0',
            description: 'High-quality image generation',
            isDefault: true,
            supportedSizes: ['1024x1024', '1024x768', '768x1024'],
          },
        ],
      },
      videoGeneration: {
        models: [
          {
            modelId: 'veo-3.1-generate-preview',
            displayName: 'Veo 3.1 (Preview)',
            description: 'Video generation with reference images',
            isDefault: true,
            supportedDurations: [8],
            supportedResolutions: ['720p', '1080p'],
            maxReferenceImages: 3,
          },
        ],
      },
    },
  },

  // Placeholder for future OpenAI support
  openai: {
    adaptorId: 'openai',
    adaptorName: 'OpenAI',
    capabilities: {
      textGeneration: {
        models: [
          {
            modelId: 'gpt-4',
            displayName: 'GPT-4',
            description: 'Advanced text generation',
            isDefault: true,
            contextWindow: 8192,
            maxOutputTokens: 4096,
          },
        ],
      },
      imageGeneration: {
        models: [
          {
            modelId: 'dall-e-3',
            displayName: 'DALL-E 3',
            description: 'High-quality image generation',
            isDefault: true,
            supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
          },
        ],
      },
      videoGeneration: {
        models: [
          {
            modelId: 'sora-2',
            displayName: 'Sora 2',
            description: 'Standard video generation model',
            isDefault: true,
            supportedDurations: [4, 8, 12],
            supportedResolutions: ['720x1280', '1280x720', '1024x1792', '1792x1024'],
            costPerSecond: 2.5,
          },
          {
            modelId: 'sora-2-pro',
            displayName: 'Sora 2 Pro',
            description: 'Advanced video generation with HD quality',
            isDefault: false,
            supportedDurations: [4, 8, 12],
            supportedResolutions: ['720x1280', '1280x720', '1024x1792', '1792x1024'],
            costPerSecond: 5.0,
          },
        ],
      },
    },
  },
};

/**
 * Get available models for a specific capability
 * @param {string} capability - Capability type (textGeneration, imageGeneration, videoGeneration)
 * @param {string} adaptorId - Optional adaptor ID filter (e.g., 'gemini', 'openai')
 * @returns {Array} List of available models
 */
function getAvailableModelsForCapability(capability, adaptorId = null) {
  const results = [];

  const adaptors = adaptorId ? [AVAILABLE_MODELS[adaptorId]] : Object.values(AVAILABLE_MODELS);

  for (const adaptor of adaptors) {
    if (adaptor && adaptor.capabilities[capability]) {
      const models = adaptor.capabilities[capability].models || [];
      models.forEach(model => {
        results.push({
          adaptorId: adaptor.adaptorId,
          adaptorName: adaptor.adaptorName,
          ...model,
        });
      });
    }
  }

  return results;
}

/**
 * Get default model for a capability and adaptor
 * @param {string} capability - Capability type
 * @param {string} adaptorId - Adaptor ID
 * @returns {Object|null} Default model config or null
 */
function getDefaultModel(capability, adaptorId) {
  const adaptor = AVAILABLE_MODELS[adaptorId];
  if (!adaptor || !adaptor.capabilities[capability]) {
    return null;
  }

  const models = adaptor.capabilities[capability].models || [];
  const defaultModel = models.find(m => m.isDefault) || models[0];

  if (defaultModel) {
    return {
      adaptorId: adaptor.adaptorId,
      modelId: defaultModel.modelId,
      displayName: defaultModel.displayName,
    };
  }

  return null;
}

/**
 * Get model details by adaptorId and modelId
 * @param {string} adaptorId - Adaptor ID
 * @param {string} modelId - Model ID
 * @returns {Object|null} Model details or null
 */
function getModelDetails(adaptorId, modelId) {
  const adaptor = AVAILABLE_MODELS[adaptorId];
  if (!adaptor) {
    return null;
  }

  for (const capability of Object.keys(adaptor.capabilities)) {
    const models = adaptor.capabilities[capability].models || [];
    const model = models.find(m => m.modelId === modelId);
    if (model) {
      return {
        adaptorId: adaptor.adaptorId,
        adaptorName: adaptor.adaptorName,
        capability,
        ...model,
      };
    }
  }

  return null;
}

module.exports = {
  AVAILABLE_MODELS,
  getAvailableModelsForCapability,
  getDefaultModel,
  getModelDetails,
};
