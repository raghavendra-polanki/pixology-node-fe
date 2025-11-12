/**
 * ActionExecutorV2 - Refactored to use AIAdaptors instead of direct service calls
 *
 * Executes individual recipe actions (nodes) using pluggable AI adaptors
 * instead of hardcoded service dependencies.
 */

const AIAdaptorResolver = require('./AIAdaptorResolver');
const PromptManager = require('./PromptManager');
const ImageGenerationService = require('./imageGenerationService');
const VideoGenerationService = require('./videoGenerationService');
const GCSService = require('./gcsService');

class ActionExecutorV2 {
  /**
   * Execute a single action node
   *
   * @param {object} node - Action node configuration
   * @param {object} input - Input data for the action
   * @param {string} projectId - Project ID for adaptor/prompt resolution
   * @param {string} stageType - Stage type for context
   * @param {object} db - Firestore database instance
   * @returns {Promise<object>} Result with output, status, metadata
   */
  static async executeAction(node, input, projectId = null, stageType = null, db = null) {
    const result = {
      nodeId: node.id,
      status: 'processing',
      input,
      startedAt: Date.now(),
      error: null,
    };

    try {
      console.log(`[ActionExecutor] Executing action: ${node.name || node.type} (${node.id})`);

      let output;

      // Route to appropriate executor based on type
      switch (node.type) {
        case 'text_generation':
          output = await this.executeTextGeneration(node, input, projectId, stageType, db);
          break;

        case 'image_generation':
          output = await this.executeImageGeneration(node, input, projectId, stageType, db);
          break;

        case 'video_generation':
          output = await this.executeVideoGeneration(node, input, projectId, stageType, db);
          break;

        case 'data_processing':
          output = await this.executeDataProcessing(node, input, projectId, db);
          break;

        default:
          throw new Error(`Unknown action type: ${node.type}`);
      }

      result.output = output;
      result.status = 'completed';
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      console.log(`[ActionExecutor] Action ${node.id} completed in ${result.duration}ms`);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      };
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      console.error(`[ActionExecutor] Action ${node.id} failed: ${error.message}`);

      // Handle error strategy
      if (node.errorHandling?.onError === 'fail') {
        throw error;
      } else if (node.errorHandling?.onError === 'skip') {
        result.status = 'skipped';
        result.output = node.errorHandling?.defaultOutput;
        return result;
      } else if (node.errorHandling?.onError === 'retry') {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Execute text generation using resolved adaptor
   */
  static async executeTextGeneration(node, input, projectId, stageType, db) {
    try {
      // Resolve which adaptor to use
      const adaptorResolution = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        stageType,
        'textGeneration',
        db
      );

      console.log(
        `[TextGen] Using ${adaptorResolution.adaptorId}/${adaptorResolution.modelId} (source: ${adaptorResolution.source})`
      );

      // Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(stageType, projectId, db);

      // Determine which capability to use from template
      let promptSet = promptTemplate.prompts?.textGeneration;

      if (!promptSet) {
        console.warn(`No textGeneration prompts found in template, using fallback`);
        promptSet = {
          systemPrompt: '',
          userPromptTemplate: '{prompt}',
          outputFormat: 'json',
        };
      }

      // Resolve prompt variables
      const resolvedPrompt = PromptManager.resolvePrompt(promptSet, input);

      // Build full prompt
      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // Execute using adaptor
      const generationResult = await adaptorResolution.adaptor.generateText(fullPrompt, {
        temperature: node.config?.temperature,
        maxTokens: node.config?.maxTokens,
      });

      // Parse JSON if needed
      let output = generationResult.text;

      if (promptSet.outputFormat === 'json') {
        output = this._parseJsonFromResponse(output);
      }

      return {
        output,
        adaptor: adaptorResolution.adaptorId,
        model: adaptorResolution.modelId,
        usage: generationResult.usage,
      };
    } catch (error) {
      console.error('[TextGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute image generation using resolved adaptor
   */
  static async executeImageGeneration(node, input, projectId, stageType, db) {
    try {
      // Resolve which adaptor to use
      const adaptorResolution = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        stageType,
        'imageGeneration',
        db
      );

      console.log(
        `[ImageGen] Using ${adaptorResolution.adaptorId}/${adaptorResolution.modelId} (source: ${adaptorResolution.source})`
      );

      const { personaData, sceneData, selectedPersonaImage, selectedPersonaName } = input;

      // Check if this is scene image generation
      const isSceneImageGeneration = sceneData && Array.isArray(sceneData);

      if (isSceneImageGeneration) {
        console.log(`[ImageGen] Generating images for ${sceneData.length} scenes`);

        // For scene images, fall back to existing service (preserves consistency logic)
        // In future, this could be updated to use adaptor-based image generation
        const sceneImages = await ImageGenerationService.generateMultipleSceneImages(
          sceneData,
          selectedPersonaName || 'Character',
          selectedPersonaImage || null
        );

        return {
          output: sceneImages,
          adaptor: 'legacy_imageGeneration',
          model: 'image-consistency-v1',
        };
      } else if (personaData && Array.isArray(personaData)) {
        console.log(`[ImageGen] Generating ${personaData.length} persona images`);

        const images = [];

        for (let i = 0; i < personaData.length; i++) {
          try {
            const persona = personaData[i];
            const imagePrompt = this._generateImagePrompt(persona);

            console.log(`[ImageGen] Generating image ${i + 1}/${personaData.length}`);

            const imageResult = await adaptorResolution.adaptor.generateImage(imagePrompt, {
              size: node.config?.size || '1024x1024',
              quality: node.config?.quality,
            });

            images.push({
              personaId: persona.id || `persona_${i}`,
              personaName: persona.coreIdentity?.name || 'Unknown',
              imageUrl: imageResult.imageUrl,
              adaptor: adaptorResolution.adaptorId,
              model: adaptorResolution.modelId,
              generatedAt: new Date().toISOString(),
            });

            // Rate limiting
            if (i < personaData.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (personaError) {
            console.error(`[ImageGen] Error for persona ${i + 1}: ${personaError.message}`);

            if (node.errorHandling?.onError === 'skip') {
              images.push({
                personaId: personaData[i].id || `persona_${i}`,
                personaName: personaData[i].coreIdentity?.name || 'Unknown',
                error: personaError.message,
              });
              continue;
            }
            throw personaError;
          }
        }

        return {
          output: images,
          adaptor: adaptorResolution.adaptorId,
          model: adaptorResolution.modelId,
        };
      } else {
        throw new Error('Missing input: sceneData or personaData required');
      }
    } catch (error) {
      console.error('[ImageGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute video generation using resolved adaptor
   */
  static async executeVideoGeneration(node, input, projectId, stageType, db) {
    try {
      // Resolve which adaptor to use
      const adaptorResolution = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        stageType,
        'videoGeneration',
        db
      );

      console.log(
        `[VideoGen] Using ${adaptorResolution.adaptorId}/${adaptorResolution.modelId} (source: ${adaptorResolution.source})`
      );

      const { sceneImageGcsUri, sceneDescription, sceneIndex, projectId: projId } = input;

      console.log(`[VideoGen] Generating video for scene ${sceneIndex}`);

      // Call appropriate video generation based on adaptor
      let videoResult;

      if (adaptorResolution.adaptorId === 'openai') {
        // OpenAI video generation (when available)
        videoResult = await adaptorResolution.adaptor.generateVideo(sceneDescription, {
          duration: node.config?.duration || '6s',
          resolution: node.config?.resolution || '720p',
        });
      } else {
        // Fall back to existing video generation service
        videoResult = await VideoGenerationService.generateVideoWithVeo(
          sceneImageGcsUri,
          { description: sceneDescription, sceneIndex },
          projId,
          sceneIndex
        );
      }

      return {
        output: videoResult,
        adaptor: adaptorResolution.adaptorId,
        model: adaptorResolution.modelId,
      };
    } catch (error) {
      console.error('[VideoGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute data processing action (GCS uploads, etc.)
   */
  static async executeDataProcessing(node, input, projectId, db) {
    try {
      console.log(`[DataProcessing] Processing: ${node.subType || 'unknown'}`);

      const { images, videos, metadata } = input;

      // Upload images to GCS if present
      if (images && Array.isArray(images)) {
        console.log(`[DataProcessing] Uploading ${images.length} images`);

        const uploadedImages = [];

        for (const image of images) {
          try {
            const gcsUri = await GCSService.uploadImage(
              image.buffer,
              `personas/${projectId}/${image.personaName}.png`
            );

            uploadedImages.push({
              ...image,
              gcsUri,
              imageUrl: await GCSService.generatePublicUrl(gcsUri),
            });
          } catch (uploadError) {
            console.error(`Failed to upload image: ${uploadError.message}`);

            if (node.errorHandling?.onError === 'skip') {
              continue;
            }
            throw uploadError;
          }
        }

        return { uploadedImages };
      }

      // Upload videos if present
      if (videos && Array.isArray(videos)) {
        console.log(`[DataProcessing] Uploading ${videos.length} videos`);

        const uploadedVideos = [];

        for (const video of videos) {
          try {
            const gcsUri = await GCSService.uploadVideo(
              video.buffer,
              `videos/${projectId}/video_${video.index}.mp4`
            );

            uploadedVideos.push({
              ...video,
              gcsUri,
              videoUrl: await GCSService.generatePublicUrl(gcsUri),
            });
          } catch (uploadError) {
            console.error(`Failed to upload video: ${uploadError.message}`);

            if (node.errorHandling?.onError === 'skip') {
              continue;
            }
            throw uploadError;
          }
        }

        return { uploadedVideos };
      }

      return { processed: true };
    } catch (error) {
      console.error('[DataProcessing] Error:', error.message);
      throw error;
    }
  }

  /**
   * Parse JSON from response (handles markdown code blocks)
   *
   * @private
   */
  static _parseJsonFromResponse(text) {
    try {
      // Try direct JSON parse
      return JSON.parse(text);
    } catch (e) {
      // Try extracting from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.warn('Failed to parse JSON from markdown block');
        }
      }

      // Return as-is if not JSON
      console.warn('Response is not valid JSON, returning as text');
      return text;
    }
  }

  /**
   * Generate image prompt from persona data
   *
   * @private
   */
  static _generateImagePrompt(persona) {
    const identity = persona.coreIdentity || {};
    const appearance = persona.physicalAppearance || {};
    const communication = persona.personalityAndCommunication || {};

    return `Generate a UGC-style portrait photograph of a ${identity.age}-year-old ${identity.sex} person with the following characteristics:

Name: ${identity.name}
Location: ${identity.location || 'Urban setting'}

Physical Appearance:
- General: ${appearance.general}
- Hair: ${appearance.hair}
- Build: ${appearance.build}
- Clothing: ${appearance.clothingAesthetic}
- Signature Details: ${appearance.signatureDetails}

Style & Vibe:
- Demeanor: ${communication.demeanor}
- Energy Level: ${communication.energyLevel}

Create a realistic, professional-quality portrait photo. The person should look relatable and authentic. Include natural lighting and a neutral or lifestyle background.`;
  }
}

module.exports = ActionExecutorV2;
