# Pixology Node FE - File Structure & Path Reference

## Core Service Files

### AI Services
- **api/services/geminiService.js** (725 lines)
  - Functions: generateTextFromGemini, generatePersonaDescription, generateMultiplePersonasInSingleCall, generateNarrativesInSingleCall, generateStoryScenesInSingleCall, generateScreenplayFromStoryboard
  - Model: gemini-2.5-flash
  - Purpose: All text generation (personas, narratives, scenes, screenplay)

- **api/services/imageGenerationService.js** (254 lines)
  - Functions: generatePersonaImage, generateMultiplePersonaImages, generateSceneImage, generateMultipleSceneImages, ensureBase64String
  - Model: gemini-2.5-flash-image
  - Purpose: Generate persona and scene images with consistency

- **api/services/videoGenerationService.js** (812 lines)
  - Functions: generateVideoWithVeo, generateVideoWithVeo3DirectAPI, generateMultipleSceneVideos, callPythonVideoGenerationAPI, getAccessToken, pollVeo3Operation
  - Purpose: Video generation (delegates to Python backend or Veo3 API)
  - GCS: pixology-personas bucket

### Recipe Orchestration
- **api/services/RecipeOrchestrator.js** (250+ lines)
  - Functions: executeRecipe, getExecutionStatus, getRecipeExecutions
  - Purpose: DAG-based recipe orchestration engine
  - Database: Stores to recipe_executions collection

- **api/services/ActionExecutor.js** (507 lines)
  - Functions: executeAction, executeTextGeneration, executeImageGeneration, executeVideoGeneration, executeDataProcessing, generateImagePrompt
  - Purpose: Routes node execution based on action type
  - Database: Logs results via ActionResultTracker

- **api/services/RecipeManager.js** (337 lines)
  - Functions: createRecipe, getRecipe, updateRecipe, deleteRecipe, listRecipes, getRecipesByStageType, searchRecipes, createRecipeVersion, addTag, removeTag, activateRecipe, deactivateRecipe
  - Purpose: CRUD operations for recipes
  - Database: recipes collection

- **api/services/RecipeSeedData.js** (1000+ lines)
  - Exports: PERSONA_GENERATION_RECIPE, NARRATIVE_GENERATION_RECIPE, STORYBOARD_GENERATION_RECIPE, SCREENPLAY_GENERATION_RECIPE, VIDEO_GENERATION_RECIPE
  - Purpose: Pre-built recipe definitions with complete prompt templates
  - Contains: All default prompts with {variable} placeholders

### Supporting Services
- **api/services/ActionResultTracker.js**
  - Purpose: Logs action results to Firestore

- **api/services/DAGValidator.js**
  - Purpose: Validates DAG structure (nodes and edges)

- **api/services/AgentService.js** (200+ lines)
  - Purpose: Facade for all recipe-related operations
  - Exports: Main interface for recipe management and orchestration

- **api/services/gcsService.js**
  - Functions: uploadImageToGCS, uploadVideoToGCS, uploadMultipleImagesToGCS, deleteImageFromGCS, imageExistsInGCS, getImageMetadata
  - Purpose: Google Cloud Storage operations
  - Bucket: GCS_BUCKET_NAME environment variable

### Configuration
- **api/config/firestore.js**
  - Purpose: Firestore client initialization
  - Exports: db instance

### Utilities
- **api/utils/firestoreUtils.js** (300+ lines)
  - Functions: saveProject, getUserProjects, getProject, deleteProject, getProjectMembers, addProjectMember, removeProjectMember
  - Purpose: Firestore project operations

## API Route Files

- **api/recipes.js**
  - Routes: GET /, GET /:recipeId, POST /, POST /:recipeId/execute, GET /executions/:executionId
  - Middleware: verifyToken (OAuth)

- **api/projects.js** (300+ lines)
  - Routes: GET /, GET /:projectId, POST /, PUT /:projectId, DELETE /:projectId
  - Middleware: verifyToken (OAuth)

- **api/personas.js**
  - Routes for persona-specific operations
  - Can also use recipes instead

- **api/videos.js**
  - Routes for video operations
  - Uses recipe system for generation

- **api/auth.js**
  - OAuth authentication endpoints

- **api/allowlist.js**
  - Allowlist management

## Frontend Components

### Stage Components
- **src/features/storylab/components/stages/Stage1CampaignDetails.tsx**
  - User inputs: productDescription, targetAudience, productImageUrl, videoDuration
  - No AI generation

- **src/features/storylab/components/stages/Stage2Personas.tsx** (Lines 113-332)
  - Calls: GET /api/recipes?stageType=stage_2_personas
  - Executes: POST /api/recipes/{recipeId}/execute
  - Polls: GET /api/recipes/executions/{executionId}
  - Input: productDescription, targetAudience, productImageUrl, numberOfPersonas: 3
  - Features: Recipe editor, persona selection

- **src/features/storylab/components/stages/Stage3Narratives.tsx**
  - Calls: GET /api/recipes?stageType=stage_3_narratives
  - Input: productDescription, targetAudience, numberOfNarratives: 6
  - Features: Narrative selection

- **src/features/storylab/components/stages/Stage4Storyboard.tsx** (Lines 94-250)
  - Calls: GET /api/recipes?stageType=stage_4_storyboard
  - Input: includes selectedPersonaImage for consistency
  - Complex flow with persona/narrative selection
  - Features: Scene editing, recipe editor

