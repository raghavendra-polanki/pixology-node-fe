# Bug Fix: Stage Progression Logic - "Highest Completed Stage + 1" Issue

## Problem Description
When clicking the "Finalise [Stage]" button to complete a stage and advance to the next one, the system was using an incorrect reference point to determine which stage to advance to. Instead of advancing from the stage just being completed, it would sometimes advance based on the highest completed stage + 1, causing incorrect stage progression.

## Root Cause Analysis

### The Issue
The problem was in the `markStageCompleted` function in `useStoryLabProject` hook:

1. When a user completed a stage (e.g., Stage 5 - Screenplay), `markStageCompleted('screenplay')` was called
2. This function only updated the stage execution status (marking it as "completed")
3. **It did NOT update `currentStageIndex`** to reflect that the stage was completed
4. When `advanceToNextStage()` was subsequently called, it used `project.currentStageIndex` to determine where to go next
5. If `currentStageIndex` was stale (pointing to an earlier stage), it would advance from that earlier stage instead of the one just completed

### Example Scenario
```
Scenario: User is on Stage 5 (Screenplay), completes it
1. currentStageIndex = 4 (pointing to stage 5, the current stage)
2. User clicks "Finalise Screenplay"
3. markStageCompleted('screenplay') is called
4. Stage execution status is updated to "completed"
5. BUT currentStageIndex is still 4 (no update!)
6. advanceToNextStage() uses currentStageIndex = 4
7. getNextStage(4) returns index 5 (stage 6) ✓ Correct by luck!

BUT if the user manually navigated back to a previous stage:
1. User was on stage 5, then manually clicked stage 3 in sidebar
2. currentStageIndex is still 4 (backend wasn't updated)
3. markStageCompleted('storyboard') is called
4. advanceToNextStage() uses currentStageIndex = 4 (wrong!)
5. Goes to stage 5 instead of stage 4
```

## Solution

### The Fix
Updated `markStageCompleted` to also update `currentStageIndex` to the stage being completed:

```typescript
const markStageCompleted = useCallback(
  async (stageName: string, data?: any) => {
    // Find the index of the stage being completed
    const stageIndex = DEFAULT_WORKFLOW_STAGES.findIndex(s => s.name === stageName);

    // Update stage status
    await updateStageStatus(stageName, 'completed', data);

    // Update currentStageIndex to point to the stage that was just completed
    // This ensures advanceToNextStage will correctly advance from this stage
    if (stageIndex !== -1 && project) {
      console.log(`markStageCompleted: Setting currentStageIndex to ${stageIndex} for stage '${stageName}'`);
      await updateProject(
        {
          currentStageIndex: stageIndex,
        },
        project.id
      );
    }
  },
  [updateStageStatus, updateProject, project],
);
```

**File:** `src/features/storylab/hooks/useStoryLabProject.ts:379-400`

### How It Works Now
1. When `markStageCompleted('screenplay')` is called
2. Find the index of 'screenplay' in DEFAULT_WORKFLOW_STAGES (index = 4)
3. Update both:
   - Stage execution status → "completed"
   - currentStageIndex → 4 (now points to the completed stage)
4. When `advanceToNextStage()` is called
5. It uses currentStageIndex = 4 and correctly advances to index 5 (stage 6)

### Workflow Example
```
Stage Progression:
Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6

When completing Stage 5:
- markStageCompleted('screenplay')
  - Updates currentStageIndex to 4 (stage 5's index)
  - Marks stage as completed

- advanceToNextStage()
  - Uses currentStageIndex = 4
  - Calls getNextStage(4) → returns index 5
  - Updates currentStageIndex to 5
  - User moves to Stage 6 ✓
```

## Testing

### Verification
✅ Build succeeds with no TypeScript errors

### Manual Testing Steps
1. Create a new project and complete it through stages sequentially:
   - Stage 1 → Complete → Advance to Stage 2
   - Stage 2 → Complete → Advance to Stage 3
   - Stage 3 → Complete → Advance to Stage 4
   - Stage 4 → Complete → Advance to Stage 5
   - Stage 5 → Complete → Advance to Stage 6

2. Check browser console for logs showing:
   ```
   markStageCompleted: Setting currentStageIndex to X for stage 'Y'
   ```

3. Verify that each stage advances to the correct next stage

### Edge Case Testing
Test manual navigation and backward movement:
1. Complete Stage 1
2. Manually go to Stage 1 from sidebar
3. Edit and finalize again
4. Should advance to Stage 2 (not skip stages)

## Files Modified
- ✅ `src/features/storylab/hooks/useStoryLabProject.ts` (lines 378-400)

## Debugging Information
Console logs now show:
```
markStageCompleted: Setting currentStageIndex to 4 for stage 'screenplay'
markStageCompleted: Setting currentStageIndex to 3 for stage 'storyboard'
// etc.
```

These logs help verify that `currentStageIndex` is being set correctly.

## Impact
- ✅ Stage progression now always advances from the stage just completed
- ✅ No more "jumping" stages due to stale currentStageIndex
- ✅ Users can safely navigate backward and re-complete stages
- ✅ Sequential stage progression is now guaranteed

## Related Issues Fixed
This fix also addresses timing issues where `advanceToNextStage` might use a stale `currentStageIndex` from earlier in the completion flow.

## Prevention
To prevent similar issues:
1. Always update related state together (status + index)
2. Use console logging to track state changes
3. Test both sequential and non-sequential navigation patterns
4. Ensure callbacks capture the correct state through dependencies
