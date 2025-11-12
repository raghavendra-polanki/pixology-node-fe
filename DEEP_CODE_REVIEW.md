# Pixology Node FE - Comprehensive Code Review

## Executive Summary

This document provides a detailed analysis of the pixology-node-fe repository's current implementation, focusing on AI service implementations, recipe system, database schema, API routes, frontend components, and prompt handling. The system is built around a recipe-based orchestration pattern that chains together AI service calls for generating personas, narratives, storyboards, screenplays, and videos.

---

## 1. AI SERVICE IMPLEMENTATIONS

### 1.1 GeminiService (api/services/geminiService.js)

**Purpose**: Text generation using Google Generative AI (Gemini)

**Key Functions**:

1. **generateTextFromGemini(prompt, options)** (Lines 11-31)
   - Generic text generation interface
   - Options: temperature (default 0.7), maxTokens (default 2000)
   - Model: gemini-2.5-flash
   - Returns: Promise<string>

2. **generatePersonaDescription(productDescription, targetAudience, personaNumber, customPrompt)** (Lines 41-138)
   - Generates single persona with detailed JSON structure
   - Takes optional customPrompt parameter for prompt templates
   - Returns: Parsed JSON persona object with structure:
     ```json
     {
       "coreIdentity": { name, age, demographic, motivation, bio },
       "physicalAppearance": { general, hair, build, clothingAesthetic, signatureDetails },
       "personalityAndCommunication": { demeanor, energyLevel, speechPatterns, values },
       "lifestyleAndWorldview": { profession, hobbies, lifestyleChoices, socialMediaHabits },
       "whyAndCredibility": { whyTheyUseProduct, credibility, influenceStyle }
     }
     ```

3. **generateMultiplePersonasInSingleCall(productDescription, targetAudience, numberOfPersonas, customPrompt)** (Lines 148-284)
   - Generates multiple personas in one API call (optimized)
   - Returns: Promise<Array> of persona objects
   - **NOTE**: Validates each persona has required fields
   - **PROMPTING STRATEGY**: Custom prompts support template variables: {productDescription}, {targetAudience}, {numberOfPersonas}

4. **generateMultiplePersonas(productDescription, targetAudience, numberOfPersonas)** (Lines 290-309)
   - **DEPRECATED**: Use generateMultiplePersonasInSingleCall instead
   - Makes sequential calls with 500ms delays to avoid rate limiting

5. **generateNarrativesInSingleCall(productDescription, targetAudience, numberOfNarratives, selectedPersonas, customPrompt)** (Lines 320-423)
   - Generates narrative themes for UGC videos
   - Returns: Promise<Array> with structure:
     ```json
     {
       "id": "unique-id",
       "title": "Narrative theme title",
       "description": "1-2 sentence description",
       "structure": "Story beats with arrows (Hook → Build → Solution → Resolution)",
       "gradient": "Tailwind gradient string",
       "patternColor": "RGBA color for patterns",
       "ringColor": "Tailwind ring color",
       "detailedExplanation": "3-4 sentence explanation"
     }
     ```

6. **generateStoryScenesInSingleCall(productDescription, targetAudience, selectedPersonaName, selectedPersonaDescription, narrativeTheme, narrativeStructure, numberOfScenes, videoDuration, customPrompt)** (Lines 429-555)
   - Generates detailed storyboard scenes
   - Returns: Promise<Array> with structure:
     ```json
     {
       "sceneNumber": 1,
       "title": "Scene title",
       "duration": "Scene duration in seconds",
       "description": "2-3 sentence description",
       "location": "Where this scene takes place",
       "persona": "How persona appears/acts",
       "product": "Product integration in scene",
       "visualElements": "Visual details (colors, lighting, props)",
       "dialogue": "Scene dialogue or voiceover",
       "cameraWork": "Camera movements and angles",
       "keyFrameDescription": "Detailed visual description for image generation"
     }
     ```

7. **generateScreenplayFromStoryboard(storyboardScenes, videoDuration, selectedPersonaName, customPrompt)** (Lines 565-725)
   - Converts storyboard scenes to professional screenplay with detailed timing
   - Input: Array of storyboard scene objects
   - Returns: Promise<Array> with structure:
     ```json
     {
       "sceneNumber": 1,
       "timeStart": "0:00",
       "timeEnd": "0:08",
       "visual": "Second-by-second breakdown of visuals",
       "cameraFlow": "Camera movements with timing",
       "script": "Dialogue with timing (0:01-0:04 [Character]: '...')",
       "backgroundMusic": "Music style, tempo, timing",
       "transition": "Transition to next scene"
     }
     ```
   - **CONSTRAINTS**:
     - Max 8 seconds per scene
     - Total must fit within specified video duration
     - Timings in MM:SS format

