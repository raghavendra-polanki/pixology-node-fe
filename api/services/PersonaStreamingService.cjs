/**
 * PersonaStreamingService
 *
 * Extends PersonaGenerationService with streaming support
 * Provides progressive generation with real-time updates for:
 * - Persona text generation (streamed and parsed incrementally)
 * - Persona image generation (one by one with progress updates)
 */

const PromptManager = require('./PromptManager.cjs');
const PersonaGenerationService = require('./PersonaGenerationService.cjs');
const GCSService = require('./gcsService');

class PersonaStreamingService {
  /**
   * Generate personas with progressive streaming
   *
   * @param {string} projectId - Project ID
   * @param {object} input - Generation input (same as PersonaGenerationService)
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @param {object} callbacks - Event callbacks for streaming
   * @returns {Promise<object>} { personas, textAdaptor, textModel }
   */
  static async generatePersonasProgressive(
    projectId,
    input,
    db,
    AIAdaptorResolver,
    callbacks = {}
  ) {
    const {
      onPersonaParsed = () => {},
      onImageGenerated = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    try {
      const {
        productDescription,
        targetAudience,
        numberOfPersonas = 3,
        productImageUrl,
      } = input;

      console.log(
        `[PersonaStreamingService] Starting progressive generation for ${numberOfPersonas} personas`
      );

      onProgress({ stage: 'init', message: 'Assembling character profiles...', progress: 0 });

      // ========================================
      // STEP 1: Resolve Text Adaptor & Get Prompt
      // ========================================

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_personas',
        'textGeneration',
        db
      );

      console.log(
        `[PersonaStreamingService] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`
      );

      const textPrompt = await PromptManager.getPromptByCapability(
        'stage_2_personas',
        'textGeneration',
        projectId,
        db
      );

      // Build prompt variables
      const variables = {
        productDescription,
        targetAudience,
        numberOfPersonas,
        productImageUrl: productImageUrl || 'Not provided',
      };

      const resolvedPrompt = PromptManager.resolvePrompt(textPrompt, variables);

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // ========================================
      // STEP 2: Stream Persona Text Generation
      // ========================================

      onProgress({ stage: 'text', message: 'Crafting unique personalities...', progress: 5 });

      const personas = [];
      let personaBuffer = '';
      let inArray = false;
      let braceDepth = 0;
      let personaCount = 0;

      // Incremental JSON parser for streaming
      const parseAndEmitPersonas = (text) => {
        personaBuffer += text;

        // Parse JSON array incrementally
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (char === '[') inArray = true;
          if (!inArray) continue;

          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;

          // When we close a complete persona object at depth 0
          if (braceDepth === 0 && char === '}') {
            try {
              // Extract complete persona JSON using regex
              const jsonMatch = personaBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
              if (jsonMatch) {
                const personaJson = jsonMatch[0];
                const persona = JSON.parse(personaJson);

                // Basic validation
                if (persona && typeof persona === 'object') {
                  personas.push(persona);
                  personaCount++;

                  const progress = 5 + Math.round((personaCount / numberOfPersonas) * 40); // 5-45%

                  // Emit persona immediately to frontend
                  onPersonaParsed({
                    personaNumber: personaCount,
                    persona,
                    progress,
                  });
                }

                // Clear buffer after successful parse
                personaBuffer = personaBuffer.substring(
                  personaBuffer.indexOf(personaJson) + personaJson.length
                );
              }
            } catch (parseError) {
              // Continue buffering if parse fails (incomplete JSON)
              console.warn(
                `[PersonaStreamingService] Parse attempt failed, continuing...`
              );
            }
          }
        }
      };

      // Stream generation (if adaptor supports it)
      if (textAdaptor.adaptor.supportsStreaming()) {
        console.log('[PersonaStreamingService] Using streaming text generation');

        await textAdaptor.adaptor.generateTextStream(
          fullPrompt,
          { temperature: 0.7, maxTokens: 4000 },
          (chunk) => {
            if (chunk.type === 'chunk') {
              parseAndEmitPersonas(chunk.text);
            }
          }
        );
      } else {
        console.log('[PersonaStreamingService] Falling back to non-streaming generation');

        // Fallback to non-streaming
        const result = await textAdaptor.adaptor.generateText(fullPrompt, {
          temperature: 0.7,
          maxTokens: 4000,
        });

        const parsedPersonas = PersonaGenerationService._parsePersonasFromResponse(result.text);

        parsedPersonas.forEach((persona, idx) => {
          personas.push(persona);
          const progress = 5 + Math.round(((idx + 1) / numberOfPersonas) * 40);

          onPersonaParsed({
            personaNumber: idx + 1,
            persona,
            progress,
          });
        });
      }

      if (personas.length === 0) {
        throw new Error('No valid personas generated');
      }

      console.log(`[PersonaStreamingService] Generated ${personas.length} personas`);

      onProgress({
        stage: 'text-complete',
        message: 'Personas defined. Bringing them to life...',
        progress: 45,
      });

      // ========================================
      // STEP 3: Generate Images Progressively
      // ========================================

      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_personas',
        'imageGeneration',
        db
      );

