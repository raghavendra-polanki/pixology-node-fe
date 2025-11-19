/**
 * StoryboardStreamingService
 *
 * Extends StoryboardGenerationService with streaming support
 * Provides progressive generation with real-time updates for:
 * - Scene text generation (streamed and parsed incrementally)
 * - Scene image generation (one by one with progress updates)
 */

const PromptManager = require('./PromptManager.cjs');
const StoryboardGenerationService = require('./StoryboardGenerationService.cjs');
const GCSService = require('./gcsService');

class StoryboardStreamingService {
  /**
   * Generate storyboard with progressive streaming
   *
   * @param {string} projectId - Project ID
   * @param {object} input - Generation input (same as StoryboardGenerationService)
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @param {object} callbacks - Event callbacks for streaming
   *   {
   *     onSceneParsed: (data) => void,
   *     onImageGenerated: (data) => void,
   *     onProgress: (data) => void,
   *     onComplete: (data) => void,
   *     onError: (data) => void
   *   }
   * @returns {Promise<object>} { scenes, textAdaptor, textModel }
   */
  static async generateStoryboardProgressive(
    projectId,
    input,
    db,
    AIAdaptorResolver,
    callbacks = {}
  ) {
    const {
      onSceneParsed = () => {},
      onImageGenerated = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    try {
      const {
        campaignDescription,
        productDescription,
        targetAudience,
        selectedPersonaName,
        selectedPersonaDescription,
        selectedPersonaImage,
        productImageUrl,
        narrativeTheme,
        narrativeStructure,
        numberOfScenes = 6,
        videoDuration = '30s',
      } = input;

      console.log(
        `[StoryboardStreamingService] Starting progressive generation for ${numberOfScenes} scenes`
      );

      onProgress({ stage: 'init', message: 'Preparing your story canvas...', progress: 0 });

      // ========================================
      // STEP 1: Resolve Text Adaptor & Get Prompt
      // ========================================

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_4_storyboard',
        'textGeneration',
        db
      );

      console.log(
        `[StoryboardStreamingService] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`
      );

      const textPrompt = await PromptManager.getPromptByCapability(
        'stage_4_storyboard',
        'textGeneration',
        projectId,
        db
      );

      // Build prompt variables
      const variables = {
        campaignDescription,
        productDescription,
        targetAudience,
        selectedPersonaName,
        selectedPersonaDescription,
        selectedPersonaImage,
        narrativeTheme,
        narrativeStructure,
        numberOfScenes,
        videoDuration,
      };

      const resolvedPrompt = PromptManager.resolvePrompt(textPrompt, variables);

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // ========================================
      // STEP 2: Stream Scene Text Generation
      // ========================================

      onProgress({ stage: 'text', message: 'Weaving narrative threads...', progress: 5 });

      const scenes = [];
      let sceneBuffer = '';
      let inArray = false;
      let braceDepth = 0;
      let sceneCount = 0;

      // Incremental JSON parser for streaming
      const parseAndEmitScenes = (text) => {
        sceneBuffer += text;

        // Parse JSON array incrementally
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (char === '[') inArray = true;
          if (!inArray) continue;

          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;

          // When we close a complete scene object at depth 0
          if (braceDepth === 0 && char === '}') {
            try {
              // Extract complete scene JSON using regex
              const jsonMatch = sceneBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
              if (jsonMatch) {
                const sceneJson = jsonMatch[0];
                const scene = JSON.parse(sceneJson);

                // Validate scene structure
                if (StoryboardGenerationService._isValidScene(scene)) {
                  scenes.push(scene);
                  sceneCount++;

                  const progress = 5 + Math.round((sceneCount / numberOfScenes) * 40); // 5-45%

                  // Emit scene immediately to frontend
                  onSceneParsed({
                    sceneNumber: sceneCount,
                    scene,
                    progress,
                  });

                }

                // Clear buffer after successful parse
                sceneBuffer = sceneBuffer.substring(
                  sceneBuffer.indexOf(sceneJson) + sceneJson.length
                );
              }
            } catch (parseError) {
              // Continue buffering if parse fails (incomplete JSON)
              console.warn(
                `[StoryboardStreamingService] Parse attempt failed, continuing...`
              );
            }
          }
        }
      };

      // Stream generation (if adaptor supports it)
      if (textAdaptor.adaptor.supportsStreaming()) {
        console.log('[StoryboardStreamingService] Using streaming text generation');

        await textAdaptor.adaptor.generateTextStream(
          fullPrompt,
          { temperature: 0.7, maxTokens: 6000 },
          (chunk) => {
            if (chunk.type === 'chunk') {
              parseAndEmitScenes(chunk.text);
            }
          }
        );
      } else {
        console.log('[StoryboardStreamingService] Falling back to non-streaming generation');

        // Fallback to non-streaming
        const result = await textAdaptor.adaptor.generateText(fullPrompt, {
          temperature: 0.7,
          maxTokens: 6000,
        });

        const parsedScenes = StoryboardGenerationService._parseScenesFromResponse(result.text);

        parsedScenes.forEach((scene, idx) => {
          if (StoryboardGenerationService._isValidScene(scene)) {
            scenes.push(scene);
            const progress = 5 + Math.round(((idx + 1) / numberOfScenes) * 40);

            onSceneParsed({
              sceneNumber: idx + 1,
              scene,
              progress,
            });
          }
        });
      }

      if (scenes.length === 0) {
        throw new Error('No valid scenes generated');
      }

      console.log(`[StoryboardStreamingService] Generated ${scenes.length} scenes`);

      onProgress({
        stage: 'text-complete',
        message: 'Story blueprint complete. Painting your vision...',
        progress: 45,
      });

      // ========================================
      // STEP 3: Generate Images Progressively
      // ========================================

      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_4_storyboard',
        'imageGeneration',
        db
      );

