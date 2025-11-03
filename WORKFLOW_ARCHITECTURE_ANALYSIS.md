# StoryLab Workflow Architecture Analysis

## Overview
The StoryLab multi-stage workflow system is built with a centralized state management pattern using React hooks. The `WorkflowView` component orchestrates the entire workflow, while `useStoryLabProject` hook manages all project data synchronization with the backend.

---

## 1. Project Creation and Data Flow Between Stages

### Project Creation Process

**Location**: `/src/features/storylab/pages/StorylabPage.tsx` (lines 104-127)

```typescript
const handleCreateProject = () => {
  const tempId = `temp-${Date.now()}`;
  const newProject: Project = {
    id: tempId,
    name: 'New Campaign',
    status: 'draft',
    currentStage: 1,
    // ... empty data
  };
  setProjects([...projects, newProject]);
  setSelectedProject(newProject);
  setCurrentView('workflow');
};
```

**Key Point**: Projects start with a `temp-` ID prefix in the local state before being saved to the database.

### Stage 1 - Project Persistence

**Location**: `/src/features/storylab/components/stages/Stage1CampaignDetails.tsx` (lines 62-91)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  if (!project) {
    // NEW PROJECT - Create and persist to database
    const newProject = await createProject({
      name: formData.campaignName || 'New Campaign',
      description: '',
      campaignDetails: formData,
    });
    if (newProject) {
      // RELOAD project to get full data (stage executions, etc.)
      const loadedProject = await loadProject(newProject.id);
      // ADVANCE - pass loaded project to avoid timing issues
      await advanceToNextStage(loadedProject);
    }
  } else {
    // EXISTING PROJECT - Update campaign details
    await updateCampaignDetails(formData);
    await markStageCompleted('campaign-details');
    await advanceToNextStage(project);
  }
};
```

**Critical Flow**:
1. `createProject()` creates new project in database
2. `loadProject()` reloads project to ensure full data
3. `advanceToNextStage(loadedProject)` moves to next stage

**Why reload?** The reload ensures all stage execution metadata is available before advancing.

---

## 2. Project Reload Behavior When Advancing Stages

### Does `advanceToNextStage()` Reload the Project?

**Location**: `/src/features/storylab/hooks/useStoryLabProject.ts` (lines 384-402)

```typescript
const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
  const projectData = projectToAdvance || project;
  if (!projectData) throw new Error('No project loaded');

  const next = projectService.current.getNextStage(projectData.currentStageIndex);
  if (!next) throw new Error('No next stage available');

  // DOES NOT RELOAD - only updates currentStageIndex
  await updateProject(
    {
      currentStageIndex: next.index,
      campaignDetails: projectData.campaignDetails,
    },
    projectData.id
  );
}, [project, updateProject]);
```

### Answer: NO - It Only Updates Stage Index

`advanceToNextStage()` **DOES NOT** reload the project from the database. It only:
1. Calculates the next stage using `getNextStage(currentStageIndex)`
2. Calls `updateProject()` with just `currentStageIndex` and `campaignDetails`
3. Relies on the `updateProject()` service to return updated data

**Exception**: Some operations like `markStageCompleted()` DO trigger reloads:

```typescript
const markStageCompleted = useCallback(
  async (stageName: string, data?: any) => {
    await updateStageStatus(stageName, 'completed', data);
  },
  [updateStageStatus],
);

const updateStageStatus = useCallback(
  async (stageName: string, status: string, data?: any) => {
    if (!project) throw new Error('No project loaded');
    await projectService.current.updateStageExecution(project.id, {...});
    // RELOADS PROJECT - ensures updated stage executions
    await loadProject(project.id);
  },
  [project, loadProject],
);
```

---

## 3. How projectId is Passed to Each Stage Component

### Architecture Pattern: Props Drilling from WorkflowView

**Location**: `/src/features/storylab/components/WorkflowView.tsx` (lines 30-162)

```typescript
export function WorkflowView({ projectId, onBack }: WorkflowViewProps) {
  // Hook loads project with projectId
  const {
    project,
    isLoading,
    createProject,
    loadProject,
    updateCampaignDetails,
    updateAIPersonas,
    updatePersonaSelection,
    markStageCompleted,
    advanceToNextStage,
  } = useStoryLabProject({ autoLoad: true, projectId });

  const [currentStage, setCurrentStage] = useState(1);

  // Render stage component with all functions and project data
  const CurrentStageComponent = stages[currentStage - 1].component;

  return (
    <CurrentStageComponent
      project={project}                    // PASS PROJECT
      createProject={createProject}         // PASS FUNCTIONS
      loadProject={loadProject}
      updateCampaignDetails={updateCampaignDetails}
      updateAIPersonas={updateAIPersonas}
      updatePersonaSelection={updatePersonaSelection}
      markStageCompleted={markStageCompleted}
      advanceToNextStage={advanceToNextStage}
    />
  );
}
```

### Pattern Overview:

1. **ProjectId Source**: Passed as prop to `WorkflowView` from `StorylabPage`
2. **ProjectId Usage**: Passed to `useStoryLabProject({ projectId })` hook
3. **Automatic Loading**: Hook automatically loads project via `autoLoad: true`
4. **Stage Access**: All stage components receive:
   - `project` object (contains all stage data)
   - All mutation functions that internally use `project?.id`

### Stage Component Interfaces

**Stage1 Example** (`Stage1CampaignDetails.tsx`):
```typescript
interface Stage1Props {
  project: StoryLabProject | null;
  createProject: (input: CreateProjectInput) => Promise<StoryLabProject>;
  loadProject: (projectId: string) => Promise<StoryLabProject>;
  updateCampaignDetails: (details: Partial<UserInputCampaignDetails>) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  advanceToNextStage: (projectToAdvance?: StoryLabProject) => Promise<void>;
}
```

**Stage4 Example** (`Stage4Storyboard.tsx`):
```typescript
interface Stage4Props {
  projectId?: string;  // NOTE: Stage4 uses a different pattern!
}

