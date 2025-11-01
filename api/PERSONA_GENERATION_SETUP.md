# Persona Generation API Setup Guide

This guide explains how to set up and use the persona generation API that creates detailed personas and generates professional portrait images using Gemini APIs (both Gemini 2.5 Flash for descriptions and Gemini 2.5 Flash Image for image generation).

## Overview

The persona generation system consists of:

1. **Gemini 2.5 Flash Service** - Generates detailed persona descriptions based on product/audience
2. **Gemini 2.5 Flash Image Service** - Creates professional portrait images from descriptions
3. **GCS Service** - Uploads generated images to Google Cloud Storage
4. **Firestore Service** - Stores personas and project data in Firestore

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Gemini API Configuration (for persona descriptions AND image generation)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud Storage Configuration
GCP_PROJECT_ID=your_gcp_project_id
GCS_BUCKET_NAME=pixology-personas
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-service-account-key.json

# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the required packages:
- `@google/generative-ai` - Gemini API client (for persona descriptions and image generation)
- `@google-cloud/storage` - GCS client
- `uuid` - For unique file IDs

### 2. Configure Gemini API

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env`: `GEMINI_API_KEY=your_key`

The same API key is used for:
- **Persona descriptions** via `gemini-2.5-flash` model
- **Image generation** via `gemini-2.5-flash-image` model

### 3. Configure Google Cloud Storage

1. Create a GCS bucket: `pixology-personas`
2. Download service account JSON key from GCP Console
3. Add to `.env`:
   - `GCP_PROJECT_ID=your_project_id`
   - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

### 5. Configure Firestore

Ensure Firebase Admin SDK is initialized with your service account key. The system will use the projects collection to store persona data.

## API Endpoints

### Generate Personas

**Endpoint:** `POST /api/personas/generate`

**Authentication:** Required (Bearer token from Google OAuth)

**Request Body:**
```json
{
  "projectId": "project-123",
  "campaignDetails": {
    "campaignName": "Summer Campaign",
    "productDescription": "High-quality wireless earbuds with noise cancellation",
    "targetAudience": "Young professionals aged 25-40 who value audio quality",
    "videoLength": "30 seconds",
    "callToAction": "Get 20% off today"
  },
  "numberOfPersonas": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 3 personas successfully",
  "personas": [
    {
      "id": "persona-project-123-1730000000-0",
      "type": "mainstream",
      "coreIdentity": {
        "name": "Alex Chen",
        "age": 32,
        "demographic": "Urban tech professional",
        "motivation": "Needs quality audio for commuting and work calls",
        "bio": "Senior software engineer at a startup, commutes daily on public transit"
      },
      "physicalAppearance": {
        "general": "Professional appearance, well-groomed, approachable",
        "hair": "Dark hair, modern cut",
        "build": "Athletic build",
        "clothingAesthetic": "Business casual, tech-forward brands",
        "signatureDetails": "Minimalist watch, wireless earbuds"
      },
      "personalityAndCommunication": {
        "demeanor": "Confident and thoughtful",
        "energyLevel": "High-energy but focused",
        "speechPatterns": "Direct and technical, uses industry language",
        "values": ["Quality", "Efficiency", "Innovation", "Authenticity"]
      },
      "lifestyleAndWorldview": {
        "profession": "Senior Software Engineer",
        "hobbies": ["Hiking", "Photography", "Gaming"],
        "lifestyleChoices": "Values work-life balance, invests in quality tech",
        "socialMediaHabits": "Active on LinkedIn and Twitter, follows tech news"
      },
      "whyAndCredibility": {
        "whyTheyUseProduct": "Needs reliable audio for calls during commute and at office",
        "credibility": "Years of experience evaluating tech products professionally",
        "influenceStyle": "Through detailed technical comparisons and personal examples"
      },
      "image": {
        "url": "https://storage.googleapis.com/pixology-personas/personas/project-123/alex-chen-1730000000-abc123.png"
      }
    }
    // ... more personas
  ],
  "project": {
    "id": "project-123",
    "title": "Summer Campaign",
    "aiGeneratedPersonas": {
      "personas": [...],
      "generatedAt": "2025-10-31T10:30:00.000Z",
      "generationRecipeId": "persona-generation-v1",
      "generationExecutionId": "exec-project-123-1730000000",
      "model": "gemini-2.5-flash",
      "temperature": 0.7,
      "count": 3
    }
  }
}
```

## Persona Data Structure

Each generated persona includes:

### Core Identity
- `name` - Realistic persona name
- `age` - Age as number (18-65)
- `demographic` - Brief demographic description
- `motivation` - Why they'd use/recommend the product
- `bio` - 2-3 sentence biography

### Physical Appearance
- `general` - Overall appearance description
- `hair` - Hair color, style, texture
- `build` - Body type
- `clothingAesthetic` - Style of dress
- `signatureDetails` - Distinctive features/accessories

### Personality & Communication
- `demeanor` - How they present themselves
- `energyLevel` - Natural energy level
- `speechPatterns` - How they talk
- `values` - Core values (list of 3-4)

### Lifestyle & Worldview
- `profession` - What they do for work
- `hobbies` - 3-4 interests
- `lifestyleChoices` - How they spend time/money
- `socialMediaHabits` - Social media presence

### Why & Credibility
- `whyTheyUseProduct` - Genuine reason for using product
- `credibility` - Why their recommendation would be credible
- `influenceStyle` - How they influence others

## Image Generation Details

The system generates professional UGC-style portrait images with:

- **Model**: Gemini 2.5 Flash Image
- **Format**: PNG
- **Storage**: Google Cloud Storage with public access
- **Caching**: 1-hour cache control

Images are automatically:
1. Generated based on persona physical appearance details using Gemini 2.5 Flash Image model
2. Converted from base64 to PNG buffer
3. Uploaded to GCS bucket with unique filename
4. Made publicly accessible with 1-hour cache
5. URL stored in persona data

The prompt includes detailed specifications like clothing, hair, appearance, and UGC style to ensure consistency with the persona profile.

## Usage from Frontend

### Stage 2 Personas Component

Connect the generate button to the API:

```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const response = await fetch('/api/personas/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        projectId: project.id,
        campaignDetails: project.campaignDetails,
        numberOfPersonas: 3
      })
    });

    const data = await response.json();

    if (data.success) {
      // Update UI with generated personas
      await updateAIPersonas(data.project.aiGeneratedPersonas);
    }
  } catch (error) {
    console.error('Failed to generate personas:', error);
  } finally {
    setIsGenerating(false);
  }
};
```

## Error Handling

The API includes comprehensive error handling for:

- Missing authentication token
- Invalid project data
- API rate limiting
- Image generation failures
- GCS upload failures
- Database errors

Each service logs detailed error messages for debugging.

## Rate Limiting Considerations

- **Gemini API (Descriptions)**: Add delays between persona generations (~500ms)
- **Gemini API (Image Generation)**: Add delays between image generations (~1s)
- **GCS**: Should handle concurrent uploads without issues

The implementation includes small delays (500ms-1s) between sequential operations to avoid rate limiting on the Gemini APIs. Check your Gemini API quota limits at [Google AI Studio](https://aistudio.google.com/app/usage) if you hit rate limits.

## Cost Estimation

### Per Persona Generation (3 personas):
1. **Gemini 2.5 Flash** (descriptions): ~0.15 cents per persona (~0.45 cents total)
2. **Gemini 2.5 Flash Image** (image generation): ~0.38 cents per image (~1.14 cents total)
3. **GCS Storage**: Minimal (images can be auto-deleted after use)
4. **Total**: ~1.6 cents per complete persona set (3 personas with images)

### Monthly (100 campaigns with 3 personas each):
- ~$1.60 in API costs
- **Note**: Much cheaper than Replicate approach and fully integrated with Google ecosystem

## Troubleshooting

### "No authentication token found"
- Ensure user is authenticated with Google OAuth
- Check that token is properly stored in sessionStorage

### "Failed to generate persona description"
- Verify GEMINI_API_KEY is set correctly
- Check Gemini API quota limits in [Google AI Studio](https://aistudio.google.com/app/usage)
- Review Gemini API error logs
- Ensure you have access to `gemini-2.5-flash` model

### "Failed to generate persona image"
- Verify GEMINI_API_KEY is set correctly
- Check Gemini API quota limits for image generation
- Review Gemini 2.5 Flash Image model availability
- Check that `gemini-2.5-flash-image` model is accessible
- Note: Image generation may require API quota adjustment

### "No image generated / No image data in response"
- Verify the Gemini 2.5 Flash Image model is returning valid image data
- Check that the image prompt is detailed enough (model needs specific descriptions)
- Try with simpler prompts if complex ones fail

### "Failed to upload image to GCS"
- Verify GCP credentials and permissions
- Check bucket exists and is accessible: `gcloud storage ls gs://pixology-personas`
- Ensure service account has Storage Admin role
- Verify GOOGLE_APPLICATION_CREDENTIALS path is correct

### "Failed to update project with personas"
- Verify user has editor/owner role on project
- Check project exists in Firestore
- Review Firestore security rules
- Check userId is being passed correctly from auth token

## Next Steps

1. Test the API endpoint with sample campaign data
2. Connect Stage 2 Personas UI to use the real API
3. Monitor API costs and performance
4. Add image deletion/cleanup logic if needed
5. Implement caching for frequently used personas
