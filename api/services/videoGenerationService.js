import { generateTextFromGemini } from './geminiService.js';
import { uploadVideoToGCS } from './gcsService.js';
import { GoogleGenAI } from '@google/genai';

/**
 * Video Generation Service
 * Handles video generation using Gemini API with Veo 3.1 model
 */

const USE_MOCK_VIDEOS = process.env.USE_MOCK_VIDEOS !== 'false'; // Set to false to use real Veo API, true for mock videos in testing
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Generate a video for a scene
 * Uses Gemini to enhance descriptions and generate images, with Veo 3.1 for video generation
 * Generates image with Gemini 2.5 Flash, then passes to Veo 3.1 for video generation
 *
 * @param {object} sceneData - Scene data from screenplay
 * @param {string} sceneIndex - Index of the scene (0-based)
 * @returns {Promise<object>} Generated video info with URL and metadata
 */
export async function generateVideoWithVeo(sceneData, sceneIndex = 0) {
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
      videoBuffer = await callVeoAPIRealImplementation(enhancedDescription);
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
 * Creates a minimal valid MP4 file structure for testing without real video generation
 * @private
 */
async function generateMockVideo(_description, sceneIndex) {
  try {
    // Create a minimal but valid MP4 file structure
    // This includes: ftyp (file type), mdat (media data), and moov (movie metadata)

    // MP4 ftyp box (file type)
    const ftypBox = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x20]), // Size (32 bytes)
      Buffer.from('ftyp', 'ascii'),
      Buffer.from([0x69, 0x73, 0x6f, 0x6d]), // Major brand (isom)
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // Minor version
      Buffer.from('isomiso2avc1mp41', 'ascii') // Compatible brands
    ]);

    // MP4 mdat box (media data) - minimal placeholder
    const mdatContent = Buffer.from(
      `Video for scene ${sceneIndex + 1} generated at ${new Date().toISOString()}`
    );
    const mdatSize = mdatContent.length + 8;
    const mdatBox = Buffer.concat([
      Buffer.from([(mdatSize >> 24) & 0xFF, (mdatSize >> 16) & 0xFF, (mdatSize >> 8) & 0xFF, mdatSize & 0xFF]),
      Buffer.from('mdat', 'ascii'),
      mdatContent
    ]);

    // MP4 moov box (movie metadata) - minimal structure
    const moovContent = Buffer.from([
      // mvhd (movie header) - minimal
      0x00, 0x00, 0x00, 0x6C, // Size
      0x6D, 0x76, 0x68, 0x64, // 'mvhd'
      0x00, 0x00, 0x00, 0x00, // Version and flags
      0x00, 0x00, 0x00, 0x00, // Creation time
      0x00, 0x00, 0x00, 0x00, // Modification time
      0x00, 0x00, 0x03, 0xE8, // Timescale (1000)
      0x00, 0x00, 0x03, 0xE8, // Duration (1000ms = 1 second)
      0x00, 0x01, 0x00, 0x00, // Playback speed (1x)
      0x01, 0x00, 0x00, 0x00, // Volume
      ...Array(6).fill(0x00), // Reserved
      0x00, 0x01, 0x00, 0x00, // Matrix A
      0x00, 0x00, 0x00, 0x00, // Matrix B
      0x00, 0x00, 0x00, 0x00, // Matrix C
      0x00, 0x00, 0x00, 0x00, // Matrix D
      0x00, 0x01, 0x00, 0x00, // Matrix E
      0x00, 0x00, 0x00, 0x00, // Matrix F
      0x40, 0x00, 0x00, 0x00, // Matrix G
      0x00, 0x00, 0x00, 0x00, // Matrix H
      0x40, 0x00, 0x00, 0x00, // Matrix I
      0x00, 0x00, 0x00, 0x00, // Matrix J
      0x00, 0x00, 0x00, 0x02  // Next track ID
    ]);

    const moovSize = moovContent.length + 8;
    const moovBox = Buffer.concat([
      Buffer.from([(moovSize >> 24) & 0xFF, (moovSize >> 16) & 0xFF, (moovSize >> 8) & 0xFF, moovSize & 0xFF]),
      Buffer.from('moov', 'ascii'),
      moovContent
    ]);

    // Combine all boxes
    const mockVideoData = Buffer.concat([ftypBox, mdatBox, moovBox]);

    console.log(`Created mock MP4 video buffer for scene ${sceneIndex + 1} (${mockVideoData.length} bytes)`);
    return mockVideoData;
  } catch (error) {
    console.error('Error generating mock video:', error);
    throw error;
  }
}

/**
 * Call real Veo 3.1 API using Google GenAI
 * Generates video using Veo 3.1 model with image input
 * @private
 */
async function callVeoAPIRealImplementation(description) {
  try {
    console.log('Calling Veo 3.1 API via GoogleGenAI...');

    // Convert description to string (it may be an object from Gemini enhancement)
    let promptString;
    if (typeof description === 'string') {
      promptString = description;
    } else if (typeof description === 'object' && description !== null) {
      // If it's an object, create a text representation
      promptString = typeof description.description === 'string'
        ? description.description
        : JSON.stringify(description);
    } else {
      promptString = String(description);
    }

    // Step 1: Generate image with Gemini 2.5 Flash
    // Note: Using Gemini-generated images instead of storyboard for consistency with Veo 3.1 API
    console.log('Generating image with Gemini 2.5 Flash...');
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      prompt: promptString,
    });

    if (!imageResponse.generatedImages || !imageResponse.generatedImages[0]) {
      throw new Error('Failed to generate image with Gemini 2.5 Flash');
    }

    const imageForVeo = {
      imageBytes: imageResponse.generatedImages[0].image.imageBytes,
      mimeType: 'image/png',
    };
    console.log('Image generated successfully with Gemini 2.5 Flash');

    // Step 2: Generate video with Veo 3.1 using the image
    console.log('Starting Veo 3.1 video generation...');

    console.log('Prompt for Veo 3.1:', promptString.substring(0, 200) + '...');

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: promptString,
      image: imageForVeo,
    });

    console.log('Video generation operation started, polling for completion...');

    // Step 3: Poll the operation status until the video is ready
    let pollAttempts = 0;
    const maxPolls = 120; // Max 2 hours with 60 second intervals
    const pollInterval = 60000; // 60 seconds

    while (!operation.done && pollAttempts < maxPolls) {
      pollAttempts++;
      console.log(`Waiting for video generation to complete... (attempt ${pollAttempts}/${maxPolls})`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (!operation.done) {
      throw new Error(`Video generation timed out after ${maxPolls} attempts`);
    }

    console.log('Video generation completed successfully');

    // Step 4: Get the generated video and convert to buffer
    const generatedVideo = operation.response.generatedVideos[0].video;

    // Download the video file and convert to buffer
    const videoBuffer = await ai.files.download({
      file: generatedVideo,
    });

    console.log(`Received video buffer from Veo 3.1 API (${videoBuffer.length} bytes)`);
    return videoBuffer;

  } catch (error) {
    console.error('Error calling Veo 3.1 API:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: error.stack,
    });
    // Throw error instead of falling back - we need to see what's wrong with Veo 3.1
    throw new Error(`Veo 3.1 API Error: ${error.message}`);
  }
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

    console.log(`Uploading video to GCS for scene ${sceneNumber}...`);

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
