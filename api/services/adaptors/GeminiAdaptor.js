/**
 * GeminiAdaptor
 *
 * Adaptor for Google Gemini API
 * Supports text generation, image generation, video generation, and vision capabilities
 */

import BaseAIAdaptor from './BaseAIAdaptor.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';
import fs from 'fs';

export default class GeminiAdaptor extends BaseAIAdaptor {
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
   * Generate image using Gemini 2.5 Flash Image model
   * @param {string} prompt - Text prompt for image generation
   * @param {object} options - Options object
   * @param {string|string[]} options.referenceImageUrl - Optional reference image URL(s) to guide generation
   */
  async generateImage(prompt, options = {}) {
    try {
      // Use the specialized image generation model
      const imageModel = this.client.getGenerativeModel({
        model: 'gemini-2.5-flash-image',
      });

      // Build content parts array
      const contentParts = [{ text: prompt }];

      // Add reference images if provided (supports single URL or array of URLs)
      if (options.referenceImageUrl) {
        const imageUrls = Array.isArray(options.referenceImageUrl)
          ? options.referenceImageUrl
          : [options.referenceImageUrl];

        for (const imageUrl of imageUrls) {
          if (imageUrl) {
            const imageBase64 = await this._fetchImageAsBase64(imageUrl);
            if (imageBase64) {
              contentParts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              });
            }
          }
        }
      }

