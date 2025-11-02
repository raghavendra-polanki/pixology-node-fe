import { db, admin } from '../config/firestore.js';

/**
 * ActionResultTracker - Logs and tracks action execution results
 */
export class ActionResultTracker {
  /**
   * Log successful action result to Firestore
   * @param {string} executionId - Recipe execution ID
   * @param {object} result - Action result from ActionExecutor
   * @returns {Promise<void>}
   */
  static async logActionResult(executionId, result) {
    try {
      // Safely serialize input
      const safeInput = this.serializeForFirestore(result.input);

      // For output, store summary/metadata only (not the full data)
      let outputSummary = null;
      if (result.output) {
        if (Array.isArray(result.output)) {
          outputSummary = { count: result.output.length, type: 'array' };
        } else if (typeof result.output === 'object') {
          outputSummary = { type: 'object', keys: Object.keys(result.output) };
        } else {
          outputSummary = result.output;
        }
      }

      const actionResult = {
        nodeId: result.nodeId,
        status: result.status,
        input: safeInput,
        output: outputSummary,
        duration: result.duration,
        startedAt: admin.firestore.Timestamp.fromDate(new Date(result.startedAt)),
        completedAt: admin.firestore.Timestamp.fromDate(new Date(result.completedAt)),
        aiResponse: this.extractAIResponse(result),
        error: null,
      };

      // Add to actionResults array in the execution document
      await db
        .collection('recipe_executions')
        .doc(executionId)
        .update({
          actionResults: admin.firestore.FieldValue.arrayUnion(actionResult),
        });

      console.log(`Logged result for action ${result.nodeId}`);
    } catch (error) {
      console.error(`Error logging action result:`, error);
      throw error;
    }
  }