**Key Features**:
- JSON extraction from markdown code blocks (Lines 119-127 for personas)
- Custom prompt support throughout (allows template substitution)
- Model: gemini-2.5-flash (released 2024)
- Temperature: 0.7-0.8 for creative outputs
- Max tokens: 2000-2500 depending on generation type

---

### 1.2 ImageGenerationService (api/services/imageGenerationService.js)

**Purpose**: Generate images for personas and storyboard scenes using Gemini

**Key Functions**:

1. **generatePersonaImage(imagePrompt)** (Lines 9-31)
   - Uses gemini-2.5-flash-image model
   - Returns: Promise<Buffer> (image buffer)
   - Extracts image from response.candidates[0].content.parts

2. **generateMultiplePersonaImages(prompts)** (Lines 36-55)
   - Sequential generation with 1000ms delays between calls
   - Returns: Promise<Array<Buffer>>
   - Rate-limited to prevent API throttling

3. **ensureBase64String(imageData)** (Lines 77-94)
   - Helper function to convert various image formats to base64
   - Handles: Buffer, base64 strings, URLs
   - Fetches from HTTP/HTTPS URLs if needed

4. **generateSceneImage(sceneDescription, personaName, personaImageBuffer, previousSceneImageBuffer)** (Lines 105-195)
   - Generates scene images with character consistency
   - Uses persona image as reference for consistency
   - Optionally uses previous scene for visual continuity
   - **CRITICAL**: Includes persona image in multipart request for character consistency
   - Returns: Promise<Buffer>

5. **generateMultipleSceneImages(scenes, personaName, personaImageBuffer)** (Lines 205-254)
   - Generates all scene images sequentially
   - Maintains consistency by:
     - Always including persona image reference
     - Using previous scene as context for next scene
   - Returns: Promise<Array> with structure:
     ```json
     {
       "sceneId": 1,
       "sceneTitle": "Scene title",
       "buffer": Buffer,
       "generatedAt": timestamp
     }
     ```
   - 1000ms delays between API calls

---

### 1.3 VideoGenerationService (api/services/videoGenerationService.js)

**Purpose**: Generate videos from storyboard images and screenplay using Vertex AI Veo 3.1

**Key Functions**:

1. **generateVideoWithVeo(imageBase64, sceneData, projectId, sceneIndex)** (Lines 156-187)
   - Calls Python FastAPI backend for video generation (currently using Veo via Python)
   - Input: Base64 image, scene data object, project ID
   - Returns: Promise<object> with:
     ```json
     {
       "sceneNumber": 1,
       "videoUrl": "GCS URL",
       "videoFormat": "mp4",
       "duration": "6s",
       "generatedAt": timestamp,
       "uploadedToGCS": true,
       "metadata": { ... }
     }
     ```

2. **callPythonVideoGenerationAPI(prompt, duration_seconds, quality)** (Lines 193-233)
   - Calls Python backend at PYTHON_API_URL environment variable
   - Parameters: prompt, duration_seconds (1-30), quality ('fast' or 'quality')
   - Returns: Response with video_url, video_id, gcs_path

3. **generateVideoWithVeo3DirectAPI(params)** (Lines 484-640)
   - Direct HTTP API call to Vertex AI Veo 3.1
   - Parameters:
     ```
     {
       sceneImageGcsUri: "gs://bucket/image.jpg",
       prompt: string,
       sceneData: { sceneNumber, title },
       durationSeconds: 4|6|8 (ONLY these values allowed),
       aspectRatio: "16:9" (default),
       resolution: "720p"|"1080p" (default "720p"),
       storageUri: optional GCS path override,
       projectId: for organizing output
     }
     ```
   - **CONSTRAINTS**: Veo3 only supports 4, 6, 8 second durations
   - Returns: Promise<object> with video details

4. **pollVeo3Operation(operationName, accessToken, gcpLocation, maxWaitMs)** (Lines 646-755)
   - Polls long-running operation every 15 seconds
   - Max wait: 1 hour (3600000ms)
   - Uses fetchPredictOperation endpoint

5. **getAccessToken(serviceAccountType)** (Lines 239-295)
   - Gets OAuth token from service account
   - Supports separate Veo3 service account (VEO3_SERVICE_ACCOUNT_KEY env var)
   - Falls back to GOOGLE_APPLICATION_CREDENTIALS