      console.log(
        `[StoryboardStreamingService] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`
      );

      const imagePromptTemplate = await PromptManager.getPromptByCapability(
        'stage_4_storyboard',
        'imageGeneration',
        projectId,
        db
      );

      for (let i = 0; i < scenes.length; i++) {
        try {
          const scene = scenes[i];

          const artMessages = [
            'Sketching visual magic...',
            'Bringing pixels to life...',
            'Crafting cinematic moments...',
            'Painting with AI brilliance...',
            'Rendering your vision...',
          ];

          onProgress({
            stage: 'image',
            message: `${artMessages[i % artMessages.length]} (${i + 1}/${scenes.length})`,
            currentScene: i + 1,
            progress: 45 + Math.round(((i) / scenes.length) * 50), // 45-95%
          });

          // Build variables for this scene's image
          const imageVariables = {
            selectedPersonaName,
            selectedPersonaDescription,
            title: scene.title || '',
            description: scene.description || '',
            location: scene.location || '',
            visualElements: scene.visualElements || '',
            cameraWork: scene.cameraWork || '',
            product: scene.product || '',
            keyFrameDescription: scene.keyFrameDescription || '',
          };

          const resolvedImagePrompt = PromptManager.resolvePrompt(
            imagePromptTemplate,
            imageVariables
          );

          const imagePrompt = resolvedImagePrompt.systemPrompt
            ? `${resolvedImagePrompt.systemPrompt}\n\n${resolvedImagePrompt.userPrompt}`
            : resolvedImagePrompt.userPrompt;

          console.log(`[StoryboardStreamingService] Generating image ${i + 1}/${scenes.length}`);

          // Collect reference images
          const referenceImages = [];
          if (selectedPersonaImage) referenceImages.push(selectedPersonaImage);
          if (productImageUrl) referenceImages.push(productImageUrl);

          const imageResult = await imageAdaptor.adaptor.generateImage(imagePrompt, {
            size: '1024x1024',
            quality: 'standard',
            referenceImageUrl: referenceImages.length > 0 ? referenceImages : undefined,
          });

          // Handle image URL - convert data URLs to GCS URLs
          let imageUrl = imageResult.imageUrl;
          const sceneTitle = scene.title || `scene_${i}`;

          if (imageUrl && imageUrl.startsWith('data:')) {
            try {
              const base64Data = imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              const sceneTitleSafe = sceneTitle.replace(/\s+/g, '_');
              imageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, sceneTitleSafe);
              console.log(`[StoryboardStreamingService] Uploaded image to GCS for: ${sceneTitle}`);
            } catch (uploadError) {
              console.warn(
                `[StoryboardStreamingService] Failed to upload image to GCS: ${uploadError.message}`
              );
            }
          }

          // Update scene with image
          scenes[i].image = {
            url: imageUrl,
            adaptor: imageAdaptor.adaptorId,
            model: imageAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          };

          // Emit image result
          onImageGenerated({
            sceneNumber: i + 1,
            imageUrl,
            progress: 45 + Math.round(((i + 1) / scenes.length) * 50),
          });


          // Rate limiting between image generations
          if (i < scenes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (imageError) {
          console.error(
            `[StoryboardStreamingService] Image generation failed for scene ${i}: ${imageError.message}`
          );

          scenes[i].image = {
            error: imageError.message,
            generatedAt: new Date().toISOString(),
          };

          // Emit error for this specific image
          onImageGenerated({
            sceneNumber: i + 1,
            error: imageError.message,
            progress: 45 + Math.round(((i + 1) / scenes.length) * 50),
          });
        }
      }

      // ========================================
      // STEP 4: Save to Firestore
      // ========================================

      onProgress({ stage: 'saving', message: 'Finalizing your masterpiece...', progress: 95 });

      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedStoryboard: {
            scenes,
            adaptor: textAdaptor.adaptorId,
            textModel: textAdaptor.modelId,
            imageAdaptor: imageAdaptor.adaptorId,
            imageModel: imageAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          },
        });

      console.log(`[StoryboardStreamingService] Storyboard saved to Firestore`);

      // ========================================
      // STEP 5: Complete
      // ========================================

      onComplete({
        scenes,
        totalCount: scenes.length,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        imageAdaptor: imageAdaptor.adaptorId,
        imageModel: imageAdaptor.modelId,
        progress: 100,
      });

      return {
        scenes,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        imageAdaptor: imageAdaptor.adaptorId,
        imageModel: imageAdaptor.modelId,
      };
    } catch (error) {
      console.error('[StoryboardStreamingService] Error:', error.message);
      onError({ message: error.message, stage: 'generation' });
      throw error;
    }
  }
}

module.exports = StoryboardStreamingService;
