/**
 * OpenAIAdaptor
 *
 * Adaptor for OpenAI API
 * Supports text generation (GPT), image generation (DALL-E), and vision capabilities
 */

const BaseAIAdaptor = require('./BaseAIAdaptor');
const OpenAI = require('openai');

class OpenAIAdaptor extends BaseAIAdaptor {
  constructor(modelId, config = {}, credentials = {}) {
    super(modelId, config, credentials);

    if (!credentials.apiKey) {
      throw new Error('OpenAI API requires apiKey in credentials');
    }

    this.client = new OpenAI({
      apiKey: credentials.apiKey,
      organization: credentials.organization,
    });

    this.modelId = modelId || 'gpt-4-turbo';
  }

  /**
   * Generate text using OpenAI GPT models
   */
  async generateText(prompt, options = {}) {
    const mergedConfig = { ...this.config, ...options };

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: mergedConfig.temperature !== undefined ? mergedConfig.temperature : 0.7,
        max_tokens: mergedConfig.maxTokens || 2048,
      });

      return {
        text: response.choices[0].message.content,
        model: this.modelId,
        backend: 'openai',
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI text generation error: ${error.message}`);
    }
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(prompt, options = {}) {
    const mergedConfig = { ...this.config, ...options };

    try {
      const response = await this.client.images.generate({
        model: mergedConfig.imageModel || 'dall-e-3',
        prompt,
        n: mergedConfig.n || 1,
        size: mergedConfig.size || '1024x1024',
        quality: mergedConfig.quality || 'standard',
        style: mergedConfig.style || 'natural',
      });

      return {
        imageUrl: response.data[0].url,
        revisedPrompt: response.data[0].revised_prompt,
        model: mergedConfig.imageModel || 'dall-e-3',
        backend: 'openai',
        usage: {
          images: 1,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI image generation error: ${error.message}`);
    }
  }

  /**
   * Generate video using OpenAI (when available)
   */
  async generateVideo(prompt, options = {}) {
    // Video generation not yet available in OpenAI API
    throw new Error('OpenAI video generation is not yet available. Use another adaptor or wait for API release.');
  }

  /**
   * Validate OpenAI configuration
   */
  validateConfig(config) {
    if (!config.apiKey) {
      throw new Error('OpenAI adaptor requires apiKey in configuration');
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new Error('temperature must be a number between 0 and 2');
      }
    }

    if (config.maxTokens !== undefined && typeof config.maxTokens !== 'number') {
      throw new Error('maxTokens must be a number');
    }
  }

  /**
   * Check OpenAI API health
   */
  async healthCheck() {
    try {
      const startTime = Date.now();

      // Make a minimal API call to check health
      await this.client.models.list({ limit: 1 });

      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency,
        adaptor: 'openai',
        model: this.modelId,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        adaptor: 'openai',
        model: this.modelId,
      };
    }
  }

  /**
   * Get OpenAI usage information
   */
  async getUsage() {
    // OpenAI provides usage via billing API, not real-time
    return {
      status: 'unavailable',
      message: 'Use OpenAI dashboard or billing API for detailed usage',
    };
  }

  /**
   * Estimate cost for OpenAI
   * Based on published pricing
   */
  estimateCost(inputTokens, outputTokens) {
    const modelPricing = {
      'gpt-4-turbo': { input: 10, output: 30 }, // per 1M tokens
      'gpt-4o': { input: 5, output: 15 },
      'gpt-4-vision': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'dall-e-3': { input: 0, output: 4 }, // per image (simplified)
      'dall-e-2': { input: 0, output: 0.02 }, // per image (simplified)
    };

    const pricing = modelPricing[this.modelId] || modelPricing['gpt-4-turbo'];

    const inputCost = (inputTokens * pricing.input) / 1000000;
    const outputCost = (outputTokens * pricing.output) / 1000000;

    return inputCost + outputCost;
  }

  /**
   * Get all available OpenAI models
   */
  static async getAvailableModels() {
    return [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Most capable model, optimized for speed and intelligence',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 10, output: 30 },
        isLatest: true,
        isDeprecated: false,
        releaseDate: new Date('2024-04-01'),
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Optimized model with better performance',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: true,
          multimodal: true,
        },
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 5, output: 15 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2024-05-01'),
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective',
        capabilities: {
          textGeneration: true,
          imageGeneration: false,
          videoGeneration: false,
          vision: false,
          multimodal: false,
        },
        contextWindow: 16385,
        maxOutputTokens: 4096,
        costPer1MTokens: { input: 0.5, output: 1.5 },
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2023-11-01'),
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: 'Advanced image generation',
        capabilities: {
          textGeneration: false,
          imageGeneration: true,
          videoGeneration: false,
          vision: false,
          multimodal: false,
        },
        costPerImage: 0.04,
        isLatest: true,
        isDeprecated: false,
        releaseDate: new Date('2023-10-01'),
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        description: 'Previous generation image model',
        capabilities: {
          textGeneration: false,
          imageGeneration: true,
          videoGeneration: false,
          vision: false,
          multimodal: false,
        },
        costPerImage: 0.02,
        isLatest: false,
        isDeprecated: false,
        releaseDate: new Date('2022-11-01'),
      },
    ];
  }

  /**
   * Get information about a specific OpenAI model
   */
  static async getModelInfo(modelId) {
    const models = await this.getAvailableModels();
    return models.find((m) => m.id === modelId);
  }
}

module.exports = OpenAIAdaptor;
