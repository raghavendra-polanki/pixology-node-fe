/**
 * ThemeStreamingService - Handles progressive theme generation for GameLab Stage 2
 *
 * Follows the same architecture as StoryLab's StoryboardStreamingService:
 * 1. Generate theme text with AI (titles + descriptions)
 * 2. Progressively generate images for each theme
 * 3. Stream results back via SSE callbacks
 */

const PromptManager = require('../../../core/services/PromptManager.cjs');
const GCSService = require('../../../core/services/gcsService');

class ThemeStreamingService {
  /**
   * Generate themes progressively with streaming updates
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters from Stage 1
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @param {Object} callbacks - SSE callbacks { onThemeParsed, onImageGenerated, onProgress, onComplete, onError }
   * @returns {Promise<Object>} Generated themes
   */
  static async generateThemesProgressive(
    projectId,
    input,
    db,
    AIAdaptorResolver,
    callbacks = {}
  ) {
    const {
      onThemeParsed = () => {},
      onImageGenerated = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    try {
      const {
        sportType,
        homeTeam,
        awayTeam,
        contextPills = [],
        campaignGoal,
        numberOfThemes = 6,
      } = input;

      // ==========================================
      // STEP 1: RESOLVE TEXT ADAPTOR & GET PROMPT
      // ==========================================
      onProgress({
        stage: 'init',
        message: 'Preparing theme generation...',
        progress: 5,
      });

      const textPrompt = await PromptManager.getPromptByCapability(
        'stage_2_themes',
        'textGeneration',
        projectId,
        db
      );

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_themes',
        'textGeneration',
        db,
        textPrompt.modelConfig
      );

      // ==========================================
      // STEP 2: GENERATE THEME TEXT
      // ==========================================
      onProgress({
        stage: 'text',
        message: 'Creating broadcast-ready themes...',
        progress: 10,
      });

      // Build variables for prompt
      const contextPillsStr = Array.isArray(contextPills)
        ? contextPills.join(', ')
        : contextPills;

      const variables = {
        sportType: sportType || 'Hockey',
        homeTeam: homeTeam || 'Home Team',
        awayTeam: awayTeam || 'Away Team',
        contextPills: contextPillsStr || 'Playoff Intensity',
        campaignGoal: campaignGoal || 'Social Hype',
      };

      const resolvedPrompt = PromptManager.resolvePrompt(textPrompt, variables);
      const fullPrompt = textPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      console.log('[ThemeStreamingService] Generating theme text with prompt variables:', variables);

      // Generate themes text
      const themes = [];
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.8, // Higher temperature for creative variety
        maxTokens: 4000,
      });

      console.log('[ThemeStreamingService] Text generation complete, parsing JSON...');

