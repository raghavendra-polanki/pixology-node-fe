/**
 * Adaptors API
 * Endpoints for managing AI adaptors and their configurations
 */

import express from 'express';
import admin from 'firebase-admin';
import AIAdaptorResolver from './services/AIAdaptorResolver.js';
import { AdaptorRegistry } from './services/adaptors/index.js';

const router = express.Router();
const db = admin.firestore();

/**
 * GET /api/adaptors/available
 * Get available adaptors for a project and capability
 */
router.get('/available', async (req, res) => {
  try {
    const { projectId, capability } = req.query;

    if (!projectId || !capability) {
      return res.status(400).json({
        error: 'projectId and capability are required',
      });
    }

    // Get available adaptors from registry
    const allAdaptorIds = AdaptorRegistry.getAllAdaptors();
    const adaptors = [];

    for (const adaptorId of allAdaptorIds) {
      try {
        // Get available models for this adaptor
        const models = AdaptorRegistry.getAvailableModels(adaptorId) || [];

        // Filter models that support the requested capability
        const supportedModels = models.filter((model) => {
          const modelInfo = AdaptorRegistry.getModelInfo(adaptorId, model);
          return (
            modelInfo &&
            modelInfo.supportedCapabilities &&
            modelInfo.supportedCapabilities.includes(capability)
          );
        });

        if (supportedModels.length > 0) {
          adaptors.push({
            id: adaptorId,
            name: adaptorId.charAt(0).toUpperCase() + adaptorId.slice(1),
            description: `${adaptorId} adaptor for ${capability}`,
            models: supportedModels,
            capabilities: [capability],
            isHealthy: true,
            lastHealthCheck: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`Error loading adaptor ${adaptorId}:`, err.message);
      }
    }

    res.json({ adaptors });
  } catch (error) {
    console.error('Error loading available adaptors:', error);
    res.status(500).json({
      error: 'Failed to load adaptors',
      message: error.message,
    });
  }
});

/**
 * POST /api/adaptors/config
 * Save adaptor configuration for a project/stage
 */
router.post('/config', async (req, res) => {
  try {
    const { projectId, stageType, capability, adaptorId, modelId } = req.body;

    if (!projectId || !stageType || !capability || !adaptorId || !modelId) {
      return res.status(400).json({
        error: 'projectId, stageType, capability, adaptorId, and modelId are required',
      });
    }

    // Get or create project AI config
    const configRef = db.collection('project_ai_config').doc(projectId);
    const configDoc = await configRef.get();

    const updates = {
      [`stageAdaptors.${stageType}.${capability}`]: {
        adaptorId,
        modelId,
        setAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    if (!configDoc.exists) {
      updates.projectId = projectId;
      updates.createdAt = new Date().toISOString();
    }

    await configRef.set(updates, { merge: true });

    res.json({
      success: true,
      message: 'Adaptor configuration saved',
    });
  } catch (error) {
    console.error('Error saving adaptor config:', error);
    res.status(500).json({
      error: 'Failed to save adaptor configuration',
      message: error.message,
    });
  }
});

/**
 * POST /api/adaptors/config/parameters
 * Save adaptor-specific parameters for text generation
 */
router.post('/config/parameters', async (req, res) => {
  try {
    const { projectId, stageType, adaptorId, config } = req.body;

    if (!projectId || !stageType || !adaptorId || !config) {
      return res.status(400).json({
        error: 'projectId, stageType, adaptorId, and config are required',
      });
    }

    // Validate config parameters
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      return res.status(400).json({
        error: 'Temperature must be between 0 and 2',
      });
    }

    if (config.maxTokens !== undefined && config.maxTokens < 1) {
      return res.status(400).json({
        error: 'maxTokens must be at least 1',
      });
    }

    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      return res.status(400).json({
        error: 'topP must be between 0 and 1',
      });
    }

    // Save to project AI config
    const configRef = db.collection('project_ai_config').doc(projectId);
    const updates = {
      [`adaptorParameters.${stageType}.${adaptorId}`]: {
        ...config,
        setAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    await configRef.set(updates, { merge: true });

    res.json({
      success: true,
      message: 'Adaptor parameters saved',
    });
  } catch (error) {
    console.error('Error saving adaptor parameters:', error);
    res.status(500).json({
      error: 'Failed to save adaptor parameters',
      message: error.message,
    });
  }
});

/**
 * GET /api/adaptors/config
 * Get adaptor configuration for a project/stage
 */
router.get('/config', async (req, res) => {
  try {
    const { projectId, stageType } = req.query;

    if (!projectId || !stageType) {
      return res.status(400).json({
        error: 'projectId and stageType are required',
      });
    }

    const configDoc = await db.collection('project_ai_config').doc(projectId).get();

    if (!configDoc.exists) {
      return res.json({
        adaptorId: null,
        modelId: null,
        config: null,
      });
    }

    const data = configDoc.data();
    const stageAdaptors = data.stageAdaptors?.[stageType] || {};
    const adaptorParams = data.adaptorParameters?.[stageType] || {};

    res.json({
      adaptorId: stageAdaptors.textGeneration?.adaptorId,
      modelId: stageAdaptors.textGeneration?.modelId,
      config: adaptorParams,
    });
  } catch (error) {
    console.error('Error getting adaptor config:', error);
    res.status(500).json({
      error: 'Failed to get adaptor configuration',
      message: error.message,
    });
  }
});

export default router;