      const result = await imageModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: contentParts,
          },
        ],
      });

      const response = result.response;

      // Extract the generated image from the response
      const generatedImagePart = response.candidates[0].content.parts.find(
        part => part.inlineData
      );

      if (generatedImagePart && generatedImagePart.inlineData) {
        // Return the image URL (inline data)
        const imageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;

        return {
          imageUrl,
          format: 'data-url',
          model: 'gemini-2.5-flash-image',
          backend: 'gemini',
        };
      } else {
        throw new Error('No image data found in the response');
      }
    } catch (error) {
      throw new Error(`Gemini image generation error: ${error.message}`);
    }
  }

  /**
   * Generate video using Vertex AI Veo 3.1 API
   * @param {string} prompt - Text prompt for video generation
   * @param {object} options - Options object
   * @param {string} options.imageGcsUri - GCS URI of reference image (gs://bucket/path/image.jpg)
   * @param {number} options.durationSeconds - Video duration (4, 6, or 8 seconds)
   * @param {string} options.aspectRatio - Aspect ratio (default: 16:9)
   * @param {string} options.resolution - Resolution (720p or 1080p)
   * @param {string} options.projectId - Project ID for organizing output
   * @param {number} options.sceneNumber - Scene number for path organization
   */
  async generateVideo(prompt, options = {}) {
    try {
      const {
        imageGcsUri,
        durationSeconds = 6,
        aspectRatio = '16:9',
        resolution = '720p',
        projectId = 'default',
        sceneNumber = 1,
        storageUri = null,
      } = options;

      const gcpProjectId = process.env.GCP_PROJECT_ID;
      const gcpLocation = process.env.GCP_LOCATION || 'us-central1';
      const gcsBucket = process.env.GCS_BUCKET_NAME || 'pixology-personas';
      const veoModelId = 'veo-3.1-generate-preview';

      if (!gcpProjectId) {
        throw new Error('GCP_PROJECT_ID environment variable not set');
      }

      if (!imageGcsUri) {
        throw new Error('imageGcsUri is required (GCS URI format: gs://bucket/path/image.jpg)');
      }

      // Convert HTTPS URL to GCS URI if needed
      const gcsUri = this._convertToGcsUri(imageGcsUri);

      // Validate Veo 3 constraints
      const ALLOWED_DURATIONS = [4, 6, 8];
      if (!ALLOWED_DURATIONS.includes(durationSeconds)) {
        throw new Error(`Invalid duration: ${durationSeconds}s. Veo 3 only supports: ${ALLOWED_DURATIONS.join(', ')}s`);
      }

      const ALLOWED_RESOLUTIONS = ['720p', '1080p'];
      if (!ALLOWED_RESOLUTIONS.includes(resolution)) {
        throw new Error(`Invalid resolution: ${resolution}. Veo 3 only supports: ${ALLOWED_RESOLUTIONS.join(', ')}`);
      }

      console.log(`[GeminiAdaptor] Generating video with Veo 3 for scene ${sceneNumber}`);
      console.log(`[GeminiAdaptor] Image: ${gcsUri}`);
      console.log(`[GeminiAdaptor] Duration: ${durationSeconds}s, Resolution: ${resolution}`);

      // Get access token
      const accessToken = await this._getAccessToken();

      // Build GCS output path
      const outputStorageUri = storageUri || `gs://${gcsBucket}/videos/${projectId}/scene_${sceneNumber}/`;

      // Build request payload
      const requestPayload = {
        instances: [
          {
            prompt: prompt,
            image: {
              gcsUri: gcsUri,
              mimeType: 'image/jpeg',
            },
          },
        ],
        parameters: {
          durationSeconds: durationSeconds,
          aspectRatio: aspectRatio,
          resolution: resolution,
          enhancePrompt: true,
          generateAudio: true,
          storageUri: outputStorageUri,
        },
      };

      // Call Veo 3 API
      const apiEndpoint = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${veoModelId}:predictLongRunning`;

      console.log(`[GeminiAdaptor] Calling Veo 3 API...`);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;

        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData?.error?.message || JSON.stringify(errorData);
          } else {
            const text = await response.text();
            errorMessage = text.substring(0, 500);
          }
        } catch (parseError) {
          errorMessage = `Could not parse error response. Status: ${response.status}`;
        }

        throw new Error(`Veo 3 API error: ${errorMessage}`);
      }

      const operationData = await response.json();
      const operationName = operationData.name;

      console.log(`[GeminiAdaptor] Operation started: ${operationName}`);

      // Poll for completion
      const result = await this._pollVeo3Operation(operationName, gcpLocation, gcpProjectId, veoModelId);

      // Extract video URL
      const videoUrl = this._extractVideoUrl(result);

      console.log(`[GeminiAdaptor] Video generation completed: ${videoUrl}`);

      return {
        videoUrl,
        format: 'mp4',
        duration: `${durationSeconds}s`,
        resolution,
        aspectRatio,
        model: veoModelId,
        backend: 'gemini',
        operationName,
      };
    } catch (error) {
      throw new Error(`Gemini video generation error: ${error.message}`);
    }
  }

  /**
   * Convert HTTPS GCS URL to GCS URI format
   * Converts: https://storage.googleapis.com/bucket/path/file.ext
   * To: gs://bucket/path/file.ext
   * @private
   */
  _convertToGcsUri(url) {
    if (!url) {
      throw new Error('URL is required for conversion');
    }

    // If already in GCS URI format, return as-is
    if (url.startsWith('gs://')) {
      return url;
    }

    // Convert HTTPS URL to GCS URI
    if (url.startsWith('https://storage.googleapis.com/')) {
      const path = url.replace('https://storage.googleapis.com/', '');
      return `gs://${path}`;
    }

    // If not a recognized format, throw error
    throw new Error(`Invalid GCS URL format: ${url}. Expected gs:// or https://storage.googleapis.com/`);
  }

  /**
   * Get authenticated access token for Vertex AI
   * @private
   */
  async _getAccessToken() {
    try {
      const keyFilePath = process.env.VEO3_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (!keyFilePath) {
        throw new Error('No service account key file configured. Set GOOGLE_APPLICATION_CREDENTIALS or VEO3_SERVICE_ACCOUNT_KEY');
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      const client = await auth.getClient();
      const response = await client.getAccessToken();

      const token = response?.token || response?.access_token || response;

      if (!token || typeof token !== 'string') {
        throw new Error(`Invalid access token format received`);
      }

      return token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  /**
   * Poll Veo 3 long-running operation until completion
   * @private
   */
  async _pollVeo3Operation(operationName, gcpLocation, gcpProjectId, veoModelId, maxWaitMs = 3600000) {
    const startTime = Date.now();
    const pollIntervalMs = 15000; // 15 seconds
    let pollCount = 0;

    console.log(`[GeminiAdaptor] Polling operation for completion...`);

    // Get fresh access token for polling
    const pollingToken = await this._getAccessToken();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${veoModelId}:fetchPredictOperation`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pollingToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: operationName,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Poll failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        pollCount++;

        if (data.done) {
          if (data.error) {
            throw new Error(`Operation failed: ${data.error.message}`);
          }

          console.log(`[GeminiAdaptor] Operation completed after ${pollCount} polls`);
          return data.response || data.result;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        if (error.message.includes('Operation failed')) {
          throw error;
        }
        console.warn(`[GeminiAdaptor] Poll attempt ${pollCount} error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new Error(`Operation timeout after ${maxWaitMs}ms`);
  }

  /**
   * Extract video URL from Veo 3 operation result
   * @private
   */
  _extractVideoUrl(result) {
    // Try multiple paths to find the video URL
    if (result?.videos?.[0]?.gcsUri) {
      const gcsUri = result.videos[0].gcsUri;
      // Convert gs:// to https:// URL
      return `https://storage.googleapis.com/${gcsUri.substring(5)}`;
    }

    if (result?.predictions?.[0]?.videoUri) {
      return result.predictions[0].videoUri;
    }

    if (result?.predictions?.[0]?.gcsUri) {
      const gcsUri = result.predictions[0].gcsUri;
      return `https://storage.googleapis.com/${gcsUri.substring(5)}`;
    }

    if (result?.videoUri) {
      return result.videoUri;
    }

    if (result?.gcsUri) {
      const gcsUri = result.gcsUri;
      return `https://storage.googleapis.com/${gcsUri.substring(5)}`;
    }

    if (typeof result === 'string' && result.startsWith('gs://')) {
      return `https://storage.googleapis.com/${result.substring(5)}`;
    }

    throw new Error(
      `Unable to extract video URL from result. Result structure: ${JSON.stringify(result).substring(0, 200)}`
    );
  }

  /**
   * Fetch image from URL and convert to base64
   * @private
   */
  async _fetchImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      console.error(`[GeminiAdaptor] Error fetching image: ${error.message}`);
      return null;
    }
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
          imageGeneration: true,
          videoGeneration: true,
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
          imageGeneration: true,
          videoGeneration: true,
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
          imageGeneration: true,
          videoGeneration: true,
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