6. **generateMultipleSceneVideos(sceneDataArray, imageBase64, projectId)** (Lines 395-428)
   - Generates videos for all scenes sequentially
   - 2000ms delays between API calls
   - Returns: Array of video info objects

**Implementation Notes**:
- Currently uses Python FastAPI backend instead of direct Veo3 API
- Images are sent as base64 to Python backend
- GCS bucket: pixology-personas (configurable via GCS_BUCKET_NAME)
- Output structure: videos/{projectId}/scene_{sceneNumber}/

---

## 2. RECIPE SYSTEM

### 2.1 RecipeOrchestrator (api/services/RecipeOrchestrator.js)

**Purpose**: Orchestrates recipe execution following DAG structure

**Key Methods**:

1. **executeRecipe(recipeId, input, options)** (Lines 19-165)
   - Main orchestration entry point
   - Creates execution context and tracks results
   - Execution flow:
     1. Loads recipe by ID
     2. Creates execution record with ID: exec_{uuid}
     3. Validates DAG structure
     4. Gets topological sort of execution order
     5. Executes nodes in order, storing outputs
     6. Handles node-level errors based on errorHandling strategy
     7. Stores final result keyed by last node's outputKey
   - **Data Flow**:
     - nodeOutputs object stores intermediate results
     - Input mapped via node.inputMapping to resolve dependencies
     - Final output structured as {outputKey: finalData}
   - Database: Stores to recipe_executions collection

2. **getExecutionStatus(executionId)** (Lines 172-188)
   - Fetches execution record from Firestore
   - Returns execution data with status and results

3. **getRecipeExecutions(recipeId)** (Lines 195-210)
   - Lists all executions for a recipe
   - Ordered by startedAt descending

**Execution Context Storage** (Line 43-47):
```javascript
executionContext: {
  startedAt: new Date(),
  triggeredBy: options.userId || 'system'
}
```

---

### 2.2 ActionExecutor (api/services/ActionExecutor.js)

**Purpose**: Executes individual recipe action nodes

**Key Methods**:

1. **executeAction(node, input)** (Lines 21-90)
   - Routes to appropriate executor based on node.type
   - Types: 'text_generation', 'image_generation', 'video_generation', 'data_processing'
   - Returns:
     ```javascript
     {
       nodeId: string,
       status: 'completed'|'failed'|'skipped',
       input: object,
       output: any,
       startedAt: timestamp,
       completedAt: timestamp,
       duration: ms,
       error: null|{message, code, stack}
     }
     ```
   - Error handling: Respects node.errorHandling.onError ('fail', 'skip', 'retry')

2. **executeTextGeneration(node, input)** (Lines 97-213)
   - Detects generation type by node.id (screenplay, narrative, story)
   - Screenplay path: generateScreenplayFromStoryboard()
   - Story path: generateStoryScenesInSingleCall()
   - Narrative path: generateNarrativesInSingleCall()
   - Persona path (default): generateMultiplePersonasInSingleCall()
   - Supports custom prompts from node.prompt field

3. **executeImageGeneration(node, input)** (Lines 219-295)
   - Detects scene vs persona generation by node.id
   - Scene path: generateMultipleSceneImages() for storyboard consistency
   - Persona path: generatePersonaImage() for each persona sequentially
   - Returns image buffers or URLs

4. **executeVideoGeneration(node, input)** (Lines 301-382)
   - Combines scene and screenplay data
   - Calls generateVideoWithVeo() with base64 image
   - Handles URL-to-base64 conversion
   - Returns: Array wrapping video data object

5. **executeDataProcessing(node, input)** (Lines 388-466)
   - Handles persona and storyboard uploads
   - Persona upload path: Uploads images to GCS, creates persona objects
   - Storyboard upload path: Saves scene details and scene images to GCS
   - Returns final data structure

6. **generateImagePrompt(persona)** (Lines 470-503)
   - Builds detailed image generation prompt from persona data
   - Includes all persona characteristics for image generation

---

### 2.3 RecipeSeedData (api/services/RecipeSeedData.js)

**Purpose**: Pre-built recipe definitions for each stage

**Recipes Defined**:

1. **PERSONA_GENERATION_RECIPE** (v1)
   - stageType: 'stage_2_personas'
   - Nodes: 3
     1. generate_persona_details (text_generation) → personaDetails
     2. generate_persona_images (image_generation) → personaImages
     3. combine_and_upload (data_processing) → finalPersonas
   - **Custom Prompt** (Lines 35-111):
     - Template variables: {productDescription}, {targetAudience}, {numberOfPersonas}, {productImageUrl}
     - Includes product image analysis instruction
     - JSON output requirement specified
   - Input mapping:
     ```
     productDescription: 'external_input.productDescription'
     targetAudience: 'external_input.targetAudience'
     productImageUrl: 'external_input.productImageUrl'
     numberOfPersonas: 'external_input.numberOfPersonas'
     ```
   - Parameters: numberOfPersonas: 3 (customizable)

2. **NARRATIVE_GENERATION_RECIPE** (v1)
   - stageType: 'stage_3_narratives'
   - Nodes: 1
     1. generate_narrative_themes (text_generation) → narrativeThemes
   - Similar prompt structure with narrative-specific guidance

3. **STORYBOARD_GENERATION_RECIPE** (v1)
   - stageType: 'stage_4_storyboard'
   - Nodes: 3
     1. generate_story_scenes (text_generation) → storyboardScenes
     2. generate_scene_images (image_generation) → sceneImages
     3. upload_and_save (data_processing) → finalStoryboard

4. **SCREENPLAY_GENERATION_RECIPE** (v1)
   - stageType: 'stage_5_screenplay'
   - Nodes: 1
     1. generate_screenplay (text_generation) → screenplayEntries

5. **VIDEO_GENERATION_RECIPE** (v1)
   - stageType: 'stage_6_videos'
   - Nodes: 1
     1. generate_video_from_screenplay (video_generation) → videoOutput

**Node Structure**:
```javascript
{
  id: string,
  name: string,
  type: 'text_generation'|'image_generation'|'video_generation'|'data_processing',
  order: number,
  inputMapping: { paramName: 'source.path' },
  outputKey: string,
  aiModel: { provider, modelName, temperature, maxTokens },
  prompt: string (optional custom template),
  promptTemplate: string,
  parameters: {},
  dependencies: [],
  errorHandling: { onError, retryCount, timeout },
  metadata: {}
}
```

---

### 2.4 RecipeManager (api/services/RecipeManager.js)

**Purpose**: CRUD operations for recipes in Firestore

**Key Methods**:
- createRecipe(recipeData, userId)
- getRecipe(recipeId)
- updateRecipe(recipeId, updates)
- deleteRecipe(recipeId)
- listRecipes(filters) - with client-side filtering
- getRecipesByStageType(stageType)
- searchRecipes(searchTerm)
- createRecipeVersion(recipeId, updates, userId) - Version tracking
- addTag/removeTag for recipe categorization
- activateRecipe/deactivateRecipe for soft deletes

**Database Collection**: recipes

---

## 3. DATABASE SCHEMA

### 3.1 Firestore Collections

**collections.projects**:
```javascript
{
  id: projectId,
  title: string,
  description: string,
  thumbnail: string (URL),
  status: 'draft'|'in_progress'|'completed'|'archived'|'published',
  ownerId: userId,
  members: { userId: 'owner'|'editor'|'viewer' },
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // Stage 1: Campaign Details
  campaignDetails: {
    productDescription: string,
    targetAudience: string,
    productImageUrl: string,
    videoDuration: string (e.g., '30s')
  },
  
  // Stage 2: Personas
  aiGeneratedPersonas: {
    personas: [{
      id: string,
      coreIdentity: { name, age, demographic, motivation, bio },
      physicalAppearance: { general, hair, build, clothingAesthetic, signatureDetails },
      personalityAndCommunication: { demeanor, energyLevel, speechPatterns, values },
      lifestyleAndWorldview: { profession, hobbies, lifestyleChoices, socialMediaHabits },
      whyAndCredibility: { whyTheyUseProduct, credibility, influenceStyle },
      image: { url: string } | null
    }],
    generatedAt: timestamp
  },
  userPersonaSelection: {
    selectedPersonaIds: [string]
  },
  
  // Stage 3: Narratives
  aiGeneratedNarratives: {
    narratives: [{
      id: string,
      title: string,
      description: string,
      structure: string,
      gradient: string,
      patternColor: string,
      ringColor: string,
      detailedExplanation: string
    }],
    generatedAt: timestamp
  },
  narrativePreferences: {
    narrativeStyle: string (narrativeId)
  },
  
  // Stage 4: Storyboard
  aiGeneratedStoryboard: {
    scenes: [{
      sceneNumber: number,
      title: string,
      description: string,
      location: string,
      persona: string,
      product: string,
      visualElements: string,
      dialogue: string,
      cameraWork: string,
      keyFrameDescription: string,
      image: { url: string } | referenceImage
    }],
    generatedAt: timestamp
  },
  storyboardCustomizations: {
    scenes: [{ sceneNumber, customizations }]
  },
  
  // Stage 5: Screenplay
  aiGeneratedScreenplay: {
    entries: [{
      sceneNumber: number,
      timeStart: string,
      timeEnd: string,
      visual: string,
      cameraFlow: string,
      script: string,
      backgroundMusic: string,
      transition: string
    }],
    generatedAt: timestamp
  },
  screenplayCustomizations: {
    entries: [{ sceneNumber, customizations }]
  },
  
  // Stage 6: Videos
  aiGeneratedVideos: {
    videos: [{
      sceneNumber: number,
      sceneTitle: string,
      videoUrl: string (GCS URL),
      videoFormat: string,
      duration: string,
      uploadedToGCS: boolean,
      metadata: {}
    }],
    generatedAt: timestamp
  },
  
  // Workflow Progress
  currentStageIndex: number (0-5),
  stageExecutions: {
    stage_2: { recipeExecutionId, status, completedAt },
    stage_3: { ... },
    stage_4: { ... },
    stage_5: { ... },
    stage_6: { ... }
  },
  completionPercentage: number,
  
  // Other
  videoProduction: {},
  narrativePreferences: {},
  visualDirection: {},
  scriptPreferences: {},
  metadata: {}
}
```

