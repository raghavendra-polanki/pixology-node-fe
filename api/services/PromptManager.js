/**
 * PromptManager
 *
 * Manages AI prompts with support for:
 * - Template resolution from Firestore
 * - Variable substitution
 * - Project-specific overrides
 * - Version management
 *
 * Singleton pattern for consistent prompt management across application
 */

class PromptManager {
  constructor() {
    this.templateCache = new Map();
    this.overrideCache = new Map();
  }

  /**
   * Get prompt template for a stage with project-specific overrides
   *
   * @param {string} stageType - Stage type (e.g., "stage_2_personas")
   * @param {string} projectId - Project ID (optional for global defaults)
   * @param {object} db - Firestore database instance
   * @returns {Promise<object>} { templateId, prompts, version, source, ... }
   */
  async getPromptTemplate(stageType, projectId = null, db = null) {
    try {
      // 1. Check for project-specific overrides first
      if (projectId && db) {
        const override = await this._getProjectOverride(projectId, stageType, db);

        if (override) {
          return {
            source: 'project_override',
            templateId: 'custom',
            prompts: override.prompts,
            version: override.version || 1,
          };
        }

        // 2. Check project's preferred template version
        const projectConfig = await db.collection('project_ai_config').doc(projectId).get();

        if (projectConfig.exists) {
          const templateId = projectConfig.data().promptVersions?.[stageType];

          if (templateId) {
            const template = await this._getTemplate(templateId, db);

            if (template) {
              return {
                source: 'project_version',
                templateId,
                prompts: template.prompts,
                version: template.version,
              };
            }
          }
        }
      }

      // 3. Fall back to global default template
      if (db) {
        const defaultTemplate = await this._getDefaultTemplate(stageType, db);

        if (defaultTemplate) {
          return {
            source: 'default',
            templateId: defaultTemplate.id,
            prompts: defaultTemplate.prompts,
            version: defaultTemplate.version,
          };
        }
      }

      // 4. Return empty template (shouldn't happen if seeded properly)
      return {
        source: 'empty',
        templateId: null,
        prompts: {},
        version: 1,
      };
    } catch (error) {
      console.error(`Failed to get prompt template for ${stageType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve template variables with actual values
   *
   * @param {string} template - Template string with {variable} placeholders
   * @param {object} variables - Variable values
   * @returns {string} Resolved prompt
   */
  resolvePromptVariables(template, variables = {}) {
    if (!template) return '';

    let resolved = template;

    // Replace all {variableName} with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      resolved = resolved.replace(regex, value);
    });

    // Log any unresolvekvariables
    const unresolvedMatches = resolved.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);

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
    if (!promptTemplate) {
      throw new Error('Prompt template is required');
    }

    return {
      systemPrompt: this.resolvePromptVariables(promptTemplate.systemPrompt, variables),
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
   * List available prompt templates for a stage
   *
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of template objects
   */
  async listAvailableTemplates(stageType, db) {
    try {
      const snapshot = await db
        .collection('prompt_templates')
        .where('stageType', '==', stageType)
        .where('isActive', '==', true)
        .orderBy('isDefault', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Failed to list templates for ${stageType}: ${error.message}`);
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
   *
   * @private
   * @param {string} stageType - Stage type
   * @param {object} db - Firestore database
   * @returns {Promise<object|null>} Default template or null
   */
  async _getDefaultTemplate(stageType, db) {
    try {
      const snapshot = await db
        .collection('prompt_templates')
        .where('stageType', '==', stageType)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.warn(`Failed to get default template for ${stageType}: ${error.message}`);
      return null;
    }
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
