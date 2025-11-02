import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import AgentService from './services/AgentService.js';

const router = express.Router();
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

/**
 * Middleware to verify Google token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const ticket = await client.verifyIdToken({ idToken: token, audience: googleClientId });
    const payload = ticket.getPayload();
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ============================================
// RECIPE MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/recipes
 * List all recipes with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { stageType, tags, search } = req.query;

    let recipes;

    if (search) {
      recipes = await AgentService.searchRecipes(search);
    } else {
      recipes = await AgentService.listRecipes({
        stageType,
        isActive: true,
      });
    }

    return res.status(200).json({
      success: true,
      count: recipes.length,
      recipes,
    });
  } catch (error) {
    console.error('Error listing recipes:', error);
    return res.status(500).json({
      error: error.message || 'Failed to list recipes',
    });
  }
});

/**
 * GET /api/recipes/:recipeId
 * Get a specific recipe by ID
 */
router.get('/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const recipe = await AgentService.getRecipe(recipeId);

    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
      });
    }

    return res.status(200).json({
      success: true,
      recipe,
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch recipe',
    });
  }
});

/**
 * POST /api/recipes
 * Create a new recipe
 * Requires authentication
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, stageType, nodes, edges, executionConfig, metadata } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Recipe name is required' });
    }

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ error: 'Recipe must have at least one node' });
    }

    if (!edges || !Array.isArray(edges)) {
      return res.status(400).json({ error: 'Recipe must have edges array' });
    }

    // Validate DAG structure
    try {
      AgentService.validateDAG(nodes, edges);
    } catch (validationError) {
      return res.status(400).json({
        error: `Invalid DAG structure: ${validationError.message}`,
      });
    }

    // Create recipe
    const recipe = await AgentService.createRecipe(
      {
        name,
        description,
        stageType,
        nodes,
        edges,
        executionConfig,
        metadata,
      },
      req.userId
    );

    return res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      recipe,
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create recipe',
    });
  }
});

/**
 * PUT /api/recipes/:recipeId
 * Update a recipe
 * Requires authentication
 */
router.put('/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const updates = req.body;

    // If updating nodes/edges, validate new DAG
    if (updates.nodes || updates.edges) {
      const recipe = await AgentService.getRecipe(recipeId);

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const nodesToValidate = updates.nodes || recipe.nodes;
      const edgesToValidate = updates.edges || recipe.edges;

      try {
        AgentService.validateDAG(nodesToValidate, edgesToValidate);
      } catch (validationError) {
        return res.status(400).json({
          error: `Invalid DAG structure: ${validationError.message}`,
        });
      }
    }

    // Update recipe
    const updated = await AgentService.updateRecipe(recipeId, updates);

    return res.status(200).json({
      success: true,
      message: 'Recipe updated successfully',
      recipe: updated,
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return res.status(500).json({
      error: error.message || 'Failed to update recipe',
    });
  }
});

/**
 * DELETE /api/recipes/:recipeId
 * Delete a recipe
 * Requires authentication
 */
router.delete('/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;

    await AgentService.deleteRecipe(recipeId);

    return res.status(200).json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return res.status(500).json({
      error: error.message || 'Failed to delete recipe',
    });
  }
});

// ============================================
// RECIPE EXECUTION ENDPOINTS
// ============================================

/**
 * POST /api/recipes/:recipeId/execute
 * Execute a recipe
 */
router.post('/:recipeId/execute', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { input, projectId, stageId } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input data is required' });
    }

    console.log(`Executing recipe ${recipeId} for project ${projectId || 'unknown'}`);

    // Execute recipe
    const executionId = await AgentService.executeRecipe(
      recipeId,
      input,
      {
        userId: req.userId,
        projectId,
        stageId,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Recipe execution started',
      executionId,
    });
  } catch (error) {
    console.error('Error executing recipe:', error);
    return res.status(500).json({
      error: error.message || 'Failed to execute recipe',
    });
  }
});

/**
 * POST /api/recipes/:recipeId/test-node
 * Test a single node (for recipe development)
 * Requires authentication
 */