**collections.recipes**:
```javascript
{
  id: recipeId,
  name: string,
  description: string,
  stageType: string (e.g., 'stage_2_personas'),
  version: number,
  nodes: [{ ...node structure as defined in RecipeSeedData }],
  edges: [{ from: nodeId, to: nodeId }],
  executionConfig: {
    timeout: ms,
    retryPolicy: { maxRetries, backoffMs },
    parallelExecution: boolean,
    continueOnError: boolean
  },
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId,
    isActive: boolean,
    tags: [string]
  }
}
```

**collections.recipe_executions**:
```javascript
{
  id: executionId (exec_{uuid}),
  recipeId: string,
  projectId: string,
  stageId: string (e.g., 'stage_2'),
  input: { ...execution input data },
  status: 'running'|'completed'|'failed',
  result: { [outputKey]: data },
  actionResults: [{
    nodeId: string,
    status: string,
    input: object,
    output: object,
    startedAt: timestamp,
    completedAt: timestamp,
    duration: ms,
    error: null|object
  }],
  executionContext: {
    startedAt: timestamp,
    triggeredBy: userId,
    completedAt: timestamp,
    error: string,
    failedNodeId: string
  }
}
```

---

## 4. API ROUTES

### 4.1 Recipe Routes (/api/recipes)

**GET /api/recipes**
- Query params: stageType, tags, search
- Returns: { success, count, recipes }
- Filters by optional stageType, enables search

**GET /api/recipes/:recipeId**
- Returns: { success, recipe }

**POST /api/recipes** (authenticated)
- Body: { name, description, stageType, nodes, edges, executionConfig, metadata }
- Validates DAG structure
- Returns: { success, message, recipe }

**POST /api/recipes/:recipeId/execute** (authenticated)
- Body: { input: {...}, projectId, stageId }
- Returns: { success, executionId }
- Triggers RecipeOrchestrator.executeRecipe()

**GET /api/recipes/executions/:executionId**
- Returns execution status and results
- Polls-friendly for frontend status checking

---

### 4.2 Project Routes (/api/projects)

**GET /api/projects** (authenticated)
- Returns user's accessible projects
- Includes: count, projects array with userRole and isOwner

**GET /api/projects/:projectId** (authenticated)
- Returns single project if user has access
- Checks membership before returning

**POST /api/projects** (authenticated)
- Body: { title, description, thumbnail, status, ...StoryLabFields }
- Creates project and adds owner to members
- Returns: { success, projectId, project }

**PUT /api/projects/:projectId** (authenticated)
- Body: All project fields (partial updates supported)
- Updates storyboard and screenplay data fields
- Returns: { success, project }

---

### 4.3 Other Routes

**GET /api/personas**
- Not directly called by stage components (uses recipes instead)

**POST /api/personas/generate**
- For direct persona generation without recipes

**GET /api/videos**, **POST /api/videos**
- Video endpoints (uses recipe system for generation)

---

## 5. FRONTEND COMPONENTS

### 5.1 Stage Components (src/features/storylab/components/stages/)

**Stage1CampaignDetails.tsx**
- Collects: productDescription, targetAudience, productImageUrl, videoDuration
- Saves to project.campaignDetails
- No AI generation

