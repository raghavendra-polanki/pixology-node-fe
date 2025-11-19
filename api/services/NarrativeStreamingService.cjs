/**
 * NarrativeStreamingService
 *
 * Extends NarrativeGenerationService with streaming support
 * Provides progressive generation with real-time updates for:
 * - Narrative text generation (streamed and parsed incrementally)
 */

const PromptManager = require('./PromptManager.cjs');
const NarrativeGenerationService = require('./NarrativeGenerationService.cjs');

class NarrativeStreamingService {
  /**
   * Generate narratives with progressive streaming
   *
   * @param {string} projectId - Project ID
   * @param {object} input - Generation input (same as NarrativeGenerationService)
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @param {object} callbacks - Event callbacks for streaming
   * @returns {Promise<object>} { narratives, adaptor, model }
   */
  static async generateNarrativesProgressive(
    projectId,
    input,
    db,
    AIAdaptorResolver,
    callbacks = {}
  ) {
    const {
      onNarrativeParsed = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    try {
      const {
        campaignDescription,
        productDescription,
        targetAudience,
        numberOfNarratives = 6,
        selectedPersonas = 'Unknown personas',
      } = input;

      console.log(
        `[NarrativeStreamingService] Starting progressive generation for ${numberOfNarratives} narratives`
      );

      onProgress({ stage: 'init', message: 'Gathering narrative inspiration...', progress: 0 });

      // ========================================
      // STEP 1: Resolve Text Adaptor & Get Prompt
      // ========================================

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_3_narratives',
        'textGeneration',
        db
      );

      console.log(
        `[NarrativeStreamingService] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`
      );

      const textPrompt = await PromptManager.getPromptByCapability(
        'stage_3_narratives',
        'textGeneration',
        projectId,
        db
      );

      // Build prompt variables
      const variables = {
        campaignDescription,
        productDescription,
        targetAudience,
        numberOfNarratives,
        selectedPersonas,
      };

      const resolvedPrompt = PromptManager.resolvePrompt(textPrompt, variables);

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // ========================================
      // STEP 2: Stream Narrative Text Generation
      // ========================================

      onProgress({ stage: 'text', message: 'Weaving compelling story arcs...', progress: 10 });

      const narratives = [];
      let narrativeBuffer = '';
      let inArray = false;
      let braceDepth = 0;
      let narrativeCount = 0;

      // Incremental JSON parser for streaming
      const parseAndEmitNarratives = (text) => {
        narrativeBuffer += text;

        // Parse JSON array incrementally
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (char === '[') inArray = true;
          if (!inArray) continue;

          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;

          // When we close a complete narrative object at depth 0
          if (braceDepth === 0 && char === '}') {
            try {
              // Extract complete narrative JSON using regex
              const jsonMatch = narrativeBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
              if (jsonMatch) {
                const narrativeJson = jsonMatch[0];
                const narrative = JSON.parse(narrativeJson);

                // Validate narrative structure
                if (NarrativeGenerationService._isValidNarrative(narrative)) {
                  narratives.push(narrative);
                  narrativeCount++;

                  const progress = 10 + Math.round((narrativeCount / numberOfNarratives) * 80); // 10-90%

                  // Emit narrative immediately to frontend
                  onNarrativeParsed({
                    narrativeNumber: narrativeCount,
                    narrative,
                    progress,
                  });
                }

                // Clear buffer after successful parse
                narrativeBuffer = narrativeBuffer.substring(
                  narrativeBuffer.indexOf(narrativeJson) + narrativeJson.length
                );
              }
            } catch (parseError) {
              // Continue buffering if parse fails (incomplete JSON)
              console.warn(
                `[NarrativeStreamingService] Parse attempt failed, continuing...`
              );
            }
          }
        }
      };

      // Stream generation (if adaptor supports it)
      if (textAdaptor.adaptor.supportsStreaming()) {
        console.log('[NarrativeStreamingService] Using streaming text generation');

        await textAdaptor.adaptor.generateTextStream(
          fullPrompt,
          { temperature: 0.8, maxTokens: 4000 },
          (chunk) => {
            if (chunk.type === 'chunk') {
              parseAndEmitNarratives(chunk.text);
            }
          }
        );
      } else {
        console.log('[NarrativeStreamingService] Falling back to non-streaming generation');

        // Fallback to non-streaming
        const result = await textAdaptor.adaptor.generateText(fullPrompt, {
          temperature: 0.8,
          maxTokens: 4000,
        });

        const parsedNarratives = NarrativeGenerationService._parseNarrativesFromResponse(result.text);

        parsedNarratives.forEach((narrative, idx) => {
          if (NarrativeGenerationService._isValidNarrative(narrative)) {
            narratives.push(narrative);
            const progress = 10 + Math.round(((idx + 1) / numberOfNarratives) * 80);

            onNarrativeParsed({
              narrativeNumber: idx + 1,
              narrative,
              progress,
            });
          }
        });
      }

      if (narratives.length === 0) {
        throw new Error('No valid narratives generated');
      }

      console.log(`[NarrativeStreamingService] Generated ${narratives.length} narratives`);

      onProgress({
        stage: 'text-complete',
        message: 'Story themes crafted successfully...',
        progress: 90,
      });

      // ========================================
      // STEP 3: Save to Firestore
      // ========================================

      onProgress({ stage: 'saving', message: 'Finalizing narrative collection...', progress: 95 });

      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedNarratives: {
            narratives,
            adaptor: textAdaptor.adaptorId,
            model: textAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          },
        });

      console.log(`[NarrativeStreamingService] Narratives saved to Firestore`);

      // ========================================
      // STEP 4: Complete
      // ========================================

      onComplete({
        narratives,
        totalCount: narratives.length,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
        progress: 100,
      });

      return {
        narratives,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
      };
    } catch (error) {
      console.error('[NarrativeStreamingService] Error:', error.message);
      onError({ message: error.message, stage: 'generation' });
      throw error;
    }
  }
}

module.exports = NarrativeStreamingService;
