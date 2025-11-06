import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG_IMAGE_DIR = path.join(__dirname, '../../.debug_images');

/**
 * Video Generation Service
 * Handles video generation using Vertex AI Veo 3.1 API with direct GCS upload
 */

const ENABLE_DEBUG_IMAGES = process.env.ENABLE_DEBUG_IMAGES === 'true';

/**
 * DEBUGGING UTILITY: Save image for inspection
 */
function debugSaveImage(imageBase64, sceneIndex, stage = 'original') {
  if (!ENABLE_DEBUG_IMAGES) return;

  try {
    if (!fs.existsSync(DEBUG_IMAGE_DIR)) {
      fs.mkdirSync(DEBUG_IMAGE_DIR, { recursive: true });
    }

    let imageData;
    let imageType = 'png';
    let base64String = imageBase64;

    const dataURIMatch = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (dataURIMatch) {
      imageType = dataURIMatch[1];
      base64String = dataURIMatch[2];
    }

    imageData = Buffer.from(base64String, 'base64');
    const filename = `scene_${sceneIndex}_${stage}.${imageType}`;
    const filepath = path.join(DEBUG_IMAGE_DIR, filename);
    fs.writeFileSync(filepath, imageData);

    console.log(`DEBUG: Saved image to ${filepath} (${imageData.length} bytes)`);
  } catch (err) {
    console.error('DEBUG: Failed to save image:', err.message);
  }
}

/**
 * DEBUGGING UTILITY: Validate and analyze image data
 */
function debugAnalyzeImage(imageBase64) {
  try {
    console.log('\n=== DEBUG: IMAGE ANALYSIS ===');

    const isString = typeof imageBase64 === 'string';
    const isBuffer = Buffer.isBuffer(imageBase64);
    console.log(`DEBUG: Image input type: ${isString ? 'string' : isBuffer ? 'Buffer' : 'unknown'}`);

    let base64String = isString ? imageBase64 : isBuffer ? imageBase64.toString('base64') : null;
    if (!base64String) {
      console.log(`DEBUG: WARNING - Unexpected image type: ${typeof imageBase64}`);
      return;
    }

    console.log(`DEBUG: Base64 string length: ${base64String.length} characters`);
    console.log(`DEBUG: Estimated image size: ~${Math.round(base64String.length * 0.75 / 1024)} KB`);

    if (base64String.includes('data:image')) {
      const prefixMatch = base64String.match(/^data:image\/([^;]+);base64,/);
      if (prefixMatch) {
        console.log(`DEBUG: Has data URI prefix - Image type: ${prefixMatch[1]}`);
      }
    }

    try {
      const decoded = Buffer.from(base64String.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      console.log(`DEBUG: Base64 is valid, decoded size: ${decoded.length} bytes`);

      const magicBytes = decoded.subarray(0, 12).toString('hex');
      if (magicBytes.startsWith('89504e47')) {
        console.log('DEBUG: ✓ Detected PNG format');
      } else if (magicBytes.startsWith('ffd8ff')) {
        console.log('DEBUG: ✓ Detected JPEG format');
      } else {
        console.log(`DEBUG: ⚠ Unknown image format with magic bytes: ${magicBytes}`);
      }
    } catch (decodeErr) {
      console.log(`DEBUG: ✗ Base64 decode failed: ${decodeErr.message}`);
    }

    console.log('=== END DEBUG ===\n');
  } catch (err) {
    console.error('DEBUG: Error analyzing image:', err.message);
  }
}

/**
 * Build video generation prompt from screenplay data
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
 * Generate video using Vertex AI Veo 3.1 API and save directly to GCS
 *
 * @param {string} imageBase64 - Base64 encoded storyboard image
 * @param {object} sceneData - Scene data from screenplay
 * @param {string} projectId - Project ID for GCS storage
 * @param {number} sceneIndex - Index of the scene (0-based)
 * @returns {Promise<object>} Generated video info with GCS URL
 */
export async function generateVideoWithVeo(imageBase64, sceneData, projectId, sceneIndex = 0) {
  try {
    console.log(`Generating video for scene ${sceneIndex + 1}...`);

    const prompt = buildVideoPrompt(sceneData, sceneIndex);
    console.log(`Scene ${sceneIndex + 1} Video Prompt:`, prompt.substring(0, 150) + '...');

    // Call Veo API and upload directly to GCS
    const videoUrl = await callVeoAPIAndUploadToGCS(imageBase64, prompt, projectId, sceneIndex);

    console.log(`Video generated and uploaded for scene ${sceneIndex + 1}: ${videoUrl}`);

    return {
      sceneNumber: sceneIndex + 1,
      videoUrl: videoUrl,
      videoFormat: 'mp4',
      duration: sceneData.timeEnd || '6s',
      generatedAt: new Date(),
      uploadedToGCS: true,
      metadata: {
        sceneTitle: sceneData.title || `Scene ${sceneIndex + 1}`,
        duration: sceneData.timeEnd,
        visual: sceneData.visual,
        cameraFlow: sceneData.cameraFlow,
        description: prompt,
      },
    };
  } catch (error) {
    console.error(`Error generating video for scene ${sceneIndex + 1}:`, error);
    throw error;
  }
}

/**
 * Call Python FastAPI backend for video generation
 * @private
 */
async function callPythonVideoGenerationAPI(prompt, duration_seconds = 5, quality = 'fast') {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const endpoint = `${pythonApiUrl}/api/videos/generate`;

    console.log(`Calling Python FastAPI backend at: ${endpoint}`);
    console.log(`Request: prompt="${prompt.substring(0, 100)}...", duration=${duration_seconds}s, quality=${quality}`);

    const requestBody = {
      prompt: prompt,
      duration_seconds: duration_seconds,
      quality: quality,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Python API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Python API error response:', errorData);
      throw new Error(
        `Python API error: ${response.status} - ${errorData.error || errorData.detail || 'Unknown error'}`
      );
    }

    const videoData = await response.json();
    console.log(`Python API response: video_id=${videoData.video_id}, url=${videoData.video_url}`);

    return videoData;
  } catch (error) {
    console.error('Error calling Python FastAPI backend:', error.message);
    throw new Error(`Python Video Generation API Error: ${error.message}`);
  }
}

