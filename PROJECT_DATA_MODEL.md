# StoryLab Project Data Model - Complete Guide

## Overview

The new **StoryLabProject** data model provides a comprehensive, well-structured way to manage projects through the entire workflow. It clearly separates:

1. **User Input Data** - What the user provides at each stage
2. **AI Generated Data** - What the AI systems produce
3. **Stage Execution Tracking** - Status and history of each generation stage
4. **Metadata & Analytics** - Project information and tracking

## File Structure

```
src/features/storylab/
├── types/
│   ├── project.types.ts      # Main project model and interfaces
│   └── project.schema.ts     # Zod validation schemas
├── hooks/
│   └── useStoryLabProject.ts # React hook for project management
├── utils/
│   └── projectUtils.ts       # Utility functions

src/shared/services/
└── storyLabProjectService.ts # Complete CRUD operations
```

## Data Model Architecture

### 1. User Input Data

Data provided by the user through the UI at various stages:

```typescript
// Stage 1: Campaign Details
UserInputCampaignDetails {
  campaignName: string;
  productDescription: string;
  targetAudience: string;
  videoLength: string;
  callToAction: string;
  budget?: string;
  deadline?: string;
  additionalNotes?: string;
}

// Stage 3: Narrative Preferences
UserInputNarrativePreferences {
  narrativeStyle?: string;
  tone?: string;
  keyMessages?: string[];
  excludedTopics?: string[];
  storyArc?: string;
  additionalContext?: string;
}

// Stage 4: Visual Direction
UserInputVisualDirection {
  visualStyle?: string;
  colorPreferences?: string[];
  atmosphereDescription?: string;
  settingPreferences?: string[];
  cameraStyle?: string;
  additionalNotes?: string;
}

// Stage 5: Script Preferences
UserInputScriptPreferences {
  scriptTone?: string;
  dialogueStyle?: string;
  inclusionPreferences?: {...};
  pacePreference?: string;
  callToActionPlacement?: string;
  additionalRequirements?: string;
}
```

### 2. AI Generated Data

Data produced by AI models at each stage:

```typescript
// Stage 2: Generated Personas
AIGeneratedPersonas {
  personas: PersonaData[];
  generatedAt: Date;
  generationRecipeId: string;
  generationExecutionId: string;
  model: string;
  temperature?: number;
}

// Stage 3: Generated Narrative
AIGeneratedNarrative {
  narrativeId: string;
  synopsis: string;
  fullNarrative: string;
  acts?: Act[];
  themes: string[];
  emotionalJourney: string;
  generatedAt: Date;
  model: string;
  // ... metadata
}

// Stage 4: Generated Storyboard
AIGeneratedStoryboard {
  storyboardId: string;
  scenes: StoryboardScene[];
  totalDuration: string;
  visualTheme: string;
  generatedAt: Date;
  model: string;
  // ... metadata
}

// Stage 5: Generated Screenplay
AIGeneratedScreenplay {
  screenplayId: string;
  title: string;
  fullText: string;
  sections: Section[];
  callToActionIncluded: boolean;
  estimatedDuration: string;
  generatedAt: Date;
  model: string;
  // ... metadata
}

// Stage 6: Video Production
VideoProductionData {
  videoId: string;
  title: string;
  videoUrl?: string;
  duration: string;
  status: 'draft' | 'rendering' | 'complete' | 'error';
  // ... metadata
}
```

### 3. Stage Execution Tracking

Tracks the status and history of each generation stage:

```typescript
StageExecution {
  stageName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  executionId?: string; // Recipe execution ID
  recipeId?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  retriesCount?: number;
  outputs?: Record<string, any>;
}
```

### 4. Main Project Model

