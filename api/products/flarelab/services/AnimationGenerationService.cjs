/**
 * AnimationGenerationService - GameLab Stage 5 Animation Generation
 *
 * Two-step process:
 * 1. Analyze image with AI to generate animation screenplay/prompt
 * 2. Use the screenplay to generate 4-second animated video
 *
 * Follows the same patterns as StoryLab VideoGenerationService
 */

const PromptManager = require('../../../core/services/PromptManager.cjs');
const GCSService = require('../../../core/services/gcsService');

class AnimationGenerationService {
  /**
   * Step 1: Analyze image and generate animation screenplay
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Object>} Screenplay data
   */
  static async generateScreenplay(projectId, input, db, AIAdaptorResolver) {
    const {
      imageUrl,
      themeId,
      themeName,
      themeDescription,
      themeCategory,
      players = [],
      contextBrief = {},
    } = input;

    try {
      console.log(`[AnimationGen] Generating screenplay for theme: ${themeName}`);

      // Get the screenplay prompt template
      const promptTemplate = await PromptManager.getPromptByCapability(
        'stage_5_animation',
        'textGeneration',
        projectId,
        db
      );

      console.log('[AnimationGen] Loaded screenplay prompt template:', promptTemplate?.id);

      // Get text generation adaptor
      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_5_animation',
        'textGeneration',
        db,
        promptTemplate.modelConfig
      );

      console.log(`[AnimationGen] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

      // Build player info string
      const playerInfo = players.map((player, idx) => {
        const teamType = player.teamId === 'home' ? contextBrief.homeTeam?.name : contextBrief.awayTeam?.name;
        return `Player ${idx + 1}: ${player.name} (#${player.number}) - ${player.position || 'Unknown'} - ${teamType || 'Unknown Team'}`;
      }).join('\n') || 'No specific players featured';

      // Build prompt variables
      const variables = {
        sportType: contextBrief.sportType || 'Hockey',
        homeTeam: contextBrief.homeTeam?.name || 'Home Team',
        awayTeam: contextBrief.awayTeam?.name || 'Away Team',
        themeName: themeName || 'Sports Theme',
        themeDescription: themeDescription || '',
        contextPills: Array.isArray(contextBrief.contextPills)
          ? contextBrief.contextPills.join(', ')
          : contextBrief.contextPills || '',
        campaignGoal: contextBrief.campaignGoal || 'Social Hype',
        playerInfo: playerInfo,
      };

      // Resolve the prompt
      const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
      const fullPrompt = promptTemplate.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      console.log('[AnimationGen] Generating screenplay with image analysis...');

      // Send image URL for analysis along with the prompt
      const response = await textAdaptor.adaptor.generateText(fullPrompt, {
        referenceImageUrl: imageUrl,
        responseFormat: 'json',
      });

      // Parse the screenplay response
      const screenplay = this._parseScreenplayResponse(response.text || response);

      console.log('[AnimationGen] Screenplay generated successfully');

      return {
        themeId,
        themeName,
        imageUrl,
        screenplay,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('[AnimationGen] Screenplay generation error:', error);
      throw error;
    }
  }

