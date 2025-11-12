/**
 * GeminiAdaptor
 *
 * Adaptor for Google Gemini API
 * Supports text generation, image generation, and vision capabilities
 */

const BaseAIAdaptor = require('./BaseAIAdaptor');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAdaptor extends BaseAIAdaptor {
  constructor(modelId, config = {}, credentials = {}) {
    super(modelId, config, credentials);

    if (!credentials.apiKey) {
      throw new Error('Gemini API requires apiKey in credentials');
    }

    this.client = new GoogleGenerativeAI(credentials.apiKey);
    this.modelId = modelId || 'gemini-2.0-flash';
  }

  /**
   * Generate text using Gemini
   */
  async generateText(prompt, options = {}) {
    const mergedConfig = { ...this.config, ...options };

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelId,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: mergedConfig.temperature !== undefined ? mergedConfig.temperature : 0.7,
          topK: mergedConfig.topK,
          topP: mergedConfig.topP,
          maxOutputTokens: mergedConfig.maxOutputTokens || 8192,
        },
      });

      const text = result.response.text();
      const usageMetadata = result.response.usageMetadata || {};

      return {
        text,
        model: this.modelId,
        backend: 'gemini',
        usage: {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        },
      };
    } catch (error) {
      throw new Error(`Gemini text generation error: ${error.message}`);
    }
  }

  /**
   * Generate image using Gemini
   * Note: Gemini can generate images via API, but we primarily use it for vision/analysis
   */
  async generateImage(prompt, options = {}) {
    // Gemini's image generation capabilities are limited
    // For now, throw error and recommend using appropriate image generation adaptor
    throw new Error(
      'Gemini adaptor does not support direct image generation. Use OpenAI (DALL-E) or other image generation adaptors.'
    );
  }

  /**
   * Validate Gemini configuration
   */
  validateConfig(config) {
    if (!config.apiKey) {
      throw new Error('Gemini adaptor requires apiKey in configuration');
    }

    // Optional config validation
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new Error('temperature must be a number between 0 and 2');
      }
    }

    if (config.maxOutputTokens !== undefined && typeof config.maxOutputTokens !== 'number') {
      throw new Error('maxOutputTokens must be a number');
    }
  }

  /**
   * Check Gemini API health
   */
  async healthCheck() {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelId });

      const startTime = Date.now();
      await model.generateContent('ping');
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency,
        adaptor: 'gemini',
        model: this.modelId,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        adaptor: 'gemini',
        model: this.modelId,
      };
    }
  }

  /**
   * Get Gemini usage information
   */
  async getUsage() {
    // Gemini doesn't provide real-time usage API
    // Return placeholder
    return {
      status: 'unavailable',
      message: 'Gemini API does not provide real-time usage endpoint',
    };
  }

  /**
   * Estimate cost for Gemini
   * Based on published pricing as of latest update
   */
  estimateCost(inputTokens, outputTokens) {
    const modelPricing = {
      'gemini-2.0-flash': { input: 0.075, output: 0.3 }, // per 1M tokens
      'gemini-1.5-pro': { input: 3.5, output: 10.5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-pro': { input: 0.5, output: 1.5 },
    };

    const pricing = modelPricing[this.modelId] || modelPricing['gemini-2.0-flash'];

    // Cost in USD per 1M tokens
    const inputCost = (inputTokens * pricing.input) / 1000000;
    const outputCost = (outputTokens * pricing.output) / 1000000;

    return inputCost + outputCost;
  }

  /**
   * Get all available Gemini models
   */
  static async getAvailableModels() {
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Latest fast model, optimized for speed and efficiency',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 1000000,
        maxOutputTokens: 16384,
        costPer1MTokens: { input: 0.075, output: 0.3 },
        isLatest: true,
        isDeprecated: false,
        releaseDate: new Date('2024-12-01'),
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable model for complex tasks',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1MTokens: { input: 3.5, output: 10.5 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2024-05-01'),
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient multimodal model',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1MTokens: { input: 0.075, output: 0.3 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2024-05-01'),
      },
    ];
  }

  /**
   * Get information about a specific Gemini model
   */
  static async getModelInfo(modelId) {
    const models = await this.getAvailableModels();
    return models.find((m) => m.id === modelId);
  }
}

module.exports = GeminiAdaptor;