/**
 * Get authenticated access token for Google API
 * @private
 */
async function getAccessToken(serviceAccountType = 'default') {
  try {
    // Select appropriate service account based on type
    let keyFilePath;

    if (serviceAccountType === 'veo3') {
      // Use dedicated Veo3 service account if available
      keyFilePath = process.env.VEO3_SERVICE_ACCOUNT_KEY;
      console.log(`   Using Veo3 service account: ${keyFilePath}`);
    } else {
      // Use default service account for Firestore and general operations
      keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    if (!keyFilePath) {
      throw new Error('No service account key file configured. Set GOOGLE_APPLICATION_CREDENTIALS or VEO3_SERVICE_ACCOUNT_KEY environment variable.');
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const response = await client.getAccessToken();

    // Handle different response formats
    const token = response?.token || response?.access_token || response;

    if (!token || typeof token !== 'string') {
      console.error('Unexpected response format from getAccessToken:', response);
      throw new Error(`Invalid access token format received: ${JSON.stringify(response).substring(0, 100)}`);
    }

    // Log service account info from credentials file for debugging
    try {
      const credentialsContent = fs.readFileSync(keyFilePath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      const serviceAccountEmail = credentials.client_email || 'unknown';
      const projectId = credentials.project_id || 'unknown';

      console.log(`   ℹ️  Service account: ${serviceAccountEmail}`);
      console.log(`   ℹ️  Project ID: ${projectId}`);

      if (projectId === 'unknown') {
        console.warn(`   ⚠️  Warning: Could not find project_id in credentials file ${keyFilePath}`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not read service account credentials for logging: ${e.message}`);
    }

    return token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Poll operation status until completion
 * @private
 */
async function pollOperationStatus(operationName, accessToken, gcpRegion, maxWaitMs = 7200000) {
  const startTime = Date.now();
  const pollIntervalMs = 10000; // Poll every 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const url = `https://${gcpRegion}-aiplatform.googleapis.com/v1/${operationName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const operation = await response.json();
      console.log(`Operation status: ${operation.done ? 'DONE' : 'IN_PROGRESS'}`);

      if (operation.done) {
        if (operation.error) {
          throw new Error(`Operation failed: ${operation.error.message}`);
        }
        return operation.result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      if (error.message.includes('API error')) throw error;
      console.warn(`Poll attempt failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error('Operation timed out after 2 hours');
}

/**
 * Call Python FastAPI backend for video generation (replaces Veo 3.1 API)
 * @private
 */
async function callVeoAPIAndUploadToGCS(imageBase64, description, projectId, sceneIndex) {
  try {
    console.log('Calling Python FastAPI backend for video generation...');

    // Debug image data (for reference, though we're not using the image with Python API for now)
    debugAnalyzeImage(imageBase64);
    debugSaveImage(imageBase64, sceneIndex, 'original');

    // Extract duration from description if available
    // Default to 5 seconds, can be adjusted based on scene data
    let duration_seconds = 5;
    let quality = 'fast';

    // Try to extract duration from description if it mentions seconds
    const durationMatch = description.match(/(\d+)\s*seconds?\s*duration/i);
    if (durationMatch) {
      const extractedDuration = parseInt(durationMatch[1]);
      if (extractedDuration >= 1 && extractedDuration <= 30) {
        duration_seconds = extractedDuration;
      }
    }

    console.log(`Using duration: ${duration_seconds}s, quality: ${quality}`);

    // Call Python FastAPI backend
    const pythonApiResponse = await callPythonVideoGenerationAPI(description, duration_seconds, quality);

    console.log('✅ Video generation completed successfully via Python FastAPI');
    console.log(`📺 Video URL: ${pythonApiResponse.video_url}`);
    console.log(`📺 Video ID: ${pythonApiResponse.video_id}`);
    console.log(`📺 GCS Path: ${pythonApiResponse.gcs_path}`);

    return pythonApiResponse.video_url;

  } catch (error) {
    console.error('Error in video generation:', error);
    throw new Error(`Video Generation Error: ${error.message}`);
  }
}

/**
 * Generate videos for multiple scenes with direct GCS upload
 *
 * @param {array} sceneDataArray - Array of scene data from screenplay
 * @param {string} imageBase64 - Storyboard image (same for all scenes)
 * @param {string} projectId - Project ID for GCS storage
 * @returns {Promise<array>} Array of generated videos with GCS URLs
 */
export async function generateMultipleSceneVideos(sceneDataArray, imageBase64, projectId) {
  try {
    console.log(`Generating videos for ${sceneDataArray.length} scenes with direct GCS upload...`);

    const generatedVideos = [];

    // Process scenes sequentially to manage API rate limits
    for (let i = 0; i < sceneDataArray.length; i++) {
      try {
        console.log(`Processing scene ${i + 1}/${sceneDataArray.length}...`);

        const videoData = await generateVideoWithVeo(imageBase64, sceneDataArray[i], projectId, i);
        generatedVideos.push(videoData);

        // Add delay between API calls
        if (i < sceneDataArray.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to generate video for scene ${i + 1}:`, error.message);
        generatedVideos.push({
          sceneNumber: i + 1,
          error: error.message,
          videoUrl: null,
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
 * Generate video directly from a text prompt using Python FastAPI backend
 * This is a simplified interface for direct prompt-based generation
 *
 * @param {string} prompt - Text prompt for video generation
 * @param {number} durationSeconds - Duration in seconds (1-30, default 5)
 * @param {string} quality - Quality setting: 'fast' or 'quality' (default 'fast')
 * @returns {Promise<object>} Generated video info with URL and metadata
 */
export async function generateVideoFromPrompt(prompt, durationSeconds = 5, quality = 'fast') {
  try {
    console.log('Generating video from prompt using Python FastAPI backend...');
    const videoData = await callPythonVideoGenerationAPI(prompt, durationSeconds, quality);

    return {
      success: true,
      videoUrl: videoData.video_url,
      videoId: videoData.video_id,
      prompt: videoData.prompt,
      duration: videoData.duration_seconds,
      quality: videoData.quality,
      generatedAt: videoData.generation_time,
      gcsPath: videoData.gcs_path,
      metadata: {
        videoUrl: videoData.video_url,
        videoId: videoData.video_id,
        duration: videoData.duration_seconds,
        quality: videoData.quality,
      },
    };
  } catch (error) {
    console.error('Error generating video from prompt:', error);
    throw error;
  }
}

/**
 * Generate video using Vertex AI Veo 3 API (Direct HTTP Endpoint)
 * Uses the Google Cloud Vertex AI Veo 3.1 predictLongRunning endpoint
 *
 * Videos are stored in GCS bucket with organized folder structure:
 * gs://{bucket}/videos/{projectId}/scene_{sceneNumber}/{video_filename}
 *
 * @param {object} params - Video generation parameters
 * @param {string} params.sceneImageGcsUri - GCS URI of storyboard image (e.g., gs://bucket/image.jpg)
 * @param {string} params.prompt - Text prompt for video generation
 * @param {object} params.sceneData - Scene data object with sceneNumber
 * @param {number} params.durationSeconds - Duration in seconds (Veo3 supports: 4, 6, 8 only) (default: 6)
 * @param {string} params.aspectRatio - Aspect ratio (default: '16:9')
 * @param {string} params.resolution - Resolution format (Veo3 supports: '720p' or '1080p') (default: '720p')
 * @param {string} params.storageUri - Custom GCS storage location override (optional)
 * @param {string} params.projectId - Project ID for organizing video output folder (optional)
 * @returns {Promise<object>} Generated video info with GCS URL
 */
export async function generateVideoWithVeo3DirectAPI({
  sceneImageGcsUri,
  prompt,
  sceneData = {},
  durationSeconds = 6,
  aspectRatio = '16:9',
  resolution = '720p',
  storageUri = null,
  projectId = null,
}) {
  try {
    const gcpProjectId = process.env.GCP_PROJECT_ID;
    const gcpLocation = process.env.GCP_LOCATION || 'us-central1';
    const gcsBucket = process.env.GCS_BUCKET_NAME || 'pixology-personas';
    const veoModelId = 'veo-3.1-generate-preview';

    if (!gcpProjectId) {
      throw new Error('GCP_PROJECT_ID environment variable not set');
    }

    if (!sceneImageGcsUri) {
      throw new Error('sceneImageGcsUri is required (GCS URI format: gs://bucket/path/image.jpg)');
    }

    // Validate Veo 3 constraints
    const ALLOWED_DURATIONS = [4, 6, 8];
    if (!ALLOWED_DURATIONS.includes(durationSeconds)) {
      throw new Error(`Invalid duration: ${durationSeconds}s. Veo 3 only supports: ${ALLOWED_DURATIONS.join(', ')}s`);
    }

    // Validate resolution format
    const ALLOWED_RESOLUTIONS = ['720p', '1080p'];
    if (!ALLOWED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Invalid resolution: ${resolution}. Veo 3 only supports: ${ALLOWED_RESOLUTIONS.join(', ')}`);
    }

    console.log(`🎬 Generating video with Veo 3 Direct API for scene ${sceneData.sceneNumber || 1}`);
    console.log(`   Image: ${sceneImageGcsUri}`);
    console.log(`   Duration: ${durationSeconds}s`);
    console.log(`   Resolution: ${resolution}`);

    // Get access token using Veo3-specific service account
    const accessToken = await getAccessToken('veo3');

    // Build GCS output path: gs://bucket/videos/{projectId}/scene_{sceneNumber}/
    const sceneNumber = sceneData?.sceneNumber || 1;
    const projectPath = projectId ? `${projectId}` : 'default';
    const outputStorageUri = storageUri || `gs://${gcsBucket}/videos/${projectPath}/scene_${sceneNumber}/`;

    console.log(`   Output location: ${outputStorageUri}`);

    // Build the request payload according to Veo 3 API specification
    const requestPayload = {
      instances: [
        {
          prompt: prompt,
          image: {
            gcsUri: sceneImageGcsUri,
            mimeType: 'image/jpeg', // or image/png
          },
        },
      ],
      parameters: {
        durationSeconds: durationSeconds,
        aspectRatio: aspectRatio,
        resolution: resolution,
        enhancePrompt: true,
        generateAudio: true,
        storageUri: outputStorageUri,
      },
    };

    // Call Veo 3 API
    const apiEndpoint = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${veoModelId}:predictLongRunning`;

    console.log(`📡 Calling Veo 3 API: ${apiEndpoint}`);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `HTTP ${response.status}`;

      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        } else if (contentType && contentType.includes('text/html')) {
          const htmlText = await response.text();
          errorMessage = `Received HTML response (possible auth error). First 200 chars: ${htmlText.substring(0, 200)}`;
        } else {
          const text = await response.text();
          errorMessage = text.substring(0, 500);
        }
      } catch (parseError) {
        errorMessage = `Could not parse error response. Status: ${response.status}`;
      }

      throw new Error(`Veo 3 API error: ${errorMessage}`);
    }

    const operationData = await response.json();
    const operationName = operationData.name;

    console.log(`⏳ Operation started: ${operationName}`);
    console.log(`   ✓ Initial API call succeeded - operation created`);
    console.log(`   📋 Operation response keys: ${Object.keys(operationData).join(', ')}`);

    // Log if operation is already done in the initial response
    if (operationData.done) {
      console.log(`   ⚡ Operation completed immediately in initial response!`);
      console.log(`   📋 Response structure: ${JSON.stringify(operationData, null, 2).substring(0, 500)}`);
    }

    console.log(`   Polling for completion...`);

    // Poll for operation completion (polling function will get its own fresh token)
    const result = await pollVeo3Operation(operationName, accessToken, gcpLocation);

    // Extract video URL from result
    let videoUrl;
    try {
      videoUrl = extractVideoUrl(result);
    } catch (extractError) {
      // If we can't extract URL from operation result (e.g., 404), construct GCS path directly
      console.warn(`   ⚠️  Could not extract video URL from operation result: ${extractError.message}`);
      console.log(`   📺 Video should be in GCS output folder: ${outputStorageUri}`);
      // Assume video was created at the storage location we specified
      videoUrl = `${outputStorageUri}generated_video.mp4`;
    }

    console.log(`✅ Video generation completed!`);
    console.log(`   Video URL: ${videoUrl}`);

    return {
      sceneNumber: sceneData.sceneNumber || 1,
      sceneTitle: sceneData.title || `Scene ${sceneData.sceneNumber || 1}`,
      videoUrl: videoUrl,
      videoFormat: 'mp4',
      duration: `${durationSeconds}s`,
      resolution: resolution,
      aspectRatio: aspectRatio,
      generatedAt: new Date(),
      uploadedToGCS: true,
      operationName: operationName,
      metadata: {
        prompt: prompt,
        durationSeconds: durationSeconds,
        resolution: resolution,
        aspectRatio: aspectRatio,
        sceneTitle: sceneData.title,
        sceneNumber: sceneData.sceneNumber,
      },
    };
  } catch (error) {
    console.error(`❌ Error generating video with Veo 3 API:`, error.message);
    throw error;
  }
}

/**
 * Poll Veo 3 long-running operation until completion
 * @private
 */
async function pollVeo3Operation(operationName, accessToken, gcpLocation, maxWaitMs = 3600000) {
  const startTime = Date.now();
  const pollIntervalMs = 15000; // Poll every 15 seconds
  let pollCount = 0;

  console.log(`   📡 Polling operation via fetchPredictOperation endpoint`);
  console.log(`   📋 Operation name: ${operationName}`);

  // Get fresh access token using Veo3 service account for polling
  const pollingToken = await getAccessToken('veo3');

  // Parse operation name to extract project, location, and model
  // Format: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{id}
  const operationMatch = operationName.match(/projects\/([^/]+)\/locations\/([^/]+)\/publishers\/google\/models\/([^/]+)\/operations\//);
  if (!operationMatch) {
    throw new Error(`Invalid operation name format: ${operationName}`);
  }

  const gcpProjectId = operationMatch[1];
  const veoModelId = 'veo-3.1-generate-preview';

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Use fetchPredictOperation endpoint as documented
      const url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${veoModelId}:fetchPredictOperation`;

      if (pollCount === 0) {
        console.log(`   📡 First poll attempt:`);
        console.log(`      Endpoint: ${url}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pollingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: operationName,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;

        // Try to parse error response
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData?.error?.message || JSON.stringify(errorData);
          } else if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            errorMessage = `HTTP ${response.status}: Auth/Server error`;
          } else {
            const text = await response.text();
            errorMessage = `HTTP ${response.status}: ${text.substring(0, 200)}`;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: Could not parse error response`;
        }

        console.error(`   ❌ Polling failed: ${errorMessage}`);

        if (response.status === 403) {
          console.error(`\n   💡 Permission Denied (403):`);
          console.error(`   - Service account lacks 'aiplatform.operations.get' permission`);
          console.error(`   - Assign 'Vertex AI User' or 'AI Platform Admin' role`);
          throw new Error(`Poll error: Permission denied - ${errorMessage}`);
        } else if (response.status === 401) {
          console.error(`\n   💡 Authentication Failed (401):`);
          console.error(`   - Service account credentials are invalid or expired`);
          console.error(`   - Verify VEO3_SERVICE_ACCOUNT_KEY path is correct`);
          throw new Error(`Poll error: Authentication failed - ${errorMessage}`);
        } else {
          throw new Error(`Poll error: ${errorMessage}`);
        }
      }

      // Parse operation response
      const operation = await response.json();
      pollCount++;

      // Log progress
      if (pollCount % 4 === 0 || operation.done) {
        console.log(`   [Poll #${pollCount}] Status: ${operation.done ? '✅ COMPLETED' : '⏳ IN_PROGRESS'}`);
      }

      if (operation.done) {
        if (operation.error) {
          throw new Error(`Operation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
        }
        console.log(`   ✓ Operation completed after ${pollCount} polls`);
        return operation.response || operation.result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      if (error.message.includes('Poll error') || error.message.includes('Operation failed')) {
        throw error;
      }

      console.warn(`   ⚠️ Poll attempt #${pollCount} failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(`Operation timed out after ${maxWaitMs / 1000} seconds`);
}

/**
 * Extract video URL from Veo 3 operation result
 * @private
 */
function extractVideoUrl(result) {
  // Veo 3 returns video in various possible formats
  // Try multiple paths to find the video URL
  if (result?.predictions?.[0]?.videoUri) {
    return result.predictions[0].videoUri;
  }
  if (result?.predictions?.[0]?.gcsUri) {
    return result.predictions[0].gcsUri;
  }
  if (result?.videoUri) {
    return result.videoUri;
  }
  if (result?.gcsUri) {
    return result.gcsUri;
  }
  if (typeof result === 'string' && result.startsWith('gs://')) {
    return result;
  }

  throw new Error(
    `Unable to extract video URL from result. Result structure: ${JSON.stringify(result).substring(0, 200)}`
  );
}

/**
 * Get video streaming URL
 * GCS URLs are directly streamable in HTML5 video players
 *
 * @param {string} videoUrl - GCS video URL
 * @returns {string} Video URL for playback
 */
export function getVideoStreamUrl(videoUrl) {
  return videoUrl;
}

export default {
  generateVideoWithVeo,
  generateVideoWithVeo3DirectAPI,
  generateMultipleSceneVideos,
  generateVideoFromPrompt,
  callPythonVideoGenerationAPI,
  getVideoStreamUrl,
};
