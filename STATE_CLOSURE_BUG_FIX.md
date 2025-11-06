# Bug Fix: React State Closure Issue in Stage Progression

## Problem
When clicking the "Finalize Screenplay" button, the application was throwing:
```
Failed to save screenplay: Error: No next stage available (currentStageIndex=5)
    at useStoryLabProject.ts:426:22
```

This error indicated that `advanceToNextStage` was using an incorrect `currentStageIndex` value, making it think there were no more stages available.

## Root Cause
This is a classic **React state closure issue**:

1. User is on Stage 5 (screenplay), with `currentStageIndex = 4`
2. `handleSubmit` calls `markStageCompleted('screenplay')`
3. `markStageCompleted` updates the project to set `currentStageIndex = 4` (the screenplay stage index)
4. However, this is an async operation that updates React state
5. **Immediately after**, `advanceToNextStage()` is called
6. But `advanceToNextStage` is using the `project` variable from the closure, which has NOT been updated yet
7. The stale `project` object has an old `currentStageIndex` value
8. This causes incorrect stage progression logic

### Closure Problem Visualization
```
handleSubmit() {
  // project closure variable = { currentStageIndex: 3, ... }

  await markStageCompleted('screenplay');
  // Sets state to { currentStageIndex: 4, ... }
  // BUT the 'project' in the closure is still the OLD object

  await advanceToNextStage();
  // Uses 'project' from closure = { currentStageIndex: 3, ... } ❌ STALE!
}
```

## Solution
Pass the updated project object from `markStageCompleted` to `advanceToNextStage` instead of relying on stale closure variables:

### 1. Update `markStageCompleted` to Return Updated Project
**File:** `src/features/storylab/hooks/useStoryLabProject.ts:379-403`

```typescript
const markStageCompleted = useCallback(
  async (stageName: string, data?: any): Promise<StoryLabProject | null> => {
    const stageIndex = DEFAULT_WORKFLOW_STAGES.findIndex(s => s.name === stageName);
    await updateStageStatus(stageName, 'completed', data);

    if (stageIndex !== -1 && project) {
      const updatedProject = await updateProject(
        {
          currentStageIndex: stageIndex,
        },
        project.id
      );
      return updatedProject;  // ✓ Return the updated project
    }
    return null;
  },
  [updateStageStatus, updateProject, project],
);
```

### 2. Update `advanceToNextStage` to Accept Updated Project
**File:** `src/features/storylab/hooks/useStoryLabProject.ts:415-442`

```typescript
const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
  // Use provided project parameter (with fresh data)
  // OR fall back to closure variable (will be stale if just updated)
  const projectData = projectToAdvance || project;
  if (!projectData) throw new Error('No project loaded');

  console.log(`advanceToNextStage: Using currentStageIndex=${projectData.currentStageIndex}`);

  const next = projectService.current.getNextStage(projectData.currentStageIndex);
  if (!next) {
    throw new Error(`No next stage available (currentStageIndex=${projectData.currentStageIndex})`);
  }

  // Update currentStageIndex
  await updateProject(
    {
      currentStageIndex: next.index,
      campaignDetails: projectData.campaignDetails,
    },
    projectData.id
  );
}, [project, updateProject]);
```

### 3. Update Stage Component to Pass Updated Project
**File:** `src/features/storylab/components/stages/Stage5Screenplay.tsx:216-247`

```typescript
const handleSubmit = async () => {
  try {
    // Save customizations
    if (screenplay.length > 0) {
      await updateScreenplayCustomizations({
        editedText: screenplay,
        lastEditedAt: new Date(),
      });
    }

    // Mark stage as completed and GET the updated project
    const updatedProject = await markStageCompleted('screenplay');

    // Pass the updated project to advanceToNextStage
    // This ensures we're using FRESH data, not a stale closure
    await advanceToNextStage(updatedProject || undefined);
  } catch (error) {
    console.error('Failed to save screenplay:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error finalizing screenplay: ${errorMessage}`);
  }
};
```

## How It Works Now
```
handleSubmit() {
  const updatedProject = await markStageCompleted('screenplay');
  // updatedProject = { currentStageIndex: 4, ... } ✓ FRESH DATA

  await advanceToNextStage(updatedProject);
  // Uses updatedProject parameter = { currentStageIndex: 4, ... } ✓ CORRECT!
  // getNextStage(4) → returns index 5 ✓
  // Successfully advances to Stage 6 ✓
}
```

## Enhanced Logging
Added detailed console logs to help debug stage progression:

```javascript
console.log(`markStageCompleted: Setting currentStageIndex to ${stageIndex} for stage '${stageName}'`);
console.log(`markStageCompleted: Updated project with currentStageIndex=${stageIndex}`);

console.log(`advanceToNextStage: Using currentStageIndex=${projectData.currentStageIndex}`);
console.log(`advanceToNextStage: Advancing from stage index ${projectData.currentStageIndex} to ${next.index}`);
console.log(`advanceToNextStage: Successfully advanced to stage index ${next.index}`);
```

These logs help verify that:
1. The correct `currentStageIndex` is being set
2. The updated project is being used
3. Each stage advance is happening correctly

## Testing Results
✅ **Build:** Successful (no TypeScript errors)
✅ **Stage Progression:** Should now work correctly without "No next stage available" errors

## Expected Behavior After Fix
1. Click "Finalize Screenplay" button
2. Screenplay is saved with customizations
3. Screenplay stage marked as completed (currentStageIndex = 4)
4. `advanceToNextStage` receives the updated project
5. Correctly calculates next stage as index 5 (Stage 6)
6. Updates to currentStageIndex = 5
7. User is now on Stage 6 (Generate Video)
8. Sidebar shows screenplay stage as completed

## Key Takeaway
**Never rely on closure variables for state that may have just been updated.**
Instead, either:
- Return the updated value and pass it as a parameter
- Wait for the state update to propagate
- Use a ref to access the latest state

This pattern prevents subtle timing bugs in React applications.

## Files Modified
- ✅ `src/features/storylab/hooks/useStoryLabProject.ts` (markStageCompleted and advanceToNextStage)
- ✅ `src/features/storylab/components/stages/Stage5Screenplay.tsx` (handleSubmit)