```typescript
StoryLabProject {
  // Identification
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members?: Record<string, 'owner' | 'editor' | 'viewer'>;
  createdAt: Date;
  updatedAt: Date;

  // Status
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  currentStageIndex: number;
  completionPercentage: number;

  // Stage Execution History
  stageExecutions: Record<string, StageExecution>;

  // User Inputs & AI Outputs at Each Stage
  campaignDetails: UserInputCampaignDetails;

  narrativePreferences?: UserInputNarrativePreferences;
  aiGeneratedNarrative?: AIGeneratedNarrative;

  visualDirection?: UserInputVisualDirection;
  aiGeneratedStoryboard?: AIGeneratedStoryboard;
  storyboardCustomizations?: {...};

  scriptPreferences?: UserInputScriptPreferences;
  aiGeneratedScreenplay?: AIGeneratedScreenplay;
  screenplayCustomizations?: {...};

  videoProduction?: VideoProductionData;

  // AI-Generated Personas
  aiGeneratedPersonas?: AIGeneratedPersonas;
  userPersonaSelection?: UserInputPersonaSelection;

  // Additional Metadata
  metadata?: {
    tags?: string[];
    categories?: string[];
    notes?: string;
    deadline?: Date;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  };

  // Versioning
  versions?: Version[];

  // Analytics
  analytics?: {
    viewCount?: number;
    shareCount?: number;
    downloadCount?: number;
  };
}
```

## 6 Workflow Stages

The workflow is divided into 6 distinct stages:

### Stage 0: Campaign Details (User Input)
- User provides campaign information
- Inputs: `UserInputCampaignDetails`
- Outputs: Saved in `campaignDetails`

### Stage 1: Personas (AI Generated)
- AI generates 3 personas from campaign details
- Inputs: `campaignDetails`
- Outputs: `AIGeneratedPersonas`
- User can: Select primary persona (`UserInputPersonaSelection`)

### Stage 2: Narrative (AI Generated)
- AI generates narrative based on personas
- Inputs: `campaignDetails`, `userPersonaSelection`, `narrativePreferences`
- Outputs: `AIGeneratedNarrative`
- User can: Customize with `narrativePreferences`

### Stage 3: Storyboard (AI Generated)
- AI creates visual breakdown of narrative
- Inputs: `aiGeneratedNarrative`, `visualDirection`
- Outputs: `AIGeneratedStoryboard`
- User can: Customize with `storyboardCustomizations`

### Stage 4: Screenplay (AI Generated)
- AI generates detailed script
- Inputs: `aiGeneratedStoryboard`, `scriptPreferences`
- Outputs: `AIGeneratedScreenplay`
- User can: Customize with `screenplayCustomizations`

### Stage 5: Video (User Input)
- User finalizes or uploads video
- Inputs: All previous data
- Outputs: `VideoProductionData`

## Using the New Data Model

### 1. Load a Project

```typescript
import { useStoryLabProject } from '@/features/storylab/hooks/useStoryLabProject';

function MyComponent() {
  const { project, loadProject } = useStoryLabProject({
    autoLoad: true,
    projectId: 'project-123'
  });

  return <div>{project?.name}</div>;
}
```

### 2. Update Campaign Details

```typescript
const { updateCampaignDetails } = useStoryLabProject();

await updateCampaignDetails({
  campaignName: 'New Campaign',
  productDescription: 'Updated description',
});
```

### 3. Update AI Generated Personas

```typescript
const { updateAIPersonas } = useStoryLabProject();

await updateAIPersonas({
  personas: generatedPersonas,
  generatedAt: new Date(),
  generationRecipeId: 'recipe-123',
  generationExecutionId: 'exec-123',
  model: 'gemini-2.5-flash',
});
```

### 4. Update Narrative Preferences

```typescript
const { updateNarrativePreferences } = useStoryLabProject();

await updateNarrativePreferences({
  narrativeStyle: 'emotional',
  tone: 'professional',
  keyMessages: ['message1', 'message2'],
});
```

### 5. Advance to Next Stage

```typescript
const { advanceToNextStage, canAdvanceToNextStage } = useStoryLabProject();

if (canAdvanceToNextStage()) {
  await advanceToNextStage();
}
```

### 6. Track Stage Execution

```typescript
const { project } = useStoryLabProject();

// Check stage status
const personasStage = project.stageExecutions['personas'];
console.log(personasStage.status); // 'completed', 'failed', etc.

// Get error details if stage failed
if (personasStage.error) {
  console.log(personasStage.error.message);
}
```

