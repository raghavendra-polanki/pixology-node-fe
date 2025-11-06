# Fix: "Finalise Screenplay" Button Not Advancing to Next Stage

## Problem
Clicking the "Finalise Screenplay" button in the Create Screenplay stage (Stage 5) was not advancing to the next stage. The button appeared to do nothing, with no error messages or feedback.

## Root Cause Analysis

The issue had three components:

### 1. Missing Hook Function
The `updateScreenplayCustomizations` function was not exported from the `useStoryLabProject` hook, even though it was being called in Stage5Screenplay's `handleSubmit` function.

**Location:** `src/features/storylab/hooks/useStoryLabProject.ts`
- Expected: Function definition and export
- Actual: Function was missing

### 2. Missing Props
The `updateScreenplayCustomizations` and `updateAIScreenplay` functions were not being passed from WorkflowView to Stage5Screenplay, so the component couldn't access them.

**Location:** `src/features/storylab/components/WorkflowView.tsx`
- Expected: Functions passed to CurrentStageComponent
- Actual: Functions not included in destructuring or props

### 3. Silent Error
When the `handleSubmit` function tried to call `updateScreenplayCustomizations`, it was `undefined`, causing the function to fail silently with no user-facing error message.

**Location:** `src/features/storylab/components/stages/Stage5Screenplay.tsx`
- Expected: Error messages displayed to user
- Actual: Error caught but only logged to console

## Solution

### Step 1: Add `updateScreenplayCustomizations` to Hook
Added the missing function definition to the useStoryLabProject hook:

```typescript
// Update screenplay customizations (screenplay edits)
const updateScreenplayCustomizations = useCallback(
  async (customizations: any, projectIdOverride?: string) => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');
    setHasUnsavedChanges(true);
    await updateProject({ screenplayCustomizations: customizations }, projectId);
  },
  [updateProject, project],
);
```

**File:** `src/features/storylab/hooks/useStoryLabProject.ts:342-351`

### Step 2: Export Function from Hook
Added `updateScreenplayCustomizations` to the hook's return statement:

```typescript
return {
  // ... other exports
  updateScreenplayCustomizations,
  // ... rest of exports
};
```

**File:** `src/features/storylab/hooks/useStoryLabProject.ts:469`

### Step 3: Destructure in WorkflowView
Added the functions to the hook destructuring in WorkflowView:

```typescript
const {
  // ... other destructures
  updateAIScreenplay,
  updateScreenplayCustomizations,
  // ... rest of destructures
} = useStoryLabProject({ autoLoad: true, projectId });
```

**File:** `src/features/storylab/components/WorkflowView.tsx:40-41`

### Step 4: Pass Props to Stage Component
Pass the functions to CurrentStageComponent:

```typescript
<CurrentStageComponent
  // ... other props
  updateAIScreenplay={updateAIScreenplay}
  updateScreenplayCustomizations={updateScreenplayCustomizations}
  // ... rest of props
/>
```

**File:** `src/features/storylab/components/WorkflowView.tsx:158-159`

### Step 5: Improve Error Handling
Enhanced error handling and logging in Stage5Screenplay's `handleSubmit`:

```typescript
const handleSubmit = async () => {
  try {
    console.log('handleSubmit: Starting screenplay finalization');

    if (screenplay.length > 0) {
      console.log('handleSubmit: Saving screenplay customizations...');
      await updateScreenplayCustomizations({
        editedText: screenplay,
        lastEditedAt: new Date(),
      });
      console.log('handleSubmit: Screenplay customizations saved');
    }

    console.log('handleSubmit: Marking screenplay stage as completed...');
    await markStageCompleted('screenplay');
    console.log('handleSubmit: Stage marked as completed');

    console.log('handleSubmit: Advancing to next stage...');
    await advanceToNextStage();
    console.log('handleSubmit: Successfully advanced to next stage');
  } catch (error) {
    console.error('Failed to save screenplay:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error finalizing screenplay: ${errorMessage}`);
  }
};
```

**File:** `src/features/storylab/components/stages/Stage5Screenplay.tsx:216-244`

## Changes Summary

| File | Changes |
|------|---------|
| `useStoryLabProject.ts` | Added `updateScreenplayCustomizations` function definition and export |
| `WorkflowView.tsx` | Added `updateAIScreenplay` and `updateScreenplayCustomizations` to destructuring and props |
| `Stage5Screenplay.tsx` | Enhanced error logging and user-facing error messages |

## Testing

✅ **Build Verification**: Ran `npm run build` - Success (no TypeScript errors)

## Expected Behavior After Fix

1. Click "Finalise Screenplay" button
2. Screenplay customizations are saved
3. Stage is marked as completed
4. Application advances to Stage 6 (Generate Video)
5. Sidebar updates to show screenplay stage as completed
6. Console logs show each step of the process

## Error Handling

If something goes wrong:
- Users will see an alert with the error message
- Console logs will show exactly which step failed
- The error message will indicate what the issue is

## Future Prevention

To prevent similar issues in other stages:
- Always verify that required callback functions are exported from hooks
- Always pass all required functions from parent components
- Always implement visible error messages (alerts/toast notifications)
- Add console logging to track function execution flow

## Files Modified
- ✅ `src/features/storylab/hooks/useStoryLabProject.ts`
- ✅ `src/features/storylab/components/WorkflowView.tsx`
- ✅ `src/features/storylab/components/stages/Stage5Screenplay.tsx`

## Verification Steps

To verify the fix works:

1. Run the application:
   ```bash
   npm run dev
   ```

2. Navigate to create a project and reach the "Create Screenplay" stage

3. Generate or load a screenplay

4. Click "Finalise Screenplay" button

5. Expected:
   - Button should show "Saving..." state
   - Console should log each step
   - Page should advance to "Generate Video" stage
   - Sidebar should show screenplay stage as completed with checkmark
