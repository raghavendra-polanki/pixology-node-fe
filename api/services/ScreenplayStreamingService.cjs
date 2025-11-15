/**
 * ScreenplayStreamingService
 *
 * Extends ScreenplayGenerationService with streaming support
 * Provides progressive generation with real-time updates for:
 * - Screenplay text generation (streamed and parsed incrementally)
 */

const PromptManager = require('./PromptManager.cjs');
const ScreenplayGenerationService = require('./ScreenplayGenerationService.cjs');

class ScreenplayStreamingService {
  /**
   * Generate screenplay with progressive streaming
   *
   * @param {string} projectId - Project ID
   * @param {object} input - Generation input (same as ScreenplayGenerationService)
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @param {object} callbacks - Event callbacks for streaming
   * @returns {Promise<object>} { screenplay, adaptor, model }
   */
  static async generateScreenplayProgressive(
    projectId,
    input,
    db,
    AIAdaptorResolver,
    callbacks = {}
  ) {
    const {
      onScreenplayEntryParsed = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    try {
      const {
        storyboardScenes = [],
        videoDuration = '30s',
        selectedPersonaName = 'Character',
      } = input;

      if (!Array.isArray(storyboardScenes) || storyboardScenes.length === 0) {
        throw new Error('storyboardScenes is required and must be a non-empty array');
      }

      const numberOfEntries = storyboardScenes.length;

      console.log(
        `[ScreenplayStreamingService] Starting progressive generation for ${numberOfEntries} screenplay entries`
      );

      onProgress({ stage: 'init', message: 'Preparing screenplay framework...', progress: 0 });

      // ========================================
      // STEP 1: Resolve Text Adaptor & Get Prompt
      // ========================================

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_5_screenplay',
        'textGeneration',
        db
      );

      console.log(
        `[ScreenplayStreamingService] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`
      );

      const textPrompt = await PromptManager.getPromptByCapability(
        'stage_5_screenplay',
        'textGeneration',
        projectId,
        db
      );

      // Build prompt variables
      const scenesDescription = storyboardScenes
        .map((scene, index) => {
          return `Scene ${index + 1}: ${scene.title || ''}
Description: ${scene.description || ''}
Location: ${scene.location || ''}
Persona: ${scene.persona || ''}
Product: ${scene.product || ''}
Camera Work: ${scene.cameraWork || ''}`;
        })
        .join('\n\n');

      const variables = {
        storyboardScenes: scenesDescription,
        videoDuration,
        selectedPersonaName,
      };

      const resolvedPrompt = PromptManager.resolvePrompt(textPrompt, variables);

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // ========================================
      // STEP 2: Stream Screenplay Text Generation
      // ========================================

      onProgress({ stage: 'text', message: 'Writing cinematic sequences...', progress: 10 });

      const screenplay = [];
      let screenplayBuffer = '';
      let inArray = false;
      let braceDepth = 0;
      let entryCount = 0;

      // Incremental JSON parser for streaming
      const parseAndEmitEntries = (text) => {
        screenplayBuffer += text;

        // Parse JSON array incrementally
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (char === '[') inArray = true;
          if (!inArray) continue;

          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;

          // When we close a complete screenplay entry at depth 0
          if (braceDepth === 0 && char === '}') {
            try {
              // Extract complete entry JSON using regex
              const jsonMatch = screenplayBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
              if (jsonMatch) {
                const entryJson = jsonMatch[0];
                const entry = JSON.parse(entryJson);

                // Validate entry structure
                if (ScreenplayGenerationService._isValidScreenplayEntry(entry)) {
                  screenplay.push(entry);
                  entryCount++;

                  const progress = 10 + Math.round((entryCount / numberOfEntries) * 80); // 10-90%

                  // Emit entry immediately to frontend
                  onScreenplayEntryParsed({
                    entryNumber: entryCount,
                    entry,
                    progress,
                  });
                }

                // Clear buffer after successful parse
                screenplayBuffer = screenplayBuffer.substring(
                  screenplayBuffer.indexOf(entryJson) + entryJson.length
                );
              }
            } catch (parseError) {
              // Continue buffering if parse fails (incomplete JSON)
              console.warn(
                `[ScreenplayStreamingService] Parse attempt failed, continuing...`
              );
            }
          }
        }
      };

      // Stream generation (if adaptor supports it)
      if (textAdaptor.adaptor.supportsStreaming()) {
        console.log('[ScreenplayStreamingService] Using streaming text generation');

        await textAdaptor.adaptor.generateTextStream(
          fullPrompt,
          { temperature: 0.6, maxTokens: 8000 },
          (chunk) => {
            if (chunk.type === 'chunk') {
              parseAndEmitEntries(chunk.text);
            }
          }
        );
      } else {
        console.log('[ScreenplayStreamingService] Falling back to non-streaming generation');

        // Fallback to non-streaming
        const result = await textAdaptor.adaptor.generateText(fullPrompt, {
          temperature: 0.6,
          maxTokens: 8000,
        });

        const parsedEntries = ScreenplayGenerationService._parseScreenplayFromResponse(result.text);

        parsedEntries.forEach((entry, idx) => {
          if (ScreenplayGenerationService._isValidScreenplayEntry(entry)) {
            screenplay.push(entry);
            const progress = 10 + Math.round(((idx + 1) / numberOfEntries) * 80);

            onScreenplayEntryParsed({
              entryNumber: idx + 1,
              entry,
              progress,
            });
          }
        });
      }

      if (screenplay.length === 0) {
        throw new Error('No valid screenplay entries generated');
      }

      console.log(`[ScreenplayStreamingService] Generated ${screenplay.length} screenplay entries`);

      onProgress({
        stage: 'text-complete',
        message: 'Screenplay crafted successfully...',
        progress: 90,
      });

      // ========================================
      // STEP 3: Save to Firestore
      // ========================================

      onProgress({ stage: 'saving', message: 'Finalizing screenplay...', progress: 95 });

      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedScreenplay: {
            screenplay,
            adaptor: textAdaptor.adaptorId,
            model: textAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          },
        });

      console.log(`[ScreenplayStreamingService] Screenplay saved to Firestore`);

      // ========================================
      // STEP 4: Complete
      // ========================================

      onComplete({
        screenplay,
        totalCount: screenplay.length,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
        progress: 100,
      });

      return {
        screenplay,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
      };
    } catch (error) {
      console.error('[ScreenplayStreamingService] Error:', error.message);
      onError({ message: error.message, stage: 'generation' });
      throw error;
    }
  }
}

module.exports = ScreenplayStreamingService;
