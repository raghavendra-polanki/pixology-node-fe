# AIAdaptor Architecture Migration Plan

**Project**: Pixology Node Frontend - Major Architectural Refactoring
**Status**: Planning Phase
**Date**: November 11, 2025
**Target Branch**: `feature/ai-adaptor-architecture`
**Estimated Duration**: 4-6 weeks

---

## Executive Summary

This document outlines a comprehensive migration from the current **direct AI service integration** architecture to a **multi-provider AIAdaptor abstraction layer** with configurable prompt templates.

### Key Changes:
- ✅ **From**: Direct GeminiService → Specific services (Image, Video)
- ✅ **To**: Abstracted AIAdaptor pattern → Multiple providers (Gemini, OpenAI, Anthropic, etc.)
- ✅ **From**: Hardcoded prompts in code
- ✅ **To**: Firestore-stored prompt templates with versioning
- ✅ **From**: Single service per capability
- ✅ **To**: Pluggable adaptor per capability per stage
- ✅ **From**: Fixed project configuration
- ✅ **To**: Per-project, per-stage adapter + model selection

### Impact Scope:
- **Backend**: 8-10 services modified/created
- **Database**: 3 new collections, 2 existing updated
- **Frontend**: 5-6 new components, updates to 4 existing
- **API**: 12 new endpoints, 4 modified endpoints
- **Data Migration**: Firestore migration script required

---

## Phase Breakdown

### Phase 1: Foundation (Week 1-2)
- Create AIAdaptor abstraction layer
- Implement provider registry
- Create adaptor implementations
- Set up new Firestore collections

### Phase 2: Prompt Templates (Week 2)
- Create prompt template system
- Migrate hardcoded prompts to DB
- Build prompt manager service
- Create frontend UI

### Phase 3: Service Refactoring (Week 3)
- Refactor stage services
- Update ActionExecutor
- Update RecipeOrchestrator
- Remove direct service calls

### Phase 4: Frontend Updates (Week 3-4)
- Create adaptor selector components
- Create prompt template editor
- Update stage components
- Update configuration UI

### Phase 5: API Updates (Week 4)
- Implement adaptor management endpoints
- Implement prompt management endpoints
- Add project config endpoints
- Add usage tracking endpoints

### Phase 6: Testing & Migration (Week 5-6)
- Comprehensive testing
- Firestore migration scripts
- Data validation
- Rollback procedures
- Deploy & monitor

---

## Detailed Architecture Changes

### Current Architecture
```
Stage Component
    ↓
Project Service (API call)
    ↓
Recipe Endpoint
    ↓
RecipeOrchestrator
    ↓
ActionExecutor (hardcoded routing)
    ↓
GeminiService / ImageGenerationService / VideoGenerationService
    ↓
External AI APIs
```

### New Architecture
```
Stage Component
    ↓
Project Service (API call)
    ↓
Recipe Endpoint
    ↓
RecipeOrchestrator
    ↓
ActionExecutor (adaptor routing)
    ↓
AIAdaptorResolver (project-specific config)
    ↓
Adaptor Instance (GeminiAdaptor / OpenAIAdaptor / AnthropicAdaptor / etc.)
    ↓
PromptManager (template resolution + variable substitution)
    ↓
External AI APIs
```

---

## Phase 1: Foundation - AIAdaptor System

### 1.1 Create BaseAIAdaptor Abstract Class

**File**: `api/services/adaptors/BaseAIAdaptor.js`

```javascript
class BaseAIAdaptor {
  constructor(modelId, config = {}, credentials = {}) {
    this.modelId = modelId;
    this.config = config;
    this.credentials = credentials;
  }

  // Execution methods
  async generateText(prompt, options = {}) { throw new Error('Not implemented'); }
  async generateImage(prompt, options = {}) { throw new Error('Not implemented'); }
  async generateVideo(prompt, options = {}) { throw new Error('Not implemented'); }

  // Validation
  validateConfig(config) { throw new Error('Not implemented'); }

  // Utilities
  async getUsage() { throw new Error('Not implemented'); }
  async healthCheck() { throw new Error('Not implemented'); }
  estimateCost(inputTokens, outputTokens) { throw new Error('Not implemented'); }

  // Static methods
  static async getAvailableModels() { throw new Error('Not implemented'); }
  static async getModelInfo(modelId) { throw new Error('Not implemented'); }
}
```

### 1.2 Create Adaptor Implementations

