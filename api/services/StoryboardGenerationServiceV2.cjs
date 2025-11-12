/**
 * StoryboardGenerationServiceV2
 *
 * Refactored for adaptor-aware operations
 * Generates storyboard scenes using configured AI adaptor with prompt templates
 * Also handles scene image generation with per-scene consistency
 */

const PromptManager = require('./PromptManager.cjs');
const ImageGenerationService = require('./imageGenerationService');
const GCSService = require('./gcsService');

class StoryboardGenerationServiceV2 {
  /**
   * Generate storyboard scenes for a project
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { productDescription, targetAudience, selectedPersonaName, selectedPersonaDescription, narrativeTheme, narrativeStructure, numberOfScenes, videoDuration }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @returns {Promise<object>} { scenes, adaptor, model, usage }
   */
  static async generateStoryboardScenes(projectId, input, db, AIAdaptorResolver) {
    try {
      const {
        productDescription,
        targetAudience,
        selectedPersonaName,
        selectedPersonaDescription,
        narrativeTheme,
        narrativeStructure,
        numberOfScenes = 6,
        videoDuration = '30s',
      } = input;

      console.log(
        `[StoryboardGen] Generating ${numberOfScenes} storyboard scenes for project ${projectId}`
      );

      // 1. Resolve text generation adaptor
      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_4_storyboard',
        'textGeneration',
        db
      );

      console.log(`[StoryboardGen] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

      // 2. Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(
        'stage_4_storyboard',
        projectId,
        db
      );

      // 3. Build storyboard generation prompt
      const variables = {
        productDescription,
        targetAudience,
        selectedPersonaName,
        selectedPersonaDescription,
        narrativeTheme,
        narrativeStructure,
        numberOfScenes,
        videoDuration,
      };

      const resolvedPrompt = PromptManager.resolvePrompt(
        promptTemplate.prompts.textGeneration,
        variables
      );

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // 4. Generate scenes using adaptor
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.7,
        maxTokens: 6000,
      });

      // 5. Parse response
      let scenes = this._parseScenesFromResponse(generationResult.text);

      if (!Array.isArray(scenes)) {
        scenes = [scenes];
      }

      // 6. Validate scene structure
      scenes = scenes.filter((s) => this._isValidScene(s));

      if (scenes.length === 0) {
        throw new Error('No valid scenes generated');
      }

      // 7. Generate images for each scene
      const scenesWithImages = await this._generateSceneImages(
        projectId,
        scenes,
        selectedPersonaName,
        selectedPersonaDescription,
        db,
        AIAdaptorResolver
      );

      // 8. Store in Firestore
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedStoryboard: {
            scenes: scenesWithImages,
            adaptor: textAdaptor.adaptorId,
            textModel: textAdaptor.modelId,
            imageAdaptor: 'unset', // Will be set when images are generated
            generatedAt: new Date().toISOString(),
          },
        });

      return {
        scenes: scenesWithImages,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        usage: generationResult.usage,
      };
    } catch (error) {
      console.error('[StoryboardGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate images for storyboard scenes
   *
   * @private
   */
  static async _generateSceneImages(projectId, scenes, selectedPersonaName, selectedPersonaDescription, db, AIAdaptorResolver) {
    try {
      // Resolve image generation adaptor
      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_4_storyboard',
        'imageGeneration',
        db
      );

      console.log(`[StoryboardGen] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`);

      const scenesWithImages = [];

      for (let i = 0; i < scenes.length; i++) {
        try {
          const scene = scenes[i];
          const imagePrompt = this._buildSceneImagePrompt(
            scene,
            selectedPersonaName,
            selectedPersonaDescription
          );

          console.log(`[StoryboardGen] Generating image ${i + 1}/${scenes.length}`);

          const imageResult = await imageAdaptor.adaptor.generateImage(imagePrompt, {
            size: '1024x1024',
            quality: 'standard',
          });

          // Handle image URL - convert data URLs to GCS URLs
          let imageUrl = imageResult.imageUrl;
          const sceneTitle = scene.title || `scene_${i}`;

          if (imageUrl && imageUrl.startsWith('data:')) {
            // Convert data URL to buffer and upload to GCS
            try {
              const base64Data = imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              const sceneTitleSafe = sceneTitle.replace(/\s+/g, '_');
              imageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, sceneTitleSafe);
              console.log(`[StoryboardGen] Uploaded image to GCS for: ${sceneTitle}`);
            } catch (uploadError) {
              console.warn(`[StoryboardGen] Failed to upload image to GCS: ${uploadError.message}`);
              // Continue with data URL if upload fails (will likely cause Firestore error)
            }
          }

          scenesWithImages.push({
            ...scene,
            id: scene.sceneNumber || `scene_${i}`,
            image: {
              url: imageUrl,
              adaptor: imageAdaptor.adaptorId,
              model: imageAdaptor.modelId,
              generatedAt: new Date().toISOString(),
            },
          });

          // Rate limiting between image generations
          if (i < scenes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (imageError) {
          console.error(`[StoryboardGen] Image generation failed for scene ${i}: ${imageError.message}`);

          // Continue without image if error
          scenesWithImages.push({
            ...scenes[i],
            id: scenes[i].sceneNumber || `scene_${i}`,
            image: {
              error: imageError.message,
              generatedAt: new Date().toISOString(),
            },
          });
        }
      }

      return scenesWithImages;
    } catch (error) {
      console.error('[StoryboardGen] Image generation error:', error.message);
      // Return scenes without images rather than failing
      return scenes.map((s, i) => ({
        ...s,
        id: s.sceneNumber || `scene_${i}`,
      }));
    }
  }

  /**
   * Parse scenes from AI response
   *
   * @private
   */
  static _parseScenesFromResponse(text) {
    try {
      // Try direct JSON parse
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // Try extracting from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (innerError) {
          console.warn('Failed to parse scenes from markdown block');
        }
      }

      throw new Error('Failed to parse scenes from response');
    }
  }

  /**
   * Validate scene structure
   *
   * @private
   */
  static _isValidScene(scene) {
    return (
      scene &&
      typeof scene === 'object' &&
      scene.sceneNumber &&
      scene.title &&
      scene.description &&
      scene.location &&
      scene.persona &&
      scene.product &&
      scene.visualElements &&
      scene.cameraWork &&
      scene.keyFrameDescription
    );
  }

  /**
   * Build image generation prompt from scene
   *
   * @private
   */
  static _buildSceneImagePrompt(scene, selectedPersonaName, selectedPersonaDescription) {
    return `Generate a professional UGC-style scene image for a marketing video:

**Scene Title:** ${scene.title}
**Scene Description:** ${scene.description}

**Location/Setting:**
${scene.location}

**Visual Elements:**
${scene.visualElements}

**Camera Work:**
${scene.cameraWork}

**Character/Persona:**
${selectedPersonaName} - ${selectedPersonaDescription}

**Detailed Visual Description:**
${scene.keyFrameDescription}

Create a high-quality, cinematic scene that matches the description above. Use professional cinematography, natural lighting, and authentic styling. The image should be suitable for a professional marketing video and feel like a genuine UGC production.`;
  }
}

module.exports = StoryboardGenerationServiceV2;
