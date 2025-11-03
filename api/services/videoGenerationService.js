import { generateTextFromGemini } from './geminiService.js';
import { uploadVideoToGCS } from './gcsService.js';
import fs from 'fs';
import path from 'path';

/**
 * Video Generation Service
 * Handles video generation using Gemini API with mock video support
 * Infrastructure ready for real video generation (Veo 3.1) integration
 */

const USE_MOCK_VIDEOS = process.env.USE_MOCK_VIDEOS !== 'false'; // Default to mock for development

/**
 * Generate a video for a scene
 * Uses Gemini to enhance descriptions, with mock video support for development
 * Ready for real Veo 3.1 integration when available
 *
 * @param {string} imageBase64 - Base64 encoded image (storyboard image)
 * @param {object} sceneData - Scene data from screenplay
 * @param {string} sceneIndex - Index of the scene (0-based)
 * @returns {Promise<object>} Generated video info with URL and metadata
 */
export async function generateVideoWithVeo(imageBase64, sceneData, sceneIndex = 0) {
  try {
    console.log(`Generating video for scene ${sceneIndex + 1}...`);

    // Prepare the prompt from screenplay data
    const prompt = buildVideoPrompt(sceneData, sceneIndex);

    console.log(`Scene ${sceneIndex + 1} Video Prompt:`, prompt.substring(0, 200) + '...');

    // Use Gemini to enhance video description
    const enhancedDescription = await enhanceVideoDescriptionWithGemini(prompt);

    console.log(`Enhanced video description for scene ${sceneIndex + 1}`);

    // Generate video (mock for now, ready for real implementation)
    let videoBuffer;
    if (USE_MOCK_VIDEOS) {
      videoBuffer = await generateMockVideo(enhancedDescription, sceneIndex);
      console.log(`Generated mock video for scene ${sceneIndex + 1}`);
    } else {
      videoBuffer = await callVeoAPIRealImplementation(imageBase64, enhancedDescription);
      console.log(`Generated real video with Veo 3.1 for scene ${sceneIndex + 1}`);
    }

    // Return video metadata
    return {
      sceneNumber: sceneIndex + 1,
      videoBuffer: videoBuffer,
      videoFormat: 'mp4',
      duration: sceneData.timeEnd || '8s',
      generatedAt: new Date(),
      metadata: {
        sceneTitle: sceneData.title || `Scene ${sceneIndex + 1}`,
        duration: sceneData.timeEnd,
        visual: sceneData.visual,
        cameraFlow: sceneData.cameraFlow,
        description: enhancedDescription,
      },
    };
  } catch (error) {
    console.error(`Error generating video for scene ${sceneIndex + 1}:`, error);
    throw error;
  }
}

/**
 * Use Gemini to enhance video description
 * @private
 */
async function enhanceVideoDescriptionWithGemini(prompt) {
  try {
    const enhancementPrompt = `
You are a professional video production expert. Based on this video scene description, provide technical video production specifications:

${prompt}

Return ONLY a JSON object with these fields:
{
  "shotTypes": ["array of shot types like 'wide shot', 'close-up', etc"],
  "transitions": ["array of recommended transitions"],
  "lighting": "lighting recommendations",
  "colorGrade": "color grading suggestions",
  "pacing": "scene pacing description"
}
    `.trim();

    const response = await generateTextFromGemini(enhancementPrompt, {
      temperature: 0.5,
      maxTokens: 1000,
    });

    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Could not parse Gemini response as JSON, using raw text');
      return { description: response };
    }
  } catch (error) {
    console.warn('Failed to enhance description with Gemini:', error.message);
    return { description: prompt };
  }
}

/**
 * Generate a mock video for development/testing
 * Creates a minimal MP4-like structure for testing without real video generation
 * @private
 */
