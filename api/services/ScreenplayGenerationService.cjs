/**
 * ScreenplayGenerationService
 *
 * Refactored for adaptor-aware operations
 * Generates screenplay with detailed timings from storyboard scenes
 */

const PromptManager = require('./PromptManager.cjs');

class ScreenplayGenerationService {
  /**
   * Generate screenplay from storyboard scenes
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { storyboardScenes, videoDuration, selectedPersonaName }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @returns {Promise<object>} { screenplay, adaptor, model, usage }
   */
  static async generateScreenplay(projectId, input, db, AIAdaptorResolver) {
    try {
      const {
        storyboardScenes = [],
        videoDuration = '30s',
        selectedPersonaName = 'Character',
      } = input;

      if (!Array.isArray(storyboardScenes) || storyboardScenes.length === 0) {
        throw new Error('storyboardScenes is required and must be a non-empty array');
      }

      console.log(
        `[ScreenplayGen] Generating screenplay for ${storyboardScenes.length} scenes for project ${projectId}`
      );

      // 1. Resolve text generation adaptor
      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_5_screenplay',
        'textGeneration',
        db
      );

      console.log(`[ScreenplayGen] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

      // 2. Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(
        'stage_5_screenplay',
        projectId,
        db
      );

      // 3. Build screenplay generation prompt
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

      const resolvedPrompt = PromptManager.resolvePrompt(
        promptTemplate.prompts.textGeneration,
        variables
      );

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // 4. Generate screenplay using adaptor
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.6,
        maxTokens: 8000,
      });

      // 5. Parse response
      let screenplay = this._parseScreenplayFromResponse(generationResult.text);

      if (!Array.isArray(screenplay)) {
        screenplay = [screenplay];
      }

      // 6. Validate screenplay structure
      screenplay = screenplay.filter((s) => this._isValidScreenplayEntry(s));

      if (screenplay.length === 0) {
        throw new Error('No valid screenplay entries generated');
      }

      // 7. Store in Firestore
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

      return {
        screenplay,
        adaptor: textAdaptor.adaptorId,
        model: textAdaptor.modelId,
        usage: generationResult.usage,
      };
    } catch (error) {
      console.error('[ScreenplayGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Parse screenplay from AI response
   *
   * @private
   */
  static _parseScreenplayFromResponse(text) {
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
          console.warn('Failed to parse screenplay from markdown block');
        }
      }

      throw new Error('Failed to parse screenplay from response');
    }
  }

  /**
   * Validate screenplay entry structure
   *
   * @private
   */
  static _isValidScreenplayEntry(entry) {
    return (
      entry &&
      typeof entry === 'object' &&
      entry.sceneNumber &&
      entry.timeStart &&
      entry.timeEnd &&
      entry.visual &&
      entry.cameraFlow &&
      entry.script &&
      entry.backgroundMusic &&
      entry.transition
    );
  }
}

module.exports = ScreenplayGenerationService;
