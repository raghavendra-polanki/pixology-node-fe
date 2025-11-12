# AI Adaptor Architecture Integration Guide

## Overview

The new AI Adaptor architecture has been integrated into the frontend. This guide explains how to use the adaptor system in stage components and throughout the application.

## Architecture Components

### 1. **AdaptorService** (`/src/shared/services/adaptorService.ts`)
- Handles all API calls related to adaptors
- Methods:
  - `getAvailableAdaptors(projectId, capability)` - Get available adaptors
  - `saveAdaptorSelection(projectId, stageType, capability, adaptorId, modelId)` - Save selection
  - `getAdaptorConfig(projectId, stageType, adaptorId)` - Get adaptor config
  - `saveAdaptorParameters(projectId, stageType, adaptorId, config)` - Save parameters
  - `getUsageStats(projectId, period)` - Get usage statistics
  - `savePromptTemplate(projectId, stageType, template)` - Save prompt template
  - `getPromptTemplate(projectId, stageType, templateId)` - Get a template
  - `listPromptTemplates(projectId, stageType)` - List all templates
  - `deletePromptTemplate(projectId, templateId)` - Delete a template
  - `getModelInfo(adaptorId, modelId)` - Get model information
  - `getAllAdaptors()` - Get all adaptors

### 2. **useAdaptorConfig Hook** (`/src/features/storylab/hooks/useAdaptorConfig.ts`)
- React hook for managing adaptor state
- Usage:
```typescript
const {
  adaptors,
  selectedAdaptorId,
  selectedModelId,
  config,
  usageStats,
  promptTemplates,
  isLoading,
  isSaving,
  error,
  loadAdaptors,
  selectAdaptor,
  updateAdaptorConfig,
  loadUsageStats,
  loadPromptTemplates,
  savePromptTemplate,
  deletePromptTemplate,
  reset,
} = useAdaptorConfig({
  projectId: 'project-id',
  stageType: 'stage_2_personas',
  capability: 'textGeneration'
});
```

### 3. **AdaptorContext** (`/src/shared/contexts/AdaptorContext.tsx`)
- React Context for sharing adaptor state across components
- Usage:
```typescript
import { useAdaptorContext } from '@/shared/contexts/AdaptorContext';

function MyComponent() {
  const { selectedAdaptor, selectAdaptor } = useAdaptorContext();
  // ...
}
```
- Must wrap the component tree with `<AdaptorProvider projectId={projectId}>`

### 4. **Adaptor Components**
Located in `/src/features/storylab/components/adaptor/`:
- **AdaptorSelector** - Select from available adaptors and models
- **ModelInfoCard** - Display model information and pricing
- **AdaptorConfigPanel** - Configure adaptor parameters
- **UsageTrackerPanel** - Track usage and costs
- **PromptTemplateEditor** - Create/edit prompt templates
- **AdaptorSettingsPage** - Main settings page (all tabs combined)
- **AdaptorSettingsModal** - Modal wrapper for the settings page

### 5. **Integration Points**

#### In WorkflowView
The workflow view now has an "AI Adaptor Settings" button in the left sidebar that opens the AdaptorSettingsModal.

#### Location: `/src/features/storylab/components/WorkflowView.tsx`
```typescript
<AdaptorSettingsModal
  projectId={projectId}
  isOpen={isAdaptorSettingsOpen}
  onClose={() => setIsAdaptorSettingsOpen(false)}
/>
```

## How to Use in Stage Components

### Example: Integrating Adaptor Selection in Stage2Personas

```typescript
import { useAdaptorConfig } from '@/features/storylab/hooks/useAdaptorConfig';

export function Stage2Personas({ project, ...props }: Stage2Props) {
  // Load adaptor configuration
  const {
    adaptors,
    selectedAdaptorId,
    selectedModelId,
    loadAdaptors,
    selectAdaptor,
  } = useAdaptorConfig({
    projectId: project.id,
    stageType: 'stage_2_personas',
    capability: 'textGeneration'
  });

  // Load adaptors when component mounts
  useEffect(() => {
    loadAdaptors('textGeneration');
  }, []);

  // Use the selected adaptor when generating personas
  const handleGeneratePersonas = async () => {
    if (!selectedAdaptorId) {
      alert('Please select an adaptor first');
      return;
    }

    try {
      // Call API with selected adaptor
      const response = await fetch('/api/recipes/stage_2_personas/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
          'X-Adaptor-Id': selectedAdaptorId,
          'X-Model-Id': selectedModelId || '',
        },
        body: JSON.stringify({
          projectId: project.id,
          // ... other payload
        }),
      });

      const data = await response.json();
      // Handle response
    } catch (error) {
      console.error('Error generating personas:', error);
    }
  };

  // Show adaptor selector UI
  return (
    <div>
      {!selectedAdaptorId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
          <p className="text-blue-800">
            Please configure an AI adaptor before generating personas.
            Click "AI Adaptor Settings" in the sidebar.
          </p>
        </div>
      )}

      {selectedAdaptorId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
          <p className="text-green-800">
            Using: {selectedAdaptorId} - {selectedModelId}
          </p>
        </div>
      )}

      <Button
        onClick={handleGeneratePersonas}
        disabled={!selectedAdaptorId || isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Personas'}
      </Button>
    </div>
  );
}
```

## API Integration

### New Endpoints Used

The adaptor architecture expects these backend endpoints:

#### Adaptor Management
- `GET /api/adaptors` - Get all adaptors
- `GET /api/adaptors/available?projectId={id}&capability={cap}` - Get available adaptors
- `GET /api/adaptors/{adaptorId}/models/{modelId}` - Get model info
- `POST /api/adaptors/config` - Save adaptor selection
- `POST /api/adaptors/config/parameters` - Save parameters
- `GET /api/adaptors/config?projectId={id}&stageType={stage}&adaptorId={id}` - Get config

#### Prompt Management
- `GET /api/prompts/templates?projectId={id}&stageType={stage}` - Get default template
- `GET /api/prompts/templates/list?projectId={id}&stageType={stage}` - List all templates
- `POST /api/prompts/templates` - Save template
- `DELETE /api/prompts/templates/{id}?projectId={id}` - Delete template

#### Usage Tracking
- `GET /api/usage/stats?projectId={id}&period={period}` - Get usage stats

### Passing Adaptor Info to Recipe Execution

When executing a recipe with an adaptor, include these headers:
```typescript
headers: {
  'X-Adaptor-Id': adaptorId,
  'X-Model-Id': modelId,
}
```

Or include in the request body:
```typescript
body: JSON.stringify({
  projectId: project.id,
  adaptorId: selectedAdaptorId,
  modelId: selectedModelId,
  // ... other fields
})
```

## Migration Path

### Current State (Recipe-Based)
- Uses `/api/recipes/*` endpoints
- No adaptor abstraction
- No usage tracking

### New State (Adaptor-Based)
- Uses `/api/adaptors/*` endpoints
- Per-stage adaptor selection
- Built-in usage tracking
- Reusable prompt templates

### Backward Compatibility
Both systems can coexist:
1. Check if an adaptor is selected for the stage
2. If yes, use adaptor-based execution
3. If no, fall back to recipe-based execution (for compatibility)

```typescript
if (selectedAdaptorId) {
  // Use new adaptor-based execution
} else {
  // Fall back to recipe-based execution
}
```

## Types

All types are exported from `AdaptorService`:

```typescript
import type {
  AdaptorInfo,
  AdaptorConfig,
  PromptTemplate,
  UsageStats
} from '@/shared/services/adaptorService';
```

## Error Handling

All hooks and context methods throw errors. Wrap in try-catch:

```typescript
try {
  await selectAdaptor({
    adaptorId: 'openai',
    modelId: 'gpt-4',
    capability: 'textGeneration',
    stageType: 'stage_2_personas',
  });
} catch (error) {
  console.error('Failed to select adaptor:', error);
  setError(error.message);
}
```

## Adding to New Stages

To add adaptor selection to a new stage:

1. Import the hook:
```typescript
import { useAdaptorConfig } from '@/features/storylab/hooks/useAdaptorConfig';
```

2. Initialize in your component:
```typescript
const { adaptors, selectedAdaptorId, loadAdaptors, selectAdaptor } = useAdaptorConfig({
  projectId: project.id,
  stageType: 'stage_X_name',
  capability: 'appropriate capability'
});
```

3. Load adaptors on mount:
```typescript
useEffect(() => {
  loadAdaptors('textGeneration');
}, []);
```

4. Use selected adaptor when making API calls:
```typescript
const response = await fetch('/api/recipes/...', {
  method: 'POST',
  headers: {
    'X-Adaptor-Id': selectedAdaptorId,
    'X-Model-Id': selectedModelId,
    // ... other headers
  },
  body: JSON.stringify({ ... })
});
```

## Testing

All components have proper error states and loading states. Test:
- Loading state while fetching adaptors
- Error state when API fails
- Display adaptor options
- Save selection and config
- Usage tracking
- Prompt template management

## Future Enhancements

1. **Local Storage**: Cache adaptor selections
2. **Defaults**: Set default adaptor per stage
3. **Quotas**: Track and limit usage per period
4. **Custom Models**: Support custom model registration
5. **Analytics**: Dashboard for usage analytics
6. **A/B Testing**: Compare adaptor performance
7. **Cost Optimization**: Recommend optimal adaptor based on cost

## Troubleshooting

### "X-Adaptor-Id header not found"
- Ensure adaptor is selected before executing
- Pass adaptor ID in headers or request body

### "No authentication token found"
- Ensure user is logged in
- Check sessionStorage for 'authToken'

### "API endpoints not found"
- Verify backend has `/api/adaptors/*` endpoints implemented
- Check API URL in `.env.local` (VITE_API_URL)

### Settings modal not opening
- Check if AdaptorSettingsModal is imported in WorkflowView
- Verify projectId is being passed

## Files Modified/Created

Created:
- `/src/shared/services/adaptorService.ts` - Service layer
- `/src/features/storylab/hooks/useAdaptorConfig.ts` - React hook
- `/src/shared/contexts/AdaptorContext.tsx` - Context provider
- `/src/features/storylab/components/AdaptorSettingsModal.tsx` - Modal wrapper

Modified:
- `/src/features/storylab/components/WorkflowView.tsx` - Added settings button

Already existed (not integrated yet):
- `/src/features/storylab/components/adaptor/AdaptorSelector.tsx`
- `/src/features/storylab/components/adaptor/ModelInfoCard.tsx`
- `/src/features/storylab/components/adaptor/AdaptorConfigPanel.tsx`
- `/src/features/storylab/components/adaptor/UsageTrackerPanel.tsx`
- `/src/features/storylab/components/adaptor/PromptTemplateEditor.tsx`
- `/src/features/storylab/components/adaptor/AdaptorSettingsPage.tsx`

