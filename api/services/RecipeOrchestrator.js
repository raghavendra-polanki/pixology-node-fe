import { db } from '../config/firestore.js';
import { v4 as uuidv4 } from 'uuid';
import DAGValidator from './DAGValidator.js';
import ActionExecutor from './ActionExecutor.js';
import ActionResultTracker from './ActionResultTracker.js';
import RecipeManager from './RecipeManager.js';

/**
 * RecipeOrchestrator - Orchestrates recipe execution following DAG structure
 */
export class RecipeOrchestrator {
  /**
   * Execute a complete recipe
   * @param {string} recipeId - Recipe ID
   * @param {object} input - Input data for the recipe
   * @param {object} options - Execution options (userId, projectId, etc.)
   * @returns {Promise<string>} Execution ID
   */
  static async executeRecipe(recipeId, input, options = {}) {
    let executionId;

    try {
      // Load recipe
      const recipe = await RecipeManager.getRecipe(recipeId);

      if (!recipe) {
        throw new Error(`Recipe ${recipeId} not found`);
      }

      console.log(`Starting execution of recipe: ${recipe.name}`);

      // Create execution context
      executionId = `exec_${uuidv4()}`;

      const execution = {
        id: executionId,
        recipeId,
        projectId: options.projectId,
        stageId: options.stageId,
        input,
        status: 'running',
        actionResults: [],
        executionContext: {
          startedAt: new Date(),
          triggeredBy: options.userId || 'system',
        },
      };

      // Save initial execution record
      await db.collection('recipe_executions').doc(executionId).set(execution);

      console.log(`Created execution record: ${executionId}`);

      // Validate DAG
      DAGValidator.validateDAG(recipe.nodes, recipe.edges);

      // Get execution order (topological sort)
      const executionOrder = DAGValidator.topologicalSort(recipe.nodes, recipe.edges);

      console.log(`Execution order: ${executionOrder.join(' -> ')}`);

      // Store node outputs for passing between actions
      const nodeOutputs = {};

      // Execute each node in order
      for (const nodeId of executionOrder) {
        const node = recipe.nodes.find((n) => n.id === nodeId);

        if (!node) {
          throw new Error(`Node ${nodeId} not found in recipe`);
        }

        try {
          // Resolve inputs from previous outputs and external input
          const nodeInput = this.resolveInputs(node.inputMapping, nodeOutputs, input);

          console.log(`Resolved input for node ${node.id}:`, Object.keys(nodeInput));

          // Execute the action
          const actionResult = await ActionExecutor.executeAction(node, nodeInput);

          // Store output for next nodes
          nodeOutputs[node.outputKey] = actionResult.output;

          console.log(`[RecipeOrchestrator] Node ${node.id} output stored:`, {
            outputKey: node.outputKey,
            outputType: typeof actionResult.output,
            isArray: Array.isArray(actionResult.output),
            outputLength: Array.isArray(actionResult.output) ? actionResult.output.length : 'N/A',
            firstItemKeys: Array.isArray(actionResult.output)?.[0] ? Object.keys(actionResult.output[0]) : [],
          });

          // Log result to Firestore
          await ActionResultTracker.logActionResult(executionId, actionResult);

          console.log(`Node ${node.id} completed successfully`);
        } catch (nodeError) {
          console.error(`Node ${node.id} execution failed:`, nodeError.message);

          // Log error result
          await ActionResultTracker.logActionError(executionId, node.id, nodeError);

          // Check error handling strategy
          if (node.errorHandling?.onError === 'fail') {
            // Update execution status to failed
            await db.collection('recipe_executions').doc(executionId).update({
              status: 'failed',
              'executionContext.error': nodeError.message,
              'executionContext.failedNodeId': node.id,
              'executionContext.completedAt': new Date(),
            });

            throw nodeError;
          }
          // else continue with 'skip' strategy
        }
      }

      // Aggregate final output from the last action's output key
      const lastNode = recipe.nodes[recipe.nodes.length - 1];
      const finalOutput = nodeOutputs[lastNode.outputKey] || {};

      // Store result using the output key as field name (e.g., result.screenplayEntries)
      const result = {
        [lastNode.outputKey]: finalOutput,
      };

      console.log(`[RecipeOrchestrator] Final result being stored:`, {
        resultKeys: Object.keys(result),
        lastNodeOutputKey: lastNode.outputKey,
        outputKeyValue: result[lastNode.outputKey],
        isArray: Array.isArray(result[lastNode.outputKey]),
        length: Array.isArray(result[lastNode.outputKey]) ? result[lastNode.outputKey].length : 'N/A',
        firstItem: Array.isArray(result[lastNode.outputKey]) ? result[lastNode.outputKey][0] : 'N/A',
      });

      // Mark execution as completed
      await db.collection('recipe_executions').doc(executionId).update({
        status: 'completed',
        result,
        'executionContext.completedAt': new Date(),
      });

      console.log(`Recipe execution completed: ${executionId}`);

      return executionId;
    } catch (error) {
      console.error('Error executing recipe:', error);

      // Ensure execution is marked as failed
      if (executionId) {
        try {
          await db.collection('recipe_executions').doc(executionId).update({
            status: 'failed',
            'executionContext.error': error.message,
            'executionContext.completedAt': new Date(),
          });
        } catch (updateError) {
          console.error('Error updating execution status:', updateError);
        }
      }

      throw error;
    }
  }