**Files**:
- `api/services/adaptors/GeminiAdaptor.js` (extends BaseAIAdaptor)
- `api/services/adaptors/OpenAIAdaptor.js` (extends BaseAIAdaptor)
- `api/services/adaptors/AnthropicAdaptor.js` (extends BaseAIAdaptor)

Each implements:
- `generateText(prompt, options)`
- `generateImage(prompt, options)` (with capability checking)
- `generateVideo(prompt, options)` (with capability checking)
- `validateConfig(config)`
- `healthCheck()`
- `estimateCost(inputTokens, outputTokens)`

### 1.3 Create Adaptor Registry

**File**: `api/services/adaptors/AdaptorRegistry.js`

```javascript
class AdaptorRegistry {
  constructor() {
    this.adaptors = new Map();
  }

  register(adaptorId, AdaptorClass) { }
  async getAdaptor(adaptorId, modelId, credentials, config = {}) { }
  async getAvailableModels(adaptorId) { }
  async getModelInfo(adaptorId, modelId) { }
  getAllAdaptors() { }
  hasAdaptor(adaptorId) { }
}
```

### 1.4 Create AIAdaptorResolver

**File**: `api/services/AIAdaptorResolver.js`

```javascript
class AIAdaptorResolver {
  async resolveAdaptor(projectId, stageType, capability) {
    // Returns: { adaptorId, modelId, adaptor, config, credentials }
  }

  async listAvailableAdaptors() { }
  getGlobalCredentials(adaptorId) { }
}
```

### 1.5 Create New Firestore Collections

**Collections**:
1. `ai_adaptors` - Adaptor definitions, models, capabilities
2. `prompt_templates` - Prompt templates with versioning
3. `project_ai_config` - Project-specific adaptor + model selections

---

## Phase 2: Prompt Templates

### 2.1 Create Prompt Template System

**File**: `api/services/PromptManager.js`

```javascript
class PromptManager {
  async getPromptTemplate(stageType, projectId) {
    // Returns: { templateId, prompts: { capability: {...} }, source, ... }
  }

  async savePromptOverride(projectId, stageType, customPrompts) { }
  async listAvailableTemplates(stageType) { }
  resolvePromptVariables(template, variables) { }
}
```

### 2.2 Migrate Hardcoded Prompts

**Source files to migrate from**:
- `api/services/RecipeSeedData.js` (1000+ lines of prompt templates)
- `api/services/geminiService.js` (fallback prompts)

**Migration process**:
1. Extract each prompt from RecipeSeedData
2. Create PromptTemplate documents in Firestore
3. Store with versioning (v1, v2, etc.)
4. Tag by stageType and capability
5. Set defaults

### 2.3 Create Prompt Template Firestore Documents

**Structure** (per stage):
```firestore
collection: "prompt_templates"
document: "pt_stage2_personas_v1"
{
  stageType: "stage_2_personas",
  version: 1,
  name: "Default Persona Generator",
  prompts: {
    "textGeneration": {
      systemPrompt: string,
      userPromptTemplate: string,
      outputFormat: "json"
    },
    "imageGeneration": {
      systemPrompt: string,
      userPromptTemplate: string
    }
  },
  isDefault: true,
  createdAt: timestamp
}
```

---

## Phase 3: Service Refactoring

### 3.1 Refactor ActionExecutor

**Current** (lines 60-120 in ActionExecutor.js):
```javascript
switch (node.type) {
  case 'text_generation':
    result = await GeminiService.generateTextFromGemini(prompt, config);
    break;
  case 'image_generation':
    result = await ImageGenerationService.generateImage(prompt);
    break;
  // hardcoded routing
}
```

**New**:
```javascript
switch (node.type) {
  case 'text_generation':
    const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId, stageType, 'textGeneration'
    );
    result = await textAdaptor.adaptor.generateText(prompt, config);
    break;
  case 'image_generation':
    const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
      projectId, stageType, 'imageGeneration'
    );
    result = await imageAdaptor.adaptor.generateImage(prompt, config);
    break;
}
```

### 3.2 Update Stage Services

**Files to refactor**:
- `api/services/PersonaGenerationService.js` - Now uses TextAdaptor + ImageAdaptor
- `api/services/NarrativeGenerationService.js` - Uses TextAdaptor
- `api/services/StoryboardGenerationService.js` - Uses TextAdaptor + ImageAdaptor
- `api/services/ScreenplayGenerationService.js` - Uses TextAdaptor
- `api/services/VideoGenerationService.js` - Now uses VideoAdaptor

