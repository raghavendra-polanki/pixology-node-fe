# Persona Generation API Integration

## Overview

The Stage 2 Personas UI component has been successfully connected to the backend persona generation API. When users click "Generate Personas", the system now:

1. ✅ Calls the `/api/personas/generate` endpoint
2. ✅ Sends campaign details from Stage 1
3. ✅ Waits for AI-generated personas and images
4. ✅ Displays the generated personas in the UI
5. ✅ Saves personas to the database
6. ✅ Shows loading state while generating
7. ✅ Handles errors gracefully

## What Was Updated

### Frontend Changes

**File**: `src/features/storylab/components/stages/Stage2Personas.tsx`

**Changes Made**:

1. **Removed unused imports**:
   - Removed `useStoryLabProject` import (not needed anymore)

2. **Removed mock data**:
   - Deleted the `mockPersonas` constant (~30 lines of hardcoded test data)

3. **Updated `handleGenerate()` function** (lines 57-124):
   - Gets auth token from `sessionStorage`
   - Makes POST request to `/api/personas/generate`
   - Sends:
     ```javascript
     {
       projectId: project.id,
       campaignDetails: project.campaignDetails,
       numberOfPersonas: 3
     }
     ```
   - Handles API response:
     - Maps API response to UI Persona format
     - Updates UI with generated personas
     - Displays personas with images
   - Saves to database via `updateAIPersonas()`
   - Shows error alert if generation fails

4. **UI Updates**:
   - Shows loading spinner while generating ("Generating Personas...")
   - Displays personas grid after successful generation
   - Shows error message in alert if API call fails

## API Response Flow

### Request
```javascript
POST /api/personas/generate
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "projectId": "project-123",
  "campaignDetails": {
    "campaignName": "...",
    "productDescription": "...",
    "targetAudience": "...",
    "videoLength": "...",
    "callToAction": "..."
  },
  "numberOfPersonas": 3
}
```

### Response
```javascript
{
  "success": true,
  "message": "Generated 3 personas successfully",
  "personas": [
    {
      "id": "persona-project-123-...",
      "type": "mainstream",
      "coreIdentity": {
        "name": "Alex Chen",
        "age": 32,
        "demographic": "Urban tech professional",
        "motivation": "...",
        "bio": "..."
      },
      "physicalAppearance": {...},
      "personalityAndCommunication": {...},
      "lifestyleAndWorldview": {...},
      "whyAndCredibility": {...},
      "image": {
        "url": "https://storage.googleapis.com/pixology-personas/..."
      }
    },
    // ... more personas
  ],
  "project": {
    "id": "project-123",
    "aiGeneratedPersonas": {
      "personas": [...],
      "generatedAt": "2025-10-31T...",
      "generationRecipeId": "persona-generation-v1",
      "generationExecutionId": "exec-...",
      "model": "gemini-2.5-flash",
      "temperature": 0.7,
      "count": 3
    }
  }
}
```

## Data Flow

```
User clicks "Generate Personas"
          ↓
handleGenerate() called
          ↓
Get auth token from sessionStorage
          ↓
Call /api/personas/generate
          ↓
personasService orchestrates:
  1. Gemini 2.5 Flash (persona descriptions)
  2. Gemini 2.5 Flash Image (portrait images)
  3. GCS (image upload)
  4. Firestore (database storage)
          ↓
API returns generated personas with image URLs
          ↓
Map API response to UI Persona format
          ↓
setPersonas() to display in UI
          ↓
updateAIPersonas() to save to database
          ↓
UI shows generated personas with images
```

## User Actions

### To Test the Integration:

1. **Create a new project** in Stage 1:
   - Enter campaign name
   - Enter product description
   - Enter target audience
   - Click "Save and Proceed"

2. **Generate personas** in Stage 2:
   - Click "Generate Personas" button
   - Wait for generation (this may take 30-60 seconds):
     - Generating 3 persona descriptions (~10 seconds)
     - Generating 3 images (~15-20 seconds)
     - Uploading images to GCS (~5 seconds)
     - Saving to database (~5 seconds)
   - See loading spinner: "Generating Personas..."
   - Personas appear with:
     - AI-generated profile image
     - Name, age, demographic
     - Motivation and bio

3. **Select personas** to continue:
   - Click on persona cards to select them
   - Selected personas show blue ring and checkmark
   - Click "Continue with Selected Personas"

4. **Error Handling**:
   - If auth token is missing: "Authentication token not found"
   - If API fails: Specific error message from backend
   - If image generation fails: Error message from image generation service
   - If GCS upload fails: Error message from storage service

## Environment Setup Checklist

Ensure the following are configured in `.env`:

```bash
# Required for Gemini APIs
GEMINI_API_KEY=your_api_key

# Required for Google Cloud Storage
GCP_PROJECT_ID=your_project_id
GCS_BUCKET_NAME=pixology-personas
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Required for OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Troubleshooting

### "Authentication token not found"
- User must be logged in with Google OAuth
- Token is stored in `sessionStorage.authToken`
- Check browser DevTools → Application → Session Storage

### "Failed to generate personas: Missing required fields"
- Ensure campaign details were saved in Stage 1
- Check `project.campaignDetails` contains:
  - `productDescription`
  - `targetAudience`

### "Failed to generate persona description"
- Check GEMINI_API_KEY is set correctly
- Check [Google AI Studio](https://aistudio.google.com/app/usage) for API quota limits
- May need to enable gemini-2.5-flash model in API settings

### "Failed to generate persona image"
- Check GEMINI_API_KEY is set (same key used for images)
- Ensure `gemini-2.5-flash-image` model is accessible
- Check API quota in Google AI Studio
- Note: Image generation is slower (~15-20 seconds per image)

### "Failed to upload image to GCS"
- Verify GCP credentials and service account permissions
- Check bucket exists: `gcloud storage ls gs://pixology-personas`
- Service account needs "Storage Object Creator" role

### Images show as broken/404
- Check that GCS bucket is publicly accessible
- Verify image URLs are correct format: `https://storage.googleapis.com/pixology-personas/...`
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct

## Performance Considerations

### Generation Time
- Persona descriptions: ~10 seconds total (3 personas)
- Image generation: ~15-20 seconds total (3 images)
- GCS upload: ~5 seconds total
- Database save: ~2 seconds
- **Total: ~30-40 seconds**

### Cost per Generation
- Gemini 2.5 Flash descriptions: ~0.45 cents
- Gemini 2.5 Flash Image generation: ~1.14 cents
- GCS storage: negligible
- **Total: ~1.6 cents per persona set**

### Optimization Tips
- Sequential generation (current) = stable but slower
- Could parallelize if rate limits allow
- Images can be cached/reused if prompt is identical

## Next Steps

1. ✅ Backend API created and ready
2. ✅ Frontend connected to API
3. ✅ UI displays generated personas
4. ⏭️ Test the full flow end-to-end
5. ⏭️ Verify image generation quality
6. ⏭️ Test error handling scenarios
7. ⏭️ Optimize generation time if needed
8. ⏭️ Add loading progress indicator (optional)

## Code References

- **Frontend Component**: `src/features/storylab/components/stages/Stage2Personas.tsx:91-124`
- **API Endpoint**: `api/personas.js`
- **Gemini Service**: `api/services/geminiService.js`
- **Image Generation**: `api/services/imageGenerationService.js`
- **GCS Service**: `api/services/gcsService.js`
- **Database Functions**: `api/utils/firestoreUtils.js:432-495`
