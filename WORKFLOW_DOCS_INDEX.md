# WorkflowView Component Documentation Index

## Overview

This directory contains comprehensive documentation of the StoryLab multi-stage workflow architecture, examining how the WorkflowView component manages project data flow through all 6 stages.

**Documentation Date**: November 3, 2025  
**Repository**: pixology-node-fe  
**Focus**: WorkflowView component, useStoryLabProject hook, project data management

---

## Documentation Files

### 1. EXAMINATION_SUMMARY.md
**Start here for quick understanding**

- Quick answers to all 5 examination questions
- Architecture highlights and key insights
- File locations (absolute paths)
- Testing recommendations
- Potential issues and notes
- **Read time**: 10 minutes

**Best for**: Getting oriented, understanding the big picture, finding specific file locations

---

### 2. WORKFLOW_ARCHITECTURE_ANALYSIS.md
**Complete technical reference**

- Detailed analysis of project creation and data flow
- Project reload behavior when advancing stages
- How projectId is passed to each stage
- Data save validation mechanism
- advanceToNextStage() implementation deep dive
- Summary table of all behaviors
- Critical implementation details
- **Read time**: 20-30 minutes

**Best for**: Understanding every detail, implementation specifics, decision rationale

---

### 3. WORKFLOW_ARCHITECTURE_DIAGRAMS.md
**Visual guide to architecture**

- Component hierarchy diagram
- Data flow for new projects
- Data flow for advancing between stages
- State management pattern
- Key architecture patterns
- Critical points explained visually
- Why this architecture?
- **Read time**: 15 minutes

**Best for**: Visual learners, understanding flow sequences, seeing relationships

---

### 4. CODE_SNIPPETS_REFERENCE.md
**Developer quick reference**

- Organized by component and file
- Complete code examples (copy-paste ready)
- All key methods with context
- 7 major sections covering:
  1. WorkflowView entry point
  2. useStoryLabProject hook
  3. Stage1CampaignDetails
  4. Stage2Personas
  5. Stage4Storyboard
  6. Service layer
  7. StorylabPage entry point
- **Read time**: 5-10 minutes per section

**Best for**: Finding specific code, understanding implementation, copy-paste examples

---

## Quick Answers to Examination Questions

### Q1: How is the project created and passed between stages?

**File**: WORKFLOW_ARCHITECTURE_ANALYSIS.md - Section 1
**Summary**:
- Projects start with temporary ID (`temp-{timestamp}`)
- Stage1 creates project via `createProject()`, reloads via `loadProject()`, advances via `advanceToNextStage()`
- WorkflowView loads project via `useStoryLabProject` hook
- Project object passed as prop to stage components
- All mutations go through same hook instance

**Code**: CODE_SNIPPETS_REFERENCE.md - Sections 1, 3, 7

---

### Q2: Is project reloaded when advancing stages?

**File**: WORKFLOW_ARCHITECTURE_ANALYSIS.md - Section 2
**Summary**:
- `advanceToNextStage()` does NOT reload
- `markStageCompleted()` DOES reload (to get fresh stageExecutions)
- `updateProject()` returns server response (used for state update)
- Reload happens at the right time for efficiency

**Code**: CODE_SNIPPETS_REFERENCE.md - Section 2

---

### Q3: How is projectId passed to each stage?

**File**: WORKFLOW_ARCHITECTURE_ANALYSIS.md - Section 3
**Summary**:
- **Pattern A** (Stage1-3): Receive project + functions as props from WorkflowView
- **Pattern B** (Stage4+): Receive projectId, use own hook instance
- Flow: StorylabPage → WorkflowView → useStoryLabProject → Stages

**Code**: CODE_SNIPPETS_REFERENCE.md - Sections 1, 3, 4, 5

---

### Q4: Mechanism to ensure data is saved before advancing?

**File**: WORKFLOW_ARCHITECTURE_ANALYSIS.md - Section 4
**Summary**:
- Level 1: `updateProject()` always calls API before updating state
- Level 2: `markStageCompleted()` updates stageExecutions status
- Level 3: `isStageAccessible()` blocks future stages if previous incomplete
- Multi-level validation ensures data integrity

**Code**: CODE_SNIPPETS_REFERENCE.md - Sections 1, 2

---

### Q5: Does advanceToNextStage() reload the project?

**File**: WORKFLOW_ARCHITECTURE_ANALYSIS.md - Section 5
**Summary**:
- NO reload - only updates `currentStageIndex`
- Preserves `campaignDetails` explicitly
- Relies on `updateProject()` service response
- Why no reload: efficiency, server validates

**Code**: CODE_SNIPPETS_REFERENCE.md - Section 2

---

## Reading Recommendations by Use Case

### I want a quick overview
1. Read: EXAMINATION_SUMMARY.md (10 min)
2. Skim: WORKFLOW_ARCHITECTURE_DIAGRAMS.md (5 min)

### I need to understand the implementation
1. Read: WORKFLOW_ARCHITECTURE_ANALYSIS.md (25 min)
2. Reference: CODE_SNIPPETS_REFERENCE.md as needed
3. Visual: WORKFLOW_ARCHITECTURE_DIAGRAMS.md

