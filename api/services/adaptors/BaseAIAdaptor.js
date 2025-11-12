/**
 * BaseAIAdaptor
 *
 * Abstract base class for all AI provider adaptors.
 * Defines the interface that all adaptor implementations must follow.
 *
 * Usage:
 *   class GeminiAdaptor extends BaseAIAdaptor { ... }
 */

class BaseAIAdaptor {
  /**
   * Initialize adaptor with model and configuration
   *
   * @param {string} modelId - Specific model to use (e.g., "gpt-4-turbo", "gemini-2.0-flash")
   * @param {object} config - Model-specific configuration
   * @param {object} credentials - API credentials (apiKey, etc.)
   */
  constructor(modelId, config = {}, credentials = {}) {
    if (new.target === BaseAIAdaptor) {
      throw new TypeError('Cannot instantiate abstract class BaseAIAdaptor');
    }

    this.modelId = modelId;
    this.config = config;
    this.credentials = credentials;
  }

  /**
   * Generate text from a prompt
   *
   * @param {string} prompt - The prompt to send to AI
   * @param {object} options - Generation options (temperature, maxTokens, etc.)
   * @returns {Promise<object>} { text: string, usage: { inputTokens, outputTokens, totalTokens }, model, backend }
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented in subclass');
  }

  /**
   * Generate an image from a prompt
   *
   * @param {string} prompt - The image description
   * @param {object} options - Generation options (size, quality, style, etc.)
   * @returns {Promise<object>} { imageUrl: string, revisedPrompt?: string, model, backend, usage }
   */
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage() must be implemented in subclass');
  }

  /**
   * Generate a video from a prompt
   *
   * @param {string} prompt - The video description
   * @param {object} options - Generation options (duration, quality, resolution, etc.)
   * @returns {Promise<object>} { videoUrl: string, duration: string, model, backend, usage }
   */
  async generateVideo(prompt, options = {}) {
    throw new Error('generateVideo() must be implemented in subclass');
  }

  /**
   * Validate configuration before use
   *
   * @param {object} config - Configuration to validate
   * @throws {Error} if validation fails
   */
  validateConfig(config) {
    throw new Error('validateConfig() must be implemented in subclass');
  }

  /**
   * Check if adaptor is healthy and accessible
   *
   * @returns {Promise<object>} { status: 'ok' | 'error' | 'degraded', latency?: number, error?: string }
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented in subclass');
  }

  /**
   * Get current usage/quota information
   *
   * @returns {Promise<object>} { requestsUsed, requestsLimit, tokensUsed, etc. }
   */
  async getUsage() {
    throw new Error('getUsage() must be implemented in subclass');
  }

  /**
   * Estimate cost for given token counts
   *
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(inputTokens, outputTokens) {
    throw new Error('estimateCost() must be implemented in subclass');
  }

  /**
   * Static method: Get all available models for this adaptor
   *
   * @returns {Promise<Array>} Array of model objects
   */
  static async getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented in subclass');
  }

  /**
   * Static method: Get detailed information about a specific model
   *
   * @param {string} modelId - Model ID to get info for
   * @returns {Promise<object>} Model information object
   */
  static async getModelInfo(modelId) {
    throw new Error('getModelInfo() must be implemented in subclass');
  }
}

module.exports = BaseAIAdaptor;