**Change pattern**:
1. Resolve adaptor from AIAdaptorResolver
2. Get prompt template from PromptManager
3. Resolve template variables
4. Call adaptor.generateText/generateImage/generateVideo
5. Store result with adaptor/model metadata

### 3.3 Deprecate/Remove Direct Service Calls

**Deprecate** (keep for backward compatibility):
- `GeminiService.generateTextFromGemini()` - Replace with TextAdaptor
- `ImageGenerationService.generateImage()` - Replace with ImageAdaptor
- `VideoGenerationService.generateVideoWithVeo()` - Replace with VideoAdaptor

**Keep** (utility functions):
- JSON parsing helpers
- Image buffer handling
- Rate limiting utilities

---

## Phase 4: Frontend Updates

### 4.1 New Components

1. **AdaptorSelector.tsx** - Select adaptor + model for capability
2. **PromptTemplateEditor.tsx** - Edit prompt templates
3. **AdaptorConfigPanel.tsx** - Configure adaptor-specific options
4. **ModelInfoCard.tsx** - Display model capabilities/costs
5. **UsageTrackerPanel.tsx** - Show adaptor usage per stage

### 4.2 Updated Components

1. **StorylabPage.tsx** - Add settings button for adaptor config
2. **Stage2Personas.tsx** - Display which adaptor is being used
3. **Stage3Narratives.tsx** - Show adaptor during generation
4. **Stage4Storyboard.tsx** - Show adaptor metadata
5. **Stage5Screenplay.tsx** - Show adaptor in status

### 4.3 New Pages

**AdaptorSettingsPage.tsx**:
```typescript
/projects/{projectId}/settings/adaptors

Shows:
- Stage 2: Text (Gemini), Image (OpenAI)
- Stage 3: Text (Claude)
- Stage 4: Text (Gemini), Image (OpenAI)
- Stage 5: Text (Claude)
- Stage 6: Video (OpenAI)

Each with [Change Adaptor] [Configure] buttons
```

**PromptTemplateEditorPage.tsx**:
```typescript
/projects/{projectId}/settings/prompts

Shows:
- Per-stage prompt templates
- System prompt editor
- User prompt editor with variable hints
- [Save] [Test] [Revert] buttons
```

---

## Phase 5: API Endpoints

### 5.1 New Endpoints

**Adaptor Management** (`/api/ai-adaptors/`):
```
GET    /adaptors
GET    /adaptors/:adaptorId
GET    /adaptors/:adaptorId/models
GET    /adaptors/:adaptorId/models/:modelId
POST   /adaptors/:adaptorId/test-health
```

**Project Adaptor Config** (`/api/projects/:projectId/adaptors/`):
```
GET    /
PUT    /stage/:stageType/:capability
POST   /stage/:stageType/:capability/test
GET    /usage
```

**Prompt Templates** (`/api/prompts/`):
```
GET    /templates
GET    /templates/:templateId
GET    /templates/stage/:stageType
POST   /templates (create new)
PUT    /templates/:templateId (update)
POST   /templates/:templateId/versions (create version)
GET    /templates/:templateId/versions
```

**Project Prompts** (`/api/projects/:projectId/prompts/`):
```
GET    /
GET    /:stageType
PUT    /:stageType (override)
DELETE /:stageType (remove override)
POST   /:stageType/test (test with sample input)
```

### 5.2 Modified Endpoints

**Projects** (`/api/projects/`):
```
GET    /:projectId
PUT    /:projectId
  Changes: Now returns adaptor info in response
```

**Recipes** (`/api/recipes/`):
```
POST   /:recipeId/execute
  Changes: Passes projectId for adaptor resolution
```

---

## Phase 6: Testing & Migration

### 6.1 Migration Strategy

**Firestore Data Migration**:
1. Create new collections in parallel (backward compatible)
2. Seed new collections with default data
3. Migrate project configurations
4. Validate data integrity
5. Switch routing to new system
6. Archive old collections (keep for 30 days)

### 6.2 Migration Script

**File**: `scripts/migrate-to-ai-adaptor-architecture.js`

```javascript
async function migrateToAdaptorArchitecture() {
  // 1. Create AI adaptors collection with default entries
  // 2. Create prompt templates collection
  // 3. Create ai_adaptor_config for existing projects
  // 4. Validate all projects have config
  // 5. Run data integrity checks
  // 6. Generate rollback instructions
}
```

