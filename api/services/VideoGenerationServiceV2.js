/**
 * VideoGenerationServiceV2
 *
 * Refactored for adaptor-aware operations
 * Generates videos using configured AI adaptor with prompt templates
 */

const AIAdaptorResolver = require('./AIAdaptorResolver');
const PromptManager = require('./PromptManager');
const VideoGenerationService = require('./videoGenerationService');

class VideoGenerationServiceV2 {
  /**
   * Generate videos for screenplay scenes
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { screenplayScenes, sceneImages, videoDuration }
   * @param {object} db - Firestore database
   * @returns {Promise<object>} { videos, adaptor, model }
   */
  static async generateVideos(projectId, input, db) {
    try {
      const {
        screenplayScenes = [],
        sceneImages = [],
        videoDuration = '30s',
      } = input;

      if (!Array.isArray(screenplayScenes) || screenplayScenes.length === 0) {
        throw new Error('screenplayScenes is required and must be a non-empty array');
      }

      console.log(
        `[VideoGen] Generating ${screenplayScenes.length} videos for project ${projectId}`
      );

      // 1. Resolve video generation adaptor
      const videoAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_6_video',
        'videoGeneration',
        db
      );

      console.log(`[VideoGen] Video adaptor: ${videoAdaptor.adaptorId}/${videoAdaptor.modelId}`);

      // 2. Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(
        'stage_6_video',
        projectId,
        db
      );

      const videos = [];

      // 3. Generate video for each scene
      for (let i = 0; i < screenplayScenes.length; i++) {
        try {
          const screenplayEntry = screenplayScenes[i];
          const sceneImage = sceneImages[i];

          console.log(`[VideoGen] Generating video ${i + 1}/${screenplayScenes.length}`);

          // Build video generation prompt from screenplay
          const variables = {
            sceneNumber: screenplayEntry.sceneNumber || i + 1,
            visual: screenplayEntry.visual || '',
            cameraFlow: screenplayEntry.cameraFlow || '',
            script: screenplayEntry.script || '',
            backgroundMusic: screenplayEntry.backgroundMusic || '',
            duration: screenplayEntry.timeEnd || '8s',
          };

          const resolvedPrompt = PromptManager.resolvePrompt(
            promptTemplate.prompts.textGeneration,
            variables
          );

          const videoPrompt = resolvedPrompt.systemPrompt
            ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
            : resolvedPrompt.userPrompt;

          // Call adaptor video generation
          let videoResult;

          if (sceneImage && sceneImage.gcsUri) {
            // Use image-based video generation if image available
            videoResult = await videoAdaptor.adaptor.generateVideo(videoPrompt, {
              duration: screenplayEntry.timeEnd || '8s',
              imageUri: sceneImage.gcsUri,
              resolution: '720p',
            });
          } else {
            // Use text-based video generation
            videoResult = await videoAdaptor.adaptor.generateVideo(videoPrompt, {
              duration: screenplayEntry.timeEnd || '8s',
              resolution: '720p',
            });
          }

          videos.push({
            sceneNumber: screenplayEntry.sceneNumber || i + 1,
            videoUrl: videoResult.videoUrl,
            videoId: videoResult.videoId,
            duration: screenplayEntry.timeEnd || '8s',
            adaptor: videoAdaptor.adaptorId,
            model: videoAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          });

          // Rate limiting between video generations
          if (i < screenplayScenes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (videoError) {
          console.error(`[VideoGen] Video generation failed for scene ${i}: ${videoError.message}`);

          // Continue with next scene
          videos.push({
            sceneNumber: screenplayScenes[i].sceneNumber || i + 1,
            error: videoError.message,
            generatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Store in Firestore
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedVideos: {
            videos,
            adaptor: videoAdaptor.adaptorId,
            model: videoAdaptor.modelId,
            generatedAt: new Date().toISOString(),
          },
        });

      return {
        videos,
        adaptor: videoAdaptor.adaptorId,
        model: videoAdaptor.modelId,
      };
    } catch (error) {
      console.error('[VideoGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate single video using legacy service (backward compatibility)
   *
   * @param {string} projectId - Project ID
   * @param {object} sceneData - Scene data from screenplay
   * @param {string} imageBase64 - Base64 encoded scene image (optional)
   * @returns {Promise<object>} Generated video info
   */
  static async generateSingleVideo(projectId, sceneData, imageBase64 = null) {
    try {
      console.log(`[VideoGen] Generating single video for scene ${sceneData.sceneNumber || 1}`);

      // Use legacy video generation service
      // This provides backward compatibility with existing video generation
      const videoResult = await VideoGenerationService.generateVideoWithVeo(
        imageBase64,
        sceneData,
        projectId,
        (sceneData.sceneNumber || 1) - 1
      );

      return videoResult;
    } catch (error) {
      console.error('[VideoGen] Error generating single video:', error.message);
      throw error;
    }
  }
}

module.exports = VideoGenerationServiceV2;