      // Parse JSON response
      let parsedThemes = [];
      try {
        // Extract JSON from response (may have markdown formatting)
        const jsonMatch = generationResult.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedThemes = JSON.parse(jsonMatch[0]);
        } else {
          parsedThemes = JSON.parse(generationResult.text);
        }
      } catch (parseError) {
        console.error('[ThemeStreamingService] Failed to parse theme JSON:', parseError);
        throw new Error('Failed to parse theme response from AI');
      }

      // Validate and send each theme as parsed
      for (let i = 0; i < parsedThemes.length && i < numberOfThemes; i++) {
        const theme = parsedThemes[i];

        if (this._isValidTheme(theme)) {
          const themeWithId = {
            id: `theme_${Date.now()}_${i}`,
            ...theme,
            contextMetadata: {
              sportType,
              homeTeam,
              awayTeam,
              contextPills: Array.isArray(contextPills) ? contextPills : [contextPills],
              campaignGoal,
            },
          };

          themes.push(themeWithId);

          onThemeParsed({
            themeNumber: themes.length,
            theme: themeWithId,
            progress: 10 + Math.round((themes.length / numberOfThemes) * 30),
          });
        }
      }

      onProgress({
        stage: 'text-complete',
        message: `Generated ${themes.length} themes. Starting image generation...`,
        progress: 40,
      });

      // ==========================================
      // STEP 3: GENERATE IMAGES PROGRESSIVELY
      // ==========================================

      const imagePromptTemplate = await PromptManager.getPromptByCapability(
        'stage_2_themes',
        'imageGeneration',
        projectId,
        db
      );

      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_themes',
        'imageGeneration',
        db,
        imagePromptTemplate.modelConfig
      );

      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];

        onProgress({
          stage: 'image',
          message: `Rendering theme ${i + 1}/${themes.length}: "${theme.title}"...`,
          progress: 40 + Math.round((i / themes.length) * 55),
        });

        try {
          // Build image prompt variables
          const imageVariables = {
            sportType: sportType || 'Hockey',
            homeTeam: homeTeam || 'Home Team',
            awayTeam: awayTeam || 'Away Team',
            contextPills: contextPillsStr || 'Playoff Intensity',
            campaignGoal: campaignGoal || 'Social Hype',
            title: theme.title || '',
            description: theme.description || '',
            tags: Array.isArray(theme.tags) ? theme.tags.join(', ') : theme.tags || '',
          };

          const resolvedImagePrompt = PromptManager.resolvePrompt(
            imagePromptTemplate,
            imageVariables
          );

          const imagePrompt = imagePromptTemplate.systemPrompt
            ? `${resolvedImagePrompt.systemPrompt}\n\n${resolvedImagePrompt.userPrompt}`
            : resolvedImagePrompt.userPrompt;

          console.log(`[ThemeStreamingService] Generating image for theme ${i + 1}: "${theme.title}"`);

          // Generate image
          const imageResult = await imageAdaptor.adaptor.generateImage(imagePrompt, {
            size: '1024x1024',
            quality: 'hd',
          });

          // Handle data URL conversion to GCS
          let imageUrl = imageResult.imageUrl;
          if (imageUrl && imageUrl.startsWith('data:')) {
            console.log(`[ThemeStreamingService] Converting data URL to GCS for theme ${i + 1}`);
            const base64Data = imageUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            imageUrl = await GCSService.uploadImageToGCS(
              buffer,
              projectId,
              `theme_${i + 1}_${Date.now()}`
            );
          }

          themes[i].image = {
            url: imageUrl,
            metadata: {
              generatedAt: new Date(),
              adaptor: imageAdaptor.adaptorId,
              model: imageAdaptor.modelId,
            },
          };

          onImageGenerated({
            themeNumber: i + 1,
            imageUrl,
            themeId: theme.id,
            progress: 40 + Math.round(((i + 1) / themes.length) * 55),
          });

          console.log(`[ThemeStreamingService] Image generated for theme ${i + 1}`);
        } catch (imageError) {
          console.error(`[ThemeStreamingService] Failed to generate image for theme ${i + 1}:`, imageError);
          // Continue with next theme even if one fails
          themes[i].image = {
            url: null,
            error: imageError.message,
          };
        }
      }

      // ==========================================
      // STEP 4: SAVE TO DATABASE
      // ==========================================

      onProgress({
        stage: 'saving',
        message: 'Saving themes to project...',
        progress: 95,
      });

      const themeData = {
        themes,
        generatedAt: new Date(),
        model: textAdaptor.modelId,
        count: themes.length,
      };

      // Update project with generated themes
      await db.collection('gamelab_projects').doc(projectId).update({
        'conceptGallery.aiGeneratedThemes': themeData,
        updatedAt: new Date(),
      });

      console.log('[ThemeStreamingService] Themes saved to database');

      onComplete({
        themes,
        totalProgress: 100,
      });

      return { themes };
    } catch (error) {
      console.error('[ThemeStreamingService] Error during theme generation:', error);
      onError({
        message: error.message || 'Failed to generate themes',
        error,
      });
      throw error;
    }
  }

  /**
   * Validate theme structure
   */
  static _isValidTheme(theme) {
    return (
      theme &&
      typeof theme.title === 'string' &&
      theme.title.trim().length > 0 &&
      typeof theme.description === 'string' &&
      theme.description.trim().length > 0
    );
  }
}

module.exports = ThemeStreamingService;
