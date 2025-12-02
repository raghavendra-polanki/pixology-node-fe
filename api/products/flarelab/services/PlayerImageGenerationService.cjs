/**
 * PlayerImageGenerationService - Generates composite player images for Stage 4
 *
 * Takes theme images and player headshots, uses AI to generate a final
 * broadcast-ready image with actual players in the theme style.
 */

const PromptManager = require('../../../core/services/PromptManager.cjs');
const GCSService = require('../../../core/services/gcsService');

class PlayerImageGenerationService {
  /**
   * Generate images for all themes with their selected players
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @param {Object} callbacks - SSE callbacks for streaming updates
   * @returns {Promise<Array>} Generated images per theme
   */
  static async generateImagesForAllThemes(projectId, input, db, AIAdaptorResolver, callbacks = {}) {
    const {
      onProgress = () => {},
      onImageGenerated = () => {},
      onComplete = () => {},
      onError = () => {},
    } = callbacks;

    const {
      themePlayerMappings = {}, // From Stage 3: { themeId: { theme, players } }
      contextBrief = {},
    } = input;

    const generatedImages = [];
    const themes = Object.values(themePlayerMappings);
    const totalThemes = themes.length;

    try {
      console.log('[PlayerImageGeneration] Starting image generation for', totalThemes, 'themes');

      onProgress({
        stage: 'init',
        message: 'Preparing image generation...',
        progress: 5,
        current: 0,
        total: totalThemes,
      });

      // Get prompt template
      const promptTemplate = await PromptManager.getPromptByCapability(
        'stage_4_images',
        'imageGeneration',
        projectId,
        db
      );

      console.log('[PlayerImageGeneration] Loaded prompt template:', promptTemplate?.id);

      // Get image adaptor
      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_4_images',
        'imageGeneration',
        db,
        promptTemplate.modelConfig
      );

      // Process each theme
      for (let i = 0; i < themes.length; i++) {
        const themeMapping = themes[i];
        const themeIndex = i + 1;

        try {
          onProgress({
            stage: 'generating',
            message: `Generating image ${themeIndex}/${totalThemes}: ${themeMapping.themeName}`,
            progress: Math.round(10 + (i / totalThemes) * 80),
            current: themeIndex,
            total: totalThemes,
          });

          console.log(`[PlayerImageGeneration] Processing theme ${themeIndex}/${totalThemes}: ${themeMapping.themeName}`);

          // Build player info string
          const playerInfo = themeMapping.selectedPlayers
            .map((player, idx) => {
              const teamType = player.teamId === 'home' ? contextBrief.homeTeam?.name : contextBrief.awayTeam?.name;
              return `Player ${idx + 1}: ${player.name} (#${player.number}) - ${player.position} - ${teamType || 'Unknown Team'}`;
            })
            .join('\n');

          // Build prompt variables
          const variables = {
            themeName: themeMapping.themeName || '',
            themeDescription: themeMapping.themeDescription || '',
            themeCategory: themeMapping.themeCategory || '',
            playerInfo: playerInfo,
            playerCount: themeMapping.selectedPlayers.length.toString(),
            sportType: contextBrief.sportType || 'Hockey',
            homeTeam: contextBrief.homeTeam?.name || 'Home Team',
            awayTeam: contextBrief.awayTeam?.name || 'Away Team',
            contextPills: Array.isArray(contextBrief.contextPills)
              ? contextBrief.contextPills.join(', ')
              : contextBrief.contextPills || '',
            campaignGoal: contextBrief.campaignGoal || '',
          };

          // Resolve the prompt
          const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
          const fullPrompt = promptTemplate.systemPrompt
            ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
            : resolvedPrompt.userPrompt;

          // Collect reference image URLs (same pattern as StoryLab storyboard generation)
          const referenceImageUrls = [];

          // Add theme thumbnail as reference (for visual style)
          if (themeMapping.thumbnailUrl) {
            referenceImageUrls.push(themeMapping.thumbnailUrl);
            console.log(`[PlayerImageGeneration] Added theme image as reference: ${themeMapping.thumbnailUrl}`);
          }

          // Add player headshots as reference (for likeness preservation)
          for (const player of themeMapping.selectedPlayers) {
            if (player.photoUrl) {
              referenceImageUrls.push(player.photoUrl);
              console.log(`[PlayerImageGeneration] Added player headshot for ${player.name}: ${player.photoUrl}`);
            }
          }

          console.log(`[PlayerImageGeneration] Using ${referenceImageUrls.length} reference images`);

          // Generate the image with reference images (same pattern as StoryLab)
          console.log(`[PlayerImageGeneration] Generating image for: "${themeMapping.themeName}"`);

          const imageResult = await imageAdaptor.adaptor.generateImage(fullPrompt, {
            size: '1024x1024',
            quality: 'hd',
            referenceImageUrl: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          });

          // Handle data URL conversion to GCS (same as ThemeStreamingService)
          let imageUrl = imageResult.imageUrl;
          if (imageUrl && imageUrl.startsWith('data:')) {
            console.log(`[PlayerImageGeneration] Converting data URL to GCS`);
            const base64Data = imageUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `stage4_${themeMapping.themeId}_${Date.now()}`;
            imageUrl = await GCSService.uploadImageToGCS(buffer, projectId, filename);
          } else if (!imageUrl) {
            throw new Error('No image URL returned from generation');
          }

          console.log(`[PlayerImageGeneration] Image uploaded: ${imageUrl}`);

          // Build result
          const generatedImage = {
            id: `gen-${themeMapping.themeId}-${Date.now()}`,
            themeId: themeMapping.themeId,
            themeName: themeMapping.themeName,
            themeCategory: themeMapping.themeCategory,
            thumbnailUrl: themeMapping.thumbnailUrl,
            url: imageUrl,
            players: themeMapping.selectedPlayers,
            hasAlphaChannel: false,
            resolution: '1920x1080',
            generatedAt: new Date().toISOString(),
          };

          generatedImages.push(generatedImage);

          // Notify UI
          onImageGenerated({
            themeIndex,
            totalThemes,
            image: generatedImage,
          });

        } catch (themeError) {
          console.error(`[PlayerImageGeneration] Failed to generate for theme ${themeMapping.themeName}:`, themeError);

          // Add error placeholder
          generatedImages.push({
            id: `error-${themeMapping.themeId}`,
            themeId: themeMapping.themeId,
            themeName: themeMapping.themeName,
            error: themeError.message,
            generatedAt: new Date().toISOString(),
          });

          onError({
            themeIndex,
            themeName: themeMapping.themeName,
            error: themeError.message,
          });
        }
      }

      // ==========================================
      // STEP: SAVE TO DATABASE (same pattern as ThemeStreamingService)
      // ==========================================

      onProgress({
        stage: 'saving',
        message: 'Saving generated images to project...',
        progress: 95,
        current: totalThemes,
        total: totalThemes,
      });

      try {
        // Helper to remove undefined values (Firestore doesn't allow undefined)
        const removeUndefined = (obj) => {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = value;
            }
          }
          return cleaned;
        };

