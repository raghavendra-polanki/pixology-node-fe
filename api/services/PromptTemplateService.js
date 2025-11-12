/**
 * PromptTemplateService
 *
 * CRUD operations for prompt templates stored in Firestore
 * Handles template versioning and lifecycle management
 */

import { v4 as uuidv4 } from 'uuid';

class PromptTemplateService {
  /**
   * Create a new prompt template
   *
   * @param {object} templateData - { stageType, name, description, prompts, isDefault }
   * @param {string} userId - User creating the template
   * @param {object} db - Firestore database
   * @returns {Promise<string>} Template ID
   */
  async createTemplate(templateData, userId, db) {
    try {
      const {
        stageType,
        name,
        description = '',
        prompts = {},
        isDefault = false,
      } = templateData;

      if (!stageType || !name || !prompts) {
        throw new Error('stageType, name, and prompts are required');
      }

      // Generate ID: pt_stage_version
      const version = 1;
      const templateId = `pt_${stageType}_v${version}_${uuidv4().slice(0, 8)}`;

      const template = {
        id: templateId,
        stageType,
        name,
        description,
        version,
        prompts,
        isDefault,
        isActive: true,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('prompt_templates').doc(templateId).set(template);

      console.log(`Created prompt template: ${templateId}`);
      return templateId;
    } catch (error) {
      console.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a prompt template by ID
   *
   * @param {string} templateId - Template ID
   * @param {object} db - Firestore database
   * @returns {Promise<object>} Template data
   */
  async getTemplate(templateId, db) {
    try {
      const doc = await db.collection('prompt_templates').doc(templateId).get();

      if (!doc.exists) {
        throw new Error(`Template '${templateId}' not found`);
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Failed to get template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a prompt template
   *
   * @param {string} templateId - Template ID
   * @param {object} updates - Fields to update
   * @param {object} db - Firestore database
   */
  async updateTemplate(templateId, updates, db) {
    try {
      // Don't allow direct version changes
      const { version, id, ...safeUpdates } = updates;

      safeUpdates.updatedAt = new Date().toISOString();

      await db.collection('prompt_templates').doc(templateId).update(safeUpdates);

      console.log(`Updated template: ${templateId}`);
    } catch (error) {
      console.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a prompt template
   *
   * @param {string} templateId - Template ID
   * @param {object} db - Firestore database
   */
  async deleteTemplate(templateId, db) {
    try {
      // Only allow deletion of non-default templates
      const template = await this.getTemplate(templateId, db);

      if (template.isDefault) {
        throw new Error('Cannot delete default templates');
      }

      await db.collection('prompt_templates').doc(templateId).delete();

      console.log(`Deleted template: ${templateId}`);
    } catch (error) {
      console.error(`Failed to delete template: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all templates for a stage
   *
   * @param {string} stageType - Stage type
   * @param {object} options - { activeOnly: boolean, limit: number }
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of templates
   */
  async listTemplatesByStage(stageType, options = {}, db) {
    try {
      const { activeOnly = true, limit = 50 } = options;

      console.log(`[PromptTemplateService] Querying templates for stage: ${stageType}`, { activeOnly, limit });

      let query = db
        .collection('prompt_templates')
        .where('stageType', '==', stageType);

      if (activeOnly) {
        query = query.where('active', '==', true);
      }

      // Try with composite ordering, fall back to simple ordering if it fails
      try {
        query = query.orderBy('isDefault', 'desc').orderBy('createdAt', 'desc').limit(limit);
      } catch (orderError) {
        console.warn('[PromptTemplateService] Composite orderBy not available, using simple orderBy');
        query = query.orderBy('createdAt', 'desc').limit(limit);
      }

      const snapshot = await query.get();

      console.log(`[PromptTemplateService] Found ${snapshot.docs.length} templates for stage: ${stageType}`);

      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return results;
    } catch (error) {
      console.error(`[PromptTemplateService] Failed to list templates for ${stageType}: ${error.message}`);
      // Don't throw - return empty array to allow UI to show proper error message
      return [];
    }
  }

  /**
   * Create a new version of a template
   *
   * @param {string} baseTemplateId - ID of template to version
   * @param {object} changes - Changes for new version
   * @param {string} userId - User creating version
   * @param {object} db - Firestore database
   * @returns {Promise<string>} New template ID
   */
  async createVersion(baseTemplateId, changes = {}, userId, db) {
    try {
      const baseTemplate = await this.getTemplate(baseTemplateId, db);

      const newVersion = baseTemplate.version + 1;
      const newId = `${baseTemplate.stageType}_v${newVersion}_${uuidv4().slice(0, 8)}`;

      const versionedTemplate = {
        ...baseTemplate,
        id: newId,
        version: newVersion,
        ...changes,
        baseTemplateId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // New versions are not default
        isDefault: false,
      };

      delete versionedTemplate.id; // Let Firestore set the ID

      await db.collection('prompt_templates').doc(newId).set(versionedTemplate);

      console.log(`Created version ${newVersion} of template: ${newId}`);
      return newId;
    } catch (error) {
      console.error(`Failed to create version: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get version history for a template
   *
   * @param {string} stageType - Stage type (to get all versions of that stage)
   * @param {object} db - Firestore database
   * @returns {Promise<Array>} Array of versions ordered by version number
   */
  async getVersionHistory(stageType, db) {
    try {
      const snapshot = await db
        .collection('prompt_templates')
        .where('stageType', '==', stageType)
        .orderBy('version', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Failed to get version history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate prompt template structure
   *
   * @param {object} template - Template to validate
   * @returns {object} { isValid: boolean, errors: Array<string> }
   */
  validateTemplate(template) {
    const errors = [];

    // Check required fields
    if (!template.stageType) {
      errors.push('stageType is required');
    }

    if (!template.name) {
      errors.push('name is required');
    }

    if (!template.prompts || typeof template.prompts !== 'object') {
      errors.push('prompts object is required');
    }

    // Check prompts structure
    if (template.prompts) {
      Object.entries(template.prompts).forEach(([key, promptSet]) => {
        if (!promptSet.systemPrompt) {
          errors.push(`${key}: systemPrompt is required`);
        }

        if (!promptSet.userPromptTemplate) {
          errors.push(`${key}: userPromptTemplate is required`);
        }

        if (!promptSet.outputFormat) {
          errors.push(`${key}: outputFormat is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deactivate a template
   *
   * @param {string} templateId - Template ID
   * @param {object} db - Firestore database
   */
  async deactivateTemplate(templateId, db) {
    try {
      const template = await this.getTemplate(templateId, db);

      if (template.isDefault) {
        throw new Error('Cannot deactivate default template');
      }

      await db.collection('prompt_templates').doc(templateId).update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      });

      console.log(`Deactivated template: ${templateId}`);
    } catch (error) {
      console.error(`Failed to deactivate template: ${error.message}`);
      throw error;
    }
  }
}

// Singleton instance
const promptTemplateService = new PromptTemplateService();

export default promptTemplateService;
