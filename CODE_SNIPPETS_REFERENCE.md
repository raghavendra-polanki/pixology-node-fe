# Code Snippets Reference - Workflow Management

## 1. WorkflowView Component Entry Point

**File**: `/src/features/storylab/components/WorkflowView.tsx`

### Loading Project and Setting Up Hook

```typescript
export function WorkflowView({ projectId, onBack }: WorkflowViewProps) {
  // SINGLE SOURCE OF TRUTH for project state
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

  // Sync UI state with project data
  useEffect(() => {
    if (project) {
      setCurrentStage(project.currentStageIndex + 1);
    }
  }, [project?.currentStageIndex, project]);
```

### Stage Validation Logic

```typescript
// Check if stage is completed (from stageExecutions)
const isStageCompleted = (stageIndex: number) => {
  const stageName = STAGE_NAMES[stageIndex - 1];
  return project?.stageExecutions[stageName]?.status === 'completed';
};

// Check if stage can be accessed
const isStageAccessible = (stageIndex: number) => {
  // Can access current stage or already completed stages
  if (stageIndex <= currentStage) return true;
  // Must complete all previous stages first
  for (let i = 1; i < stageIndex; i++) {
    if (!isStageCompleted(i)) return false;
  }
  return true;
};
```

### Dynamic Stage Rendering

```typescript
const CurrentStageComponent = stages[currentStage - 1].component;

return (
  <CurrentStageComponent
    project={project}
    createProject={createProject}
    loadProject={loadProject}
    updateCampaignDetails={updateCampaignDetails}
    updateAIPersonas={updateAIPersonas}
    updatePersonaSelection={updatePersonaSelection}
    markStageCompleted={markStageCompleted}
    advanceToNextStage={advanceToNextStage}
  />
);
```

---

## 2. useStoryLabProject Hook - Core Management

**File**: `/src/features/storylab/hooks/useStoryLabProject.ts`

### Initialization and Auto-Loading

```typescript
export function useStoryLabProject(options: UseStoryLabProjectOptions = {}): UseStoryLabProjectResult {
  const projectService = useRef(new StoryLabProjectService());

  const [project, setProject] = useState<StoryLabProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Auto-load project on mount
  useEffect(() => {
    if (options.autoLoad && options.projectId) {
      // Don't try to load temp projects from database
      if (options.projectId.startsWith('temp-')) {
        setProject(null);
        setIsLoading(false);
      } else {
        loadProject(options.projectId);
      }
    }
  }, [options.autoLoad, options.projectId, loadProject]);
```

### Load Project from Database

```typescript
const loadProject = useCallback(async (projectId: string): Promise<StoryLabProject> => {
  try {
    setIsLoading(true);
    setError(null);
    const loadedProject = await projectService.current.getProject(projectId);
    setProject(loadedProject);
    setHasUnsavedChanges(false);
    return loadedProject;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, []);
```

### Generic Project Update - The Most Important Method

```typescript
const updateProject = useCallback(
  async (updates: UpdateProjectInput, projectIdOverride?: string): Promise<StoryLabProject> => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');

    try {
      setIsSaving(true);
      setError(null);

      // Make API call with partial updates
      const updated = await projectService.current.updateProject(projectId, updates);

      // Update local state with server response
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

### Update Specific Data (Uses updateProject Internally)

```typescript
// Campaign details
const updateCampaignDetails = useCallback(
  async (details: Partial<UserInputCampaignDetails>, projectIdOverride?: string) => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');
    setHasUnsavedChanges(true);
    await updateProject({ campaignDetails: details }, projectId);
  },
  [updateProject, project],
);

// AI personas
const updateAIPersonas = useCallback(
  async (personas: AIGeneratedPersonas, projectIdOverride?: string) => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');
    setHasUnsavedChanges(true);
    await updateProject({ aiGeneratedPersonas: personas }, projectId);
  },
  [updateProject, project],
);

// AI storyboard
const updateAIStoryboard = useCallback(
  async (storyboard: AIGeneratedStoryboard, projectIdOverride?: string) => {
    const projectId = projectIdOverride || project?.id;
    if (!projectId) throw new Error('No project loaded');
    setHasUnsavedChanges(true);

    console.log('updateAIStoryboard called with:', { projectId, sceneCount: storyboard.scenes?.length });

    try {
      const result = await updateProject({ aiGeneratedStoryboard: storyboard }, projectId);
      console.log('updateAIStoryboard returned:', result?.aiGeneratedStoryboard);
      return result;
    } catch (error) {
      console.error('updateAIStoryboard error:', error);
      throw error;
    }
  },
  [updateProject, project],
);
```

### Stage Completion - Includes Reload!

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
    
    // Update stage execution in database
    await projectService.current.updateStageExecution(project.id, {
      stageName,
      status: status as any,
      data,
    });
    
    // RELOAD project to get fresh stage executions
    await loadProject(project.id);
  },
  [project, loadProject],
);
```

