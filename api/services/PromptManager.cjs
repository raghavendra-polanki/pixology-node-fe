/**
 * PromptManager
 *
 * Manages AI prompts with support for:
 * - Template resolution from Firestore
 * - Variable substitution
 * - Project-specific overrides
 * - Version management
 * - Per-prompt model configuration
 *
 * Singleton pattern for consistent prompt management across application
 */

const { getDefaultModel } = require('../config/availableModels.cjs');

class PromptManager {
  constructor() {
    this.templateCache = new Map();
    this.overrideCache = new Map();
  }

  /**
   * Get prompt template for a stage with project-specific overrides
   * NEW: Returns the full stage template with array of prompts
   *
   * @param {string} stageType - Stage type (e.g., "stage_2_personas")
   * @param {string} projectId - Project ID (optional for global defaults)
   * @param {object} db - Firestore database instance
   * @returns {Promise<object>} { id, stageType, prompts: [...], source }
   */
  async getPromptTemplate(stageType, projectId = null, db = null) {
    try {
      // 1. Check for project-specific overrides first
      if (projectId && db) {
        const override = await this._getProjectOverride(projectId, stageType, db);

        if (override) {
          return {
            source: 'project_override',
            id: stageType,
            stageType,
            prompts: override.prompts || [],
          };
        }
      }

      // 2. Fall back to global default template (now uses stageType as document ID)
      if (db) {
        const defaultTemplate = await this._getDefaultTemplate(stageType, db);

        if (defaultTemplate) {
          return {
            source: 'default',
            ...defaultTemplate,
          };
        }
      }

      // 3. Return empty template (shouldn't happen if seeded properly)
      return {
        source: 'empty',
        id: stageType,
        stageType,
        prompts: [],
      };
    } catch (error) {
      console.error(`Failed to get prompt template for ${stageType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific prompt by capability from stage template
   *
   * @param {string} stageType - Stage type
   * @param {string} capability - Capability (e.g., "textGeneration")
   * @param {string} projectId - Project ID (optional)
   * @param {object} db - Firestore database instance
   * @returns {Promise<object>} Prompt object for the capability with modelConfig
   */
  async getPromptByCapability(stageType, capability, projectId = null, db = null) {
    try {
      const template = await this.getPromptTemplate(stageType, projectId, db);

      // Find the first active prompt with matching capability
      const prompt = template.prompts.find(
        p => p.capability === capability && p.isActive !== false
      );

      if (!prompt) {
        console.warn(`No active prompt found for ${stageType}:${capability}`);
        // Return empty prompt structure to avoid breaking generation
        return {
          capability,
          systemPrompt: '',
          userPromptTemplate: '',
          outputFormat: 'json',
          modelConfig: this._getDefaultModelConfig(capability),
        };
      }

      // Ensure modelConfig exists, use default if not specified
      if (!prompt.modelConfig) {
        prompt.modelConfig = this._getDefaultModelConfig(capability);
      }

      return prompt;
    } catch (error) {
      console.error(`Failed to get prompt by capability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve template variables with actual values
   *
   * @param {string} template - Template string with {{variable}} placeholders
   * @param {object} variables - Variable values
   * @returns {string} Resolved prompt
   */
  resolvePromptVariables(template, variables = {}) {
    if (!template) return '';

    let resolved = template;

    // Replace all {{variableName}} with actual values (double curly braces)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      resolved = resolved.replace(regex, value || '');
    });

    // Log any unresolved variables
    const unresolvedMatches = resolved.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g);

    if (unresolvedMatches) {
      console.warn('Unresolved variables in prompt:', unresolvedMatches);
    }

    return resolved;
  }

  /**
   * Resolve full prompt template with variable substitution
   *
   * @param {object} promptTemplate - Template object with systemPrompt, userPromptTemplate
   * @param {object} variables - Variables to substitute
   * @returns {object} { systemPrompt, userPrompt }
   */
  resolvePrompt(promptTemplate, variables = {}) {
    if (!promptTemplate || !promptTemplate.userPromptTemplate) {
      console.warn('Prompt template missing or incomplete:', { promptTemplate, variables });
      throw new Error('Prompt template is required');
    }

    return {
      systemPrompt: this.resolvePromptVariables(promptTemplate.systemPrompt || '', variables),
      userPrompt: this.resolvePromptVariables(promptTemplate.userPromptTemplate, variables),
      outputFormat: promptTemplate.outputFormat || 'text',
    };
  }

