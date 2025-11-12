# AI Adaptor Architecture Implementation Guide

This document provides a comprehensive guide to the new AI Adaptor architecture for Pixology's Story Lab application.

## Overview

The new architecture introduces a pluggable AI adapter system that decouples business logic from specific AI service implementations (Gemini, OpenAI, Anthropic, etc.). This enables:

- **Multi-Provider Support**: Switch between different AI providers without code changes
- **Per-Project Configuration**: Each project can specify different AI providers for different stages
- **Prompt Template Management**: Centralized prompt management with versioning
- **Cost Tracking**: Monitor API usage and costs across all providers
- **Dynamic Resolution**: Automatic fallback to default providers if project-specific config unavailable

## Architecture Components

### Phase 1: Foundation (AI Adaptors)

#### Files Created:
- `/api/services/adaptors/BaseAIAdaptor.js` - Abstract base class
- `/api/services/adaptors/GeminiAdaptor.js` - Google Gemini implementation
- `/api/services/adaptors/OpenAIAdaptor.js` - OpenAI (GPT/DALL-E) implementation
- `/api/services/adaptors/AnthropicAdaptor.js` - Anthropic Claude implementation
- `/api/services/adaptors/AdaptorRegistry.js` - Singleton registry
- `/api/services/AIAdaptorResolver.js` - Dynamic adaptor resolution
- `/api/services/adaptors/index.js` - Module initialization

#### Key Classes:

**BaseAIAdaptor** (Abstract)
```javascript
- generateText(prompt, options) → Promise<{text, usage}>
- generateImage(prompt, options) → Promise<{imageUrl, usage}>
- generateVideo(prompt, options) → Promise<{videoUrl, usage}>
- validateConfig(config) → boolean
- healthCheck() → Promise<boolean>
```

**AdaptorRegistry** (Singleton)
```javascript
- register(adaptorId, AdaptorClass)
- getAdaptor(adaptorId, modelId, credentials, config)
- getAvailableModels(adaptorId)
- getModelInfo(adaptorId, modelId)
```

**AIAdaptorResolver** (Singleton)
```javascript
- resolveAdaptor(projectId, stageType, capability, db)
  → Returns {adaptorId, modelId, adaptor, config, source}
```

### Phase 2: Prompt Management

#### Files Created:
- `/api/services/PromptManager.js` - Singleton for prompt resolution
- `/api/services/PromptTemplateService.js` - CRUD for Firestore templates

#### Key Features:
- Template resolution chain: project override → project version → global default
- Variable substitution with {variableName} syntax
- Support for system prompt + user prompt template
- Output format specification (text, json)
- Version management and history

#### Firestore Collections:
```
prompt_templates/
  - id: string
  - stageType: string (e.g., "stage_2_personas")
  - version: number
  - prompts: {textGeneration, imageGeneration, videoGeneration}
  - variables: [{name, description, placeholder}]
  - isDefault: boolean
  - isActive: boolean

project_ai_config/
  - projectId: string
  - stageAdaptors: {stage_2_personas: {textGeneration: {adaptorId, modelId}}}
  - adaptorParameters: {stage_2_personas: {gemini: {temperature, maxTokens}}}
  - promptOverrides: {stage_2_personas: {prompts: {}}}
```

### Phase 3: Service Refactoring

#### Files Created:
- `/api/services/ActionExecutorV2.js` - Refactored action execution
- `/api/services/PersonaGenerationServiceV2.js` - Adaptor-aware personas
- `/api/services/NarrativeGenerationServiceV2.js` - Adaptor-aware narratives
- `/api/services/StoryboardGenerationServiceV2.js` - Adaptor-aware storyboards
- `/api/services/ScreenplayGenerationServiceV2.js` - Adaptor-aware screenplays
- `/api/services/VideoGenerationServiceV2.js` - Adaptor-aware video generation

#### Service Pattern:
All V2 services follow this pattern:
```javascript
1. Resolve appropriate adaptor via AIAdaptorResolver
2. Get prompt template via PromptManager
3. Resolve template variables
4. Call adaptor.generateX() method
5. Parse/validate response
6. Store in Firestore with adaptor/model metadata
```

### Phase 4: Frontend Components