### Advance to Next Stage - The Key Method

```typescript
const advanceToNextStage = useCallback(async (projectToAdvance?: StoryLabProject) => {
  // Use provided project or fall back to current project in state
  const projectData = projectToAdvance || project;
  if (!projectData) throw new Error('No project loaded');

  // Calculate next stage (0-based index)
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

**Important**: This does NOT reload the project. It relies on `updateProject()` returning the updated data.

---

## 3. Stage1CampaignDetails - Project Creation Flow

**File**: `/src/features/storylab/components/stages/Stage1CampaignDetails.tsx`

### New Project Creation Path

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setIsSaving(true);
    
    // NEW PROJECT PATH
    if (!project) {
      // Step 1: Create project in database
      const newProject = await createProject({
        name: formData.campaignName || 'New Campaign',
        description: '',
        campaignDetails: formData,
      });
      
      // Step 2: Reload to get full data with stage executions
      if (newProject) {
        const loadedProject = await loadProject(newProject.id);
        
        // Step 3: Advance with reloaded project
        await advanceToNextStage(loadedProject);
      }
    } else {
      // EXISTING PROJECT PATH
      await updateCampaignDetails(formData);
      await markStageCompleted('campaign-details');
      await advanceToNextStage(project);
    }
  } catch (error) {
    console.error('Failed to save campaign details:', error);
  } finally {
    setIsSaving(false);
  }
};
```

### Form Synchronization with Project

```typescript
// Sync form with project data when it loads
useEffect(() => {
  if (project?.campaignDetails) {
    // Load existing campaign details
    setFormData({
      campaignName: project.campaignDetails.campaignName || '',
      productDescription: project.campaignDetails.productDescription || '',
      targetAudience: project.campaignDetails.targetAudience || '',
      videoLength: project.campaignDetails.videoLength || '30s',
      callToAction: project.campaignDetails.callToAction || 'Visit Website',
    });
  } else if (project === null) {
    // For new/temp projects, initialize with empty form
    setFormData({
      campaignName: '',
      productDescription: '',
      targetAudience: '',
      videoLength: '30s',
      callToAction: 'Visit Website',
    });
  }
}, [project]);
```

---

## 4. Stage2Personas - Existing Project Pattern

**File**: `/src/features/storylab/components/stages/Stage2Personas.tsx`

### Receiving Props from WorkflowView

```typescript
interface Stage2Props {
  project: any;
  updateAIPersonas: (personas: any) => Promise<void>;
  updatePersonaSelection: (selection: any) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  advanceToNextStage: (projectToAdvance?: any) => Promise<void>;
}

export function Stage2Personas({ 
  project, 
  updateAIPersonas, 
  updatePersonaSelection, 
  markStageCompleted, 
  advanceToNextStage 
}: Stage2Props) {
```

### Loading Generated Data

```typescript
// Sync personas with project data when loaded
useEffect(() => {
  if (project?.aiGeneratedPersonas?.personas && project.aiGeneratedPersonas.personas.length > 0) {
    // Convert PersonaData to UI Persona format
    const loadedPersonas: Persona[] = project.aiGeneratedPersonas.personas.map(p => ({
      id: p.id,
      name: (p.coreIdentity as any)?.name || 'Unknown',
      age: (p.coreIdentity as any)?.age || '',
      demographic: (p.coreIdentity as any)?.demographic || '',
      motivation: (p.coreIdentity as any)?.motivation || '',
      bio: (p.coreIdentity as any)?.bio || '',
      image: (p.image as any)?.url || (p.image as any) || '',
      selected: project.userPersonaSelection?.selectedPersonaIds?.includes(p.id) || false
    }));
    setPersonas(loadedPersonas);
    setHasGenerated(true);
  }
}, [project?.aiGeneratedPersonas, project?.userPersonaSelection]);
```

### Advancing to Next Stage

```typescript
const handleAdvanceToNextStage = async () => {
  try {
    await markStageCompleted('personas');
    await advanceToNextStage(project);
  } catch (error) {
    console.error('Failed to advance:', error);
  }
};
```

---

## 5. Stage4Storyboard - Self-Loading Pattern

**File**: `/src/features/storylab/components/stages/Stage4Storyboard.tsx`

### Different Component Interface

