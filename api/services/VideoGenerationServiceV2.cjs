/**
 * VideoGenerationServiceV2
 *
 * Generates videos from screenplay scenes using AI Adaptor architecture
 * Follows adaptor pattern for consistency with other V2 services
 */

class VideoGenerationServiceV2 {
  /**
   * Generate videos for screenplay scenes
   * Combines screenplay and storyboard data to create videos
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { screenplayScenes, storyboardScenes, videoDuration, aspectRatio, resolution }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - AI Adaptor Resolver instance
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

      // Get video generation adaptor (Gemini for Veo API)
      const videoAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_6_video',
        'videoGeneration',
        db
      );

      const videos = [];

      // Generate video for each scene
      for (let i = 0; i < screenplayScenes.length; i++) {
          const screenplayEntry = screenplayScenes[i];
          const storyboardScene = storyboardScenes[i];

          // Use actual scene number from data, not loop index
          const actualSceneNumber = screenplayEntry?.sceneNumber || storyboardScene?.sceneNumber || i + 1;

        try {

          console.log(`[VideoGen] Generating video ${i + 1}/${screenplayScenes.length}`);
          console.log(`[VideoGen] Scene number: ${actualSceneNumber}`);

          // Validate required scene data
          if (!screenplayEntry) {
            throw new Error(`Missing screenplay entry for scene ${actualSceneNumber}`);
          }

          // Combine screenplay and storyboard data (following ActionExecutor pattern)
          const combinedSceneData = {
            title: screenplayEntry.title || storyboardScene?.title || `Scene ${actualSceneNumber}`,
            visual: storyboardScene?.description || screenplayEntry.visual || 'Professional video scene',
            cameraFlow: screenplayEntry.cameraFlow || storyboardScene?.cameraWork || 'Smooth camera movement',
            script: screenplayEntry.script || screenplayEntry.dialogue || 'Scene dialogue or narration',
            backgroundMusic: screenplayEntry.backgroundMusic || 'Background music playing',
            description: screenplayEntry.description || storyboardScene?.description || 'Scene description',
            duration: screenplayEntry.duration || screenplayEntry.timeEnd || videoDuration,
            aspectRatio,
            resolution,
          };

          // Extract storyboard scene image URL or GCS URI
          const sceneImageUrl = storyboardScene?.image?.url || storyboardScene?.image || null;
          const sceneImageGcsUri = storyboardScene?.image?.gcsUri || null;

          if (!sceneImageGcsUri && !sceneImageUrl) {
            throw new Error(`Missing scene image for scene ${actualSceneNumber}`);
          }

          console.log(`[VideoGen] Using storyboard image for scene ${actualSceneNumber}: ${sceneImageGcsUri || sceneImageUrl}`);

          // Build video prompt (pass actualSceneNumber - 1 to maintain 0-based index for prompt builder)
          const prompt = this._buildVideoPrompt(combinedSceneData, actualSceneNumber - 1);

          // Parse duration (remove 's' suffix if present)
          const durationSeconds = parseInt(combinedSceneData.duration.toString().replace('s', ''));

          // Generate video using AI adaptor
          const videoResult = await videoAdaptor.adaptor.generateVideo(prompt, {
            imageGcsUri: sceneImageGcsUri || sceneImageUrl,
            durationSeconds: durationSeconds || 6,
            aspectRatio: combinedSceneData.aspectRatio,
            resolution: combinedSceneData.resolution,
            projectId: projectId,
            sceneNumber: actualSceneNumber,
          });

          // Return structured video data
          videos.push({
            sceneNumber: actualSceneNumber,
            sceneTitle: combinedSceneData.title,
            videoUrl: videoResult.videoUrl,
            videoFormat: videoResult.format || 'mp4',
            duration: videoResult.duration,
            resolution: videoResult.resolution,
            aspectRatio: videoResult.aspectRatio,
            generatedAt: new Date().toISOString(),
            uploadedToGCS: true,
            metadata: {
              model: videoResult.model,
              backend: videoResult.backend,
              operationName: videoResult.operationName,
              prompt: prompt.substring(0, 200),
            },
          });

          // Rate limiting between video generations
          if (i < screenplayScenes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (videoError) {
          console.error(`[VideoGen] Video generation failed for scene ${actualSceneNumber}: ${videoError.message}`);

          // Continue with next scene, record error
          videos.push({
            sceneNumber: actualSceneNumber,
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

  /**
   * Build video generation prompt from scene data
   * @private
   */
  static _buildVideoPrompt(sceneData, sceneIndex) {
    const {
      title = `Scene ${sceneIndex + 1}`,
      visual = 'Professional video scene',
      cameraFlow = 'Smooth camera movement',
      script = 'Scene dialogue or narration',
      backgroundMusic = 'Background music playing',
      description = 'Scene description',
    } = sceneData;

    return `
Create a professional UGC-style marketing video for this scene:

**Scene Title:** ${title}
**Scene Number:** ${sceneIndex + 1}

**Visual Description:**
${visual}

**Camera Direction:**
${cameraFlow}

**Script/Dialogue/Narration:**
${script}

**Background Audio/Music:**
${backgroundMusic}

**Overall Scene Description:**
${description}

**Requirements:**
- Professional cinematography quality
- Natural, relatable UGC-style video
- Smooth camera movements as specified
- Authentic lighting and atmosphere
- Include the script/dialogue delivery
- Background music should enhance the scene
`.trim();
  }
}

module.exports = VideoGenerationServiceV2;
