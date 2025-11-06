# Python FastAPI Backend Integration Guide

## Overview
The Node.js `videoGenerationService` has been successfully integrated with the Python FastAPI backend for video generation. This integration replaces the direct Veo 3.1 API calls with calls to the Python backend, which handles video generation using Vertex AI Gemini 2.0 Flash model.

## Integration Architecture

### Previous Architecture (Veo 3.1 Direct)
```
Node.js Service → Google Vertex AI Veo 3.1 API → GCS
```

### New Architecture (Python API)
```
Node.js Service → Python FastAPI Backend (http://localhost:8000) → Google Vertex AI Gemini → GCS
```

## Key Changes

### 1. Environment Configuration
Added `PYTHON_API_URL` to `.env`:
```
PYTHON_API_URL=http://localhost:8000
```

### 2. New Function: `callPythonVideoGenerationAPI()`
**Location:** `api/services/videoGenerationService.js:193-233`

This is the core integration function that:
- Accepts: `prompt`, `duration_seconds`, `quality`
- Calls: `POST /api/videos/generate` on Python backend
- Returns: Video metadata with `video_url`, `video_id`, `gcs_path`, etc.
- Handles: Error responses from Python API

**Usage:**
```javascript
const videoData = await callPythonVideoGenerationAPI(
  "A beautiful sunset over mountains",
  5,      // duration in seconds (1-30)
  "fast"  // quality: "fast" or "quality"
);
```

### 3. Updated Function: `callVeoAPIAndUploadToGCS()`
**Location:** `api/services/videoGenerationService.js:319-357`

Now routes to Python FastAPI instead of calling Veo directly:
- Extracts duration from scene description
- Calls Python API via `callPythonVideoGenerationAPI()`
- Returns video URL (backwards compatible with existing code)

### 4. New Export: `generateVideoFromPrompt()`
**Location:** `api/services/videoGenerationService.js:411-436`

Simplified interface for direct prompt-based generation:
```javascript
const result = await generateVideoFromPrompt(
  "A product demo showing features",
  10,     // duration
  "quality"
);

// Returns:
// {
//   success: true,
//   videoUrl: "https://storage.googleapis.com/...",
//   videoId: "abc-123-def-456",
//   prompt: "A product demo showing features",
//   duration: 10,
//   quality: "quality",
//   generatedAt: "2024-11-04T...",
//   gcsPath: "generated-videos/video_...",
//   metadata: {...}
// }
```

## Integration Points

### ActionExecutor.js
The primary integration point where `generateVideoWithVeo()` is called:
```javascript
const videoData = await generateVideoWithVeo(
  imageBase64,        // Storyboard image (for reference)
  combinedSceneData,  // Scene data (used to build prompt)
  projectId,          // Project identifier
  sceneIndex          // Scene number
);
```

The function now:
1. Builds a text prompt from `combinedSceneData` using `buildVideoPrompt()`
2. Extracts duration from the prompt
3. Calls the Python FastAPI backend
4. Returns the video URL in the same format as before

## Testing the Integration

### Prerequisites
1. **Python FastAPI backend running:**
   ```bash
   cd /Users/raghav/Workspace/pixology-workspace/pixology-fastapi-be
   python main.py
   # API should be running on http://localhost:8000
   ```

2. **Node.js server running:**
   ```bash
   npm run dev
   # Server on http://localhost:3000
   ```

3. **Environment variables set in `.env`:**
   - `PYTHON_API_URL=http://localhost:8000`
   - All existing Google Cloud credentials

### Test Scenarios

#### 1. Direct Prompt-Based Generation (Simplest Test)
**Test the new `generateVideoFromPrompt()` function:**

```javascript
// In your test or REPL:
import { generateVideoFromPrompt } from './api/services/videoGenerationService.js';

try {
  const result = await generateVideoFromPrompt(
    "A beautiful sunset over mountains with birds flying",
    5,
    "fast"
  );
  console.log("✅ Success!", result.videoUrl);
} catch (error) {
  console.error("❌ Error:", error.message);
}
```