      console.log(
        `[PersonaStreamingService] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`
      );

      for (let i = 0; i < personas.length; i++) {
        try {
          const persona = personas[i];

          const portraitMessages = [
            'Capturing authentic expressions...',
            'Painting character portraits...',
            'Creating visual identities...',
            'Rendering persona likenesses...',
          ];

          onProgress({
            stage: 'image',
            message: `${portraitMessages[i % portraitMessages.length]} (${i + 1}/${personas.length})`,
            currentPersona: i + 1,
            progress: 45 + Math.round(((i) / personas.length) * 50), // 45-95%
          });

          // Build image prompt
          const imagePrompt = PersonaGenerationService._buildImagePrompt(persona);

          console.log(`[PersonaStreamingService] Generating image ${i + 1}/${personas.length}`);

          const imageResult = await imageAdaptor.adaptor.generateImage(imagePrompt, {
            size: '1024x1024',
            quality: 'standard',
          });

          // Handle image URL - convert data URLs to GCS URLs
          let imageUrl = imageResult.imageUrl;
          const personaName = persona.coreIdentity?.name || `persona_${i}`;

          if (imageUrl && imageUrl.startsWith('data:')) {
            try {
              const base64Data = imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              const personaNameSafe = personaName.replace(/\s+/g, '_');
              imageUrl = await GCSService.uploadImageToGCS(imageBuffer, projectId, personaNameSafe);
              console.log(`[PersonaStreamingService] Uploaded image to GCS for: ${personaName}`);
            } catch (uploadError) {
              console.warn(
                `[PersonaStreamingService] Failed to upload image to GCS: ${uploadError.message}`
              );
            }
          }

          // Update persona with image
          personas[i].id = personas[i].id || `persona_${i}`;
          personas[i].image = {
            url: imageUrl,
            adaptor: imageAdaptor.adaptorId,
            model: imageAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          };

          // Emit image result
          onImageGenerated({
            personaNumber: i + 1,
            imageUrl,
            progress: 45 + Math.round(((i + 1) / personas.length) * 50),
          });

          // Rate limiting between image generations
          if (i < personas.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (imageError) {
          console.error(
            `[PersonaStreamingService] Image generation failed for persona ${i}: ${imageError.message}`
          );

          personas[i].id = personas[i].id || `persona_${i}`;
          personas[i].image = {
            error: imageError.message,
            generatedAt: new Date().toISOString(),
          };

          // Emit error for this specific image
          onImageGenerated({
            personaNumber: i + 1,
            error: imageError.message,
            progress: 45 + Math.round(((i + 1) / personas.length) * 50),
          });
        }
      }

      // ========================================
      // STEP 4: Save to Firestore
      // ========================================

      onProgress({ stage: 'saving', message: 'Finalizing character lineup...', progress: 95 });

      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedPersonas: {
            personas,
            adaptor: textAdaptor.adaptorId,
            textModel: textAdaptor.modelId,
            imageAdaptor: imageAdaptor.adaptorId,
            imageModel: imageAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          },
        });

      console.log(`[PersonaStreamingService] Personas saved to Firestore`);

      // ========================================
      // STEP 5: Complete
      // ========================================

      onComplete({
        personas,
        totalCount: personas.length,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        imageAdaptor: imageAdaptor.adaptorId,
        imageModel: imageAdaptor.modelId,
        progress: 100,
      });

      return {
        personas,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        imageAdaptor: imageAdaptor.adaptorId,
        imageModel: imageAdaptor.modelId,
      };
    } catch (error) {
      console.error('[PersonaStreamingService] Error:', error.message);
      onError({ message: error.message, stage: 'generation' });
      throw error;
    }
  }
}

module.exports = PersonaStreamingService;
