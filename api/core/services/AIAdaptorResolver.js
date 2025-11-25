/**
 * AIAdaptorResolver
 *
 * Resolves which AI adaptor and model to use for a given project/stage/capability.
 * Handles fallback logic: project-specific → default → global.
 *
 * Singleton pattern for consistent resolution across the application.
 */

import AdaptorRegistry from '../adaptors/AdaptorRegistry.js';

class AIAdaptorResolver {
  /**
   * Resolve which adaptor to use for a specific capability
   *
   * @param {string} projectId - Project ID
   * @param {string} stageType - Stage type (e.g., "stage_2_personas")
   * @param {string} capability - Capability (e.g., "textGeneration", "imageGeneration")
   * @param {object} db - Firestore database instance
   * @param {object} modelConfigOverride - Optional model config override from prompt { adaptorId, modelId }
   * @returns {Promise<object>} { adaptorId, modelId, adaptor, config, credentials, source }
   */
  async resolveAdaptor(projectId, stageType, capability, db, modelConfigOverride = null) {
    try {
      // 0. Check for model config override from prompt (highest priority)
      let adaptorId = null;
      let modelId = null;
      let config = {};
      let source = 'global'; // where config came from

      if (modelConfigOverride && modelConfigOverride.adaptorId && modelConfigOverride.modelId) {
        adaptorId = modelConfigOverride.adaptorId;
        modelId = modelConfigOverride.modelId;
        source = 'prompt';
        console.log(`[AIAdaptorResolver] Using model config from prompt: ${adaptorId}/${modelId}`);
      }

      // 1. Get project-specific AI configuration from Firestore (if no override)
      if (!adaptorId && db && projectId) {
        try {
          const configDoc = await db.collection('project_ai_config').doc(projectId).get();

          if (configDoc.exists) {
            const projectConfig = configDoc.data();

            // Check for stage-specific adaptor selection
            const stageConfig = projectConfig.stageConfigs?.[stageType];

            if (stageConfig && stageConfig[capability]) {
              adaptorId = stageConfig[capability].adaptor;
              modelId = stageConfig[capability].model;
              config = stageConfig[capability].config || {};
              source = 'project';
            } else if (projectConfig.defaultAdaptor) {
              // Fall back to project default
              adaptorId = projectConfig.defaultAdaptor;
              modelId = projectConfig.defaultModel || this._getDefaultModelForAdaptor(adaptorId);
              source = 'project';
            }
          }
        } catch (error) {
          console.warn(`Failed to load project config for ${projectId}: ${error.message}`);
        }
      }

      // 2. Fall back to global defaults if not specified
      if (!adaptorId) {
        adaptorId = process.env.DEFAULT_AI_ADAPTOR || 'gemini';
        modelId = process.env.DEFAULT_AI_MODEL || 'gemini-2.0-flash';
        source = 'global';
      }

      // 3. Get credentials (project-specific or global)
      let credentials = {};

      if (db && projectId && source === 'project') {
        try {
          const configDoc = await db.collection('project_ai_config').doc(projectId).get();

          if (configDoc.exists) {
            const adaptorCreds = configDoc.data().adaptorCredentials?.[adaptorId];

            if (adaptorCreds) {
              credentials = adaptorCreds;
            } else {
              // Fall back to global credentials
              credentials = this._getGlobalCredentials(adaptorId);
            }
          } else {
            credentials = this._getGlobalCredentials(adaptorId);
          }
        } catch (error) {
          console.warn(`Failed to get credentials: ${error.message}`);
          credentials = this._getGlobalCredentials(adaptorId);
        }
      } else {
        credentials = this._getGlobalCredentials(adaptorId);
      }

      // 4. Validate adaptor is registered
      if (!AdaptorRegistry.hasAdaptor(adaptorId)) {
        throw new Error(
          `Adaptor '${adaptorId}' is not registered. Available: ${AdaptorRegistry.getAllAdaptors().join(', ')}`
        );
      }

      // 5. Get adaptor instance
      const adaptor = await AdaptorRegistry.getAdaptor(adaptorId, modelId, credentials, config);

      return {
        adaptorId,
        modelId,
        adaptor,
        config,
        credentials,
        source,
      };
    } catch (error) {
      console.error(`Adaptor resolution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all available adaptors with their status and models
   *
   * @returns {Promise<Array>} Array of adaptor info objects
   */
  async listAvailableAdaptors() {
    const result = [];
    const adaptorIds = AdaptorRegistry.getAllAdaptors();

    for (const adaptorId of adaptorIds) {
      try {
        const models = await AdaptorRegistry.getAvailableModels(adaptorId);
        const credentials = this._getGlobalCredentials(adaptorId);

        // Try health check
        let healthStatus = 'unknown';
        try {
          if (models.length > 0) {
            const firstModel = models[0].id;
            const adaptor = await AdaptorRegistry.getAdaptor(adaptorId, firstModel, credentials);
            const health = await adaptor.healthCheck();
            healthStatus = health.status;
          }
        } catch (error) {
          healthStatus = 'error';
        }

        result.push({
          id: adaptorId,
          name: this._getAdaptorName(adaptorId),
          status: healthStatus,
          models,
          defaultModel: models[0]?.id,
        });
      } catch (error) {
        result.push({
          id: adaptorId,
          name: this._getAdaptorName(adaptorId),
          status: 'unavailable',
          error: error.message,
          models: [],
        });
      }
    }

    return result;
  }

  /**
   * Get global credentials from environment variables
   *
   * @private
   * @param {string} adaptorId - Adaptor ID
   * @returns {object} Credentials object
   */
  _getGlobalCredentials(adaptorId) {
    const credentialMap = {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    };

    const creds = credentialMap[adaptorId] || {};

    if (!creds.apiKey) {
      console.warn(`No credentials found in environment for adaptor '${adaptorId}'`);
    }

    return creds;
  }

  /**
   * Get default model for an adaptor
   *
   * @private
   * @param {string} adaptorId - Adaptor ID
   * @returns {string} Default model ID
   */
  _getDefaultModelForAdaptor(adaptorId) {
    const defaults = {
      gemini: 'gemini-2.0-flash',
      openai: 'gpt-4-turbo',
      anthropic: 'claude-3-opus-20240229',
    };

    return defaults[adaptorId] || 'gemini-2.0-flash';
  }

  /**
   * Get display name for an adaptor
   *
   * @private
   * @param {string} adaptorId - Adaptor ID
   * @returns {string} Display name
   */
  _getAdaptorName(adaptorId) {
    const names = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
    };

    return names[adaptorId] || adaptorId;
  }
}

// Singleton instance
const resolver = new AIAdaptorResolver();

// For CommonJS compatibility (when required via require())
if (typeof module !== 'undefined' && module.exports) {
  module.exports = resolver;
}

export default resolver;
