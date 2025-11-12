/**
 * VideoGenerationServiceV2
 *
 * Generates videos using legacy video generation service
 * Supports per-scene video generation for screenplay entries
 */

const VideoGenerationService = require('./videoGenerationService');

class VideoGenerationServiceV2 {
  /**
   * Generate videos for screenplay scenes
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { screenplayScenes, sceneImages, videoDuration }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
   * @returns {Promise<object>} { videos, adaptor, model }
   */
  static async generateVideos(projectId, input, db, AIAdaptorResolver) {
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

      const videos = [];

      // Generate video for each scene
      for (let i = 0; i < screenplayScenes.length; i++) {
        try {
          const screenplayEntry = screenplayScenes[i];
          const sceneImage = sceneImages[i];

          console.log(`[VideoGen] Generating video ${i + 1}/${screenplayScenes.length}`);

          // For now, use legacy video generation service
          // The adaptor system for video generation will be implemented later
          const videoResult = await this.generateSingleVideo(
            projectId,
            screenplayEntry,
            null  // imageBase64 - will fetch from GCS URI if needed
          );

          videos.push({
            sceneNumber: screenplayEntry.sceneNumber || i + 1,
            videoUrl: videoResult.videoUrl,
            videoId: videoResult.videoId,
            duration: screenplayEntry.timeEnd || '8s',
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

      // Store in Firestore
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedVideos: {
            videos,
            generatedAt: new Date().toISOString(),
          },
        });

      return {
        videos,
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