**Stage2Personas.tsx** (Lines 113-332)
- Fetches recipe: GET /api/recipes?stageType=stage_2_personas
- Executes recipe: POST /api/recipes/{recipeId}/execute
  - Input: { productDescription, targetAudience, productImageUrl, numberOfPersonas: 3 }
  - projectId, stageId: 'stage_2'
- Polls for completion: GET /api/recipes/executions/{executionId}
- Updates project: updateAIPersonas(personas)
- User selects: updatePersonaSelection(selectedPersonaIds)

**Stage3Narratives.tsx**
- Fetches recipe: GET /api/recipes?stageType=stage_3_narratives
- Executes with: productDescription, targetAudience, numberOfNarratives: 6, selectedPersonas
- Polls for results
- Updates project: updateAINarratives()
- User selects narrative theme

**Stage4Storyboard.tsx** (Lines 94-250)
- **Complex flow with persona image passing**:
  1. Fetches recipe: GET /api/recipes?stageType=stage_4_storyboard
  2. Gets selectedNarrative from project.aiGeneratedNarratives
  3. Gets selectedPersona from project.aiGeneratedPersonas
  4. Execution input includes:
     ```javascript
     {
       productDescription,
       targetAudience,
       selectedPersonaName,
       selectedPersonaDescription,
       selectedPersonaImage: persona.image.url,
       narrativeTheme,
       narrativeStructure,
       numberOfScenes: recipe.nodes[0].parameters.numberOfScenes,
       videoDuration
     }
     ```
  5. Polls execution
  6. Maps result: execution.result.finalStoryboard → scenes
  7. Updates project: updateAIStoryboard()

**Stage5Screenplay.tsx**
- Fetches recipe: GET /api/recipes?stageType=stage_5_screenplay
- Input: storyboardScenes (from aiGeneratedStoryboard), selectedPersonaName, videoDuration
- Execution: POST /api/recipes/{recipeId}/execute
- Polls results
- Updates project: updateAIScreenplay()

**Stage6GenerateVideo.tsx**
- Fetches recipe: GET /api/recipes?stageType=stage_6_videos
- Per-scene generation triggered by user
- Input: sceneImage (base64), sceneData, screenplayEntry, projectId
- Handles GCS URL-to-base64 conversion
- Updates project: updateAIVideos()

---

### 5.2 Key Frontend Patterns

**Recipe Editor Component** (Stage2Personas, Stage4Storyboard)
- Allows users to edit recipe nodes before execution
- Fetches recipe
- User can modify prompt templates
- Saves recipe: PUT /api/recipes/{recipeId}

**Polling Pattern**:
```javascript
// Typical 5-second polling with 3-minute timeout
const maxAttempts = 36; // 180 seconds / 5 = 36
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const response = await fetch(`/api/recipes/executions/${executionId}`);
  const execution = await response.json();
  
  if (execution.execution.status === 'completed') break;
  if (execution.execution.status === 'failed') throw error;
  attempts++;
}
```

---

## 6. PROMPT HANDLING & TEMPLATES

### 6.1 Current Prompt Architecture

**Hardcoded Default Prompts**:
- Persona generation prompt (Line 55-109 in geminiService.js, 294+ lines)
- Narrative prompt (Line 334-382)
- Storyboard scene prompt (Line 457-503)
- Screenplay prompt (Line 595-673)
- Image generation prompt (RecipeSeedData.js Lines 152-197)

**Custom Prompt Support**:
- Implemented in all generation functions
- Parameter: customPrompt (string)
- Template variables substitution:
  ```javascript
  prompt = customPrompt
    .replace(/{productDescription}/g, productDescription)
    .replace(/{targetAudience}/g, targetAudience)
    .replace(/{numberOfPersonas}/g, numberOfPersonas)
    // ... etc for each parameter
  ```

### 6.2 Prompt Storage & Access

**Prompt Locations**:
1. **In RecipeSeedData.js (Primary)**
   - Each node has a `prompt` field (string)
   - Lines 35-111: Persona generation prompt
   - Lines 300-382: Narrative generation prompt
   - Lines 486-554: Storyboard generation prompt
   - Lines 652-822: Screenplay generation prompt

2. **In Recipe Nodes**
   - Recipe.nodes[i].prompt stores custom prompt
   - If node.prompt exists, ActionExecutor uses it
   - Otherwise, uses built-in defaults

3. **In geminiService.js (Fallback)**
   - Embedded default prompts as fallback
   - Used if recipe doesn't specify custom prompt

