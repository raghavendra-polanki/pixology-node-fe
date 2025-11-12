/**
 * NarrativeGenerationServiceV2
 *
 * Refactored for adaptor-aware operations
 * Generates narrative themes using configured AI adaptor with prompt templates
 */

const AIAdaptorResolver = require('./AIAdaptorResolver');
const PromptManager = require('./PromptManager');

class NarrativeGenerationServiceV2 {
  /**
   * Generate narrative themes for a project
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { productDescription, targetAudience, numberOfNarratives, selectedPersonas }
   * @param {object} db - Firestore database
   * @returns {Promise<object>} { narratives, adaptor, model, usage }
   */
  static async generateNarratives(projectId, input, db) {
    try {
      const {
        productDescription,
        targetAudience,
        numberOfNarratives = 6,
        selectedPersonas = 'Unknown personas',
      } = input;

      console.log(
        `[NarrativeGen] Generating ${numberOfNarratives} narrative themes for project ${projectId}`
      );

      // 1. Resolve text generation adaptor
      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_3_narratives',
        'textGeneration',
        db
      );

      console.log(`[NarrativeGen] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

      // 2. Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(
        'stage_3_narratives',
        projectId,
        db
      );

      // 3. Build narrative generation prompt
      const variables = {
        productDescription,
        targetAudience,
        numberOfNarratives,
        selectedPersonas,
      };

      const resolvedPrompt = PromptManager.resolvePrompt(
        promptTemplate.prompts.textGeneration,
        variables
      );

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // 4. Generate narratives using adaptor
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.8,
        maxTokens: 4000,
      });

      // 5. Parse response
      let narratives = this._parseNarrativesFromResponse(generationResult.text);

      if (!Array.isArray(narratives)) {
        narratives = [narratives];
      }

      // 6. Validate narrative structure
      narratives = narratives.filter((n) => this._isValidNarrative(n));

      if (narratives.length === 0) {
        throw new Error('No valid narratives generated');
      }

      // 7. Store in Firestore
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

      return {
        narratives,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
        usage: generationResult.usage,
      };
    } catch (error) {
      console.error('[NarrativeGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Parse narratives from AI response
   *
   * @private
   */
  static _parseNarrativesFromResponse(text) {
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
          console.warn('Failed to parse narratives from markdown block');
        }
      }

      throw new Error('Failed to parse narratives from response');
    }
  }

  /**
   * Validate narrative structure
   *
   * @private
   */
  static _isValidNarrative(narrative) {
    return (
      narrative &&
      typeof narrative === 'object' &&
      narrative.id &&
      narrative.title &&
      narrative.description &&
      narrative.structure &&
      narrative.gradient &&
      narrative.patternColor &&
      narrative.ringColor
    );
  }
}

module.exports = NarrativeGenerationServiceV2;
