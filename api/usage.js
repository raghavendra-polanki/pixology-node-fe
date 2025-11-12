/**
 * Usage API
 * Endpoints for tracking API usage and costs
 */

import express from 'express';
import { db } from './config/firestore.js';

const router = express.Router();

/**
 * POST /api/usage/track
 * Record API usage for an adaptor
 */
router.post('/track', async (req, res) => {
  try {
    const {
      projectId,
      adaptorId,
      modelId,
      stageType,
      inputTokens,
      outputTokens,
      cost,
      success,
    } = req.body;

    if (!projectId || !adaptorId || !modelId) {
      return res.status(400).json({
        error: 'projectId, adaptorId, and modelId are required',
      });
    }

    // Record usage in Firestore
    const usageRef = db.collection('usage_records').doc();
    const timestamp = new Date().toISOString();

    await usageRef.set({
      projectId,
      adaptorId,
      modelId,
      stageType,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalTokens: (inputTokens || 0) + (outputTokens || 0),
      cost: cost || 0,
      success: success !== false,
      timestamp,
      date: new Date().toISOString().split('T')[0],
    });

    res.json({
      success: true,
      message: 'Usage recorded',
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({
      error: 'Failed to track usage',
      message: error.message,
    });
  }
});

/**
 * GET /api/usage/stats
 * Get usage statistics for a project
 */
router.get('/stats', async (req, res) => {
  try {
    const { projectId, period = 'month' } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: 'projectId is required',
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date('1970-01-01');
        break;
    }

    // Query usage records
    const usageSnapshot = await db
      .collection('usage_records')
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', startDate.toISOString())
      .get();

    // Aggregate by adaptor/model
    const aggregates = {};
    let totalCost = 0;

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.adaptorId}_${data.modelId}`;

      if (!aggregates[key]) {
        aggregates[key] = {
          adaptorId: data.adaptorId,
          modelId: data.modelId,
          inputTokens: 0,
          outputTokens: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalCost: 0,
          lastUsed: data.timestamp,
        };
      }

      aggregates[key].inputTokens += data.inputTokens || 0;
      aggregates[key].outputTokens += data.outputTokens || 0;
      aggregates[key].totalRequests += 1;
      aggregates[key].successfulRequests += data.success ? 1 : 0;
      aggregates[key].failedRequests += data.success === false ? 1 : 0;
      aggregates[key].totalCost += data.cost || 0;
      totalCost += data.cost || 0;

      if (data.timestamp > aggregates[key].lastUsed) {
        aggregates[key].lastUsed = data.timestamp;
      }
    });

    const stats = Object.values(aggregates).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    res.json({ stats, period });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
      message: error.message,
    });
  }
});

export default router;
