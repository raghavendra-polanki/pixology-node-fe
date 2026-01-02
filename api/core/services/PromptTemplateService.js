/**
 * PromptTemplateService
 *
 * CRUD operations for prompt templates stored in Firestore
 * New structure: One document per stage with an array of prompts
 * Document ID = stage name (e.g., "stage_2_personas")
 */

import { v4 as uuidv4 } from 'uuid';

class PromptTemplateService {
  /**
   * Get stage template (contains all prompts for a stage)
   *
   * @param {string} stageType - Stage type (e.g., "stage_2_personas")
   * @param {object} db - Firestore database
   * @returns {Promise<object>} Stage template with prompts array
   */
  async getStageTemplate(stageType, db) {
    try {
      const doc = await db.collection('prompt_templates').doc(stageType).get();

      if (!doc.exists) {
        // Return default empty structure if not found
        return {
          id: stageType,
          stageType,
          prompts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Failed to get stage template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a new prompt to a stage
   *
   * @param {string} stageType - Stage type
   * @param {object} promptData - { capability, name, description, systemPrompt, userPromptTemplate, outputFormat, variables }
   * @param {string} userId - User creating the prompt
   * @param {object} db - Firestore database
   * @returns {Promise<string>} Prompt ID
   */
  async addPrompt(stageType, promptData, userId, db) {
    try {
      const {
        capability,
        name,
        description = '',
        systemPrompt = '',
        userPromptTemplate = '',
        outputFormat = 'json',
        variables = [],
        isDefault = false,
      } = promptData;

      if (!capability || !name) {
        throw new Error('capability and name are required');
      }

      if (!systemPrompt && !userPromptTemplate) {
        throw new Error('At least one of systemPrompt or userPromptTemplate is required');
      }

      // Get existing stage template
      const stageTemplate = await this.getStageTemplate(stageType, db);

      // Generate unique prompt ID
      const promptId = `prompt_${capability}_${uuidv4().slice(0, 8)}`;

      // Create new prompt object
      const newPrompt = {
        id: promptId,
        capability,
        name,
        description,
        systemPrompt,
        userPromptTemplate,
        outputFormat,
        variables,
        isDefault,
        isActive: true,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to prompts array
      const updatedPrompts = [...(stageTemplate.prompts || []), newPrompt];

      // Update stage document
      await db.collection('prompt_templates').doc(stageType).set({
        id: stageType,
        stageType,
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      }, { merge: true });

      console.log(`Added prompt ${promptId} to stage ${stageType}`);
      return promptId;
    } catch (error) {
      console.error(`Failed to add prompt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific prompt by ID from a stage
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {object} db - Firestore database
   * @returns {Promise<object>} Prompt data
   */
  async getPrompt(stageType, promptId, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);
      const prompt = stageTemplate.prompts.find(p => p.id === promptId);

      if (!prompt) {
        throw new Error(`Prompt '${promptId}' not found in stage '${stageType}'`);
      }

      return prompt;
    } catch (error) {
      console.error(`Failed to get prompt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get prompts by capability from a stage
   *
   * @param {string} stageType - Stage type
   * @param {string} capability - Capability (e.g., "textGeneration")
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of prompts for the capability
   */
  async getPromptsByCapability(stageType, capability, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);
      return stageTemplate.prompts.filter(p => p.capability === capability && p.isActive);
    } catch (error) {
      console.error(`Failed to get prompts by capability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a specific prompt in a stage
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {object} updates - Fields to update
   * @param {string} userId - User making the update
   * @param {object} db - Firestore database
   */
  async updatePrompt(stageType, promptId, updates, userId, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);

      const promptIndex = stageTemplate.prompts.findIndex(p => p.id === promptId);
      if (promptIndex === -1) {
        throw new Error(`Prompt '${promptId}' not found in stage '${stageType}'`);
      }

      // Don't allow changing ID or capability
      const { id, capability, createdAt, createdBy, ...safeUpdates } = updates;

      // Update the prompt
      const updatedPrompts = [...stageTemplate.prompts];
      updatedPrompts[promptIndex] = {
        ...updatedPrompts[promptIndex],
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      // Update stage document
      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log(`Updated prompt ${promptId} in stage ${stageType}`);
    } catch (error) {
      console.error(`Failed to update prompt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a prompt from a stage
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {string} userId - User deleting the prompt
   * @param {object} db - Firestore database
   */
  async deletePrompt(stageType, promptId, userId, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);

      const prompt = stageTemplate.prompts.find(p => p.id === promptId);
      if (!prompt) {
        throw new Error(`Prompt '${promptId}' not found in stage '${stageType}'`);
      }

      // Don't allow deletion of default prompts
      if (prompt.isDefault) {
        throw new Error('Cannot delete default prompts');
      }

      // Remove the prompt from array
      const updatedPrompts = stageTemplate.prompts.filter(p => p.id !== promptId);

      // Update stage document
      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log(`Deleted prompt ${promptId} from stage ${stageType}`);
    } catch (error) {
      console.error(`Failed to delete prompt: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all prompts for a stage (backward compatibility)
   *
   * @param {string} stageType - Stage type
   * @param {object} options - { activeOnly: boolean }
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of prompts
   */
  async listTemplatesByStage(stageType, options = {}, db) {
    try {
      const { activeOnly = true } = options;

      console.log(`[PromptTemplateService] Querying prompts for stage: ${stageType}`, { activeOnly });

      const stageTemplate = await this.getStageTemplate(stageType, db);

      let prompts = stageTemplate.prompts || [];

      if (activeOnly) {
        prompts = prompts.filter(p => p.isActive);
      }

      console.log(`[PromptTemplateService] Found ${prompts.length} prompts for stage: ${stageType}`);

      return prompts;
    } catch (error) {
      console.error(`[PromptTemplateService] Failed to list prompts for ${stageType}: ${error.message}`);
      // Don't throw - return empty array to allow UI to show proper error message
      return [];
    }
  }

  /**
   * Get all stage templates
   *
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of stage templates
   */
  async getAllStageTemplates(db) {
    try {
      const snapshot = await db.collection('prompt_templates').get();

      const templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`[PromptTemplateService] Found ${templates.length} stage templates`);
      return templates;
    } catch (error) {
      console.error(`[PromptTemplateService] Failed to get all stage templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate prompt structure
   *
   * @param {object} prompt - Prompt to validate
   * @returns {object} { isValid: boolean, errors: Array<string> }
   */
  validatePrompt(prompt) {
    const errors = [];

    // Check required fields
    if (!prompt.capability) {
      errors.push('capability is required');
    }

    if (!prompt.name) {
      errors.push('name is required');
    }

    if (!prompt.systemPrompt && !prompt.userPromptTemplate) {
      errors.push('At least one of systemPrompt or userPromptTemplate is required');
    }

    if (!prompt.outputFormat) {
      errors.push('outputFormat is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deactivate a prompt
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {string} userId - User deactivating the prompt
   * @param {object} db - Firestore database
   */
  async deactivatePrompt(stageType, promptId, userId, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);

      const promptIndex = stageTemplate.prompts.findIndex(p => p.id === promptId);
      if (promptIndex === -1) {
        throw new Error(`Prompt '${promptId}' not found in stage '${stageType}'`);
      }

      const prompt = stageTemplate.prompts[promptIndex];

      if (prompt.isDefault) {
        throw new Error('Cannot deactivate default prompt');
      }

      // Update the prompt
      const updatedPrompts = [...stageTemplate.prompts];
      updatedPrompts[promptIndex] = {
        ...updatedPrompts[promptIndex],
        isActive: false,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      // Update stage document
      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log(`Deactivated prompt ${promptId} in stage ${stageType}`);
    } catch (error) {
      console.error(`Failed to deactivate prompt: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // VERSION MANAGEMENT METHODS
  // ============================================

  /**
   * Save prompt changes as a new version
   * This creates a new version and optionally activates it
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {object} promptData - Updated prompt data
   * @param {string} versionNote - Description of changes
   * @param {string} userId - User creating the version
   * @param {boolean} activateImmediately - Whether to activate this version immediately
   * @param {object} db - Firestore database instance
   * @returns {Promise<number>} New version number
   */
  async saveAsNewVersion(stageType, promptId, promptData, versionNote, userId, activateImmediately, db) {
    try {
      const stageTemplate = await this.getStageTemplate(stageType, db);
      const prompt = stageTemplate.prompts.find(p => p.id === promptId);

      if (!prompt) {
        throw new Error(`Prompt '${promptId}' not found in stage '${stageType}'`);
      }

      // Calculate new version number
      const newVersion = (prompt.latestVersion || 0) + 1;
      const versionDocId = `${promptId}_v${newVersion}`;

      // Create version document
      const versionData = {
        promptId,
        version: newVersion,
        capability: prompt.capability,
        name: promptData.name || prompt.name,
        description: promptData.description || prompt.description || '',
        systemPrompt: promptData.systemPrompt || '',
        userPromptTemplate: promptData.userPromptTemplate || '',
        outputFormat: promptData.outputFormat || prompt.outputFormat || 'json',
        variables: promptData.variables || prompt.variables || [],
        modelConfig: promptData.modelConfig || prompt.modelConfig || null,
        versionNote: versionNote || '',
        isChosen: activateImmediately,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      };

      // If activating immediately, deactivate previous version
      if (activateImmediately && prompt.currentVersion) {
        const prevVersionDocId = `${promptId}_v${prompt.currentVersion}`;
        await db
          .collection('prompt_templates')
          .doc(stageType)
          .collection('versions')
          .doc(prevVersionDocId)
          .update({ isChosen: false });
      }

      // Save version document
      await db
        .collection('prompt_templates')
        .doc(stageType)
        .collection('versions')
        .doc(versionDocId)
        .set(versionData);

      // Update prompt in stage template
      const updatedPrompts = stageTemplate.prompts.map(p => {
        if (p.id === promptId) {
          const updates = {
            ...p,
            latestVersion: newVersion,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          };

          // If activating immediately, update prompt content
          if (activateImmediately) {
            updates.currentVersion = newVersion;
            updates.systemPrompt = promptData.systemPrompt || p.systemPrompt;
            updates.userPromptTemplate = promptData.userPromptTemplate || p.userPromptTemplate;
            updates.modelConfig = promptData.modelConfig || p.modelConfig;
            updates.outputFormat = promptData.outputFormat || p.outputFormat;
            updates.variables = promptData.variables || p.variables;
          }

          return updates;
        }
        return p;
      });

      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      console.log(`Created version ${newVersion} for ${stageType}:${promptId}${activateImmediately ? ' (activated)' : ''}`);
      return newVersion;
    } catch (error) {
      console.error(`Failed to save as new version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get version history for a prompt
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {object} db - Firestore database instance
   * @returns {Promise<Array>} Array of versions sorted by version number (descending)
   */
  async getVersionHistory(stageType, promptId, db) {
    try {
      // Query without orderBy to avoid requiring a composite index
      // We sort in JavaScript instead
      const versionsSnapshot = await db
        .collection('prompt_templates')
        .doc(stageType)
        .collection('versions')
        .where('promptId', '==', promptId)
        .get();

      if (versionsSnapshot.empty) {
        return [];
      }

      // Map to array and sort by version descending (newest first)
      const versions = versionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      versions.sort((a, b) => (b.version || 0) - (a.version || 0));

      return versions;
    } catch (error) {
      console.error(`Failed to get version history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific version
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {number} version - Version number
   * @param {object} db - Firestore database instance
   * @returns {Promise<object|null>} Version data or null
   */
  async getVersion(stageType, promptId, version, db) {
    try {
      const versionDocId = `${promptId}_v${version}`;
      const doc = await db
        .collection('prompt_templates')
        .doc(stageType)
        .collection('versions')
        .doc(versionDocId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Failed to get version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate a specific version
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {number} version - Version to activate
   * @param {string} userId - User activating
   * @param {object} db - Firestore database instance
   */
  async activateVersion(stageType, promptId, version, userId, db) {
    try {
      const versionData = await this.getVersion(stageType, promptId, version, db);

      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }

      const stageTemplate = await this.getStageTemplate(stageType, db);
      const promptIndex = stageTemplate.prompts.findIndex(p => p.id === promptId);

      if (promptIndex === -1) {
        throw new Error(`Prompt '${promptId}' not found`);
      }

      const currentPrompt = stageTemplate.prompts[promptIndex];

      // Deactivate previous version
      if (currentPrompt.currentVersion) {
        const prevVersionDocId = `${promptId}_v${currentPrompt.currentVersion}`;
        await db
          .collection('prompt_templates')
          .doc(stageType)
          .collection('versions')
          .doc(prevVersionDocId)
          .update({ isChosen: false });
      }

      // Activate new version
      const newVersionDocId = `${promptId}_v${version}`;
      await db
        .collection('prompt_templates')
        .doc(stageType)
        .collection('versions')
        .doc(newVersionDocId)
        .update({ isChosen: true });

      // Update prompt with version content
      const updatedPrompts = [...stageTemplate.prompts];
      updatedPrompts[promptIndex] = {
        ...currentPrompt,
        systemPrompt: versionData.systemPrompt,
        userPromptTemplate: versionData.userPromptTemplate,
        modelConfig: versionData.modelConfig,
        outputFormat: versionData.outputFormat,
        variables: versionData.variables,
        currentVersion: version,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      await db.collection('prompt_templates').doc(stageType).update({
        prompts: updatedPrompts,
        updatedAt: new Date().toISOString(),
      });

      console.log(`Activated version ${version} for ${stageType}:${promptId}`);
    } catch (error) {
      console.error(`Failed to activate version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a version (cannot delete active version)
   *
   * @param {string} stageType - Stage type
   * @param {string} promptId - Prompt ID
   * @param {number} version - Version to delete
   * @param {string} userId - User deleting
   * @param {object} db - Firestore database instance
   */
  async deleteVersion(stageType, promptId, version, userId, db) {
    try {
      const versionData = await this.getVersion(stageType, promptId, version, db);

      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }

      if (versionData.isChosen) {
        throw new Error('Cannot delete the active version');
      }

      const versionDocId = `${promptId}_v${version}`;
      await db
        .collection('prompt_templates')
        .doc(stageType)
        .collection('versions')
        .doc(versionDocId)
        .delete();

      console.log(`Deleted version ${version} for ${stageType}:${promptId}`);
    } catch (error) {
      console.error(`Failed to delete version: ${error.message}`);
      throw error;
    }
  }
}

// Singleton instance
const promptTemplateService = new PromptTemplateService();

export default promptTemplateService;
