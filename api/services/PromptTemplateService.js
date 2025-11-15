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
}

// Singleton instance
const promptTemplateService = new PromptTemplateService();

export default promptTemplateService;
