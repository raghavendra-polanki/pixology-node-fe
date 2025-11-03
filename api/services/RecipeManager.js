import { db } from '../config/firestore.js';
import { v4 as uuidv4 } from 'uuid';
import DAGValidator from './DAGValidator.js';

/**
 * RecipeManager - Manages recipe CRUD operations in Firestore
 */
export class RecipeManager {
  /**
   * Create a new recipe
   * @param {object} recipeData - Recipe data including nodes and edges
   * @param {string} userId - User creating the recipe
   * @returns {Promise<object>} Created recipe
   */
  static async createRecipe(recipeData, userId) {
    try {
      // Validate DAG structure
      DAGValidator.validateDAG(recipeData.nodes, recipeData.edges);

      // Use provided ID if available (for seed recipes), otherwise generate new one
      const recipeId = recipeData.id || `recipe_${uuidv4()}`;
      const now = new Date();

      const recipe = {
        id: recipeId,
        name: recipeData.name || 'Untitled Recipe',
        description: recipeData.description || '',
        stageType: recipeData.stageType || '',
        version: recipeData.version || 1,
        nodes: recipeData.nodes || [],
        edges: recipeData.edges || [],
        executionConfig: recipeData.executionConfig || {
          timeout: 120000,
          retryPolicy: { maxRetries: 1, backoffMs: 1000 },
          parallelExecution: false,
          continueOnError: false,
        },
        metadata: {
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          isActive: true,
          tags: recipeData.metadata?.tags || [],
        },
      };

      await db.collection('recipes').doc(recipeId).set(recipe);

      console.log(`Recipe ${recipeId} created successfully`);
      return recipe;
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  /**
   * Get a recipe by ID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<object|null>} Recipe data or null
   */
  static async getRecipe(recipeId) {
    try {
      const doc = await db.collection('recipes').doc(recipeId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error(`Error fetching recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Update a recipe
   * @param {string} recipeId - Recipe ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated recipe
   */
  static async updateRecipe(recipeId, updates) {
    try {
      // If nodes or edges are being updated, validate new DAG
      if (updates.nodes || updates.edges) {
        const currentRecipe = await this.getRecipe(recipeId);
        const nodesToValidate = updates.nodes || currentRecipe.nodes;
        const edgesToValidate = updates.edges || currentRecipe.edges;

        DAGValidator.validateDAG(nodesToValidate, edgesToValidate);
      }

      // Separate metadata from other updates to avoid Firestore duplicate field error
      const { metadata, ...otherUpdates } = updates;

      const updateData = {
        ...otherUpdates,
        metadata: {
          ...(metadata || {}),
          updatedAt: new Date(),
        },
      };

      await db.collection('recipes').doc(recipeId).update(updateData);

      const updatedRecipe = await this.getRecipe(recipeId);
      console.log(`Recipe ${recipeId} updated successfully`);
      return updatedRecipe;
    } catch (error) {
      console.error(`Error updating recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<void>}
   */
  static async deleteRecipe(recipeId) {
    try {
      await db.collection('recipes').doc(recipeId).delete();
      console.log(`Recipe ${recipeId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * List all recipes with optional filtering
   * @param {object} filters - Filter options (stageType, isActive, tags)
   * @returns {Promise<array>} Array of recipes
   */
  static async listRecipes(filters = {}) {
    try {
      let query = db.collection('recipes');

      // Only use stageType filter if provided (avoid composite index requirement)
      if (filters.stageType) {
        query = query.where('stageType', '==', filters.stageType);
      }

      // Get all recipes for this query
      const snapshot = await query.get();

      // Apply filters client-side to avoid composite index requirement
      let recipes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter by isActive if provided (client-side)
      if (filters.isActive !== undefined) {
        recipes = recipes.filter((recipe) => recipe.metadata?.isActive === filters.isActive);
      }

      // Sort by creation date (client-side)
      recipes = recipes.sort((a, b) => {
        const aTime = a.metadata?.createdAt?.toDate?.() || new Date(0);
        const bTime = b.metadata?.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime; // Descending order
      });

      // Filter by tags if provided (client-side since Firestore has limitations with array queries)
      if (filters.tags && Array.isArray(filters.tags)) {
        recipes = recipes.filter((recipe) =>
          filters.tags.some((tag) => recipe.metadata?.tags?.includes(tag))
        );
      }

      return recipes;
    } catch (error) {
      console.error('Error listing recipes:', error);
      throw error;
    }
  }

  /**
   * Get recipes by stage type
   * @param {string} stageType - Stage type (e.g., 'stage_2_personas')
   * @returns {Promise<array>} Array of recipes for that stage
   */
  static async getRecipesByStageType(stageType) {
    return this.listRecipes({ stageType, isActive: true });
  }

  /**
   * Create a new version of a recipe
   * @param {string} recipeId - Original recipe ID
   * @param {object} updates - Changes to make
   * @returns {Promise<object>} New recipe with incremented version
   */
  static async createRecipeVersion(recipeId, updates, userId) {
    try {
      const originalRecipe = await this.getRecipe(recipeId);

      if (!originalRecipe) {
        throw new Error(`Recipe ${recipeId} not found`);
      }

      const newRecipe = {
        ...originalRecipe,
        ...updates,
        id: undefined, // Will be generated by createRecipe
        version: (originalRecipe.version || 1) + 1,
        metadata: {
          ...originalRecipe.metadata,
          createdBy: userId,
        },
      };

      return this.createRecipe(newRecipe, userId);
    } catch (error) {
      console.error(`Error creating recipe version:`, error);
      throw error;
    }
  }

  /**
   * Add tag to recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tag - Tag to add
   * @returns {Promise<void>}
   */
  static async addTag(recipeId, tag) {
    try {
      const recipe = await this.getRecipe(recipeId);
      const tags = new Set(recipe.metadata?.tags || []);
      tags.add(tag);

      await this.updateRecipe(recipeId, {
        'metadata.tags': Array.from(tags),
      });

      console.log(`Tag "${tag}" added to recipe ${recipeId}`);
    } catch (error) {
      console.error(`Error adding tag to recipe:`, error);
      throw error;
    }
  }

  /**
   * Remove tag from recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<void>}
   */
  static async removeTag(recipeId, tag) {
    try {
      const recipe = await this.getRecipe(recipeId);
      const tags = new Set(recipe.metadata?.tags || []);
      tags.delete(tag);

      await this.updateRecipe(recipeId, {
        'metadata.tags': Array.from(tags),
      });

      console.log(`Tag "${tag}" removed from recipe ${recipeId}`);
    } catch (error) {
      console.error(`Error removing tag from recipe:`, error);
      throw error;
    }
  }

  /**
   * Deactivate a recipe (soft delete)
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<void>}
   */
  static async deactivateRecipe(recipeId) {
    try {
      await this.updateRecipe(recipeId, {
        'metadata.isActive': false,
      });

      console.log(`Recipe ${recipeId} deactivated`);
    } catch (error) {
      console.error(`Error deactivating recipe:`, error);
      throw error;
    }
  }

  /**
   * Activate a recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<void>}
   */
  static async activateRecipe(recipeId) {
    try {
      await this.updateRecipe(recipeId, {
        'metadata.isActive': true,
      });

      console.log(`Recipe ${recipeId} activated`);
    } catch (error) {
      console.error(`Error activating recipe:`, error);
      throw error;
    }
  }

  /**
   * Get all active recipes (default view)
   * @returns {Promise<array>} Array of active recipes
   */
  static async getAllActiveRecipes() {
    return this.listRecipes({ isActive: true });
  }

  /**
   * Search recipes by name or description
   * @param {string} searchTerm - Search term
   * @returns {Promise<array>} Matching recipes
   */
  static async searchRecipes(searchTerm) {
    try {
      const recipes = await this.getAllActiveRecipes();
      const term = searchTerm.toLowerCase();

      return recipes.filter(
        (recipe) =>
          recipe.name?.toLowerCase().includes(term) ||
          recipe.description?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw error;
    }
  }
}

export default RecipeManager;
