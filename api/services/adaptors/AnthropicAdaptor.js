/**
 * AnthropicAdaptor
 *
 * Adaptor for Anthropic Claude API
 * Supports text generation and vision capabilities
 */

import BaseAIAdaptor from './BaseAIAdaptor.js';
import Anthropic from '@anthropic-ai/sdk';

export default class AnthropicAdaptor extends BaseAIAdaptor {
  constructor(modelId, config = {}, credentials = {}) {
    super(modelId, config, credentials);

    if (!credentials.apiKey) {
      throw new Error('Anthropic API requires apiKey in credentials');
    }

    this.client = new Anthropic({
      apiKey: credentials.apiKey,
    });

    this.modelId = modelId || 'claude-3-opus-20240229';
  }

  /**
   * Generate text using Claude
   */
  async generateText(prompt, options = {}) {
    const mergedConfig = { ...this.config, ...options };

    try {
      const response = await this.client.messages.create({
        model: this.modelId,
        max_tokens: mergedConfig.maxTokens || 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: mergedConfig.temperature !== undefined ? mergedConfig.temperature : 0.7,
      });

      return {
        text: response.content[0].type === 'text' ? response.content[0].text : '',
        model: this.modelId,
        backend: 'anthropic',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw new Error(`Anthropic text generation error: ${error.message}`);
    }
  }

  /**
   * Generate image using Claude (not supported)
   */
  async generateImage(prompt, options = {}) {
    throw new Error(
      'Anthropic Claude does not support image generation. Use OpenAI (DALL-E) or another image generation adaptor.'
    );
  }

  /**
   * Generate video using Claude (not supported)
   */
  async generateVideo(prompt, options = {}) {
    throw new Error('Anthropic Claude does not support video generation. Use another adaptor.');
  }

  /**
   * Validate Anthropic configuration
   */
  validateConfig(config) {
    if (!config.apiKey) {
      throw new Error('Anthropic adaptor requires apiKey in configuration');
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1) {
        throw new Error('temperature must be a number between 0 and 1 for Claude');
      }
    }

    if (config.maxTokens !== undefined && typeof config.maxTokens !== 'number') {
      throw new Error('maxTokens must be a number');
    }
  }

  /**
   * Check Anthropic API health
   */
  async healthCheck() {
    try {
      const startTime = Date.now();

      // Make a minimal API call to check health
      await this.client.messages.create({
        model: this.modelId,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'ping',
          },
        ],
      });

      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency,
        adaptor: 'anthropic',
        model: this.modelId,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        adaptor: 'anthropic',
        model: this.modelId,
      };
    }
  }

  /**
   * Get Anthropic usage information
   */
  async getUsage() {
    return {
      status: 'unavailable',
      message: 'Use Anthropic dashboard for usage information',
    };
  }

  /**
   * Estimate cost for Anthropic
   * Based on published pricing
   */
  estimateCost(inputTokens, outputTokens) {
    const modelPricing = {
      'claude-3-opus-20240229': { input: 15, output: 75 }, // per 1M tokens
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.8, output: 4 },
      'claude-2.1': { input: 8, output: 24 },
      'claude-2': { input: 8, output: 24 },
    };

    const pricing = modelPricing[this.modelId] || modelPricing['claude-3-opus-20240229'];

    const inputCost = (inputTokens * pricing.input) / 1000000;
    const outputCost = (outputTokens * pricing.output) / 1000000;

    return inputCost + outputCost;
  }

  /**
   * Get all available Anthropic models
   */
  static async getAvailableModels() {
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 15, output: 75 },
        isLatest: true,
        isDeprecated: false,
        releaseDate: new Date('2024-02-29'),
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Balanced model with good performance',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 3, output: 15 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2024-02-29'),
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fast and cost-effective',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 200000,
        maxOutputTokens: 1024,
        costPer1MTokens: { input: 0.8, output: 4 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2024-03-07'),
      },
    ];
  }

  /**
   * Get information about a specific Anthropic model
   */
  static async getModelInfo(modelId) {
    const models = await this.getAvailableModels();
    return models.find((m) => m.id === modelId);
  }
}