export function Stage4Storyboard({ projectId }: Stage4Props) {
  // Stage4 loads its own project instance using the hook
  const { project, updateAIStoryboard, updateStoryboardCustomizations, ... } =
    useStoryLabProject({ autoLoad: true, projectId: projectId || '' });
}
```

**Key Difference**: 
- **Stage1, Stage2, Stage3**: Receive `project` prop and all functions from WorkflowView
- **Stage4**: Uses its own `useStoryLabProject` hook instance to load the project

---

## 4. Mechanism to Ensure Data is Saved Before Advancing

### Multi-Level Save Validation

#### Level 1: Hook-Based State Management

**Location**: `/src/features/storylab/hooks/useStoryLabProject.ts` (lines 158-180)

```typescript
const updateProject = useCallback(
  async (updates: UpdateProjectInput, projectIdOverride?: string): Promise<StoryLabProject> => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');

    try {
      setIsSaving(true);
      setError(null);

      // MAKES API CALL - ensures data persists
      const updated = await projectService.current.updateProject(projectId, updates);

      // UPDATES LOCAL STATE with server response
      setProject(updated);
      setHasUnsavedChanges(false);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  },
  [project],
);
```

#### Level 2: Stage Completion Tracking

**Location**: `/src/features/storylab/components/stages/Stage1CampaignDetails.tsx` (lines 80-86)

```typescript
// Update campaign details
await updateCampaignDetails(formData);  // 1. Saves data to DB

// Mark stage as completed
await markStageCompleted('campaign-details');  // 2. Updates stageExecutions

// Advance to next stage
await advanceToNextStage(project);  // 3. Updates currentStageIndex
```

#### Level 3: Stage Execution Validation

**Location**: `/src/features/storylab/components/WorkflowView.tsx` (lines 53-66)

```typescript
const isStageCompleted = (stageIndex: number) => {
  const stageName = STAGE_NAMES[stageIndex - 1];
  return project?.stageExecutions[stageName]?.status === 'completed';
};

const isStageAccessible = (stageIndex: number) => {
  // Can access current stage and all completed stages before it
  if (stageIndex <= currentStage) return true;
  // Check if all previous stages are completed
  for (let i = 1; i < stageIndex; i++) {
    if (!isStageCompleted(i)) return false;
  }
  return true;
};
```

### Data Flow for Stage Advancement

```
User clicks "Next"
    ↓
updateCampaignDetails(formData)
    ↓ (HTTP PUT request)
API updates database
    ↓
Hook updates local state: setProject(updated)
    ↓
markStageCompleted('campaign-details')
    ↓ (HTTP PUT to stageExecutions)
Hook reloads project: loadProject(projectId)
    ↓
Hook updates local state with fresh stageExecutions
    ↓
advanceToNextStage()
    ↓ (HTTP PUT with currentStageIndex)
Hook updates local state with new currentStageIndex
    ↓
WorkflowView syncs: setCurrentStage(project.currentStageIndex + 1)
    ↓