### I need to modify/add code
1. Quick lookup: CODE_SNIPPETS_REFERENCE.md
2. Deep dive: WORKFLOW_ARCHITECTURE_ANALYSIS.md relevant section
3. Visual reference: WORKFLOW_ARCHITECTURE_DIAGRAMS.md

### I'm debugging a workflow issue
1. Check: EXAMINATION_SUMMARY.md - "Potential Issues & Notes"
2. Trace: WORKFLOW_ARCHITECTURE_DIAGRAMS.md - relevant data flow
3. Inspect: CODE_SNIPPETS_REFERENCE.md - relevant methods
4. Understand: WORKFLOW_ARCHITECTURE_ANALYSIS.md - context

---

## Key File Locations

### Main Components
- StorylabPage: `/src/features/storylab/pages/StorylabPage.tsx`
- WorkflowView: `/src/features/storylab/components/WorkflowView.tsx`

### Stage Components
```
/src/features/storylab/components/stages/
  ├── Stage1CampaignDetails.tsx
  ├── Stage2Personas.tsx
  ├── Stage3Narratives.tsx
  ├── Stage4Storyboard.tsx
  ├── Stage5Screenplay.tsx
  └── Stage6GenerateVideo.tsx
```

### State Management
- Hook: `/src/features/storylab/hooks/useStoryLabProject.ts`
- Service: `/src/shared/services/storyLabProjectService.ts`

---

## Core Concepts

### Single Source of Truth
The `useStoryLabProject()` hook in WorkflowView is the single source of truth for project data. All stage components read from and write to this shared state.

### Automatic Persistence
Every data update immediately makes an HTTP API call. State is only updated after successful server response.

### Three-Level Validation
1. API calls validate data
2. stageExecutions tracking prevents skipping stages
3. UI blocks access to future stages

### Two Component Patterns
- **Recommended**: Receive props from WorkflowView (Stage1-3)
- **Alternative**: Use own hook instance (Stage4+)

---

## Architecture Summary

```
┌─ StorylabPage (entry point, manages projects list)
│
└─ WorkflowView (orchestrator, holds useStoryLabProject hook)
   │
   ├─ useStoryLabProject hook
   │  └─ Single source of truth for project state
   │  └─ All mutations go through this hook
   │  └─ Auto-loads project from DB if real ID
   │
   └─ Stage Components (1-6)
      ├─ Stage1-3: Receive project + functions as props
      ├─ Stage4-6: Receive projectId, use own hook instance
      └─ All can update project via hook functions
```

---

## Data Flow Summary

```
Stage User Action
    ↓
updateFunction() [HTTP PUT]
    ↓
Server validates and updates
    ↓
Hook receives response
    ↓
setProject(updated) updates state
    ↓
Component re-renders with new data
```

---

## Stage Advancement Sequence

```
1. updateData() → HTTP PUT /api/projects/{id}
2. markStageCompleted() → HTTP PUT /api/projects/{id}/stages/{name}
3. Hook calls loadProject() → HTTP GET /api/projects/{id} [RELOAD]
4. advanceToNextStage() → HTTP PUT /api/projects/{id}
5. Hook updates state
6. WorkflowView syncs currentStage
7. New stage component renders
```

---

## Common Questions

### Why does Stage4 use a different pattern?
Stage4 (and 5, 6) use their own hook instance pattern. This works but could cause synchronization issues if both patterns are active simultaneously.

### What if data changes on another device?
If data changes on server (from another device), the next reload overwrites local changes. Consider implementing conflict detection.

### How do new projects work?
New projects use temporary IDs (`temp-{timestamp}`) until Stage1 completion. Allows filling forms before persisting to database.

### Can users skip stages?
No. Navigation UI blocks future stages. Backend also validates. Must complete previous stages sequentially.

### What happens if user closes browser?
All unsaved changes are lost. No auto-save mechanism. User must click "Save & Proceed" to persist.

---

## Testing Recommendations

See EXAMINATION_SUMMARY.md for detailed testing recommendations covering:
- Project creation flow
- Data persistence
- Stage blocking
- State consistency

---

## Potential Issues & Improvements

See EXAMINATION_SUMMARY.md - "Potential Issues & Notes" for:
- Stage4 inconsistency with other stages
- Missing auto-save functionality
- Campaign details hardcoding
- No conflict resolution

---

## Related Documentation

- PROJECT_DATA_MODEL.md - Data model structure
- PROJECT_DATA_MODEL_SUMMARY.md - Data model overview
- PROJECT_DATA_MODEL_UI_INTEGRATION.md - Integration guide
- QUICK_START.md - Setup and running locally

---

## Document Maintenance

**Last Updated**: November 3, 2025  
**Examined Components**: WorkflowView, useStoryLabProject, Stage1-6, StoryLabProjectService  
**Files Analyzed**: 8 main files across features/storylab and shared/services  

All code examples are current as of the latest commit on November 3, 2025.

---

## Quick Navigation

| Need | File | Time |
|------|------|------|
| Quick overview | EXAMINATION_SUMMARY.md | 10 min |
| Visual understanding | WORKFLOW_ARCHITECTURE_DIAGRAMS.md | 15 min |
| Complete analysis | WORKFLOW_ARCHITECTURE_ANALYSIS.md | 25 min |
| Code examples | CODE_SNIPPETS_REFERENCE.md | 5-10 min |
| Everything | All 4 files | 50 min |

---