```typescript
interface Stage4Props {
  projectId?: string;
}

export function Stage4Storyboard({ projectId }: Stage4Props) {
  // Stage4 loads its own project using the hook
  const { 
    project, 
    isSaving, 
    updateAIStoryboard, 
    updateStoryboardCustomizations, 
    markStageCompleted, 
    advanceToNextStage, 
    loadProject 
  } = useStoryLabProject({ autoLoad: true, projectId: projectId || '' });
```

**Key Difference**: Stage4 doesn't receive project/functions as props. It creates its own hook instance.

### Using Loaded Project Data

```typescript
useEffect(() => {
  if (project?.aiGeneratedStoryboard?.scenes) {
    const loadedScenes: Scene[] = project.aiGeneratedStoryboard.scenes.map((s, i) => ({
      id: s.sceneNumber?.toString() || i.toString(),
      number: s.sceneNumber || i + 1,
      title: s.title || '',
      description: s.description || '',
      visualNote: s.cameraInstructions || '',
      image: (s.referenceImage as any)?.url || (s.referenceImage as any) || '',
    }));
    setScenes(loadedScenes);
  } else {
    setScenes([]);
  }
}, [project?.aiGeneratedStoryboard]);
```

---

## 6. Service Layer - API Communication

**File**: `/src/shared/services/storyLabProjectService.ts`

### Create Project

```typescript
async createProject(input: CreateProjectInput): Promise<StoryLabProject> {
  // Initialize stage executions for new projects
  const stageExecutions: Record<string, any> = {};
  DEFAULT_WORKFLOW_STAGES.forEach((stage) => {
    stageExecutions[stage.name] = {
      stageName: stage.name,
      status: 'pending',
    };
  });

  const apiPayload = {
    title: input.name,
    description: input.description || '',
    status: 'draft',
    currentStageIndex: 0,
    completionPercentage: 0,
    stageExecutions,
    ...input,
  };
  delete (apiPayload as any).name;

  const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
    method: 'POST',
    headers: this.getAuthHeader(),
    credentials: 'include',
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create project');
  }

  const data = await response.json();
  return this.parseProjectResponse(data.project);
}
```

### Get Project

```typescript
async getProject(projectId: string): Promise<StoryLabProject> {
  const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
    method: 'GET',
    headers: this.getAuthHeader(),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch project');
  }

  const data = await response.json();
  return this.parseProjectResponse(data.project);
}
```

### Update Project

```typescript
async updateProject(projectId: string, updates: UpdateProjectInput): Promise<StoryLabProject> {
  const apiPayload = { ...updates };
  if ('name' in apiPayload) {
    (apiPayload as any).title = (apiPayload as any).name;
    delete (apiPayload as any).name;
  }

  const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}`, {
    method: 'PUT',
    headers: this.getAuthHeader(),
    credentials: 'include',
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update project');
  }

  const data = await response.json();
  return this.parseProjectResponse(data.project);
}
```

### Update Stage Execution

```typescript
async updateStageExecution(projectId: string, stageUpdate: UpdateStageInput): Promise<StoryLabProject> {
  const response = await fetch(`${this.apiBaseUrl}/api/projects/${projectId}/stages/${stageUpdate.stageName}`, {
    method: 'PUT',
    headers: this.getAuthHeader(),
    credentials: 'include',
    body: JSON.stringify(stageUpdate),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update stage execution');
  }

  const data = await response.json();
  return this.parseProjectResponse(data.project);
}
```

### Get Next Stage

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

## 7. StorylabPage - Entry Point

**File**: `/src/features/storylab/pages/StorylabPage.tsx`

### Handling Project Creation

```typescript
const handleCreateProject = () => {
  // Create a temporary local project without saving to database yet
  const tempId = `temp-${Date.now()}`;
  const newProject: Project = {
    id: tempId,
    name: 'New Campaign',
    status: 'draft',
    currentStage: 1,
    createdAt: new Date().toISOString().split('T')[0],
    data: {
      campaignDetails: undefined,
      personas: [],
      narrative: undefined,
      storyboard: [],
      screenplay: [],
      video: undefined,
    },
  };

  setProjects([...projects, newProject]);
  setSelectedProject(newProject);
  setCurrentView('workflow');
};
```

### Rendering WorkflowView

```typescript
return (
  <>
    {currentView === 'projects' ? (
      <ProjectsDashboard
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        isLoading={isLoading}
        error={error}
        onRetry={fetchProjects}
      />
    ) : selectedProject ? (
      <WorkflowView
        projectId={selectedProject.id}
        onBack={handleBackToProjects}
      />
    ) : null}
  </>
);
```