router.post('/:recipeId/test-node', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { nodeId, externalInput, executeDependencies = true, mockOutputs = {} } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    if (!externalInput) {
      return res.status(400).json({ error: 'externalInput data is required' });
    }

    console.log(`Testing node ${nodeId} in recipe ${recipeId}`);

    // Test the single node
    const result = await AgentService.testSingleNode(
      recipeId,
      nodeId,
      externalInput,
      executeDependencies,
      mockOutputs
    );

    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Node test completed' : 'Node test failed',
      result,
    });
  } catch (error) {
    console.error('Error testing node:', error);
    return res.status(500).json({
      error: error.message || 'Failed to test node',
    });
  }
});

/**
 * GET /api/recipes/executions/:executionId
 * Get execution status and results
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const execution = await AgentService.getExecutionStatus(executionId);

    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    return res.status(200).json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch execution',
    });
  }
});

/**
 * GET /api/recipes/executions/:executionId/summary
 * Get execution summary with statistics
 */
router.get('/executions/:executionId/summary', async (req, res) => {
  try {
    const { executionId } = req.params;

    const summary = await AgentService.getExecutionSummary(executionId);

    if (!summary) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error fetching execution summary:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch execution summary',
    });
  }
});

/**
 * POST /api/recipes/:recipeId/executions
 * Get all executions for a recipe
 */
router.get('/:recipeId/executions', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { limit = 10 } = req.query;

    const executions = await AgentService.getRecipeExecutions(recipeId);

    return res.status(200).json({
      success: true,
      count: executions.length,
      executions: executions.slice(0, parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching recipe executions:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch executions',
    });
  }
});

/**
 * GET /api/recipes/:recipeId/history
 * Get execution history for a recipe
 */
router.get('/:recipeId/history', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { limit = 10 } = req.query;

    const history = await AgentService.getRecipeExecutionHistory(
      recipeId,
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error fetching recipe history:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch recipe history',
    });
  }
});

/**
 * POST /api/recipes/executions/:executionId/cancel
 * Cancel a running execution
 * Requires authentication
 */
router.post('/executions/:executionId/cancel', verifyToken, async (req, res) => {
  try {
    const { executionId } = req.params;

    await AgentService.cancelExecution(executionId);

    return res.status(200).json({
      success: true,
      message: 'Execution cancelled',
    });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    return res.status(500).json({
      error: error.message || 'Failed to cancel execution',
    });
  }
});

/**
 * POST /api/recipes/executions/:executionId/retry
 * Retry a failed execution
 * Requires authentication
 */
router.post('/executions/:executionId/retry', verifyToken, async (req, res) => {
  try {
    const { executionId } = req.params;

    const newExecutionId = await AgentService.retryExecution(executionId);

    return res.status(200).json({
      success: true,
      message: 'Execution retry started',
      executionId: newExecutionId,
    });
  } catch (error) {
    console.error('Error retrying execution:', error);
    return res.status(500).json({
      error: error.message || 'Failed to retry execution',
    });
  }
});

// ============================================
// SEEDING & INITIALIZATION
// ============================================

/**
 * POST /api/recipes/seed/initial
 * Seed initial recipes (admin only)
 * Requires authentication
 */
router.post('/seed/initial', verifyToken, async (req, res) => {
  try {
    const result = await AgentService.seedInitialRecipes(req.userId);

    return res.status(200).json({
      success: true,
      message: 'Initial recipes seeded',
      ...result,
    });
  } catch (error) {
    console.error('Error seeding recipes:', error);
    return res.status(500).json({
      error: error.message || 'Failed to seed recipes',
    });
  }
});

/**
 * GET /api/recipes/stage/:stageType
 * Get recipes by stage type
 */
router.get('/stage/:stageType', async (req, res) => {
  try {
    const { stageType } = req.params;

    const recipes = await AgentService.getRecipesByStageType(stageType);

    return res.status(200).json({
      success: true,
      count: recipes.length,
      recipes,
    });
  } catch (error) {
    console.error('Error fetching recipes by stage:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch recipes',
    });
  }
});

export default router;
