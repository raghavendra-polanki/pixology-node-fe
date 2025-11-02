import RecipeManager from './RecipeManager.js';
import RecipeOrchestrator from './RecipeOrchestrator.js';
import ActionResultTracker from './ActionResultTracker.js';
import DAGValidator from './DAGValidator.js';
import { PERSONA_GENERATION_RECIPE } from './RecipeSeedData.js';
import { db } from '../config/firestore.js';

/**
 * AgentService - Main facade for recipe management and orchestration
 * Coordinates all recipe-related operations
 */
export class AgentService {
  // ============================================
  // RECIPE MANAGEMENT (CRUD)
  // ============================================

  /**
   * Create a new recipe
   * @param {object} recipeData - Recipe configuration
   * @param {string} userId - User creating the recipe
   * @returns {Promise<object>} Created recipe
   */
  static async createRecipe(recipeData, userId) {
    return RecipeManager.createRecipe(recipeData, userId);
  }

  /**
   * Get recipe by ID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<object|null>} Recipe or null
   */
  static async getRecipe(recipeId) {
    return RecipeManager.getRecipe(recipeId);
  }

  /**
   * Update recipe
   * @param {string} recipeId - Recipe ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated recipe
   */
  static async updateRecipe(recipeId, updates) {
    return RecipeManager.updateRecipe(recipeId, updates);
  }

  /**
   * Delete recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<void>}
   */
  static async deleteRecipe(recipeId) {
    return RecipeManager.deleteRecipe(recipeId);
  }

  /**
   * List recipes with optional filtering
   * @param {object} filters - Filter options
   * @returns {Promise<array>} Array of recipes
   */
  static async listRecipes(filters = {}) {
    return RecipeManager.listRecipes(filters);
  }

  /**
   * Get recipes by stage type
   * @param {string} stageType - Stage type
   * @returns {Promise<array>} Array of recipes
   */
  static async getRecipesByStageType(stageType) {
    return RecipeManager.getRecipesByStageType(stageType);
  }

  /**
   * Search recipes
   * @param {string} searchTerm - Search term
   * @returns {Promise<array>} Matching recipes
   */
  static async searchRecipes(searchTerm) {
    return RecipeManager.searchRecipes(searchTerm);
  }

  /**
   * Add tag to recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tag - Tag to add
   * @returns {Promise<void>}
   */
  static async addRecipeTag(recipeId, tag) {
    return RecipeManager.addTag(recipeId, tag);
  }

  /**
   * Remove tag from recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<void>}
   */
  static async removeRecipeTag(recipeId, tag) {
    return RecipeManager.removeTag(recipeId, tag);
  }

  /**
   * Create a new version of recipe
   * @param {string} recipeId - Original recipe ID
   * @param {object} updates - Changes to make
   * @param {string} userId - User creating version
   * @returns {Promise<object>} New recipe version
   */
  static async createRecipeVersion(recipeId, updates, userId) {
    return RecipeManager.createRecipeVersion(recipeId, updates, userId);
  }

  // ============================================
  // RECIPE EXECUTION & ORCHESTRATION
  // ============================================

  /**
   * Execute a recipe (main orchestration method)
   * @param {string} recipeId - Recipe ID
   * @param {object} input - Input data for recipe
   * @param {object} options - Execution options (userId, projectId, etc.)
   * @returns {Promise<string>} Execution ID
   */
  static async executeRecipe(recipeId, input, options = {}) {
    return RecipeOrchestrator.executeRecipe(recipeId, input, options);
  }

  /**
   * Get execution status and results
   * @param {string} executionId - Execution ID
   * @returns {Promise<object|null>} Execution data or null
   */
  static async getExecutionStatus(executionId) {
    return RecipeOrchestrator.getExecutionStatus(executionId);
  }

  /**
   * Get all executions for a recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<array>} Array of executions
   */
  static async getRecipeExecutions(recipeId) {
    return RecipeOrchestrator.getRecipeExecutions(recipeId);
  }

  /**
   * Get all executions for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<array>} Array of executions
   */
  static async getProjectExecutions(projectId) {
    return RecipeOrchestrator.getProjectExecutions(projectId);
  }

  /**
   * Cancel an execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<void>}
   */
  static async cancelExecution(executionId) {
    return RecipeOrchestrator.cancelExecution(executionId);
  }

  /**
   * Retry a failed execution
   * @param {string} executionId - Original execution ID
   * @returns {Promise<string>} New execution ID
   */
  static async retryExecution(executionId) {
    return RecipeOrchestrator.retryExecution(executionId);
  }

  // ============================================
  // EXECUTION TRACKING & RESULTS
  // ============================================

  /**
   * Get execution summary with statistics
   * @param {string} executionId - Execution ID
   * @returns {Promise<object>} Execution summary
   */
  static async getExecutionSummary(executionId) {
    return ActionResultTracker.getExecutionSummary(executionId);
  }

  /**
   * Get all results for an execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<array>} Array of action results
   */
  static async getExecutionResults(executionId) {
    return ActionResultTracker.getExecutionResults(executionId);
  }

