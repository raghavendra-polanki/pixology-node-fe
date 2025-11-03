# WorkflowView Component Examination - Complete Summary

## Examination Date: November 3, 2025

### Documents Created

Three comprehensive documentation files have been created to explain the StoryLab workflow architecture:

1. **WORKFLOW_ARCHITECTURE_ANALYSIS.md** (14 KB)
   - Detailed analysis of all 5 key aspects requested
   - Critical implementation details
   - File structure reference

2. **WORKFLOW_ARCHITECTURE_DIAGRAMS.md** (7.2 KB)
   - Visual component hierarchy
   - Data flow diagrams
   - State management patterns
   - Critical points explanations

3. **CODE_SNIPPETS_REFERENCE.md** (17 KB)
   - Copy-paste ready code examples
   - All key files and functions
   - Quick reference for developers

---

## Quick Answer Summary

### 1. How is the project being created and passed between stages?

**Creation Flow:**
- User clicks "Create Project" → Creates temp project with ID: `temp-{timestamp}`
- Temp project passed to WorkflowView → useStoryLabProject hook
- Hook detects `temp-` prefix and sets `project = null` (doesn't load from DB)
- Stage1 component receives `createProject()` function

**Project Persistence (Stage1):**
```
createProject() → HTTP POST /api/projects → Returns { id, stageExecutions, ... }
     ↓
loadProject() → HTTP GET /api/projects/{id} → Ensures full data
     ↓
setProject(loadedProject) → Hook updates state
     ↓
advanceToNextStage(loadedProject) → Moves to Stage2
```

**Passing Between Stages:**
- WorkflowView loads project via hook with `projectId`
- Project object passed as prop to all stage components
- Stage components use `project` directly
- All mutations through passed functions go through same hook instance

### 2. When advancing from one stage to the next, is the project being reloaded from the database?

**Answer: ONLY when `markStageCompleted()` is called**

Normal advancement sequence:
```
updateData() → HTTP PUT → setProject(response)
     ↓
markStageCompleted() → HTTP PUT → loadProject() [RELOAD]
     ↓
advanceToNextStage() → HTTP PUT → setProject(response)
```

- `advanceToNextStage()` does NOT reload
- `updateProject()` returns server response (used for state update)
- `markStageCompleted()` triggers full reload via `loadProject()`
- Reload ensures fresh `stageExecutions` data

### 3. How is projectId being passed to each stage component?

**Pattern A (Stage1, Stage2, Stage3): Props from WorkflowView**
```typescript
<Stage1CampaignDetails
  project={project}
  updateCampaignDetails={updateCampaignDetails}
  advanceToNextStage={advanceToNextStage}
/>
```

**Pattern B (Stage4, Stage5, Stage6): projectId Prop**
```typescript
interface Stage4Props {
  projectId?: string;
}

export function Stage4Storyboard({ projectId }: Stage4Props) {
  const { project } = useStoryLabProject({ autoLoad: true, projectId });
}
```

**Flow:**
- StorylabPage → WorkflowView (`projectId` prop)
- WorkflowView → useStoryLabProject(`{ projectId }`)
- Hook auto-loads if real ID, skips if `temp-` prefix
- Stage1-3 get project as prop
- Stage4+ use own hook instance with `projectId`

### 4. Is there a mechanism to ensure data from one stage is saved before advancing to the next?

**Yes - Multi-Level Validation:**

**Level 1: updateProject() always calls API**
```typescript
const updated = await projectService.current.updateProject(projectId, updates);
setProject(updated);  // Only update state after successful API response
```

**Level 2: Stage completion tracking**
- Each stage calls `markStageCompleted(stageName)`
- This triggers database update to `stageExecutions[stageName].status = 'completed'`
- Then reloads project to ensure fresh state

**Level 3: Stage accessibility validation**
```typescript
const isStageAccessible = (stageIndex: number) => {
  for (let i = 1; i < stageIndex; i++) {
    if (!isStageCompleted(i)) return false;  // Block access
  }
  return true;
};
```

**Complete Sequence:**
1. User updates data in stage
2. `updateCampaignDetails()` → HTTP PUT
3. Hook updates state with response
4. `markStageCompleted()` → HTTP PUT to stageExecutions
5. Hook reloads project (gets fresh data)
6. `advanceToNextStage()` → HTTP PUT with new currentStageIndex
7. WorkflowView syncs UI: `setCurrentStage(project.currentStageIndex + 1)`
8. New stage renders

### 5. Check if advanceToNextStage() reloads the project or just changes the currentStage

**Answer: ONLY changes currentStageIndex, does NOT reload**

```typescript
const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
  const projectData = projectToAdvance || project;
  
  const next = projectService.current.getNextStage(projectData.currentStageIndex);
  
  // ONLY updates these two fields
  await updateProject(
    {
      currentStageIndex: next.index,
      campaignDetails: projectData.campaignDetails,
    },
    projectData.id
  );
  // No reload - relies on updateProject() response
}, [project, updateProject]);
```

**Why no reload?**
- `updateProject()` service already returns fresh data
- Server enforces validation (can't skip completed stages)
- Reload happens before advancing (in `markStageCompleted()`)

---

## Architecture Highlights

### Centralized State Management
- Single `useStoryLabProject()` hook instance in WorkflowView
- All stage components use same project state
- All mutations immediately persist to API

### Automatic Persistence Pattern
```
Any update call (e.g., updateCampaignDetails)
    ↓
HTTP PUT request with partial data
    ↓
Server validates and updates
    ↓
Hook receives response
    ↓
setProject(response) updates local state
    ↓
All components re-render with new data
```

### Two Component Patterns
1. **Recommended** (Stage1-3): Receive everything as props
2. **Alternative** (Stage4+): Use own hook instance with projectId

### Stage Completion Enforcement
- Can only advance if previous stages completed
- Navigation sidebar shows completion status
- Backend validates before allowing updates

---

## File Locations (Absolute Paths)

```
Main Components:
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/pages/StorylabPage.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/WorkflowView.tsx

Stage Components:
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage1CampaignDetails.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage2Personas.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage3Narratives.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage4Storyboard.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage5Screenplay.tsx
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/components/stages/Stage6GenerateVideo.tsx

Core Hook:
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/features/storylab/hooks/useStoryLabProject.ts

Service Layer:
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/src/shared/services/storyLabProjectService.ts

Documentation Files:
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/WORKFLOW_ARCHITECTURE_ANALYSIS.md
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/WORKFLOW_ARCHITECTURE_DIAGRAMS.md
  /Users/raghav/Workspace/pixology-workspace/pixology-node-fe/CODE_SNIPPETS_REFERENCE.md
```

---

## Key Insights

### 1. Project Creation is "Lazy"
Projects don't persist to database until Stage1 completion. Uses temporary IDs (`temp-{timestamp}`) during initial form filling.

### 2. No Props Drilling Beyond Stage1
WorkflowView passes all functions to Stage1. Later stages either get props from WorkflowView or use own hook instance.

### 3. Campaign Details are Preserved
Every `advanceToNextStage()` call explicitly preserves `campaignDetails` - ensures context stays consistent.

### 4. Reload Happens at Right Time
`markStageCompleted()` triggers reload (ensures fresh stageExecutions for validation), not `advanceToNextStage()` (more efficient).

### 5. Error Handling is Comprehensive
Each operation:
- Sets loading/saving flags
- Calls API
- Updates state only on success
- Throws error on failure
- Clears flags in finally block

---

## Testing Recommendations

### Test Project Creation
1. Create new project
2. Verify temp ID format: `temp-{timestamp}`
3. Fill Stage1, save
4. Verify real ID assigned
5. Refresh browser - project loads

### Test Data Persistence
1. Fill form in any stage
2. Click "Next"
3. Go back to previous stage
4. Verify data is still there

### Test Stage Blocking
1. Try to skip completed stages (should work)
2. Try to access future stages (should fail)
3. Reload page - stage accessibility preserved

### Test State Consistency
1. Open project in two browser tabs
2. Complete stage in one tab
3. Refresh other tab
4. Verify stage shows as completed

---

## Potential Issues & Notes

### Stage4 Inconsistency
Stage4 uses different pattern (own hook) than Stage1-3. This works but creates two separate hook instances for same project ID - could cause synchronization issues if both are active simultaneously.

### No Intermediate Saves
Stages don't auto-save. All data lost if user closes browser before clicking "Save & Proceed". Could add auto-save interval.

### Campaign Details Hardcoded
`advanceToNextStage()` always preserves `campaignDetails` even if no campaign details exist. Could be refactored to be more generic.

### No Conflict Resolution
If data changes on server (e.g., from another device), next reload overwrites local changes. Consider implementing conflict detection/resolution.

---