#### 2. Scene-Based Generation (Via ActionExecutor)
**Test the updated `generateVideoWithVeo()` function:**

```javascript
import { generateVideoWithVeo } from './api/services/videoGenerationService.js';

const testInput = {
  imageBase64: "data:image/png;base64,...", // Your image
  sceneData: {
    title: "Opening Scene",
    description: "A professional office setting",
    visual: "Modern, minimalist office",
    cameraFlow: "Slow pan across desk",
    script: "Welcome to our product",
    backgroundMusic: "Upbeat background music",
    timeEnd: "8s"
  },
  projectId: "test-project",
  sceneIndex: 0
};

try {
  const videoUrl = await generateVideoWithVeo(
    testInput.imageBase64,
    testInput.sceneData,
    testInput.projectId,
    testInput.sceneIndex
  );
  console.log("✅ Video generated:", videoUrl);
} catch (error) {
  console.error("❌ Error:", error.message);
}
```

#### 3. Integration Test via Recipe Execution
**Test the full flow through ActionExecutor:**

Use the existing recipe execution system with a video generation node. The integration is transparent - no changes needed to existing recipes.

### Debugging

#### Enable Debug Logging
```bash
# In your Node.js environment
NODE_DEBUG=* npm run dev
```

#### Check Python API Logs
```bash
# In Python terminal, you'll see:
# - Request details
# - Model responses
# - GCS upload confirmations
```

#### Verify API Connectivity
```bash
# From Node.js server:
curl http://localhost:8000/api/videos/health

# Expected response:
# {"status": "healthy", "service": "video-generation-api"}
```

## API Response Mapping

### Python FastAPI Response
```json
{
  "success": true,
  "video_url": "https://storage.googleapis.com/pixology-personas/generated-videos/video_20240101_120000_abc123.mp4",
  "video_id": "abc-123-def-456",
  "prompt": "Create a high-quality video...",
  "duration_seconds": 5,
  "quality": "fast",
  "generation_time": "2024-01-01T12:00:00",
  "gcs_path": "generated-videos/video_20240101_120000_abc123.mp4"
}
```

### Node.js Internal Format
```javascript
{
  videoUrl: "https://storage.googleapis.com/...",
  videoId: "abc-123-def-456",
  // ... other metadata
}
```

The integration handles the mapping automatically.

## Error Handling

### Python API Errors
If the Python API returns an error:
```
Error: Python API error: 400 - Invalid request
Error: Python API error: 500 - Server error during video generation
```

### Connection Errors
If Python backend is not running:
```
Error: Python Video Generation API Error: fetch failed (Connection refused)
```

**Solution:** Ensure Python backend is running on the configured URL.

### Prompt Validation
Python API validates:
- Prompt length: 10-2000 characters
- Duration: 1-30 seconds
- Quality: 'fast' or 'quality'

## Performance Characteristics

- **Fast Mode:** ~30-60 seconds for video generation
- **Quality Mode:** ~2-5 minutes for video generation
- **Default Duration:** 5 seconds
- **Max Duration:** 30 seconds

## Next Steps

1. ✅ Integration implemented
2. ✅ Environment configured
3. **TODO:** Run integration tests in your environment
4. **TODO:** Monitor performance and GCS storage
5. **TODO:** Iterate on prompt quality as needed

## Backwards Compatibility

All changes are backwards compatible:
- Existing `generateVideoWithVeo()` function signature unchanged
- Existing `generateMultipleSceneVideos()` works as before
- ActionExecutor integration is transparent
- No breaking changes to existing recipe system

## Notes for Evolution

The Python FastAPI backend is designed to evolve:
- New video generation models can be added
- Additional parameters (aspect ratio, style, etc.) can be added
- The Node.js integration will adapt automatically
- Currently uses: Vertex AI Gemini 2.0 Flash

## Support & Debugging

- **Check Python backend .env:** `/pixology-fastapi-be/.env`
- **Python logs:** Check terminal running `python main.py`
- **Node logs:** Check terminal running `npm run dev`
- **GCS verification:** Check `https://console.cloud.google.com/storage` for videos in `pixology-personas/generated-videos/`
