# Pixology Node Frontend - Architecture Reference

**Last Updated**: November 11, 2025
**Version**: 1.0
**Purpose**: Comprehensive architecture guide for the pixology-node-fe codebase

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Layers](#architecture-layers)
3. [Directory Structure](#directory-structure)
4. [Technology Stack](#technology-stack)
5. [Core Modules](#core-modules)
6. [API Routes & Data Flow](#api-routes--data-flow)
7. [Database Schema](#database-schema)
8. [Key Workflows](#key-workflows)
9. [Deployment Configuration](#deployment-configuration)
10. [Important Files & Entry Points](#important-files--entry-points)

---

## Project Overview

**Pixology** is a full-stack, monolithic AI-powered video generation platform that combines a React frontend with an Express backend.

### Key Characteristics
- **Full-Stack Monolith**: React frontend + Node.js/Express backend in single repo
- **Core Feature**: 6-stage StoryLab workflow for AI-generated marketing videos
- **AI Integration**: Heavy use of Google Cloud services (Gemini, Vertex AI Veo3)
- **DAG-Based Workflows**: Flexible recipe orchestration system for extensibility
- **Real-time Status**: WebSocket-ready architecture for execution monitoring
- **Multi-stage Projects**: Sequential project progression through campaign creation → video generation

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Port 8080/3000)              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React App (TypeScript)                                   │   │
│  │  - Pages (Landing, Login, StoryLab)                      │   │
│  │  - Features (storylab with 6-stage workflow)             │   │
│  │  - Shared Components (UI, Context, Services)             │   │
│  │  - State (Zustand + React Query)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    API GATEWAY LAYER (Port 3000)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express Server                                           │   │
│  │  - Auth Middleware (Google OAuth verification)           │   │
│  │  - CORS, Security (Helmet), Compression                  │   │
│  │  - Static File Serving (React build)                     │   │
│  │  - API Route Handlers                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                  SERVICE LAYER (Business Logic)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Services (api/services/)                           │   │
│  │  - AgentService (main facade)                            │   │
│  │  - RecipeOrchestrator (DAG execution)                    │   │
│  │  - ActionExecutor (node-level actions)                   │   │
│  │  - GeminiService (AI generation)                         │   │
│  │  - VideoGenerationService (Veo3 integration)             │   │
│  │  - ImageGenerationService (Persona images)               │   │
│  │  - GCSService (cloud storage)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                   DATA ACCESS LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Firestore Utils (abstraction layer)                   │   │
│  │  - Firebase Admin SDK                                    │   │
│  │  - GCS Client                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Firebase Firestore (NoSQL database)                   │   │
│  │  - Google Cloud Storage (media storage)                  │   │
│  │  - Gemini API (text generation)                          │   │
│  │  - Vertex AI Veo3 (video generation)                     │   │
│  │  - Vision API (image analysis)                           │   │
│  │  - Google OAuth 2.0 (authentication)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
pixology-node-fe/
│
├── src/                              # React Frontend
│   ├── main.tsx                      # Vite entry point
│   ├── App.tsx                       # Root component with providers
│   │
│   ├── app/
│   │   ├── App.tsx                   # Main app wrapper
│   │   ├── providers/                # Context providers (Auth, Query, Theme)
│   │   └── router/                   # Route configuration
│   │
│   ├── features/                     # Feature modules (domain-driven)
│   │   ├── landing/                  # Public landing page
│   │   │   ├── HeroSection.tsx
│   │   │   ├── VisionSection.tsx
│   │   │   ├── BenefitsSection.tsx
│   │   │   ├── HowItWorksSection.tsx
│   │   │   └── CTASection.tsx
│   │   │
│   │   ├── login/                    # Google OAuth flow
│   │   │   └── LoginPage.tsx
│   │   │
│   │   └── storylab/                 # Main feature (protected)
│   │       ├── pages/
│   │       │   └── StorylabPage.tsx  # Dashboard container
│   │       │
│   │       ├── components/
│   │       │   ├── Stage1CampaignDetails.tsx
│   │       │   ├── Stage2Personas.tsx
│   │       │   ├── Stage3Narratives.tsx
│   │       │   ├── Stage4Storyboard.tsx
│   │       │   ├── Stage5Screenplay.tsx
│   │       │   ├── Stage6GenerateVideo.tsx
│   │       │   ├── RecipeEditor.tsx      # DAG visualization
│   │       │   ├── ActionNode.tsx        # Recipe node component
│   │       │   ├── RecipeTestPanel.tsx   # Testing interface
│   │       │   └── ExecutionResultsPanel.tsx
│   │       │
│   │       ├── types/
│   │       │   ├── project.types.ts      # TypeScript interfaces
│   │       │   ├── project.schema.ts     # Zod validation
│   │       │   └── types.ts              # Workflow types
│   │       │
│   │       └── utils/
│   │           └── projectUtils.ts
│   │
│   ├── pages/                        # Top-level pages
│   │   ├── HomePage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── RootLayout.tsx
│   │
│   ├── shared/                       # Shared across features
│   │   ├── components/               # Reusable UI components
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── shadcn/ui components
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Global auth state
│   │   │
│   │   ├── services/                 # API client layer
│   │   │   ├── authService.ts
│   │   │   ├── projectsService.ts
│   │   │   └── storyLabProjectService.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   └── axios-instance.ts (if used)
│   │   │
│   │   └── constants/
│   │       └── config.ts
│   │
│   └── styles/
│       └── globals.css               # Tailwind imports
│
├── api/                              # Express Backend
│   ├── auth.js                       # GET /api/auth/*, POST /api/auth/*
│   ├── projects.js                   # GET,POST,PUT,DELETE /api/projects*
│   ├── recipes.js                    # GET,POST,PUT,DELETE /api/recipes*
│   ├── personas.js                   # POST /api/personas/generate
│   ├── videos.js                     # POST /api/videos/generate*
│   ├── allowlist.js                  # GET,POST,DELETE /api/allowlist*
│   │
│   ├── config/
│   │   └── firestore.js              # Firebase Admin initialization
│   │
│   ├── services/                     # Business logic
│   │   ├── AgentService.js           # Main facade (recipe & project management)
│   │   ├── RecipeManager.js          # Recipe CRUD
│   │   ├── RecipeOrchestrator.js     # DAG execution engine
│   │   ├── ActionExecutor.js         # Individual action execution
│   │   ├── ActionResultTracker.js    # Execution logging
│   │   ├── DAGValidator.js           # DAG validation & topological sort
│   │   ├── geminiService.js          # Gemini API integration
│   │   ├── imageGenerationService.js # Persona image generation
│   │   ├── videoGenerationService.js # Veo3 integration
│   │   ├── gcsService.js             # Cloud Storage operations
│   │   └── RecipeSeedData.js         # Default recipe templates
│   │
│   └── utils/
│       └── firestoreUtils.js         # Database abstraction
│
├── dist/                             # Built frontend (created by npm run build)
├── public/                           # Static assets
│
├── server.js                         # Express entry point
├── vite.config.ts                    # Frontend build config
├── tsconfig.json                     # TypeScript config
├── tsconfig.app.json                 # App-specific TS config
├── tsconfig.node.json                # Build tools TS config
├── tailwind.config.ts                # Tailwind CSS config
├── postcss.config.js                 # PostCSS config
├── components.json                   # shadcn/ui config
│
├── package.json                      # Dependencies
├── ecosystem.config.cjs              # PM2 deployment config
│
├── .env.example                      # Environment template
├── .env.local                        # Local dev vars (gitignored)
├── .env.production                   # Production vars
│
├── .gitignore
└── ARCHITECTURE_REFERENCE.md         # This file
```

---

## Technology Stack

### Frontend
| Layer | Technologies |
|-------|------|
| **Framework** | React 18.3.1 + TypeScript 5.8.3 |
| **Build Tool** | Vite 5.4.19 |
| **Routing** | React Router 6.30.1 |
| **State Management** | Zustand 5.0.8 (client), React Query 5.83.0 (server) |
| **Styling** | Tailwind CSS 3.4.17 + Radix UI |
| **Forms** | React Hook Form 7.65.0 |
| **Validation** | Zod 3.25.76 |
| **UI Components** | shadcn/ui (Radix-based) |
| **Charts** | Recharts 3.3.0 |
| **DAG Visualization** | ReactFlow 11.11.4 |
| **Notifications** | Sonner 1.7.4 |
| **Icons** | Lucide React 0.462.0 |
| **Auth** | @react-oauth/google 0.12.2 |

### Backend
| Layer | Technologies |
|-------|------|
| **Runtime** | Node.js (ES modules) |
| **Framework** | Express.js 4.21.2 |
| **Database** | Firebase Firestore + Admin SDK 13.5.0 |
| **Cloud Storage** | Google Cloud Storage 7.1.0 |
| **AI/ML** | Gemini API, Vertex AI (Veo3), Vision API |
| **Auth** | Google Auth Library 10.5.0 |
| **Utilities** | UUID 10.0.0, Zod 3.25.76 |
| **Security** | Helmet 8.1.0, CORS |
| **Compression** | Compression 1.8.1 |
| **Process Manager** | PM2 (via ecosystem.config.cjs) |

---

## Core Modules

### 1. **AgentService** (api/services/AgentService.js)
**Purpose**: Central facade for all recipe and project operations

**Key Methods**:
```javascript
// Recipe Management
- createRecipe(recipeData, userId)
- getRecipe(recipeId)
- updateRecipe(recipeId, updates)
- deleteRecipe(recipeId)
- listRecipes(filters)
- getRecipesByStageType(stageType)

// Execution
- executeRecipe(recipeId, input, options) → returns executionId
- testSingleNode(recipeId, nodeId, input, ...)
- getExecutionStatus(executionId)
- cancelExecution(executionId)

// Seeding
- seedInitialRecipes(userId, forceReseed)
```

**Relationships**: Orchestrates RecipeManager, RecipeOrchestrator, ActionExecutor

---

### 2. **RecipeOrchestrator** (api/services/RecipeOrchestrator.js)
**Purpose**: Executes DAG-based recipe workflows

**Execution Flow**:
```
1. Load recipe DAG structure
2. Validate nodes & edges (DAGValidator)
3. Topologically sort nodes
4. Execute nodes sequentially
5. Resolve node inputs from previous outputs
6. Store results in Firestore (ActionResultTracker)
7. Return execution status
```

**Node Execution Context**:
- Each node receives `inputMapping` to resolve inputs
- Outputs stored with key for downstream nodes
- Failures stop execution (no rollback)

---

### 3. **ActionExecutor** (api/services/ActionExecutor.js)
**Purpose**: Execute individual action nodes

**Supported Action Types**:
- `generate_persona` → Calls GeminiService
- `generate_narrative` → Calls GeminiService
- `generate_storyboard` → Calls GeminiService
- `generate_screenplay` → Calls GeminiService
- `generate_image` → Calls ImageGenerationService
- `generate_video` → Calls VideoGenerationService
- Custom handlers for future action types

**Return Format**:
```javascript
{
  nodeId: string,
  nodeType: string,
  status: 'success' | 'failed' | 'skipped',
  output: { /* action-specific result */ },
  error: { message, code },
  executionTime: number
}
```

---

### 4. **GeminiService** (api/services/geminiService.js)
**Purpose**: Google Gemini API integration for AI generation

**Capabilities**:
- Text generation (personas, narratives, scripts)
- Multi-turn conversations
- JSON response parsing
- Prompt engineering for consistent output format

**Integration Points**:
- Called by ActionExecutor for: persona, narrative, storyboard, screenplay
- Configurable model version
- System prompt tuning per action type

---

### 5. **VideoGenerationService** (api/services/videoGenerationService.js)
**Purpose**: Vertex AI Veo3 video generation

**Workflow**:
1. Send scene description to Veo3 API
2. Poll for generation completion
3. Download video from Veo3
4. Upload to GCS with project/scene organization
5. Generate public URL
6. Clean up temporary files

**Features**:
- Supports durations: 4, 6, 8 seconds
- Resolutions: 720p, 1080p
- Organized GCS structure: `gs://bucket/videos/{projectId}/scene_{n}/`

---

### 6. **ImageGenerationService** (api/services/imageGenerationService.js)
**Purpose**: Generate portrait images for personas

**Process**:
1. Create detailed image prompt from persona attributes
2. Use Gemini Vision API to generate UGC-style images
3. Upload to GCS: `gs://bucket/personas/{projectId}/{personaName}.png`
4. Store public URL in Firestore

---

### 7. **GCSService** (api/services/gcsService.js)
**Purpose**: Google Cloud Storage operations

**Methods**:
```javascript
- uploadImage(file, path)
- uploadVideo(file, path)
- deleteObject(path)
- generatePublicUrl(path)
- downloadFile(path)
```

**Bucket Organization**:
```
gs://pixology-personas/
├── personas/{projectId}/{name}.png
├── storyboards/{projectId}/scene_{n}.png
└── videos/{projectId}/scene_{n}/video.mp4
```

---

### 8. **DAGValidator** (api/services/DAGValidator.js)
**Purpose**: Validate recipe DAG structure

**Validations**:
- All nodes have required fields (id, type, inputMapping)
- All edges reference valid nodes
- No cycles (acyclic DAG)
- Input mappings reference valid sources

**Topological Sort**: Determines execution order for sequential execution

---

## API Routes & Data Flow

### Authentication Flow
```
1. Frontend: User clicks "Sign in with Google"
2. Google OAuth popup → User grants permission
3. Frontend receives ID token
4. Frontend: POST /api/auth/google { idToken }
5. Backend: Verifies token with Google Auth Library
6. Backend: Saves user to Firestore
7. Backend: Returns auth cookie + session
8. Frontend: Redirects to homepage
```

**Protected Routes**: All `/api/projects`, `/api/recipes`, etc. require valid OAuth token

---

### Project Workflow
```
POST /api/projects
├─ Create new project (Stage 1: Campaign Details)
├─ Initialize all stage execution records
└─ Return projectId

PUT /api/projects/{projectId}/stages/{stageName}
├─ Execute stage recipe (if available)
├─ Update stageExecutions status
├─ Store generated data (personas, narratives, etc.)
└─ Update currentStageIndex

GET /api/projects/{projectId}
└─ Retrieve full project state with all stages
```

---

### Recipe Execution Flow
```
POST /api/recipes/{recipeId}/execute { input, projectId, stageId }
├─ Load recipe DAG
├─ Validate structure
├─ Create execution record in Firestore
├─ Execute nodes sequentially via RecipeOrchestrator
├─ Store action results
└─ Return executionId

GET /api/recipes/executions/{executionId}
└─ Poll for execution status (useful for long-running tasks)

GET /api/recipes/executions/{executionId}/summary
└─ Get condensed execution results
```

---

## Database Schema

### Collections Overview

#### **users**
```firestore
collection: "users"
document: {userId}
├─ email: string
├─ name: string
├─ picture: string (avatar URL)
├─ lastLogin: timestamp
└─ status: "active" | "inactive"
```

#### **projects**
```firestore
collection: "projects"
document: {projectId}
├─ Basic Info
│  ├─ title: string
│  ├─ description: string
│  ├─ ownerId: string (userId)
│  ├─ status: "draft" | "in_progress" | "completed" | "archived"
│  └─ currentStageIndex: number (0-5)
│
├─ Stage 1: Campaign Details
│  └─ campaignDetails: {
│       campaignName, productDescription, targetAudience,
│       videoLength, callToAction, productImageUrl
│     }
│
├─ Stage 2: Personas
│  ├─ aiGeneratedPersonas: {
│  │   personas: [{ id, type, coreIdentity, physicalAppearance, ... }],
│  │   generatedAt: timestamp
│  │ }
│  └─ userPersonaSelection: {
│      selectedPersonaIds: [string],
│      primaryPersonaId: string
│    }
│
├─ Stage 3: Narrative
│  ├─ narrativePreferences: { /* user input */ }
│  └─ aiGeneratedNarratives: {
│      narratives: [{ id, title, description, structure, gradient }],
│      count: number,
│      generatedAt: timestamp
│    }
│
├─ Stage 4: Storyboard
│  ├─ visualDirection: { /* user prefs */ }
│  ├─ aiGeneratedStoryboard: {
│  │   scenes: [{
│  │     sceneNumber, title, description, duration,
│  │     image: { url }, dialogueOrVoiceover
│  │   }],
│  │   totalDuration, generatedAt
│  │ }
│  └─ storyboardCustomizations: {
│      editedScenes: [/* array */],
│      lastEditedAt: timestamp
│    }
│
├─ Stage 5: Screenplay
│  ├─ scriptPreferences: { /* user input */ }
│  └─ aiGeneratedScreenplay: {
│      screenplayId, title, fullText,
│      sections: [{ section, content, type }],
│      generatedAt: timestamp
│    }
│
├─ Stage 6: Video
│  └─ aiGeneratedVideos: {
│      videoCollectionId,
│      videos: [{
│        videoId, sceneNumber, videoUrl, gcsUri,
│        duration, status: "complete" | "error"
│      }],
│      totalCount, completedCount, generatedAt
│    }
│
├─ Stage Execution Tracking
│  └─ stageExecutions: {
│      "stage_1": { stageName, status, startedAt, completedAt, ... },
│      "stage_2": { ... },
│      ...
│    }
│
└─ Metadata
   ├─ createdAt: timestamp
   ├─ updatedAt: timestamp
   └─ metadata: { tags, categories, estimatedBudget }
```

#### **recipes**
```firestore
collection: "recipes"
document: {recipeId}
├─ Basic Info
│  ├─ name: string
│  ├─ description: string
│  ├─ stageType: "stage_2_personas" | "stage_3_narrative" | ...
│  ├─ isActive: boolean
│  ├─ createdBy: string (userId)
│  ├─ createdAt: timestamp
│  └─ updatedAt: timestamp
│
├─ DAG Structure
│  ├─ nodes: [{
│  │   id, type, label, config,
│  │   inputMapping: {
│  │     "nodeInput": {
│  │       source: "external" | "node",
│  │       key: "input.campaignName" | "nodeId.outputKey"
│  │     }
│  │   },
│  │   outputKey: "string"
│  │ }]
│  │
│  └─ edges: [{
│      id, source: nodeId, target: nodeId
│    }]
│
└─ Configuration
   └─ executionConfig: { timeout, retryCount, parallelizable }
```

#### **recipe_executions**
```firestore
collection: "recipe_executions"
document: {executionId}
├─ Meta
│  ├─ recipeId: string
│  ├─ projectId: string (optional)
│  ├─ stageId: string (optional)
│  └─ input: { /* external input */ }
│
├─ Execution Status
│  └─ status: "running" | "completed" | "failed" | "cancelled"
│
├─ Results
│  └─ actionResults: [{
│      nodeId, nodeType, status,
│      output: { /* action result */ },
│      error: { message, code },
│      executionTime: number,
│      startedAt, completedAt
│    }]
│
└─ Context
   └─ executionContext: {
       startedAt: timestamp,
       completedAt: timestamp,
       duration: number,
       triggeredBy: string (userId)
     }
```

#### **allowlist**
```firestore
collection: "allowlist"
document: {email}
├─ email: string (primary key)
├─ addedAt: timestamp
├─ addedBy: string (userId)
└─ status: "active" | "inactive"
```

---

## Key Workflows

### Workflow 1: Creating & Executing a Project (6-Stage)

```
1. User logs in → HomePage → Start New Project

2. Stage 1: Campaign Details
   - Form input: campaignName, productDescription, targetAudience, etc.
   - Save to projects.campaignDetails
   - currentStageIndex = 1

3. Stage 2: Personas
   - Execute recipe: PERSONA_GENERATION_RECIPE
   - Input: campaignDetails from Stage 1
   - Output: 3 persona options with images
   - User selects 1-3 personas
   - Save to projects.userPersonaSelection

4. Stage 3: Narrative
   - Execute recipe: NARRATIVE_GENERATION_RECIPE
   - Input: selected personas, campaign details
   - Output: Multiple narrative options
   - User selects/customizes one
   - Save to projects.aiGeneratedNarrative

5. Stage 4: Storyboard
   - Execute recipe: STORYBOARD_GENERATION_RECIPE
   - Input: narrative, personas, campaign details
   - Output: Scene breakdown with descriptions
   - User customizes if needed
   - Save to projects.aiGeneratedStoryboard

6. Stage 5: Screenplay
   - Execute recipe: SCREENPLAY_GENERATION_RECIPE
   - Input: storyboard, narrative
   - Output: Full screenplay/script
   - User reviews/customizes
   - Save to projects.aiGeneratedScreenplay

7. Stage 6: Generate Video
   - Execute recipe: VIDEO_GENERATION_RECIPE
   - For each scene: Call VideoGenerationService (Veo3)
   - Poll for completion
   - Upload videos to GCS
   - Save to projects.aiGeneratedVideos
   - Project status → "completed"
```

---

### Workflow 2: Recipe-Based Action Execution

```
User Action: Execute RecipeEditor Test
│
├─ GET /api/recipes/:recipeId
│  └─ Load DAG structure
│
├─ POST /api/recipes/:recipeId/execute { input, projectId, stageId }
│  │
│  ├─ RecipeOrchestrator.executeRecipe()
│  │  │
│  │  ├─ DAGValidator.validate(nodes, edges)
│  │  │
│  │  ├─ DAGValidator.topologicalSort(nodes, edges)
│  │  │
│  │  ├─ For each node in sorted order:
│  │  │  │
│  │  │  ├─ Resolve inputs from inputMapping
│  │  │  │  ├─ External inputs: from request.input
│  │  │  │  └─ Node inputs: from previous nodeResults
│  │  │  │
│  │  │  ├─ ActionExecutor.executeAction(nodeType, nodeConfig, resolvedInputs)
│  │  │  │  ├─ Route to appropriate service based on nodeType
│  │  │  │  └─ Return: { output, status, executionTime, ... }
│  │  │  │
│  │  │  ├─ ActionResultTracker.logResult(nodeResult)
│  │  │  │
│  │  │  └─ Store result in nodeResults for downstream nodes
│  │  │
│  │  ├─ Store all results in recipe_executions document
│  │  └─ Return executionId
│  │
│  └─ Return: { executionId, status }
│
├─ GET /api/recipes/executions/:executionId (poll in UI)
│  └─ Return: { execution, actionResults, status }
│
└─ Display results in ExecutionResultsPanel
```

---

### Workflow 3: Image Generation (Persona)

```
ActionExecutor encounters action type: "generate_image"
│
├─ ImageGenerationService.generatePersonaImage({personaData})
│  │
│  ├─ Build detailed image prompt from:
│  │  ├─ persona.physicalAppearance
│  │  ├─ persona.personalityAndCommunication
│  │  └─ Style: "UGC portrait, diverse representation"
│  │
│  ├─ Call Gemini API:
│  │  └─ Generate image based on prompt
│  │
│  ├─ GCSService.uploadImage(imageBuffer, path)
│  │  └─ gs://pixology-personas/personas/{projectId}/{personaName}.png
│  │
│  ├─ GCSService.generatePublicUrl(path)
│  │  └─ Get signed URL for image access
│  │
│  └─ Return: { imageUrl: string, gcsPath: string }
│
└─ Store imageUrl in projects.aiGeneratedPersonas.personas[].image.url
```

---

### Workflow 4: Video Generation (Veo3)

```
ActionExecutor encounters action type: "generate_video"
│
├─ VideoGenerationService.generateVideo({sceneDescription, duration})
│  │
│  ├─ Call Vertex AI Veo3 API
│  │  ├─ Send: scene prompt, duration (4/6/8s), resolution (720p/1080p)
│  │  └─ Get: video ID for polling
│  │
│  ├─ Poll Veo3 for completion
│  │  ├─ Check status every 5-10 seconds
│  │  └─ Timeout: 5-10 minutes
│  │
│  ├─ Download video from Veo3
│  │
│  ├─ GCSService.uploadVideo(videoBuffer, path)
│  │  └─ gs://pixology-personas/videos/{projectId}/scene_{n}/{filename}.mp4
│  │
│  ├─ GCSService.generatePublicUrl(path)
│  │  └─ Get signed URL for video access
│  │
│  └─ Return: { videoUrl: string, gcsUri: string, duration: string }
│
└─ Store videoUrl in projects.aiGeneratedVideos.videos[].videoUrl
```

---

## Deployment Configuration

### Development Workflow
```bash
# Terminal 1: Frontend
npm run dev
# Starts Vite on http://localhost:8080
# Auto-reload on changes

# Terminal 2: Backend
npm run dev:server
# Starts Express on http://localhost:3000
# Auto-restart on changes via --watch

# Vite proxy: /api requests → http://localhost:3000
```

### Production Build
```bash
# Build React
npm run build
# Output: dist/ with bundled JS, CSS, assets

# Start Server
npm start
# Starts Express on port 3000 (from .env.production)
# Serves React build from dist/
```

### PM2 Deployment (ecosystem.config.cjs)
```bash
# Development
pm2 start ecosystem.config.cjs --env development

# Staging
pm2 start ecosystem.config.cjs --env staging

# Production
pm2 start ecosystem.config.cjs --env production
```

**Configuration by Environment**:
| Env | Port | Node Env | Process Name | Mem Limit |
|-----|------|----------|--------------|-----------|
| dev | 3000 | development | pixology-dev | N/A |
| staging | 3001 | staging | pixology-staging | 600MB |
| prod | 3000 | production | pixology | 600MB |

**Auto-restart Policy**:
- Restart on crash (max 10 retries)
- Restart if memory exceeds 600MB
- Listen timeout: 10s, kill timeout: 5s

---

## Important Files & Entry Points

### Frontend Entry Points
| File | Purpose |
|------|---------|
| `src/main.tsx` | Vite entry, mounts React app |
| `src/App.tsx` | Root component, providers setup |
| `src/app/router/index.tsx` | Route configuration |
| `src/features/storylab/pages/StorylabPage.tsx` | Main feature page |

### Backend Entry Points
| File | Purpose |
|------|---------|
| `server.js` | Express server, middleware setup |
| `api/auth.js` | OAuth endpoints |
| `api/projects.js` | Project CRUD endpoints |
| `api/recipes.js` | Recipe execution endpoints |
| `api/services/AgentService.js` | Main business logic facade |

### Configuration Files
| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `.env.production` | Production secrets |
| `vite.config.ts` | Frontend build config |
| `tsconfig.json` | TypeScript settings |
| `tailwind.config.ts` | Tailwind CSS settings |
| `ecosystem.config.cjs` | PM2 deployment config |

---

## Key Design Patterns

### 1. **Service Facade Pattern**
AgentService acts as single entry point for all recipe/project operations

### 2. **Layered Architecture**
Clear separation: Presentation → API Routes → Services → Data Access → Database

### 3. **DAG-Based Workflow Orchestration**
Flexible recipe system allows defining multi-step workflows as directed acyclic graphs

### 4. **Action-Based Extensibility**
New action types can be added by registering in ActionExecutor without changing orchestration logic

### 5. **Context-Driven Input Resolution**
Nodes reference inputs from:
- External request payload
- Previous node outputs
- Project context data

### 6. **Separation of Concerns**
- AI services (Gemini, Veo3) isolated in dedicated modules
- Storage operations abstracted through GCSService
- Database access through firestoreUtils

---

## Critical Environment Variables

```bash
# Authentication
VITE_GOOGLE_CLIENT_ID          # OAuth client ID
GOOGLE_APPLICATION_CREDENTIALS # Service account JSON path

# Backend API
PORT=3000                      # Server port
FIREBASE_PROJECT_ID            # Firestore project
GCP_PROJECT_ID                 # GCP project for Vertex AI
GCP_LOCATION                   # Region (e.g., 'us-central1')

# AI Services
GEMINI_API_KEY                 # Gemini API key
VEO3_SERVICE_ACCOUNT_KEY       # Separate service account for Veo3

# Storage
GCS_BUCKET_NAME                # GCS bucket (backend)
VITE_GCS_BUCKET_NAME           # GCS bucket (frontend access)

# URLs
VITE_API_URL                   # Backend API URL
VITE_STORYLINE_URL             # Frontend URL (for redirects)
```

---

## Notes for Architectural Changes

### Potential Extension Points

1. **New Action Types**: Add handler to ActionExecutor without modifying RecipeOrchestrator
2. **New Stages**: Add stage component + seed recipe + endpoints
3. **Workflow Customization**: Users can create custom recipes via RecipeEditor
4. **Multi-user Collaboration**: Extend projects.members for role-based access
5. **Async Processing**: Integrate with message queue (Redis, Pub/Sub) for long-running tasks
6. **Real-time Updates**: Add WebSocket for live execution status instead of polling
7. **Caching**: Add Redis layer for recipe definitions and execution results

### Modification Points

- **Add new AI service**: Create service in `api/services/`, register in ActionExecutor
- **New database collection**: Add schema docs here, update firestoreUtils
- **API endpoint changes**: Update route handlers + frontend services
- **Stage additions**: Add Stage7*, update StoryLab component tree + types

---

**Document Status**: Complete
**Last Review**: November 11, 2025
**Next Review Recommended**: After each architectural change
