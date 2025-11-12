/**
 * Usage API
 * Endpoints for tracking API usage and costs
 */

const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();
const db = admin.firestore();

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
      date: new Date().toISOString().split('T')[0], // For easier querying by date
    });

    // Update project usage aggregates
    const aggregateRef = db
      .collection('projects')
      .doc(projectId)
      .collection('adaptor_usage')
      .doc(`${adaptorId}_${modelId}`);

    const aggregateDoc = await aggregateRef.get();
    const existingData = aggregateDoc.data() || {
      adaptorId,
      modelId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      lastUsed: timestamp,
    };

    const updates = {
      ...existingData,
      totalRequests: (existingData.totalRequests || 0) + 1,
      successfulRequests: success !== false
        ? (existingData.successfulRequests || 0) + 1
        : existingData.successfulRequests || 0,
      failedRequests: success === false
        ? (existingData.failedRequests || 0) + 1
        : existingData.failedRequests || 0,
      totalInputTokens: (existingData.totalInputTokens || 0) + (inputTokens || 0),
      totalOutputTokens: (existingData.totalOutputTokens || 0) + (outputTokens || 0),
      totalCost: (existingData.totalCost || 0) + (cost || 0),
      lastUsed: timestamp,
      adaptorId,
      modelId,
    };

    await aggregateRef.set(updates);

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
      case 'all':
      default:
        startDate = new Date('1970-01-01');
        break;
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Query usage records
    const usageSnapshot = await db
      .collection('usage_records')
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', startDate.toISOString())
      .get();

    // Aggregate by adaptor/model
    const aggregates = {};

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
          period,
        };
      }

      aggregates[key].inputTokens += data.inputTokens || 0;
      aggregates[key].outputTokens += data.outputTokens || 0;
      aggregates[key].totalRequests += 1;
      aggregates[key].successfulRequests += data.success ? 1 : 0;
      aggregates[key].failedRequests += data.success === false ? 1 : 0;
      aggregates[key].totalCost += data.cost || 0;

      // Update lastUsed if this record is newer
      if (data.timestamp > aggregates[key].lastUsed) {
        aggregates[key].lastUsed = data.timestamp;
      }
    });

    const stats = Object.values(aggregates).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    res.json({ stats, period, startDate: startDate.toISOString() });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/usage/timeline
 * Get usage over time for visualization
 */
router.get('/timeline', async (req, res) => {
  try {
    const { projectId, adaptorId, days = 30 } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: 'projectId is required',
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let query = db
      .collection('usage_records')
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', startDate.toISOString());

    if (adaptorId) {
      query = query.where('adaptorId', '==', adaptorId);
    }

    const snapshot = await query.get();

    // Group by date
    const timeline = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp.split('T')[0]; // YYYY-MM-DD

      if (!timeline[date]) {
        timeline[date] = {
          date,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          successCount: 0,
          errorCount: 0,
        };
      }

      timeline[date].requests += 1;
      timeline[date].inputTokens += data.inputTokens || 0;
      timeline[date].outputTokens += data.outputTokens || 0;
      timeline[date].totalTokens += (data.inputTokens || 0) + (data.outputTokens || 0);
      timeline[date].cost += data.cost || 0;
      timeline[date].successCount += data.success ? 1 : 0;
      timeline[date].errorCount += data.success === false ? 1 : 0;
    });

    const data = Object.values(timeline).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      timeline: data,
      period: `${days} days`,
      startDate: startDate.toISOString(),
    });
  } catch (error) {
    console.error('Error getting usage timeline:', error);
    res.status(500).json({
      error: 'Failed to get usage timeline',
      message: error.message,
    });
  }
});

/**
 * GET /api/usage/costs
 * Get cost breakdown by adaptor
 */
router.get('/costs', async (req, res) => {
  try {
    const { projectId, period = 'month' } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: 'projectId is required',
      });
    }

    // Calculate date range
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
    const snapshot = await db
      .collection('usage_records')
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', startDate.toISOString())
      .get();

    // Calculate costs
    const costsByAdaptor = {};
    let totalCost = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const adaptorId = data.adaptorId;

      if (!costsByAdaptor[adaptorId]) {
        costsByAdaptor[adaptorId] = {
          adaptorId,
          cost: 0,
          requests: 0,
          tokens: 0,
        };
      }

      costsByAdaptor[adaptorId].cost += data.cost || 0;
      costsByAdaptor[adaptorId].requests += 1;
      costsByAdaptor[adaptorId].tokens += (data.inputTokens || 0) + (data.outputTokens || 0);
      totalCost += data.cost || 0;
    });

    const breakdown = Object.values(costsByAdaptor)
      .sort((a, b) => b.cost - a.cost)
      .map((item) => ({
        ...item,
        percentage: totalCost > 0 ? ((item.cost / totalCost) * 100).toFixed(2) : 0,
      }));

    res.json({
      totalCost: totalCost.toFixed(2),
      breakdown,
      period,
      startDate: startDate.toISOString(),
    });
  } catch (error) {
    console.error('Error getting cost data:', error);
    res.status(500).json({
      error: 'Failed to get cost data',
      message: error.message,
    });
  }
});

module.exports = router;