#### Files Created:
- `/src/features/storylab/components/adaptor/AdaptorSelector.tsx`
- `/src/features/storylab/components/adaptor/ModelInfoCard.tsx`
- `/src/features/storylab/components/adaptor/AdaptorConfigPanel.tsx`
- `/src/features/storylab/components/adaptor/UsageTrackerPanel.tsx`
- `/src/features/storylab/components/adaptor/PromptTemplateEditor.tsx`
- `/src/features/storylab/components/adaptor/AdaptorSettingsPage.tsx`

#### Components:
- **AdaptorSelector**: Select AI provider and model for a stage/capability
- **ModelInfoCard**: Display model capabilities, pricing, and context window
- **AdaptorConfigPanel**: Configure temperature, max tokens, penalties
- **UsageTrackerPanel**: Monitor usage and costs across adaptors
- **PromptTemplateEditor**: Create/edit prompt templates with variables
- **AdaptorSettingsPage**: Unified dashboard for all settings

### Phase 5: API Endpoints

#### Files Created:
- `/api/adaptors.js` - Adaptor management endpoints
- `/api/prompts.js` - Prompt template endpoints
- `/api/usage.js` - Usage tracking endpoints

#### Key Endpoints:

**Adaptors API**
- `GET /api/adaptors/available` - List available adaptors for capability
- `POST /api/adaptors/config` - Save adaptor selection for stage
- `POST /api/adaptors/config/parameters` - Save adaptor parameters
- `GET /api/adaptors/config` - Get current adaptor configuration
- `POST /api/adaptors/health` - Check adaptor health status

**Prompts API**
- `GET /api/prompts/templates` - List templates for stage
- `GET /api/prompts/templates/:id` - Get specific template
- `POST /api/prompts/templates` - Create/update template
- `PUT /api/prompts/templates/:id` - Update template
- `DELETE /api/prompts/templates/:id` - Delete template
- `POST /api/prompts/override` - Save project override
- `DELETE /api/prompts/override` - Remove override
- `GET /api/prompts/variables` - Get available variables

**Usage API**
- `POST /api/usage/track` - Record API usage
- `GET /api/usage/stats` - Get aggregated statistics
- `GET /api/usage/timeline` - Get usage over time
- `GET /api/usage/costs` - Get cost breakdown

## Configuration Flow

### Project Setup

1. **Initialize Project AI Config**
```javascript
// Creates project_ai_config document with defaults
{
  projectId: "project123",
  stageAdaptors: {
    stage_2_personas: {
      textGeneration: { adaptorId: "gemini", modelId: "gemini-2.0-flash" }
    }
  }
}
```

2. **Set Adaptor Parameters** (Optional)
```javascript
// Override default temperature, max tokens, etc.
{
  adaptorParameters: {
    stage_2_personas: {
      gemini: { temperature: 0.7, maxTokens: 4000 }
    }
  }
}
```

3. **Set Prompt Override** (Optional)
```javascript
// Use project-specific prompts instead of defaults
{
  promptOverrides: {
    stage_2_personas: {
      prompts: { textGeneration: { systemPrompt: "...", userPromptTemplate: "..." } }
    }
  }
}
```

### Resolution Flow

When a service needs to generate content:

```
1. AIAdaptorResolver.resolveAdaptor(projectId, stageType, capability, db)
   ↓
2. Check project_ai_config for stage/capability configuration
   ↓
3. If not found, use environment variable defaults (GEMINI_API_KEY, OPENAI_API_KEY, etc.)
   ↓
4. Return {adaptorId, modelId, adaptor instance, config, source}
   ↓
5. Service calls adaptor.generateX(prompt, config)
   ↓
6. Response stored in Firestore with metadata
```

## Usage Examples

### Example 1: Generate Personas with Custom Adaptor

```javascript
// Frontend: AdaptorSettingsPage sets this
await fetch('/api/adaptors/config', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'project123',
    stageType: 'stage_2_personas',
    capability: 'textGeneration',
    adaptorId: 'openai',
    modelId: 'gpt-4-turbo'
  })
});

// Backend: PersonaGenerationServiceV2
const result = await PersonaGenerationServiceV2.generatePersonas(
  'project123',
  {
    productDescription: '...',
    targetAudience: '...',
    numberOfPersonas: 3
  },
  db
);
// Returns:
// {
//   personas: [...],
//   adaptor: 'openai',
//   model: 'gpt-4-turbo',
//   usage: {inputTokens: 1234, outputTokens: 5678}
// }
```