- **src/features/storylab/components/stages/Stage5Screenplay.tsx**
  - Calls: GET /api/recipes?stageType=stage_5_screenplay
  - Input: storyboardScenes, selectedPersonaName, videoDuration
  - Features: Screenplay editing

- **src/features/storylab/components/stages/Stage6GenerateVideo.tsx**
  - Per-scene video generation
  - Handles GCS URL-to-base64 conversion
  - Input: sceneImage, sceneData, screenplayEntry, projectId

### Supporting Components
- **src/features/storylab/components/recipe/RecipeEditorPage.tsx**
  - Allows users to edit recipe nodes before execution
  - Used in Stage2Personas and Stage4Storyboard

## Database Schema Files

### Firestore Collections
1. **collections.projects**
   - Main project data
   - Fields: campaignDetails, aiGeneratedPersonas, aiGeneratedNarratives, aiGeneratedStoryboard, aiGeneratedScreenplay, aiGeneratedVideos, stageExecutions, currentStageIndex, completionPercentage

2. **collections.recipes**
   - Recipe definitions
   - Fields: name, description, stageType, version, nodes[], edges[], executionConfig, metadata

3. **collections.recipe_executions**
   - Execution tracking
   - Fields: recipeId, projectId, stageId, input, status, result, actionResults[], executionContext

4. **collections.users**
   - User data from OAuth

## Configuration & Environment

- **.env** / **.env.production**
  - Environment variable definitions
  - See .env.example for all required variables

- **.env.example** (See section 7 of DEEP_CODE_REVIEW.md)
  - Documentation for all environment variables

- **server.js** (6703 bytes)
  - Express server setup
  - Routes mounting
  - CORS and security middleware
  - Static file serving
  - Socket timeout: 5 minutes for long-running operations

## Documentation Files

- **DEEP_CODE_REVIEW.md** (1083 lines)
  - Comprehensive code analysis
  - Method signatures and line numbers
  - Complete prompt templates
  - Database schema details
  - API specifications

- **CODE_REVIEW_SUMMARY.txt**
  - Executive summary of architecture
  - Key findings and insights
  - Technical debt and improvements

- **FILE_STRUCTURE_REFERENCE.md** (This file)
  - Quick reference to all important files
  - Purpose and key functions

## Key Integration Points

1. **Frontend to Backend**
   - Stage components → /api/recipes endpoints
   - Recipe execution → RecipeOrchestrator.executeRecipe()

2. **Backend to AI Services**
   - ActionExecutor → Appropriate service (Gemini, Image, Video)
   - Custom prompts from recipe.nodes[].prompt

3. **Backend to Database**
   - RecipeOrchestrator → recipe_executions collection
   - API routes → projects collection
   - Results stored back to projects

4. **Backend to Storage**
   - gcsService → GCS bucket for images and videos
   - Persona and scene images uploaded with project ID prefix

## Important Constants & Defaults

### Models
- Text Generation: gemini-2.5-flash
- Image Generation: gemini-2.5-flash-image
- Video Generation: veo-3.1-generate-preview (via Veo3.1 API)

### Timeouts & Delays
- Persona image generation: 1000ms delays
- Scene image generation: 1000ms delays
- Video generation: 2000ms delays
- Frontend polling: 5-second intervals (3-minute total timeout)
- Veo3 polling: 15-second intervals (1-hour max wait)

### Constraints
- Veo3 video duration: 4, 6, or 8 seconds only
- Screenplay: Max 8 seconds per scene
- Max tokens for text generation: 2000-2500

### Collections
- Default GCS bucket: pixology-personas
- Firestore: projects, recipes, recipe_executions, users

## Line Numbers Reference

### GeminiService (api/services/geminiService.js)
- generateTextFromGemini: Lines 11-31
- generatePersonaDescription: Lines 41-138
- generateMultiplePersonasInSingleCall: Lines 148-284
- generateNarrativesInSingleCall: Lines 320-423
- generateStoryScenesInSingleCall: Lines 429-555
- generateScreenplayFromStoryboard: Lines 565-725

### ImageGenerationService (api/services/imageGenerationService.js)
- generatePersonaImage: Lines 9-31
- generateSceneImage: Lines 105-195
- generateMultipleSceneImages: Lines 205-254

### ActionExecutor (api/services/ActionExecutor.js)
- executeAction: Lines 21-90
- executeTextGeneration: Lines 97-213
- executeImageGeneration: Lines 219-295
- executeVideoGeneration: Lines 301-382
- executeDataProcessing: Lines 388-466

### RecipeSeedData (api/services/RecipeSeedData.js)
- PERSONA_GENERATION_RECIPE: Entire file start
- Persona prompt: Lines 35-111
- Narrative prompt: Lines 300-382+

### Frontend Stage Components
- Stage2Personas.tsx: handleGenerate at lines 113-332
- Stage4Storyboard.tsx: handleGenerateStoryboard at lines 94-250

## Quick Navigation Guide

To understand the flow for a specific stage:
1. Start with: `src/features/storylab/components/stages/Stage{N}*.tsx`
2. Find recipe fetch: `GET /api/recipes?stageType=stage_{N}_{type}`
3. Check recipe: `api/services/RecipeSeedData.js` - {STAGE_NAME}_GENERATION_RECIPE
4. Understand nodes: Each node's type maps to a service
5. Services: `api/services/{Service}.js`
6. Database: See schema section above