### 6.3 Rollback Procedure

**If migration fails**:
1. Keep old collections: `projects_old`, `recipes_old`
2. Switch routing back to old services
3. Investigate issue
4. Fix and re-migrate
5. Validate before cutover

---

## Firestore Collections - New/Modified

### New Collections

#### `ai_adaptors`
```
{
  id: "gemini" | "openai" | "anthropic",
  name: "Google Gemini",
  company: "Google",
  type: "multimodal",
  models: [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      capabilities: { textGeneration: true, imageGeneration: false, ... },
      contextWindow: 1000000,
      costPer1MTokens: { input: 0.075, output: 0.3 },
      isLatest: true
    }
  ],
  configSchema: { apiKey, temperature, ... },
  isActive: true,
  healthStatus: "healthy"
}
```

#### `prompt_templates`
```
{
  id: "pt_stage2_personas_v1",
  stageType: "stage_2_personas",
  version: 1,
  name: "Default Persona Generator",
  prompts: {
    textGeneration: { systemPrompt, userPromptTemplate, outputFormat },
    imageGeneration: { systemPrompt, userPromptTemplate }
  },
  isDefault: true,
  createdAt: timestamp
}
```

#### `project_ai_config`
```
{
  projectId: "proj_123",
  defaultAdaptor: "gemini",
  defaultModel: "gemini-2.0-flash",
  stageConfigs: {
    "stage_2_personas": {
      textGeneration: { adaptor: "gemini", model: "...", config: {...} },
      imageGeneration: { adaptor: "openai", model: "...", config: {...} }
    }
  },
  adaptorCredentials: { gemini: { apiKey }, openai: { apiKey } },
  usage: { /* tracking data */ },
  createdAt: timestamp
}
```

### Modified Collections

#### `projects` (existing)
```
Changes:
- Add field: aiAdaptorConfig (reference to project_ai_config)
- Keep existing aiGeneratedPersonas, etc. (for backward compat)
- Add field: adaptorMetadata { adaptor: "...", model: "...", cost: ... }
```

#### `prompt_versions` (new sub-collection)
```
Under each project document:
projectId/prompt_versions/{stageType}
- Stores version history of prompt overrides
- Allows rollback to previous prompts
- Tracks who changed what when
```

---

## Environment Variables - New/Modified

### New Variables
```bash
# Global adaptor credentials (fallback)
GEMINI_API_KEY=...
OPENAI_API_KEY=...
OPENAI_ORG_ID=...
ANTHROPIC_API_KEY=...

# Encryption for project-specific credentials
CREDENTIALS_ENCRYPTION_KEY=...

# Adaptor configuration
DEFAULT_AI_ADAPTOR=gemini
DEFAULT_AI_MODEL=gemini-2.0-flash
```

### Modified Variables
```bash
# Keep existing for backward compatibility
GEMINI_API_KEY (now used by GeminiAdaptor)
```

---

## File Structure Changes

### New Files
```
api/services/
├── adaptors/
│   ├── BaseAIAdaptor.js (new)
│   ├── GeminiAdaptor.js (new)
│   ├── OpenAIAdaptor.js (new)
│   ├── AnthropicAdaptor.js (new)
│   └── AdaptorRegistry.js (new)
├── AIAdaptorResolver.js (new)
├── PromptManager.js (new)
├── PromptTemplateService.js (new)
└── [existing services updated]

src/features/storylab/
├── components/
│   ├── AdaptorSelector.tsx (new)
│   ├── PromptTemplateEditor.tsx (new)
│   ├── AdaptorConfigPanel.tsx (new)
│   └── [existing components updated]
└── pages/
    ├── AdaptorSettingsPage.tsx (new)
    └── PromptTemplateEditorPage.tsx (new)

api/
├── adaptors.js (new - router)
├── prompts.js (new - router)
└── [existing routers updated]

scripts/
├── migrate-to-ai-adaptor-architecture.js (new)
├── rollback-adaptor-migration.js (new)
└── validate-adaptor-config.js (new)
```

### Files to Deprecate (keep for 1 version)
```
api/services/
├── geminiService.js (replace with GeminiAdaptor)
├── imageGenerationService.js (replace with adaptors)
└── RecipeSeedData.js (replace with PromptManager + DB)
```

---

## Testing Strategy

