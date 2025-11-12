/**
 * AdaptorRegistry
 *
 * Registry for managing AI adaptor implementations.
 * Singleton pattern to maintain single source of truth for adaptor registration.
 */

class AdaptorRegistry {
  constructor() {
    this.adaptors = new Map();
    this.configurations = new Map();
  }

  /**
   * Register an adaptor implementation
   *
   * @param {string} adaptorId - Unique identifier (e.g., 'gemini', 'openai', 'anthropic')
   * @param {Class} AdaptorClass - Adaptor class that extends BaseAIAdaptor
   * @throws {Error} if adaptor already registered
   */
  register(adaptorId, AdaptorClass) {
    if (this.adaptors.has(adaptorId)) {
      throw new Error(`Adaptor '${adaptorId}' is already registered`);
    }

    this.adaptors.set(adaptorId, AdaptorClass);
    console.log(`[AdaptorRegistry] Registered adaptor: ${adaptorId}`);
  }

  /**
   * Get an instance of a registered adaptor
   *
   * @param {string} adaptorId - Adaptor identifier
   * @param {string} modelId - Model to use (e.g., 'gpt-4-turbo')
   * @param {object} credentials - API credentials { apiKey, organization?, ... }
   * @param {object} config - Model-specific configuration { temperature, maxTokens, ... }
   * @returns {object} Instantiated adaptor
   * @throws {Error} if adaptor not registered or initialization fails
   */
  async getAdaptor(adaptorId, modelId, credentials, config = {}) {
    const AdaptorClass = this.adaptors.get(adaptorId);

    if (!AdaptorClass) {
      throw new Error(`Adaptor '${adaptorId}' is not registered. Available: ${Array.from(this.adaptors.keys()).join(', ')}`);
    }

    try {
      const adaptor = new AdaptorClass(modelId, config, credentials);
      await adaptor.validateConfig({ ...credentials, ...config });
      return adaptor;
    } catch (error) {
      throw new Error(`Failed to initialize adaptor '${adaptorId}' with model '${modelId}': ${error.message}`);
    }
  }

  /**
   * Get all available models for an adaptor
   *
   * @param {string} adaptorId - Adaptor identifier
   * @returns {Promise<Array>} Array of available models
   * @throws {Error} if adaptor not found
   */
  async getAvailableModels(adaptorId) {
    const AdaptorClass = this.adaptors.get(adaptorId);

    if (!AdaptorClass) {
      throw new Error(`Adaptor '${adaptorId}' is not registered`);
    }

    return await AdaptorClass.getAvailableModels();
  }

  /**
   * Get information about a specific model
   *
   * @param {string} adaptorId - Adaptor identifier
   * @param {string} modelId - Model identifier
   * @returns {Promise<object>} Model information
   * @throws {Error} if adaptor or model not found
   */
  async getModelInfo(adaptorId, modelId) {
    const AdaptorClass = this.adaptors.get(adaptorId);

    if (!AdaptorClass) {
      throw new Error(`Adaptor '${adaptorId}' is not registered`);
    }

    const modelInfo = await AdaptorClass.getModelInfo(modelId);

    if (!modelInfo) {
      throw new Error(`Model '${modelId}' not found in adaptor '${adaptorId}'`);
    }

    return modelInfo;
  }

  /**
   * Check if adaptor is registered
   *
   * @param {string} adaptorId - Adaptor identifier
   * @returns {boolean} true if registered, false otherwise
   */
  hasAdaptor(adaptorId) {
    return this.adaptors.has(adaptorId);
  }

  /**
   * Get list of all registered adaptors
   *
   * @returns {Array<string>} Array of adaptor IDs
   */
  getAllAdaptors() {
    return Array.from(this.adaptors.keys());
  }

  /**
   * Cache adaptor configuration
   *
   * @param {string} adaptorId - Adaptor identifier
   * @param {object} config - Configuration to cache
   */
  cacheConfiguration(adaptorId, config) {
    this.configurations.set(adaptorId, config);
  }

  /**
   * Get cached configuration
   *
   * @param {string} adaptorId - Adaptor identifier
   * @returns {object|undefined} Cached configuration or undefined
   */
  getCachedConfiguration(adaptorId) {
    return this.configurations.get(adaptorId);
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.configurations.clear();
  }
}

// Singleton instance
const registry = new AdaptorRegistry();

module.exports = registry;