  /**
   * Log action error to Firestore
   * @param {string} executionId - Recipe execution ID
   * @param {string} nodeId - Node/Action ID
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   */
  static async logActionError(executionId, nodeId, error) {
    try {
      const now = new Date();
      const errorResult = {
        nodeId,
        status: 'failed',
        input: null,
        output: null,
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          // Don't store full stack trace to avoid circular references
        },
        startedAt: admin.firestore.Timestamp.fromDate(now),
        completedAt: admin.firestore.Timestamp.fromDate(now),
      };

      // Add to actionResults array in the execution document
      await db
        .collection('recipe_executions')
        .doc(executionId)
        .update({
          actionResults: admin.firestore.FieldValue.arrayUnion(errorResult),
        });

      console.log(`Logged error for action ${nodeId}`);
    } catch (firebaseError) {
      console.error(`Error logging action error:`, firebaseError);
      throw firebaseError;
    }
  }

  /**
   * Get all results for an execution
   * @param {string} executionId - Recipe execution ID
   * @returns {Promise<array>} Array of action results
   */
  static async getExecutionResults(executionId) {
    try {
      const doc = await db.collection('recipe_executions').doc(executionId).get();

      if (!doc.exists) {
        return [];
      }

      return doc.data().actionResults || [];
    } catch (error) {
      console.error(`Error fetching execution results:`, error);
      throw error;
    }
  }

  /**
   * Get result for specific action in execution
   * @param {string} executionId - Recipe execution ID
   * @param {string} nodeId - Node ID
   * @returns {Promise<object|null>} Action result or null
   */
  static async getActionResult(executionId, nodeId) {
    try {
      const results = await this.getExecutionResults(executionId);
      return results.find((r) => r.nodeId === nodeId) || null;
    } catch (error) {
      console.error(`Error fetching action result:`, error);
      throw error;
    }
  }

  /**
   * Get execution summary with statistics
   * @param {string} executionId - Recipe execution ID
   * @returns {Promise<object>} Execution summary
   */
  static async getExecutionSummary(executionId) {
    try {
      const doc = await db.collection('recipe_executions').doc(executionId).get();

      if (!doc.exists) {
        return null;
      }

      const execution = doc.data();
      const results = execution.actionResults || [];

      const summary = {
        executionId,
        recipeId: execution.recipeId,
        status: execution.status,
        totalNodes: results.length,
        completedNodes: results.filter((r) => r.status === 'completed').length,
        failedNodes: results.filter((r) => r.status === 'failed').length,
        skippedNodes: results.filter((r) => r.status === 'skipped').length,
        totalDuration:
          execution.executionContext?.completedAt && execution.executionContext?.startedAt
            ? execution.executionContext.completedAt - execution.executionContext.startedAt
            : null,
        startedAt: execution.executionContext?.startedAt,
        completedAt: execution.executionContext?.completedAt,
        nodeResults: results.map((r) => ({
          nodeId: r.nodeId,
          status: r.status,
          duration: r.duration,
          error: r.error,
        })),
        tokenUsage: this.calculateTokenUsage(results),
        estimatedCost: this.estimateCost(results),
      };

      return summary;
    } catch (error) {
      console.error(`Error getting execution summary:`, error);
      throw error;
    }
  }

  /**
   * Extract AI response metadata from action result
   * @private
   */
  static extractAIResponse(result) {
    // Try to extract token usage and other AI-specific metadata from output
    // This is implementation-specific based on which AI provider returns what

    return {
      executionTime: result.duration,
      timestamp: admin.firestore.Timestamp.fromDate(new Date(result.completedAt)),
      // Additional AI provider-specific metadata can be added here
    };
  }

  /**
   * Calculate total token usage from all results
   * @private
   */
  static calculateTokenUsage(results) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    results.forEach((result) => {
      if (result.aiResponse?.usage) {
        totalInputTokens += result.aiResponse.usage.inputTokens || 0;
        totalOutputTokens += result.aiResponse.usage.outputTokens || 0;
        totalTokens += result.aiResponse.usage.totalTokens || 0;
      }
    });

    return {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalTokens,
    };
  }

  /**
   * Estimate cost of execution based on token usage
   * @private
   */
  static estimateCost(results) {
    // This is a placeholder - actual pricing depends on AI providers
    // Update with real pricing from Gemini, DALL-E, etc.

    let estimatedCost = 0;

    results.forEach((result) => {
      // Example pricing (update with actual rates)
      if (result.aiResponse?.usage?.totalTokens) {
        const tokens = result.aiResponse.usage.totalTokens;
        // Gemini pricing: approximately $0.000075 per 1K tokens (adjust as needed)
        estimatedCost += (tokens / 1000) * 0.000075;
      }

      // Add image generation cost if applicable
      if (result.status === 'completed' && result.output && Array.isArray(result.output)) {
        // DALL-E 3: $0.04 per image (adjust as needed)
        estimatedCost += result.output.length * 0.04;
      }
    });

    return {
      estimatedCost: parseFloat(estimatedCost.toFixed(4)),
      currency: 'USD',
      note: 'This is an estimate based on typical pricing. Actual costs may vary.',
    };
  }

  /**
   * Get execution history for a recipe
   * @param {string} recipeId - Recipe ID
   * @param {number} limit - Number of recent executions to fetch
   * @returns {Promise<array>} Array of execution summaries
   */
  static async getRecipeExecutionHistory(recipeId, limit = 10) {
    try {
      const snapshot = await db
        .collection('recipe_executions')
        .where('recipeId', '==', recipeId)
        .orderBy('executionContext.startedAt', 'desc')
        .limit(limit)
        .get();

      const summaries = [];

      for (const doc of snapshot.docs) {
        const summary = await this.getExecutionSummary(doc.id);
        summaries.push(summary);
      }

      return summaries;
    } catch (error) {
      console.error(`Error fetching execution history:`, error);
      throw error;
    }
  }

  /**
   * Clear execution results older than specified days
   * @param {number} daysOld - Delete executions older than this many days
   * @returns {Promise<number>} Number of deleted executions
   */
  static async cleanupOldExecutions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await db
        .collection('recipe_executions')
        .where('executionContext.startedAt', '<', cutoffDate)
        .get();

      let deletedCount = 0;

      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} executions older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      console.error(`Error cleaning up old executions:`, error);
      throw error;
    }
  }

  /**
   * Safely serialize data for Firestore storage
   * Removes non-serializable objects and converts Date objects to Timestamps
   * @private
   */
  static serializeForFirestore(data) {
    if (data === null || data === undefined) {
      return null;
    }

    if (data instanceof Date) {
      return admin.firestore.Timestamp.fromDate(data);
    }

    // Skip Buffer objects (can't be serialized to Firestore)
    if (Buffer.isBuffer(data)) {
      return '[Buffer]';
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeForFirestore(item));
    }

    if (typeof data === 'object') {
      const serialized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip non-serializable properties
        if (typeof value === 'function' || typeof value === 'symbol') {
          continue;
        }

        if (Buffer.isBuffer(value)) {
          // Skip buffer fields entirely (they're too large and not serializable)
          continue;
        }

        if (value instanceof Date) {
          serialized[key] = admin.firestore.Timestamp.fromDate(value);
        } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          serialized[key] = this.serializeForFirestore(value);
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  }
}

export default ActionResultTracker;