New stage component renders
```

---

## 5. `advanceToNextStage()` Implementation Deep Dive

### Source Code

**Location**: `/src/features/storylab/hooks/useStoryLabProject.ts` (lines 385-402)

```typescript
const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
  // Use provided project or fall back to current project in state
  const projectData = projectToAdvance || project;
  if (!projectData) throw new Error('No project loaded');

  const next = projectService.current.getNextStage(projectData.currentStageIndex);
  if (!next) throw new Error('No next stage available');

  // Update currentStageIndex and preserve campaign details
  // Pass projectId explicitly to avoid closure issues
  await updateProject(
    {
      currentStageIndex: next.index,
      campaignDetails: projectData.campaignDetails,
    },
    projectData.id  // Pass project ID explicitly
  );
}, [project, updateProject]);
```

### What It Does (Step by Step)

1. **Accepts Optional Project Parameter**
   - `projectToAdvance` is used if provided (Stage1 pattern)
   - Falls back to `project` from closure (Stage4 pattern)

2. **Calculates Next Stage**
   ```typescript
   const next = projectService.current.getNextStage(projectData.currentStageIndex);
   // Returns: { index: 1, stage: StageDefinition }
   ```

3. **Updates Only Two Fields**
   - `currentStageIndex`: Moves to next stage (index)
   - `campaignDetails`: Preserved from current stage

4. **API Call via updateProject()**
   ```typescript
   // Makes PUT request to: /api/projects/{projectId}
   // Body: { currentStageIndex, campaignDetails }
   ```

5. **State Update** 
   - Hook receives response from server
   - Updates local `project` state with new data
   - `hasUnsavedChanges` flag set to false

### Does NOT Reload - But updateProject Does

The service method `updateProject()` (not the hook function) triggers state updates through the hook's state setter:

```typescript
const updated = await projectService.current.updateProject(projectId, updates);
setProject(updated);  // This updates the state
```

The returned `updated` project contains the new `currentStageIndex` reflecting the server-side update.

---

## Summary Table

| Aspect | Behavior | Details |
|--------|----------|---------|
| **Project Creation** | Temp ID → Create → Reload | Stage1 creates project, reloads, then advances |
| **ProjectId Passing** | Props from WorkflowView | Most stages receive it as prop; Stage4 uses hook directly |
| **Data Persistence** | updateProject() always calls API | All mutations go through HTTP before updating state |
| **Stage Reload** | Only on markStageCompleted() | advanceToNextStage() does NOT reload; updateProject() returns new data |
| **Save Validation** | Three-level: Data→Complete→Advance | Ensures completed status before allowing next stage |
| **Stage Accessibility** | Based on stageExecutions.status | Must complete previous stages to access next ones |

---

## Critical Implementation Details

### 1. Two ProjectId Passing Patterns

**Pattern A (Recommended)**: WorkflowView Props
```typescript
<Stage1CampaignDetails
  project={project}
  updateCampaignDetails={updateCampaignDetails}
  advanceToNextStage={advanceToNextStage}
/>
```

**Pattern B**: Self-Loading Hook
```typescript
const { project } = useStoryLabProject({ autoLoad: true, projectId });
```

### 2. Error Handling in advanceToNextStage()

```typescript
if (!projectData) throw new Error('No project loaded');
if (!next) throw new Error('No next stage available');
```

These exceptions prevent advancing beyond stage 6 or with null projects.

### 3. Campaign Details Preservation

Campaign details are explicitly passed when advancing:
```typescript
currentStageIndex: next.index,
campaignDetails: projectData.campaignDetails,  // PRESERVED
```

This ensures campaign context is maintained across all stages.

### 4. Service-Level Stage Navigation

**Location**: `/src/shared/services/storyLabProjectService.ts` (lines 537-544)

```typescript
getNextStage(currentStageIndex: number): 
  { index: number; stage: typeof DEFAULT_WORKFLOW_STAGES[0] } | null {
  if (currentStageIndex >= DEFAULT_WORKFLOW_STAGES.length - 1) return null;
  const nextIndex = currentStageIndex + 1;
  return {
    index: nextIndex,
    stage: DEFAULT_WORKFLOW_STAGES[nextIndex],
  };
}
```

---

## File Structure Reference

```
src/features/storylab/
├── pages/
│   └── StorylabPage.tsx           # Project selection, passes projectId
├── components/
│   ├── WorkflowView.tsx            # Main orchestrator, uses useStoryLabProject hook
│   └── stages/
│       ├── Stage1CampaignDetails.tsx  # Creates project, reloads, advances
│       ├── Stage2Personas.tsx          # Receives props from WorkflowView
│       ├── Stage3Narratives.tsx        # Receives props from WorkflowView
│       ├── Stage4Storyboard.tsx        # Uses own hook instance
│       ├── Stage5Screenplay.tsx        # (Similar pattern)
│       └── Stage6GenerateVideo.tsx     # (Similar pattern)
├── hooks/
│   └── useStoryLabProject.ts       # Central state management
└── services/
    └── storyLabProjectService.ts   # API communication
```