## React Hook API

### useStoryLabProject

Complete hook for managing projects:

```typescript
const {
  // State
  project,           // Current project
  isLoading,         // Loading state
  isSaving,          // Saving state
  error,             // Error object

  // CRUD operations
  createProject,     // Create new project
  loadProject,       // Load existing project
  saveProject,       // Save current state
  deleteProject,     // Delete project

  // Update operations
  updateCampaignDetails,
  updateNarrativePreferences,
  updateVisualDirection,
  updateScriptPreferences,
  updateAIPersonas,
  updateAINarrative,
  updateAIStoryboard,
  updateAIScreenplay,
  updateVideoProduction,

  // Stage operations
  updateStageStatus,
  markStageCompleted,
  markStageFailed,
  advanceToNextStage,

  // UI helpers
  getCurrentStage,       // Get current stage
  canAdvanceToNextStage, // Check if can advance
  getCompletionPercentage, // Get % complete

  // State management
  resetProject,      // Clear project
} = useStoryLabProject({
  projectId: 'optional-id',
  autoLoad: true,
});
```

## Service API

### StoryLabProjectService

Complete API client for all project operations:

```typescript
const service = new StoryLabProjectService();

// Create
const project = await service.createProject(input);

// Read
const project = await service.getProject(projectId);
const projects = await service.getProjects({ status: 'draft' });
const result = await service.getProjectFull(projectId);

// Update
await service.updateProject(projectId, updates);
await service.updateCampaignDetails(projectId, details);
await service.updateAIPersonas(projectId, personas);
await service.updateStageExecution(projectId, stageUpdate);

// Delete
await service.deleteProject(projectId);

// Utilities
await service.cloneProject(projectId, newName);
const blob = await service.exportProject(projectId, 'json');
await service.shareProject(projectId, userIds, 'editor');

// Helpers
const completion = service.calculateCompletionPercentage(project);
const next = service.getNextStage(currentIndex);
const canAccess = service.canAccessStage(project, stageIndex);
```

## Utility Functions

Helper functions for working with projects:

```typescript
import {
  calculateCompletionPercentage,
  getCurrentStage,
  canAccessStage,
  isStageCompleted,
  hasPersonas,
  hasNarrative,
  hasStoryboard,
  hasScreenplay,
  hasVideo,
  getGeneratedContent,
  getUserInputs,
  exportProjectAsJSON,
  getProjectSummary,
} from '@/features/storylab/utils/projectUtils';

// Check stage status
if (isStageCompleted(project, 'personas')) {
  // Personas are generated
}

// Check what's available
if (hasNarrative(project) && hasStoryboard(project)) {
  // Both narrative and storyboard are ready
}

// Get summary
const summary = getProjectSummary(project);
console.log(summary.completionPercentage);

// Export
const json = exportProjectAsJSON(project);
```

## Validation

Validate projects using Zod schemas:

```typescript
import {
  validateProject,
  validateCreateProject,
  validateUpdateProject,
} from '@/features/storylab/types/project.schema';

const validation = validateProject(data);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

const createValidation = validateCreateProject(createInput);
if (!createValidation.valid) {
  console.error('Create errors:', createValidation.errors);
}
```

## Loading UI from Data Model

When a project is loaded, the UI should be updated from the data model:

### Example: Campaign Details Stage

