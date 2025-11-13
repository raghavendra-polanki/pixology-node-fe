/**
 * VideoGenerationServiceV2
 *
 * Generates videos from screenplay scenes using Veo API
 * Follows ActionExecutor pattern for consistency
 */

const { generateVideoWithVeo } = require('./videoGenerationService');

class VideoGenerationServiceV2 {
  /**
   * Generate videos for screenplay scenes
   * Combines screenplay and storyboard data to create videos
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { screenplayScenes, storyboardScenes, videoDuration, aspectRatio, resolution }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance (not currently used)
   * @returns {Promise<object>} { videos }
   */
  static async generateVideos(projectId, input, db, AIAdaptorResolver) {
    try {
      const {
        screenplayScenes = [],
        storyboardScenes = [],
        videoDuration = '8s',
        aspectRatio = '16:9',
        resolution = '720p',
      } = input;

      // Validate required inputs
      if (!projectId) {
        throw new Error('Missing required input: projectId');
      }

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
          const storyboardScene = storyboardScenes[i];

          console.log(`[VideoGen] Generating video ${i + 1}/${screenplayScenes.length}`);

          // Validate required scene data
          if (!screenplayEntry) {
            throw new Error(`Missing screenplay entry for scene ${i + 1}`);
          }

          // Combine screenplay and storyboard data (following ActionExecutor pattern)
          const combinedSceneData = {
            title: screenplayEntry.title || storyboardScene?.title || `Scene ${i + 1}`,
            visual: storyboardScene?.description || screenplayEntry.visual || 'Professional video scene',
            cameraFlow: screenplayEntry.cameraFlow || storyboardScene?.cameraWork || 'Smooth camera movement',
            script: screenplayEntry.script || screenplayEntry.dialogue || 'Scene dialogue or narration',
            backgroundMusic: screenplayEntry.backgroundMusic || 'Background music playing',
            description: screenplayEntry.description || storyboardScene?.description || 'Scene description',
            duration: screenplayEntry.duration || screenplayEntry.timeEnd || videoDuration,
            aspectRatio,
            resolution,
          };

          // Extract storyboard scene image URL if available
          const sceneImageUrl = storyboardScene?.image?.url || storyboardScene?.image || null;
          if (sceneImageUrl) {
            console.log(`[VideoGen] Using storyboard image for scene ${i + 1}: ${sceneImageUrl}`);
          }

          // Generate video using legacy service (Veo API)
          const videoResult = await generateVideoWithVeo(
            sceneImageUrl,  // Pass storyboard scene image URL for image-to-video generation
            combinedSceneData,
            projectId,
            i
          );

          // Return structured video data
          videos.push({
            sceneNumber: screenplayEntry.sceneNumber || i + 1,
            sceneTitle: combinedSceneData.title,
            videoUrl: videoResult.videoUrl,
            videoId: videoResult.videoId,
            duration: combinedSceneData.duration,
            videoFormat: videoResult.videoFormat || 'mp4',
            generatedAt: new Date().toISOString(),
            uploadedToGCS: videoResult.uploadedToGCS,
            metadata: videoResult.metadata,
          });

          // Rate limiting between video generations
          if (i < screenplayScenes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (videoError) {
          console.error(`[VideoGen] Video generation failed for scene ${i + 1}: ${videoError.message}`);

          // Continue with next scene, record error
          videos.push({
            sceneNumber: screenplayScenes[i]?.sceneNumber || i + 1,
            error: videoError.message,
            generatedAt: new Date().toISOString(),
          });
        }
      }

      console.log(`[VideoGen] Video generation completed. Generated ${videos.length} videos.`);

      // Store in Firestore
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedVideos: {
            videos,
            totalCount: videos.length,
            successCount: videos.filter(v => !v.error).length,
            errorCount: videos.filter(v => v.error).length,
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
}

module.exports = VideoGenerationServiceV2;