  /**
   * Save project-specific prompt override
   *
   * @param {string} projectId - Project ID
   * @param {string} stageType - Stage type
   * @param {object} promptTemplate - { systemPrompt, userPromptTemplate, outputFormat }
   * @param {object} db - Firestore database
   */
  async savePromptOverride(projectId, stageType, promptTemplate, db) {
    try {
      const config = await db.collection('project_ai_config').doc(projectId).get();

      if (!config.exists) {
        throw new Error(`Project config not found for ${projectId}`);
      }

      const updates = {
        [`promptOverrides.${stageType}`]: {
          prompts: promptTemplate,
          version: 1,
          updatedAt: new Date().toISOString(),
        },
      };

      await db.collection('project_ai_config').doc(projectId).update(updates);

      // Clear cache
      this.overrideCache.delete(`${projectId}:${stageType}`);

      console.log(`Saved prompt override for ${projectId}:${stageType}`);
    } catch (error) {
      console.error(`Failed to save prompt override: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove project prompt override (revert to defaults)
   *
   * @param {string} projectId - Project ID
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   */
  async removePromptOverride(projectId, stageType, db) {
    try {
      await db
        .collection('project_ai_config')
        .doc(projectId)
        .update({
          [`promptOverrides.${stageType}`]: null,
        });

      // Clear cache
      this.overrideCache.delete(`${projectId}:${stageType}`);

      console.log(`Removed prompt override for ${projectId}:${stageType}`);
    } catch (error) {
      console.error(`Failed to remove prompt override: ${error.message}`);
      throw error;
    }
  }

  /**
   * List available prompts for a stage
   * NEW: Returns array of prompts from the stage template
   *
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of prompt objects
   */
  async listAvailableTemplates(stageType, db) {
    try {
      const template = await this.getPromptTemplate(stageType, null, db);

      // Return only active prompts
      return (template.prompts || []).filter(p => p.isActive !== false);
    } catch (error) {
      console.error(`Failed to list prompts for ${stageType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get project-specific prompt override
   *
   * @private
   * @param {string} projectId - Project ID
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   * @returns {Promise<object|null>} Override or null
   */
  async _getProjectOverride(projectId, stageType, db) {
    const cacheKey = `${projectId}:${stageType}`;

    // Check cache
    if (this.overrideCache.has(cacheKey)) {
      return this.overrideCache.get(cacheKey);
    }

    try {
      const config = await db.collection('project_ai_config').doc(projectId).get();

      if (!config.exists) {
        return null;
      }

      const override = config.data().promptOverrides?.[stageType];

      // Cache result
      if (override) {
        this.overrideCache.set(cacheKey, override);
      }

      return override || null;
    } catch (error) {
      console.warn(`Failed to get project override: ${error.message}`);
      return null;
    }
  }

  /**
   * Get template by ID
   *
   * @private
   * @param {string} templateId - Template ID
   * @param {object} db - Firestore database
   * @returns {Promise<object|null>} Template or null
   */
  async _getTemplate(templateId, db) {
    // Check cache
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId);
    }

    try {
      const doc = await db.collection('prompt_templates').doc(templateId).get();

      if (!doc.exists) {
        return null;
      }

      const template = { id: doc.id, ...doc.data() };

      // Cache result
      this.templateCache.set(templateId, template);

      return template;
    } catch (error) {
      console.warn(`Failed to get template ${templateId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get default template for a stage
   * NEW: Uses stageType as document ID directly
   *
   * @private
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   * @returns {Promise<object|null>} Default template or null
   */
  async _getDefaultTemplate(stageType, db) {
    // Check cache
    if (this.templateCache.has(stageType)) {
      return this.templateCache.get(stageType);
    }

    try {
      // NEW: Document ID is now the stageType itself
      const doc = await db.collection('prompt_templates').doc(stageType).get();

      if (!doc.exists) {
        console.warn(`No prompt template found for stageType: ${stageType}`);
        return null;
      }

      const template = { id: doc.id, ...doc.data() };

      // Cache result
      this.templateCache.set(stageType, template);

      console.log(`Found prompt template for ${stageType}:`, {
        id: doc.id,
        promptCount: template.prompts?.length || 0
      });

      return template;
    } catch (error) {
      console.warn(`Failed to get default template for ${stageType}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update model configuration for a specific prompt
   *
   * @param {string} stageType - Stage type
   * @param {string} capability - Capability
   * @param {object} modelConfig - { adaptorId, modelId }
   * @param {string} projectId - Project ID (optional, for project-specific overrides)
   * @param {object} db - Firestore database
   */
  async updatePromptModelConfig(stageType, capability, modelConfig, projectId = null, db) {
    try {
      if (!modelConfig || !modelConfig.adaptorId || !modelConfig.modelId) {
        throw new Error('Invalid modelConfig: adaptorId and modelId are required');
      }

      // Get current template
      const template = await this.getPromptTemplate(stageType, projectId, db);

      // Find and update the prompt
      const promptIndex = template.prompts.findIndex(p => p.capability === capability);

      if (promptIndex === -1) {
        throw new Error(`Prompt not found for ${stageType}:${capability}`);
      }

      template.prompts[promptIndex].modelConfig = modelConfig;

      // Save as project override if projectId provided, otherwise update default template
      if (projectId) {
        await this.savePromptOverride(projectId, stageType, template.prompts, db);
      } else {
        // Update default template
        await db.collection('prompt_templates').doc(stageType).update({
          prompts: template.prompts,
          updatedAt: new Date().toISOString(),
        });

        // Clear cache
        this.templateCache.delete(stageType);
      }

      console.log(`Updated model config for ${stageType}:${capability} to ${modelConfig.adaptorId}/${modelConfig.modelId}`);
    } catch (error) {
      console.error(`Failed to update prompt model config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get default model configuration for a capability
   *
   * @private
   * @param {string} capability - Capability type
   * @returns {object} Default model config { adaptorId, modelId }
   */
  _getDefaultModelConfig(capability) {
    // Default to Gemini adaptor
    const defaultModel = getDefaultModel(capability, 'gemini');

    if (defaultModel) {
      return {
        adaptorId: defaultModel.adaptorId,
        modelId: defaultModel.modelId,
      };
    }

    // Fallback for capabilities not in availableModels config
    return {
      adaptorId: 'gemini',
      modelId: capability === 'textGeneration' ? 'gemini-2.0-flash-exp' :
               capability === 'imageGeneration' ? 'imagen-3.0-generate-001' :
               capability === 'videoGeneration' ? 'veo-3.1-generate-preview' :
               'gemini-2.0-flash-exp',
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.templateCache.clear();
    this.overrideCache.clear();
  }
}

// Singleton instance
const promptManager = new PromptManager();

module.exports = promptManager;