```typescript
function CampaignDetailsStage() {
  const { project, updateCampaignDetails, isLoading, isSaving } = useStoryLabProject({
    autoLoad: true,
    projectId: projectId,
  });

  const [formData, setFormData] = React.useState(project?.campaignDetails);

  // Update form when project loads
  React.useEffect(() => {
    if (project?.campaignDetails) {
      setFormData(project.campaignDetails);
    }
  }, [project?.campaignDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateCampaignDetails(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData?.campaignName}
        onChange={(e) => setFormData({
          ...formData,
          campaignName: e.target.value
        })}
      />
      <button disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Example: Personas Stage

```typescript
function PersonasStage() {
  const { project, updateAIPersonas, isSaving } = useStoryLabProject({
    autoLoad: true,
    projectId: projectId,
  });

  const personas = project?.aiGeneratedPersonas?.personas || [];

  // Display existing personas if available
  if (personas.length > 0) {
    return (
      <div>
        <h2>Generated Personas</h2>
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    );
  }

  // Show generate button if not yet generated
  return (
    <PersonaGenerator
      campaignName={project?.campaignDetails.campaignName}
      onPersonasGenerated={async (newPersonas) => {
        await updateAIPersonas({
          personas: newPersonas,
          generatedAt: new Date(),
          generationRecipeId: 'recipe-123',
          generationExecutionId: 'exec-123',
          model: 'gemini-2.5-flash',
        });
      }}
    />
  );
}
```

## Database Schema Example

For reference, here's how this might be stored in Firestore:

```
projects/{projectId}
  ├── id: string
  ├── name: string
  ├── status: string
  ├── currentStageIndex: number
  ├── completionPercentage: number
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  ├── ownerId: string
  │
  ├── campaignDetails
  │   ├── campaignName: string
  │   ├── productDescription: string
  │   ├── targetAudience: string
  │   ├── videoLength: string
  │   └── callToAction: string
  │
  ├── aiGeneratedPersonas
  │   ├── personas: array
  │   ├── generatedAt: timestamp
  │   ├── model: string
  │   └── ...
  │
  ├── aiGeneratedNarrative
  │   ├── fullNarrative: string
  │   ├── generatedAt: timestamp
  │   └── ...
  │
  ├── aiGeneratedStoryboard
  │   ├── scenes: array
  │   ├── generatedAt: timestamp
  │   └── ...
  │
  ├── aiGeneratedScreenplay
  │   ├── fullText: string
  │   ├── generatedAt: timestamp
  │   └── ...
  │
  ├── stageExecutions
  │   ├── campaign-details
  │   │   ├── status: string
  │   │   └── ...
  │   ├── personas
  │   │   ├── status: string
  │   │   └── ...
  │   └── ... (other stages)
  │
  └── metadata
      ├── tags: array
      ├── notes: string
      └── ...
```

## Migration from Old Model

To migrate from the old `Project` type to `StoryLabProject`:

```typescript
function convertOldProjectToNew(oldProject: Project): StoryLabProject {
  return {
    id: oldProject.id,
    name: oldProject.name,
    description: '',
    ownerId: 'user-id',
    status: oldProject.status === 'complete' ? 'completed' : oldProject.status,
    currentStageIndex: oldProject.currentStage,
    completionPercentage: 0,
    createdAt: new Date(oldProject.createdAt),
    updatedAt: new Date(),
    stageExecutions: {}, // Will be populated
    campaignDetails: oldProject.data.campaignDetails || {},
    // ... other fields
  };
}
```

## Best Practices

1. **Always validate inputs** - Use Zod schemas before saving
2. **Handle async operations** - Use try-catch and loading states
3. **Keep UI in sync** - Use useEffect to update UI when project loads
4. **Track stage status** - Monitor `stageExecutions` for generation progress
5. **Save frequently** - Call `saveProject()` after significant changes
6. **Check completion** - Use utility functions to check if stages are complete

## Files to Update

When using the new model, update these locations:

- ✅ Stage components (campaign-details, personas, narrative, etc.)
- ✅ Workflow routing
- ✅ Project list views
- ✅ Project detail views
- ✅ Generation recipe handlers
- ✅ Export/download features
- ✅ Sharing and collaboration

## Summary

The new **StoryLabProject** data model provides:

✅ **Clear separation** of user input vs AI-generated data
✅ **Complete tracking** of each stage's execution
✅ **Full CRUD support** via service and hooks
✅ **Type safety** with Zod validation
✅ **Utility functions** for common operations
✅ **Backward compatibility** with old types
✅ **React integration** with custom hooks
✅ **Comprehensive documentation** and examples

This model scales across all 6 workflow stages and supports the complete project lifecycle from creation to completion.