### 6.3 Prompt Template Variables

**Persona Generation**:
- {productDescription}
- {targetAudience}
- {numberOfPersonas}
- {productImageUrl} (for product image analysis)

**Narrative Generation**:
- {productDescription}
- {targetAudience}
- {numberOfNarratives}
- {selectedPersonas}

**Storyboard Scene Generation**:
- {productDescription}
- {targetAudience}
- {selectedPersonaName}
- {selectedPersonaDescription}
- {narrativeTheme}
- {narrativeStructure}
- {numberOfScenes}
- {videoDuration}

**Screenplay Generation**:
- {storyboardScenes} (formatted description)
- {videoDuration}
- {selectedPersonaName}

### 6.4 Prompt Migration Path

**Current State**:
- Hardcoded in service files
- Overridable via recipe node.prompt

**Transition Steps**:
1. Extract all prompts to separate prompt templates file/collection
2. Add Firestore collection: prompt_templates
3. Modify ActionExecutor to:
   - Check recipe node.promptId (reference to template)
   - Load template from Firestore
   - Apply variable substitution
4. Add UI for prompt template management (CRUD operations)
5. Version tracking for prompt evolution

---

## 7. CONFIGURATION & ENVIRONMENT VARIABLES

### 7.1 Environment Variables Required

**Google OAuth & Cloud**:
- VITE_GOOGLE_CLIENT_ID - Google OAuth client ID
- GCP_PROJECT_ID - Google Cloud Project ID
- GCP_LOCATION - GCP region (default: us-central1)
- GEMINI_API_KEY - Gemini API key

**Service Accounts**:
- GOOGLE_APPLICATION_CREDENTIALS - Path to default service account JSON
- VEO3_SERVICE_ACCOUNT_KEY - Optional: Separate account for Veo3 API (falls back to GOOGLE_APPLICATION_CREDENTIALS)

**Cloud Storage**:
- GCS_BUCKET_NAME - GCS bucket for images/videos (default: pixology-personas)
- VITE_GCS_BUCKET_NAME - Exposed to frontend (same as GCS_BUCKET_NAME)