  /**
   * Step 2: Generate video from screenplay
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters including screenplay
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Object>} Video data
   */
  static async generateVideo(projectId, input, db, AIAdaptorResolver) {
    const {
      imageUrl,
      themeId,
      themeName,
      screenplay,
      contextBrief = {},
    } = input;

    try {
      console.log(`[AnimationGen] Generating video for theme: ${themeName}`);

      // Get the video generation prompt template
      const promptTemplate = await PromptManager.getPromptByCapability(
        'stage_5_animation',
        'videoGeneration',
        projectId,
        db
      );

      console.log('[AnimationGen] Loaded video prompt template:', promptTemplate?.id);

      // Get video generation adaptor
      const videoAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_5_animation',
        'videoGeneration',
        db,
        promptTemplate.modelConfig
      );

      console.log(`[AnimationGen] Video adaptor: ${videoAdaptor.adaptorId}/${videoAdaptor.modelId}`);

      // Build prompt variables - NOTE: We intentionally exclude team names and player names
      // to avoid copyright/trademark violations with video generation AI
      const variables = {
        videoGenerationPrompt: screenplay.videoGenerationPrompt || '',
        sportType: contextBrief.sportType || 'Hockey',
        campaignGoal: contextBrief.campaignGoal || 'Social Hype',
      };

      // Log screenplay for debugging
      console.log('[AnimationGen] ===== SCREENPLAY DEBUG =====');
      console.log('[AnimationGen] Screenplay videoGenerationPrompt:', screenplay.videoGenerationPrompt);
      console.log('[AnimationGen] Screenplay full:', JSON.stringify(screenplay, null, 2));
      console.log('[AnimationGen] Variables:', JSON.stringify(variables, null, 2));

      // Resolve the prompt
      const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
      const fullPrompt = promptTemplate.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // Log the full prompt being sent to video generation
      console.log('[AnimationGen] ===== VIDEO GEN PROMPT DEBUG =====');
      console.log('[AnimationGen] Prompt template userPrompt:', promptTemplate.userPrompt);
      console.log('[AnimationGen] Resolved prompt:', resolvedPrompt.userPrompt);
      console.log('[AnimationGen] FULL PROMPT SENT TO VIDEO GEN:');
      console.log('---START PROMPT---');
      console.log(fullPrompt);
      console.log('---END PROMPT---');

      // Convert HTTPS URL to GCS URI if needed
      let imageGcsUri = imageUrl;
      if (imageUrl && imageUrl.startsWith('https://storage.googleapis.com/')) {
        // Convert: https://storage.googleapis.com/bucket/path -> gs://bucket/path
        const urlParts = imageUrl.replace('https://storage.googleapis.com/', '').split('/');
        const bucket = urlParts[0];
        const path = urlParts.slice(1).join('/');
        imageGcsUri = `gs://${bucket}/${path}`;
        console.log(`[AnimationGen] Converted URL to GCS URI: ${imageGcsUri}`);
      }

      console.log('[AnimationGen] Generating 4-second video...');
      console.log('[AnimationGen] Image GCS URI:', imageGcsUri);

      // Generate video
      const videoResult = await videoAdaptor.adaptor.generateVideo(fullPrompt, {
        imageGcsUri: imageGcsUri,
        durationSeconds: 4, // Fixed 4-second duration
        aspectRatio: '16:9',
        resolution: '720p',
        projectId: projectId,
        sceneNumber: 1,
      });

      console.log('[AnimationGen] Video generated:', videoResult.videoUrl);

      return {
        themeId,
        themeName,
        videoUrl: videoResult.videoUrl,
        videoFormat: videoResult.format || 'mp4',
        duration: '4s',
        resolution: videoResult.resolution || '720p',
        aspectRatio: videoResult.aspectRatio || '16:9',
        generatedAt: new Date().toISOString(),
        metadata: {
          model: videoResult.model,
          backend: videoResult.backend,
          operationName: videoResult.operationName,
          screenplay: screenplay,
        },
      };

    } catch (error) {
      console.error('[AnimationGen] Video generation error:', error);
      throw error;
    }
  }

  /**
   * Full animation generation: screenplay + video in one call
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @param {Object} callbacks - SSE callbacks
   * @returns {Promise<Object>} Animation data
   */
  static async generateAnimation(projectId, input, db, AIAdaptorResolver, callbacks = {}) {
    const {
      onProgress = () => {},
      onScreenplayComplete = () => {},
      onVideoComplete = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    const {
      imageUrl,
      themeId,
      themeName,
      themeDescription,
      themeCategory,
      players = [],
      contextBrief = {},
    } = input;

    try {
      // Step 1: Generate screenplay
      onProgress({
        stage: 'screenplay',
        message: 'Analyzing image and generating animation concept...',
        progress: 10,
        themeId,
        themeName,
      });

      const screenplayResult = await this.generateScreenplay(projectId, {
        imageUrl,
        themeId,
        themeName,
        themeDescription,
        themeCategory,
        players,
        contextBrief,
      }, db, AIAdaptorResolver);

      onProgress({
        stage: 'screenplay_complete',
        message: 'Animation concept ready, starting video generation...',
        progress: 40,
        themeId,
        themeName,
      });

      onScreenplayComplete({
        themeId,
        themeName,
        screenplay: screenplayResult.screenplay,
      });

      // Step 2: Generate video
      onProgress({
        stage: 'video',
        message: 'Generating 4-second animation video...',
        progress: 50,
        themeId,
        themeName,
      });

      const videoResult = await this.generateVideo(projectId, {
        imageUrl,
        themeId,
        themeName,
        screenplay: screenplayResult.screenplay,
        contextBrief,
      }, db, AIAdaptorResolver);

      onProgress({
        stage: 'complete',
        message: 'Animation generated successfully',
        progress: 100,
        themeId,
        themeName,
      });

      const result = {
        themeId,
        themeName,
        imageUrl,
        screenplay: screenplayResult.screenplay,
        video: videoResult,
        generatedAt: new Date().toISOString(),
      };

      onVideoComplete(result);
      onComplete(result);

      return result;

    } catch (error) {
      console.error('[AnimationGen] Animation generation failed:', error);
      onError({
        themeId,
        themeName,
        message: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate animations for multiple images
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input with array of images
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @param {Object} callbacks - SSE callbacks
   * @returns {Promise<Array>} Array of animation results
   */
  static async generateAnimationsForAll(projectId, input, db, AIAdaptorResolver, callbacks = {}) {
    const {
      onProgress = () => {},
      onAnimationComplete = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    const {
      images = [],
      contextBrief = {},
    } = input;

    const results = [];
    const totalImages = images.length;

    try {
      console.log(`[AnimationGen] Starting animation generation for ${totalImages} images`);

      onProgress({
        stage: 'init',
        message: 'Preparing animation generation...',
        progress: 0,
        current: 0,
        total: totalImages,
      });

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageIndex = i + 1;

        try {
          onProgress({
            stage: 'generating',
            message: `Processing ${imageIndex}/${totalImages}: ${image.themeName}`,
            progress: Math.round((i / totalImages) * 90),
            current: imageIndex,
            total: totalImages,
          });

          // Generate animation for this image
          const result = await this.generateAnimation(projectId, {
            imageUrl: image.url,
            themeId: image.themeId,
            themeName: image.themeName,
            themeDescription: image.themeDescription || '',
            themeCategory: image.themeCategory,
            players: image.players || [],
            contextBrief,
          }, db, AIAdaptorResolver, {
            onProgress: (data) => {
              // Forward progress with image context
              onProgress({
                ...data,
                current: imageIndex,
                total: totalImages,
                overallProgress: Math.round((i / totalImages) * 90 + (data.progress / 100) * (90 / totalImages)),
              });
            },
            onScreenplayComplete: () => {},
            onVideoComplete: () => {},
            onComplete: () => {},
            onError: () => {},
          });

          results.push(result);

          onAnimationComplete({
            imageIndex,
            totalImages,
            animation: result,
          });

          // Rate limiting between animations
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (imageError) {
          console.error(`[AnimationGen] Failed for ${image.themeName}:`, imageError);

          results.push({
            themeId: image.themeId,
            themeName: image.themeName,
            error: imageError.message,
            generatedAt: new Date().toISOString(),
          });

          onError({
            imageIndex,
            themeName: image.themeName,
            error: imageError.message,
          });
        }
      }

      // Save to database
      onProgress({
        stage: 'saving',
        message: 'Saving animations to project...',
        progress: 95,
        current: totalImages,
        total: totalImages,
      });

      const animationData = {
        animations: results,
        generatedAt: new Date(),
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length,
      };

      await db.collection('projects').doc(projectId).set({
        kineticActivation: animationData,
        updatedAt: new Date(),
      }, { merge: true });

      console.log('[AnimationGen] Saved', results.length, 'animations to database');

      onProgress({
        stage: 'complete',
        message: 'All animations generated',
        progress: 100,
        current: totalImages,
        total: totalImages,
      });

      onComplete({
        animations: results,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length,
      });

      return results;

    } catch (error) {
      console.error('[AnimationGen] Fatal error:', error);
      onError({ message: error.message, fatal: true });
      throw error;
    }
  }

  /**
   * Parse screenplay JSON response from AI
   * @private
   */
  static _parseScreenplayResponse(response) {
    try {
      // If already an object, return it
      if (typeof response === 'object' && response !== null) {
        return response;
      }

      // Try to parse as JSON directly
      const text = String(response);

      // Try direct parse first
      try {
        return JSON.parse(text);
      } catch (e) {
        // Try to extract from markdown code block
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1].trim());
        }

        // Try to find JSON object in text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          return JSON.parse(objectMatch[0]);
        }

        throw new Error('Could not parse screenplay response as JSON');
      }
    } catch (error) {
      console.error('[AnimationGen] Failed to parse screenplay:', error);
      // Return a default structure
      return {
        imageAnalysis: 'Unable to parse image analysis',
        animationConcept: 'Standard sports animation',
        screenplay: {
          second1: '0:00-0:01: Subtle ambient movement',
          second2: '0:01-0:02: Continued movement',
          second3: '0:02-0:03: Building intensity',
          second4: '0:03-0:04: Return to start',
        },
        videoGenerationPrompt: 'Create a subtle 4-second animation with gentle movement. No camera movement. No audio.',
      };
    }
  }
}

module.exports = AnimationGenerationService;