  /**
   * Get execution status and results
   * @param {string} executionId - Execution ID
   * @returns {Promise<object>} Execution data
   */
  static async getExecutionStatus(executionId) {
    try {
      const doc = await db.collection('recipe_executions').doc(executionId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error(`Error fetching execution ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all executions for a recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<array>} Array of executions
   */
  static async getRecipeExecutions(recipeId) {
    try {
      const snapshot = await db
        .collection('recipe_executions')
        .where('recipeId', '==', recipeId)
        .orderBy('executionContext.startedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error fetching executions for recipe ${recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get executions for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<array>} Array of executions
   */
  static async getProjectExecutions(projectId) {
    try {
      const snapshot = await db
        .collection('recipe_executions')
        .where('projectId', '==', projectId)
        .orderBy('executionContext.startedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error fetching executions for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve node inputs from multiple sources
   * Handles: external_input.*, outputKey references, or direct values
   * @param {object} inputMapping - Input mapping configuration
   * @param {object} previousOutputs - Outputs from previous nodes (indexed by outputKey)
   * @param {object} externalInput - Input provided to recipe
   * @returns {object} Resolved inputs
   */
  static resolveInputs(inputMapping, previousOutputs, externalInput) {
    const resolved = {};

    if (!inputMapping) {
      return resolved;
    }

    Object.entries(inputMapping).forEach(([key, source]) => {
      try {
        if (source.startsWith('external_input.')) {
          // Get from external input
          const fieldPath = source.replace('external_input.', '');
          resolved[key] = this.getNestedValue(externalInput, fieldPath);
        } else if (source.includes('.output')) {
          // Get from previous action output (old pattern: 'nodeId.output')
          const parts = source.split('.');
          const actionOutputKey = parts[0]; // e.g., 'generate_persona_details'

          // Try to find the output key in previousOutputs
          const output = previousOutputs[actionOutputKey] || previousOutputs[source];

          if (output === undefined) {
            console.warn(
              `Warning: Could not resolve input mapping "${key}" from "${source}". Output not found.`
            );
          } else {
            resolved[key] = output;
          }
        } else if (previousOutputs.hasOwnProperty(source)) {
          // Check if source is a direct outputKey reference (e.g., 'personaDetails')
          resolved[key] = previousOutputs[source];
        } else {
          // Direct value (if not a reference to previousOutputs)
          resolved[key] = source;
        }
      } catch (error) {
        console.warn(`Error resolving input mapping for "${key}":`, error.message);
      }
    });

    return resolved;
  }

  /**
   * Get nested value from object using dot notation
   * e.g., getNestedValue(obj, 'a.b.c')
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Cancel a running execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<void>}
   */
  static async cancelExecution(executionId) {
    try {
      await db.collection('recipe_executions').doc(executionId).update({
        status: 'cancelled',
        'executionContext.cancelledAt': new Date(),
      });

      console.log(`Execution ${executionId} cancelled`);
    } catch (error) {
      console.error(`Error cancelling execution:`, error);
      throw error;
    }
  }

  /**
   * Retry a failed execution
   * @param {string} executionId - Original execution ID
   * @returns {Promise<string>} New execution ID
   */
  static async retryExecution(executionId) {
    try {
      const originalExecution = await this.getExecutionStatus(executionId);

      if (!originalExecution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Start a new execution with same parameters
      const newExecutionId = await this.executeRecipe(
        originalExecution.recipeId,
        originalExecution.input,
        {
          projectId: originalExecution.projectId,
          stageId: originalExecution.stageId,
          userId: originalExecution.executionContext.triggeredBy,
        }
      );

      console.log(`Retried execution. New ID: ${newExecutionId}`);
      return newExecutionId;
    } catch (error) {
      console.error(`Error retrying execution:`, error);
      throw error;
    }
  }

  /**
   * Deserialize buffers from their JSON representation
   * When buffers are JSON.stringify'd, they become {type: 'Buffer', data: [...]}
   * This function converts them back to actual Buffer objects
   */
  static deserializeBuffers(obj) {
    if (!obj) return obj;

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return Buffer.from(obj.data);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeBuffers(item));
    }

    if (typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = this.deserializeBuffers(obj[key]);
      }
      return result;
    }

    return obj;
  }

  /**
   * Test a single node in isolation (for recipe development)
   * @param {string} recipeId - Recipe ID
   * @param {string} nodeId - Node ID to test
   * @param {object} externalInput - External input data
   * @param {boolean} executeDependencies - Whether to run dependency nodes first
   * @param {object} mockOutputs - Mock outputs to use instead of running dependencies
   * @returns {Promise<object>} Node execution result
   */
  static async testSingleNode(recipeId, nodeId, externalInput, executeDependencies = true, mockOutputs = {}) {
    // Initialize dependencyResults at the start so it's always defined
    let dependencyResults = [];
    let targetNode = null;

    try {
      // Load recipe
      const recipe = await RecipeManager.getRecipe(recipeId);
      if (!recipe) {
        throw new Error(`Recipe ${recipeId} not found`);
      }

      // Find the target node
      targetNode = recipe.nodes.find((n) => n.id === nodeId);
      if (!targetNode) {
        throw new Error(`Node ${nodeId} not found in recipe`);
      }

      console.log(`Testing node: ${nodeId}`);

      // Get execution order (for dependency calculation)
      const executionOrder = DAGValidator.topologicalSort(recipe.nodes, recipe.edges);
      const nodeIndex = executionOrder.indexOf(nodeId);

      if (nodeIndex === -1) {
        throw new Error(`Node ${nodeId} not in valid execution order`);
      }

      // Collect outputs from dependency nodes
      // Deserialize any buffers from JSON representation (they come from API calls)
      const deserializedMockOutputs = this.deserializeBuffers(mockOutputs);
      const nodeOutputs = { ...deserializedMockOutputs };

      // If executeDependencies is true, run all nodes before this one
      if (executeDependencies && nodeIndex > 0) {
        console.log(`Executing ${nodeIndex} dependency node(s)...`);

        const dependencyNodeIds = executionOrder.slice(0, nodeIndex);

        for (const depNodeId of dependencyNodeIds) {
          const depNode = recipe.nodes.find((n) => n.id === depNodeId);

          try {
            // Resolve inputs for dependency node
            const depNodeInput = this.resolveInputs(depNode.inputMapping, nodeOutputs, externalInput);

            console.log(`Executing dependency node: ${depNodeId}`);

            const depStartTime = Date.now();
            // Execute dependency node
            const depResult = await ActionExecutor.executeAction(depNode, depNodeInput);
            const depDuration = Date.now() - depStartTime;

            // Track execution result for this dependency node
            dependencyResults.push({
              success: true,
              nodeId: depNodeId,
              nodeType: depNode.type,
              nodeName: depNode.name,
              input: depNodeInput,
              output: depResult.output,
              duration: depDuration,
              startedAt: new Date(Date.now() - depDuration),
              completedAt: new Date(),
              error: null,
            });

            // Store output for next nodes
            nodeOutputs[depNode.outputKey] = depResult.output;

            console.log(`Dependency node ${depNodeId} completed`);
          } catch (depError) {
            console.error(`Dependency node ${depNodeId} failed:`, depError.message);
            // Track the failed dependency node too
            dependencyResults.push({
              success: false,
              nodeId: depNodeId,
              nodeType: depNode.type,
              nodeName: depNode.name,
              input: nodeOutputs,
              output: null,
              duration: 0,
              startedAt: new Date(),
              completedAt: new Date(),
              error: {
                message: depError.message,
                code: 'DEPENDENCY_NODE_ERROR',
              },
            });
            throw new Error(`Dependency node ${depNodeId} failed: ${depError.message}`);
          }
        }
      }

      // Now execute the target node
      const startTime = Date.now();
      console.log(`Executing target node: ${nodeId}`);

      // Resolve inputs for target node
      const nodeInput = this.resolveInputs(targetNode.inputMapping, nodeOutputs, externalInput);

      console.log(`Resolved input for node ${nodeId}:`, Object.keys(nodeInput));

      // Execute the node
      const result = await ActionExecutor.executeAction(targetNode, nodeInput);

      const duration = Date.now() - startTime;

      // Return execution result
      const executionResult = {
        success: true,
        nodeId,
        nodeType: targetNode.type,
        nodeName: targetNode.name,
        input: nodeInput,
        output: result.output,
        duration,
        startedAt: new Date(Date.now() - duration),
        completedAt: new Date(),
        error: null,
      };

      console.log(`Node ${nodeId} test completed successfully in ${duration}ms`);

      // Return both dependency results and target node result
      return {
        result: executionResult,
        dependencyResults: dependencyResults,
      };
    } catch (error) {
      console.error(`Error testing node ${nodeId}:`, error.message);

      return {
        result: {
          success: false,
          nodeId,
          nodeType: targetNode?.type,
          nodeName: targetNode?.name,
          input: null,
          output: null,
          duration: 0,
          startedAt: new Date(),
          completedAt: new Date(),
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
          },
        },
        dependencyResults: dependencyResults,
      };
    }
  }
}

export default RecipeOrchestrator;