**Server & URLs**:
- PORT - Node server port (default: 3000)
- VITE_API_URL - Backend API URL (for frontend, default: http://localhost:3000)
- PYTHON_API_URL - Python FastAPI backend URL (default: http://localhost:8000)

**Debugging**:
- ENABLE_DEBUG_IMAGES - Save debug images to disk (default: false)

### 7.2 Service Initialization

**Firestore** (api/config/firestore.js):
- Initialized with GOOGLE_APPLICATION_CREDENTIALS
- Exports: db instance

**Gemini** (geminiService.js, imageGenerationService.js):
- Initialized with GEMINI_API_KEY
- Models: gemini-2.5-flash (text), gemini-2.5-flash-image (images)

**Vertex AI / Veo3** (videoGenerationService.js):
- Uses google.auth.GoogleAuth with VEO3_SERVICE_ACCOUNT_KEY
- Endpoint: {GCP_LOCATION}-aiplatform.googleapis.com
- Model: veo-3.1-generate-preview

**GCS** (gcsService.js):
- Uses google-cloud/storage library
- Bucket: GCS_BUCKET_NAME

---

## 8. KEY IMPLEMENTATION DETAILS

### 8.1 Data Flow: Stage 2-6

**Stage 2 → Personas**:
```
Frontend Input
  ↓ (campaignDetails)
Recipe Executor
  ├─ Node 1: generateMultiplePersonasInSingleCall()
  │   └─ Output: personaDetails (array)
  ├─ Node 2: generateMultiplePersonaImages()
  │   ├─ Input: personaDetails
  │   └─ Output: personaImages (array of buffers)
  └─ Node 3: Upload to GCS + combine
      └─ Output: finalPersonas (with URLs)
  ↓
Project.aiGeneratedPersonas ← Stored to Firestore
```

**Stage 4 → Storyboard**:
```
Frontend Selection (persona, narrative)
  ↓
Recipe Executor
  ├─ Node 1: generateStoryScenesInSingleCall()
  │   └─ Output: storyboardScenes (array)
  ├─ Node 2: generateMultipleSceneImages()
  │   ├─ Input: personaImage (for consistency)
  │   └─ Output: sceneImages (buffers with previous scene context)
  └─ Node 3: Upload to GCS
      └─ Output: finalStoryboard
  ↓
Project.aiGeneratedStoryboard ← Stored to Firestore
```

### 8.2 Prompt System

**Persona Prompt Highlights**:
- Expects JSON array output with specific structure
- Validates required fields per persona
- Includes markdown code block extraction
- Template variables for dynamic content

**Image Generation Prompt Highlights**:
- References persona physical appearance for accuracy
- Includes product image URL for context
- Specifies UGC style requirements
- Professional lighting and composition guidance

**Screenplay Prompt Highlights**:
- Requires second-by-second timing breakdown
- Specifies MM:SS format (0:00, 0:05, etc.)
- Maximum 8 seconds per scene constraint
- Includes dialogue, music, transitions

### 8.3 Error Handling

**Node-Level Error Handling**:
```javascript
node.errorHandling: {
  onError: 'fail'|'skip'|'retry',
  retryCount: number,
  timeout: ms,
  defaultOutput: any (for skip)
}
```

**Strategies**:
- 'fail': Stops recipe execution, marks as failed
- 'skip': Continues with next node, uses defaultOutput
- 'retry': Retries operation

**API Error Responses**:
- HTTP 500 for server errors
- HTTP 400 for validation errors
- HTTP 401/403 for auth errors
- Include error message in JSON body

---

## 9. CRITICAL INTEGRATION POINTS

### 9.1 Frontend to Backend Flow

1. **Stage UI Component** (React)
   - User triggers generation
   - Fetches recipe definition
   - Calls POST /api/recipes/{recipeId}/execute
   - Polls GET /api/recipes/executions/{executionId}
   - Updates project with results

2. **Recipe Execution** (Node.js)
   - RecipeOrchestrator.executeRecipe()
   - Creates execution record
   - Orchestrates node execution
   - Stores results to Firestore

3. **Action Execution** (AI Services)
   - ActionExecutor routes to specific service
   - Services call Gemini/Vertex AI APIs
   - Images uploaded to GCS
   - Results returned to orchestrator

4. **Project Update** (Database)
   - Results mapped to project fields
   - Stored to Firestore projects collection
   - Frontend refreshes project state

### 9.2 Consistency Mechanisms

**Persona Consistency (Storyboard Generation)**:
- Persona image buffer passed to each scene generation
- Prompt explicitly instructs to maintain appearance
- Previous scene image used for visual continuity

**Product Consistency**:
- Product description passed through all stages
- Product image URL included in persona and image prompts
- Narrative themes aligned with product positioning

---

## 10. FUTURE MIGRATION CONSIDERATIONS

### 10.1 Prompt Template Database

**Current**: Hardcoded in service files
**Future**: Firestore collection with versioning

### 10.2 Recipe Versioning

**Current**: Basic version field
**Future**: Full version history with branching

### 10.3 Execution History & Analytics

**Current**: Basic tracking in recipe_executions
**Future**: Metrics, cost tracking, performance analysis

### 10.4 Parallel Node Execution

**Current**: Sequential execution
**Future**: Support parallelExecution flag in recipe config

---

## SUMMARY TABLE

| Component | Location | Purpose | Key Return Type |
|-----------|----------|---------|-----------------|
| GeminiService | api/services/ | Text generation (personas, narratives, scenes, screenplay) | Promise<Array> JSON |
| ImageGenerationService | api/services/ | Generate persona/scene images | Promise<Buffer> |
| VideoGenerationService | api/services/ | Video from screenplay | Promise<object> with videoUrl |
| RecipeOrchestrator | api/services/ | DAG orchestration | Promise<string> executionId |
| ActionExecutor | api/services/ | Node execution routing | Promise<object> result |
| RecipeManager | api/services/ | Recipe CRUD | Promise<object> recipe |
| Stage Recipes | api/services/ | Pre-built pipelines | Used via RecipeManager |
| Projects Collection | Firestore | Project data + AI results | Document structure |
| Recipes Collection | Firestore | Recipe definitions | Document structure |
| Executions Collection | Firestore | Execution tracking | Execution history |

---

## FILE PATHS REFERENCE

**Core Services**:
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/geminiService.js (725 lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/imageGenerationService.js (254 lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/videoGenerationService.js (812 lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/ActionExecutor.js (507 lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/RecipeOrchestrator.js (250+ lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/RecipeManager.js (337 lines)
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/services/RecipeSeedData.js (1000+ lines)

**API Routes**:
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/recipes.js
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/projects.js
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/personas.js

**Frontend**:
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage2Personas.tsx
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage4Storyboard.tsx
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage5Screenplay.tsx
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage6GenerateVideo.tsx

**Configuration**:
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/.env.example
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/api/config/firestore.js
- /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/server.js

