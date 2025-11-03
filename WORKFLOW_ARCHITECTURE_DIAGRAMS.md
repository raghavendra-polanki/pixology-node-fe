# Workflow Architecture - Visual Reference

## Component Hierarchy

```
StorylabPage
    ↓
    ├─→ ProjectsDashboard (project list view)
    │   └─→ handleSelectProject → setSelectedProject
    │
    └─→ WorkflowView (projectId passed here)
        ├─→ useStoryLabProject hook (loads project)
        │   ├─→ project state
        │   ├─→ updateProject()
        │   ├─→ markStageCompleted()
        │   └─→ advanceToNextStage()
        │
        └─→ Dynamic Stage Component
            ├─→ Stage1CampaignDetails
            ├─→ Stage2Personas
            ├─→ Stage3Narratives
            ├─→ Stage4Storyboard (has own hook!)
            ├─→ Stage5Screenplay
            └─→ Stage6GenerateVideo
```

## Data Flow: Creating New Project

```
1. StorylabPage.handleCreateProject()
   ├─ Creates temp project: { id: "temp-123456", ... }
   ├─ setProjects([...projects, tempProject])
   └─ setCurrentView('workflow')
        │
        ↓
2. StorylabPage renders WorkflowView
   ├─ Passes: projectId="temp-123456"
   └─ useStoryLabProject({ autoLoad: true, projectId: "temp-123456" })
        │
        ↓
3. useStoryLabProject detects temp- prefix
   ├─ Sets project = null (doesn't try to load from DB)
   └─ Renders Stage1 with project=null
        │
        ↓
4. User fills form in Stage1
   └─ Clicks "Save & Proceed"
        │
        ↓
5. Stage1.handleSubmit() executes:
   
   a) createProject({ campaignDetails: {...} })
      └─ HTTP POST /api/projects
      └─ Returns: { id: "abc123", campaignDetails, stageExecutions: {...} }
      └─ Hook updates: setProject(newProject)
      
   b) loadProject(newProject.id)
      └─ HTTP GET /api/projects/abc123
      └─ Ensures full data (stage executions, etc.)
      └─ Hook updates: setProject(loadedProject)
      
   c) advanceToNextStage(loadedProject)
      └─ HTTP PUT /api/projects/abc123
      └─ Body: { currentStageIndex: 1, campaignDetails: {...} }
      └─ Hook updates: setProject(updatedProject)
      
   d) WorkflowView syncs: setCurrentStage(2)
      └─ Renders Stage2Personas component
```

## Data Flow: Advancing Between Stages

```
User in Stage2 clicks "Next Stage"
    │
    ↓
Stage2.handleSubmit() executes:

    a) updateAIPersonas(personasData)
       ├─ HTTP PUT /api/projects/{projectId}
       ├─ Body: { aiGeneratedPersonas: personasData }
       └─ Hook: setProject(updated)
    
    b) updatePersonaSelection(selection)
       ├─ HTTP PUT /api/projects/{projectId}
       ├─ Body: { userPersonaSelection: selection }
       └─ Hook: setProject(updated)
    
    c) markStageCompleted('personas')
       ├─ HTTP PUT /api/projects/{projectId}/stages/personas
       ├─ Body: { status: 'completed' }
       └─ Hook: loadProject(projectId)  <-- RELOADS
                ├─ HTTP GET /api/projects/{projectId}
                └─ Hook: setProject(loadedProject)
    
    d) advanceToNextStage(project)
       ├─ HTTP PUT /api/projects/{projectId}
       ├─ Body: { currentStageIndex: 2, campaignDetails: {...} }
       └─ Hook: setProject(updated)
    
    e) WorkflowView syncs: setCurrentStage(3)
       └─ Renders Stage3Narratives component
```

## State Management Pattern

```
WorkflowView
    │
    ├─→ useStoryLabProject(projectId)
    │   ├─ State: project (single source of truth)
    │   ├─ Functions: updateProject, advanceToNextStage, etc.
    │   └─ All mutations → HTTP → server update → setProject(response)
    │
    └─→ currentStage (local state)
        ├─ Synced from project.currentStageIndex
        └─ useEffect(): if (project) setCurrentStage(project.currentStageIndex + 1)
            
            // Sync logic
            useEffect(() => {
              if (project) {
                setCurrentStage(project.currentStageIndex + 1);
              }
            }, [project?.currentStageIndex, project]);
```

## Key Pattern: No Direct Props Drilling After Stage1

```
StorylabPage
    └─→ WorkflowView
        ├─→ Props: projectId only
        │
        └─→ useStoryLabProject hook
            ├─ Creates singleton: projectService instance
            ├─ Manages: project state
            ├─ Exports: all mutation functions
            │
            └─→ Stage Components receive:
                ├─ Option A (Stage1-3): project + functions as props
                └─ Option B (Stage4+): projectId + use own hook instance
```

## State Update Flow: Single Operation

```
updateCampaignDetails(newDetails)
    │
    ├─→ Hook function
    │   ├─ setIsSaving(true)
    │   ├─ HTTP PUT /api/projects/{id}
    │   ├─ On success:
    │   │   ├─ setProject(response)
    │   │   ├─ setHasUnsavedChanges(false)
    │   │   └─ return updated
    │   └─ On error:
    │       ├─ setError(error)
    │       └─ throw error
    │
    └─→ Local state updated
        ├─ All components using this project state re-render
        └─ WorkflowView re-renders with new project data
```

## Critical Points

### 1. Project ID Paths

```
StorylabPage.projectId
    ↓ (string: "abc123" or "temp-123456")
    ↓
WorkflowView.projectId
    ↓ (passed as prop)
    ↓
useStoryLabProject({ projectId })
    ├─ If temp-: skip DB load
    └─ If real ID: loadProject(projectId)
```

### 2. advanceToNextStage() Does NOT Reload

```
advanceToNextStage()
    │
    └─→ updateProject({
        currentStageIndex: next.index,
        campaignDetails: projectData.campaignDetails
        })
        │
        └─→ HTTP PUT
            │
            └─→ Server returns updated project
                │
                └─→ setProject(updated)
                    │
                    └─→ Hook does NOT call loadProject()
```

### 3. But markStageCompleted() DOES Reload

```
markStageCompleted('stage-name')
    │
    └─→ updateStageStatus()
        │
        ├─→ HTTP PUT /api/projects/{id}/stages/{name}
        │
        └─→ loadProject(projectId)  <-- RELOAD!
            │
            └─→ HTTP GET /api/projects/{id}
                │
                └─→ Ensures fresh stageExecutions
```

## Stage 4 Exception: Self-Loading Hook

```
Stage4Storyboard({ projectId })
    │
    ├─ Does NOT receive props from WorkflowView
    │
    └─→ useStoryLabProject({ autoLoad: true, projectId })
        ├─ Loads its own project instance
        ├─ Manages its own state
        └─ Independently calls updateAIStoryboard, etc.
```

This is different from Stage1-3 which rely on WorkflowView's hook instance.

## Why This Architecture?

1. **Single Source of Truth**: useStoryLabProject hook manages all project state
2. **Automatic Persistence**: All mutations immediately call API
3. **Atomic Updates**: Each operation is either fully complete or fails
4. **Stage Validation**: Must complete previous stages before advancing
5. **Temp ID Support**: Allows creation of projects before persisting to DB
6. **Flexible Passing**: Supports both prop-based (Stage1-3) and hook-based (Stage4) access

