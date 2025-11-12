# AI Adaptor Architecture Integration - Quick Reference

## Overview
This is a quick index to help you navigate the AI Adaptor Architecture integration.

## Newly Created Files

### 1. Service Layer
- **File:** `src/shared/services/adaptorService.ts` (8.6 KB)
- **Purpose:** API client for all adaptor operations
- **Key Methods:**
  - `getAvailableAdaptors()` - Get list of adaptors
  - `saveAdaptorSelection()` - Save user's choice
  - `saveAdaptorParameters()` - Save config
  - `getUsageStats()` - Get usage data
  - `savePromptTemplate()` - Create/update templates

### 2. React Hook
- **File:** `src/features/storylab/hooks/useAdaptorConfig.ts` (8.5 KB)
- **Purpose:** State management for adaptor config
- **Usage:** `const { adaptors, selectedAdaptorId, ... } = useAdaptorConfig({...})`
- **Best For:** Single component using adaptor config

### 3. Context Provider
- **File:** `src/shared/contexts/AdaptorContext.tsx` (4.0 KB)
- **Purpose:** Share adaptor state across components
- **Usage:** Wrap components with `<AdaptorProvider>`
- **Best For:** Multiple components sharing state

### 4. Modal Integration
- **File:** `src/features/storylab/components/AdaptorSettingsModal.tsx` (0.9 KB)
- **Purpose:** Dialog wrapper for settings page
- **Used In:** WorkflowView

### 5. Modified File
- **File:** `src/features/storylab/components/WorkflowView.tsx`
- **Changes:**
  - Added Settings button in sidebar
  - Added modal state management
  - Integrated AdaptorSettingsModal

### 6. Existing Components (Now Integrated)
Located in: `src/features/storylab/components/adaptor/`

- `AdaptorSelector.tsx` - Choose adaptor and model
- `ModelInfoCard.tsx` - Display model specs and pricing
- `AdaptorConfigPanel.tsx` - Configure parameters
- `UsageTrackerPanel.tsx` - Monitor usage and costs
- `PromptTemplateEditor.tsx` - Create and edit prompts
- `AdaptorSettingsPage.tsx` - Main dashboard with tabs

## Documentation Files

### INTEGRATION_SUMMARY.md
High-level overview of the integration:
- What was implemented
- Architecture diagrams
- Data flow examples
- File changes
- Troubleshooting
- Next steps

### ADAPTOR_INTEGRATION_GUIDE.md
Detailed implementation guide:
- How to use each component
- Service method reference
- Hook usage examples
- API endpoint documentation
- Stage component examples
- Error handling patterns
- Migration path

## Quick Start

### To add adaptor selection to a component:

```typescript
import { useAdaptorConfig } from '@/features/storylab/hooks/useAdaptorConfig';

export function MyComponent({ project }) {
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

  useEffect(() => {
    loadAdaptors('textGeneration');
  }, []);

  // Use selectedAdaptorId in your component...
}
```

### To access adaptor settings:
Users can click the "AI Adaptor Settings" button in the WorkflowView sidebar.

## API Endpoints

### Adaptor APIs (to be implemented in backend)
```
GET    /api/adaptors
GET    /api/adaptors/available?projectId={id}&capability={cap}
GET    /api/adaptors/{adaptorId}/models/{modelId}
POST   /api/adaptors/config
POST   /api/adaptors/config/parameters
GET    /api/adaptors/config
```

### Prompt APIs
```
POST   /api/prompts/templates
GET    /api/prompts/templates
GET    /api/prompts/templates/list
DELETE /api/prompts/templates/{id}
```

### Usage APIs
```
GET    /api/usage/stats?projectId={id}&period={period}
```

## Architecture

```
WorkflowView (Main)
├── Settings Button
│   └── AdaptorSettingsModal
│       └── AdaptorSettingsPage
│           ├── AdaptorSelector
│           ├── AdaptorConfigPanel
│           ├── PromptTemplateEditor
│           └── UsageTrackerPanel
│
└── Stage Components (1-6)
    └── useAdaptorConfig Hook
        └── AdaptorService
```

## Key Features

- 100% TypeScript support
- Full error handling
- Loading/error states on all components
- Zero breaking changes
- Works alongside legacy recipe API
- Ready for backend integration

## Next Steps

1. Implement backend API endpoints
2. Test adaptor selection workflow
3. Add adaptor selection UI to stages (optional)
4. Monitor usage and costs

## Troubleshooting

- **Modal won't open?** Check WorkflowView imports
- **API 404 errors?** Backend endpoints may not be implemented
- **No token error?** Ensure user is logged in
- **TypeScript errors?** Run `npm install`

## Common Patterns

### Option 1: Use Hook (Recommended for single component)
```typescript
const { selectedAdaptorId, selectAdaptor } = useAdaptorConfig({...});
```

### Option 2: Use Context (Recommended for multiple components)
```typescript
<AdaptorProvider projectId={projectId}>
  <YourApp />
</AdaptorProvider>

// In component:
const { selectedAdaptor } = useAdaptorContext();
```

### Option 3: Use Service Directly
```typescript
const service = new AdaptorService();
const adaptors = await service.getAvailableAdaptors(projectId, 'textGeneration');
```

## File Organization

```
src/
├── shared/
│   ├── services/
│   │   └── adaptorService.ts (NEW)
│   └── contexts/
│       └── AdaptorContext.tsx (NEW)
├── features/storylab/
│   ├── hooks/
│   │   └── useAdaptorConfig.ts (NEW)
│   └── components/
│       ├── adaptor/
│       │   ├── AdaptorSelector.tsx
│       │   ├── ModelInfoCard.tsx
│       │   ├── AdaptorConfigPanel.tsx
│       │   ├── UsageTrackerPanel.tsx
│       │   ├── PromptTemplateEditor.tsx
│       │   └── AdaptorSettingsPage.tsx
│       ├── AdaptorSettingsModal.tsx (NEW)
│       └── WorkflowView.tsx (MODIFIED)
```

## Support & Documentation

- **Overview:** See INTEGRATION_SUMMARY.md
- **Detailed Guide:** See ADAPTOR_INTEGRATION_GUIDE.md
- **This File:** Quick reference and file index

## Status

Frontend integration: COMPLETE ✅
Ready for backend implementation

For questions, refer to the comprehensive documentation files.