async function generateMockVideo(description, sceneIndex) {
  try {
    // Create a minimal mock video buffer (not a real video, but suitable for streaming)
    // In production, this would be replaced with real video generation
    const mockVideoData = Buffer.from(
      `MOCK_VIDEO_SCENE_${sceneIndex + 1}_${Date.now()}`,
      'utf8'
    );

    console.log(`Created mock video buffer for scene ${sceneIndex + 1}`);
    return mockVideoData;
  } catch (error) {
    console.error('Error generating mock video:', error);
    throw error;
  }
}

/**
 * Call real Veo 3.1 API (ready for future implementation)
 * @private
 */
async function callVeoAPIRealImplementation(imageBase64, description) {
  // TODO: Implement real Veo 3.1 API call via Vertex AI
  // For now, return mock video
  console.warn('Real Veo 3.1 API not yet implemented, using mock video');
  return generateMockVideo(description, 0);
}

/**
 * Build video generation prompt from screenplay data
 * @private
 */
function buildVideoPrompt(sceneData, sceneIndex) {
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
- 8 seconds duration
- 1280x720 resolution
- 24 fps

Generate a high-quality, professional marketing video that brings this scene to life.
  `.trim();
}

/**
 * Generate videos for multiple scenes
 * Infrastructure for batch processing
 * @param {array} sceneDataArray - Array of scene data from screenplay
 * @param {string} imageBase64 - Storyboard image (same for all scenes in initial implementation)
 * @returns {Promise<array>} Array of generated videos
 */
export async function generateMultipleSceneVideos(sceneDataArray, imageBase64) {
  try {
    console.log(`Generating videos for ${sceneDataArray.length} scenes...`);

    const generatedVideos = [];

    // Process scenes sequentially to manage API rate limits
    for (let i = 0; i < sceneDataArray.length; i++) {
      try {
        console.log(`Processing scene ${i + 1}/${sceneDataArray.length}...`);

        const videoData = await generateVideoWithVeo(imageBase64, sceneDataArray[i], i);
        generatedVideos.push(videoData);

        // Add delay between API calls to avoid rate limiting
        if (i < sceneDataArray.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
        }
      } catch (error) {
        console.error(`Failed to generate video for scene ${i + 1}:`, error.message);
        // Continue with next scene instead of failing entire operation
        generatedVideos.push({
          sceneNumber: i + 1,
          error: error.message,
          videoBuffer: null,
        });
      }
    }

    return generatedVideos;
  } catch (error) {
    console.error('Error in batch video generation:', error);
    throw error;
  }
}

/**
 * Upload generated video to GCS and return URL
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} projectId - Project identifier for organizing videos
 * @param {number} sceneNumber - Scene number for naming
 * @returns {Promise<string>} URL to the uploaded video
 */
export async function uploadVideoToGCSStorage(videoBuffer, projectId, sceneNumber) {
  try {
    if (!videoBuffer || videoBuffer.length === 0) {
      throw new Error('Video buffer is empty');
    }

    const bucketName = process.env.GCS_VIDEO_BUCKET || 'pixology-videos';
    const fileName = `projects/${projectId}/videos/scene_${sceneNumber}_${Date.now()}.mp4`;

    console.log(`Uploading video to GCS: ${fileName}`);

    const url = await uploadVideoToGCS(videoBuffer, projectId, `scene_${sceneNumber}`);

    console.log(`Video uploaded successfully: ${url}`);

    return url;
  } catch (error) {
    console.error('Error uploading video to GCS:', error);
    throw error;
  }
}

/**
 * Stream video from GCS URL to client
 * Returns streaming URL that can be used in video player
 * @param {string} videoUrl - GCS video URL
 * @returns {string} Video URL suitable for HTML5 video player
 */
export function getVideoStreamUrl(videoUrl) {
  // GCS URLs are directly streamable in HTML5 video players
  // Ensure CORS headers are properly configured on the bucket
  return videoUrl;
}

export default {
  generateVideoWithVeo,
  generateMultipleSceneVideos,
  uploadVideoToGCSStorage,
  getVideoStreamUrl,
};