        // Optimize storage - only save essential fields (not full player objects)
        const optimizedImages = generatedImages.map(img => removeUndefined({
          id: img.id,
          themeId: img.themeId,
          themeName: img.themeName,
          themeCategory: img.themeCategory,
          thumbnailUrl: img.thumbnailUrl,
          url: img.url,
          players: img.players?.map(p => removeUndefined({
            id: p.id,
            name: p.name,
            number: p.number,
          })) || [],
          hasAlphaChannel: img.hasAlphaChannel,
          resolution: img.resolution,
          generatedAt: img.generatedAt,
          error: img.error,
        }));

        const highFidelityCaptureData = {
          generatedImages: optimizedImages,
          generatedAt: new Date(),
          successCount: generatedImages.filter(img => !img.error).length,
          errorCount: generatedImages.filter(img => img.error).length,
        };

        // Save to Firestore (same pattern as ThemeStreamingService)
        await db.collection('projects').doc(projectId).set({
          highFidelityCapture: highFidelityCaptureData,
          updatedAt: new Date(),
        }, { merge: true });

        console.log('[PlayerImageGeneration] Saved', optimizedImages.length, 'images to database');
      } catch (saveError) {
        console.error('[PlayerImageGeneration] Failed to save to database:', saveError);
        // Continue even if save fails - images are still in GCS
      }

      onProgress({
        stage: 'complete',
        message: 'All images generated and saved',
        progress: 100,
        current: totalThemes,
        total: totalThemes,
      });

      onComplete({
        generatedImages,
        successCount: generatedImages.filter(img => !img.error).length,
        errorCount: generatedImages.filter(img => img.error).length,
      });

      return generatedImages;

    } catch (error) {
      console.error('[PlayerImageGeneration] Fatal error:', error);
      onError({ message: error.message, fatal: true });
      throw error;
    }
  }
}

module.exports = PlayerImageGenerationService;