### Unit Tests
- BaseAIAdaptor abstraction
- Each adaptor implementation
- PromptManager template resolution
- AdaptorRegistry functionality

### Integration Tests
- ActionExecutor with adaptors
- Stage services with adaptors
- Recipe execution with adaptors
- Prompt template loading

### E2E Tests
- Full workflow with Gemini adaptor
- Switch adaptor mid-workflow
- Project configuration persistence
- Prompt override functionality

### Migration Tests
- Data migration correctness
- Firestore schema validation
- Backward compatibility checks
- Rollback procedures

---

## Risk Assessment & Mitigation

### High Risk
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing recipes | Project failures | Keep old services, gradual migration |
| Data loss during migration | Permanent damage | Full backup, validation script |
| API breakage | Frontend errors | Versioning, backward compat layer |

### Medium Risk
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Adaptor credential leakage | Security breach | Encryption, secrets manager |
| Model cost increases | Budget overrun | Usage tracking, alerts |
| Adaptor unavailability | Service degradation | Fallback to default, health checks |

### Low Risk
| Risk | Impact | Mitigation |
|------|--------|-----------|
| UI complexity | UX issues | Comprehensive design review |
| Performance overhead | Slower execution | Caching, monitoring |

---

## Success Criteria

- ✅ All stages work with at least Gemini and OpenAI adaptors
- ✅ Projects can select different adaptors per stage
- ✅ Prompts can be customized per project
- ✅ Usage tracking works for cost analysis
- ✅ Firestore migration completes successfully
- ✅ Zero data loss during migration
- ✅ Backward compatibility for 1 version
- ✅ E2E tests pass for all workflows
- ✅ Performance within acceptable range
- ✅ Security review completed

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **1: Foundation** | 1-2 weeks | Adaptors, Registry, Resolver |
| **2: Prompts** | 1 week | PromptManager, Firestore migration |
| **3: Services** | 1 week | ActionExecutor, Stage services |
| **4: Frontend** | 1-2 weeks | UI components, pages |
| **5: API** | 1 week | New endpoints, integrations |
| **6: Testing/Migration** | 1-2 weeks | Tests, migration script, deploy |
| **Total** | **4-6 weeks** | Full production deployment |

---

## Next Steps

1. ✅ Review & approve this plan
2. Create git branch: `feature/ai-adaptor-architecture`
3. Phase 1: Implement BaseAIAdaptor and adaptors
4. Phase 2: Create PromptManager and templates
5. Continue through phases 3-6
6. Deploy to production with monitoring

---

## Appendices

### A. Current Service Method Signatures

**GeminiService**:
```javascript
generateTextFromGemini(prompt, options)
generatePersonaDescription(productDescription, targetAudience, personaNumber, customPrompt)
generateMultiplePersonasInSingleCall(productDescription, targetAudience, numberOfPersonas, customPrompt)
generateNarrativesInSingleCall(productDescription, targetAudience, numberOfNarratives, selectedPersonas, customPrompt)
generateStoryScenesInSingleCall(productDescription, targetAudience, selectedPersonaName, ...)
generateScreenplayFromStoryboard(storyboardScenes, videoDuration, selectedPersonaName, customPrompt)
```

**ImageGenerationService**:
```javascript
generatePersonaImage(imagePrompt)
generateMultiplePersonaImages(prompts)
generateSceneImage(sceneDescription, personaName, personaImageBuffer, previousSceneImageBuffer)
generateMultipleSceneImages(scenes, personaName, personaImageBuffer)
```

**VideoGenerationService**:
```javascript
generateVideoWithVeo(imageBase64, sceneData, projectId, sceneIndex)
callPythonVideoGenerationAPI(prompt, duration_seconds, quality)
generateVideoWithVeo3DirectAPI(params)
```

### B. Adaptor Interface Mapping

```
Current: GeminiService.generateTextFromGemini()
New:     GeminiAdaptor.generateText()

Current: ImageGenerationService.generateImage()
New:     ImageAdaptor.generateImage()
         (Adaptor dispatches to appropriate service based on model)

Current: VideoGenerationService.generateVideoWithVeo()
New:     VideoAdaptor.generateVideo()
         (Adaptor selects between Python backend / Direct API)
```

### C. Credential Management

**Current**: Environment variables + inline API calls
**New**:
- Global defaults from environment
- Project-specific overrides in Firestore
- Encrypted storage for sensitive data
- Credentials keyed by adaptor ID