### Example 2: Use Project-Specific Prompt

```javascript
// Save override
await fetch('/api/prompts/override', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'project123',
    stageType: 'stage_2_personas',
    promptTemplate: {
      systemPrompt: 'Custom system prompt...',
      userPromptTemplate: 'Custom user prompt with {variables}...'
    }
  })
});

// PromptManager automatically uses it in next call
const template = await PromptManager.getPromptTemplate(
  'stage_2_personas',
  'project123',
  db
);
// Returns: {source: 'project_override', prompts: {...}}
```

### Example 3: Track Usage and Costs

```javascript
// After generating content
await fetch('/api/usage/track', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'project123',
    adaptorId: 'openai',
    modelId: 'gpt-4-turbo',
    stageType: 'stage_2_personas',
    inputTokens: 1234,
    outputTokens: 5678,
    cost: 0.042,
    success: true
  })
});

// Get stats
const stats = await fetch('/api/usage/stats?projectId=project123&period=month');
// Returns: {stats: [{adaptorId, modelId, totalCost, totalRequests, ...}]}
```

## Environment Variables

Required for each adaptor:

```bash
# Gemini
GEMINI_API_KEY=your_gemini_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# GCS (for file storage)
GCS_BUCKET_NAME=pixology-bucket
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Migration from Old System

The old system (hardcoded GeminiService calls) is gradually replaced:

1. New recipes use V2 services (PersonaGenerationServiceV2, etc.)
2. Old recipes can coexist but won't benefit from multi-provider support
3. Complete migration happens when recipes are updated to use ActionExecutorV2

### For Existing Projects:

1. Default adaptor resolves to Gemini (from GEMINI_API_KEY)
2. Projects can override by setting project_ai_config
3. No breaking changes - existing functionality preserved

## Extending with New Providers

To add a new AI provider:

1. Create new adaptor in `/api/services/adaptors/MyProviderAdaptor.js`:
```javascript
const BaseAIAdaptor = require('./BaseAIAdaptor');

class MyProviderAdaptor extends BaseAIAdaptor {
  async generateText(prompt, options) { /* ... */ }
  async generateImage(prompt, options) { /* ... */ }

  static getAvailableModels() { return ['model1', 'model2']; }
  static getModelInfo(modelId) { /* ... */ }
}
```

2. Register in `/api/services/adaptors/index.js`:
```javascript
AdaptorRegistry.register('myprovider', MyProviderAdaptor);
```

3. Add environment variable: `MYPROVIDER_API_KEY`

4. Update ADaptorResolver fallback logic if needed

## Cost Estimation

Each adaptor provides pricing information:

```javascript
// GeminiAdaptor
{
  inputTokenPrice: 0.075 / 1_000_000,   // $0.075 per 1M tokens
  outputTokenPrice: 0.3 / 1_000_000,    // $0.3 per 1M tokens
}

// Used for real-time cost display in UI
estimatedCost = (inputTokens/1M * inputPrice) + (outputTokens/1M * outputPrice)
```

## Troubleshooting

### Adaptor Not Found
- Check `AdaptorRegistry.getAllAdaptors()` - verify adaptor is registered
- Verify environment variable is set (e.g., GEMINI_API_KEY)

### Prompt Variables Not Substituted
- Verify variable syntax: `{variableName}` (exact case match)
- Check PromptManager logs for "Unresolved variables"

### Usage Tracking Not Working
- Verify `POST /api/usage/track` is called after generation
- Check Firestore usage_records collection for records

### Project Config Not Applied
- Check project_ai_config in Firestore exists for projectId
- Verify stageAdaptors structure matches expected format

## Next Steps

1. Update existing API routes to use new services
2. Integrate AdaptorSettingsPage into dashboard
3. Create user documentation for configuration
4. Set up monitoring for adaptor health
5. Implement cost alerts when thresholds exceeded