  /**
   * Get result for specific action
   * @param {string} executionId - Execution ID
   * @param {string} nodeId - Node ID
   * @returns {Promise<object|null>} Action result or null
   */
  static async getActionResult(executionId, nodeId) {
    return ActionResultTracker.getActionResult(executionId, nodeId);
  }

  /**
   * Get execution history for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {number} limit - Number of executions to fetch
   * @returns {Promise<array>} Array of execution summaries
   */
  static async getRecipeExecutionHistory(recipeId, limit = 10) {
    return ActionResultTracker.getRecipeExecutionHistory(recipeId, limit);
  }

  /**
   * Cleanup old executions
   * @param {number} daysOld - Delete executions older than this many days
   * @returns {Promise<number>} Number of deleted executions
   */
  static async cleanupOldExecutions(daysOld = 30) {
    return ActionResultTracker.cleanupOldExecutions(daysOld);
  }

  // ============================================
  // DAG VALIDATION
  // ============================================

  /**
   * Validate DAG structure
   * @param {array} nodes - Array of nodes
   * @param {array} edges - Array of edges
   * @throws {Error} If validation fails
   * @returns {boolean} True if valid
   */
  static validateDAG(nodes, edges) {
    return DAGValidator.validateDAG(nodes, edges);
  }

  /**
   * Get topological sort of nodes (execution order)
   * @param {array} nodes - Array of nodes
   * @param {array} edges - Array of edges
   * @returns {array} Node IDs in execution order
   */
  static getExecutionOrder(nodes, edges) {
    return DAGValidator.topologicalSort(nodes, edges);
  }

  /**
   * Get all ancestors of a node
   * @param {string} nodeId - Node ID
   * @param {array} edges - Array of edges
   * @returns {array} Ancestor node IDs
   */
  static getNodeAncestors(nodeId, edges) {
    return DAGValidator.getAncestors(nodeId, edges);
  }

  /**
   * Get all descendants of a node
   * @param {string} nodeId - Node ID
   * @param {array} edges - Array of edges
   * @returns {array} Descendant node IDs
   */
  static getNodeDescendants(nodeId, edges) {
    return DAGValidator.getDescendants(nodeId, edges);
  }

  // ============================================
  // SEEDING & INITIALIZATION
  // ============================================

  /**
   * Seed initial recipes into Firestore
   * @param {string} userId - User ID for creation
   * @returns {Promise<object>} Created recipes
   */
  static async seedInitialRecipes(userId) {
    try {
      console.log('Seeding initial recipes...');

      // Check if persona recipe already exists
      const existingRecipes = await RecipeManager.listRecipes({
        stageType: 'stage_2_personas',
      });

      if (existingRecipes.length > 0) {
        console.log('Persona generation recipe already exists. Skipping seed.');
        return { skipped: true, existing: existingRecipes };
      }

      // Create persona generation recipe
      const personaRecipe = await RecipeManager.createRecipe(
        PERSONA_GENERATION_RECIPE,
        userId || 'system'
      );

      console.log('Seeded persona generation recipe:', personaRecipe.id);

      return {
        success: true,
        recipes: [personaRecipe],
      };
    } catch (error) {
      console.error('Error seeding recipes:', error);
      throw error;
    }
  }

  /**
   * Get or create persona generation recipe
   * @param {string} userId - User ID
   * @returns {Promise<object>} Persona generation recipe
   */
  static async getOrCreatePersonaRecipe(userId) {
    try {
      // Try to find existing persona recipe
      const existingRecipes = await RecipeManager.getRecipesByStageType('stage_2_personas');

      if (existingRecipes.length > 0) {
        console.log(`Found existing persona recipe: ${existingRecipes[0].id}`);
        return existingRecipes[0];
      }

      // Create new one if doesn't exist
      console.log('Creating new persona recipe...');
      const newRecipe = await RecipeManager.createRecipe(
        PERSONA_GENERATION_RECIPE,
        userId || 'system'
      );

      return newRecipe;
    } catch (error) {
      console.error('Error getting or creating persona recipe:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get recipe with full execution history
   * @param {string} recipeId - Recipe ID
   * @param {number} executionLimit - Number of recent executions to include
   * @returns {Promise<object>} Recipe with execution history
   */
  static async getRecipeWithHistory(recipeId, executionLimit = 5) {
    try {
      const recipe = await RecipeManager.getRecipe(recipeId);

      if (!recipe) {
        return null;
      }

      const history = await ActionResultTracker.getRecipeExecutionHistory(
        recipeId,
        executionLimit
      );

      return {
        ...recipe,
        executionHistory: history,
      };
    } catch (error) {
      console.error('Error getting recipe with history:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive project execution data
   * @param {string} projectId - Project ID
   * @returns {Promise<object>} Project execution data
   */
  static async getProjectExecutionData(projectId) {
    try {
      const executions = await RecipeOrchestrator.getProjectExecutions(projectId);

      // Enrich with summaries
      const summaries = [];

      for (const execution of executions) {
        const summary = await ActionResultTracker.getExecutionSummary(execution.id);
        summaries.push(summary);
      }

      return {
        projectId,
        totalExecutions: executions.length,
        executions: summaries,
      };
    } catch (error) {
      console.error('Error getting project execution data:', error);
      throw error;
    }
  }
}

export default AgentService;
