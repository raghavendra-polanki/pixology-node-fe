import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Check, Zap, AlertTriangle, Share2, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ShareProjectDialog } from '@/shared/components/ShareProjectDialog';
import { useFlareLabProject } from '../hooks/useFlareLabProject';
import { useAuth } from '@/shared/contexts/AuthContext';
import { DEFAULT_WORKFLOW_STAGES, STAGE_NAMES } from '../types/project.types';

// Type for unsaved changes callback from stage components
type UnsavedChangesCallback = (hasChanges: boolean, saveHandler?: () => Promise<void>) => void;

// Import stages
import { Stage1ContextBrief } from './stages/Stage1ContextBrief';
import { Stage2ConceptGallery } from './stages/Stage2ConceptGallery';
import { Stage3CastingCall } from './stages/Stage3CastingCall';
import { Stage4HighFidelityCapture } from './stages/Stage4HighFidelityCapture';
import { Stage5TextStudio } from './stages/Stage5TextStudio';
import { Stage6KineticActivation } from './stages/Stage6KineticActivation';
import { Stage7PolishDownload } from './stages/Stage7PolishDownload';

interface WorkflowViewProps {
  projectId: string;
  onBack: () => void;
}

const stages = [
  { id: 1, name: DEFAULT_WORKFLOW_STAGES[0].title, component: Stage1ContextBrief },
  { id: 2, name: DEFAULT_WORKFLOW_STAGES[1].title, component: Stage2ConceptGallery },
  { id: 3, name: DEFAULT_WORKFLOW_STAGES[2].title, component: Stage3CastingCall },
  { id: 4, name: DEFAULT_WORKFLOW_STAGES[3].title, component: Stage4HighFidelityCapture },
  { id: 5, name: DEFAULT_WORKFLOW_STAGES[4].title, component: Stage5TextStudio },
  { id: 6, name: DEFAULT_WORKFLOW_STAGES[5].title, component: Stage6KineticActivation },
  { id: 7, name: DEFAULT_WORKFLOW_STAGES[6].title, component: Stage7PolishDownload },
];

export const WorkflowView = ({ projectId, onBack }: WorkflowViewProps) => {
  // SINGLE source of truth - loads project ONCE via hook
  const {
    project,
    isLoading,
    loadProject,
    createProject,
    updateProject,
    markStageCompleted,
    markStageInProgress,
    updateContextBrief,
    updateConceptGallery,
    updateCastingCall,
    updateHighFidelityCapture,
    updateTextStudio,
    updateKineticActivation,
    updatePolishDownload,
  } = useFlareLabProject({ autoLoad: true, projectId });

  const { user } = useAuth();

  // Local UI state - tracks which stage component to display
  const [currentStage, setCurrentStage] = useState(1);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Unsaved changes tracking for stage components
  const [stageUnsavedChanges, setStageUnsavedChanges] = useState<Record<number, boolean>>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ type: 'stage' | 'back'; target?: number } | null>(null);
  const stageSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  // Track backend's currentStageIndex to avoid override on navigation
  const lastBackendStageIndexRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

  // Debug: Log project changes
  useEffect(() => {
    console.log('[WorkflowView] Project state updated:', {
      projectId: project?.id,
      currentStage,
      hasTextStudio: !!project?.textStudio,
      textStudioCompositedCount: project?.textStudio?.compositedImages?.length,
      textStudioSelectedForExport: project?.textStudio?.selectedForExport,
      hasKineticActivation: !!project?.kineticActivation,
      kineticAnimationsCount: project?.kineticActivation?.animations?.length,
      kineticSelectedForExport: project?.kineticActivation?.selectedForExport,
    });
  }, [project, currentStage]);

  // Callback for stages to report their unsaved changes state
  const onUnsavedChangesChange = useCallback<UnsavedChangesCallback>((hasChanges, saveHandler) => {
    setStageUnsavedChanges(prev => ({ ...prev, [currentStage]: hasChanges }));
    stageSaveHandlerRef.current = saveHandler || null;
  }, [currentStage]);

  // Check if current stage has unsaved changes
  const currentStageHasUnsavedChanges = stageUnsavedChanges[currentStage] || false;

  // Sync frontend currentStage to backend's last completed stage (on initial load)
  useEffect(() => {
    if (project && !hasInitializedRef.current) {
      const stageIndex = project.currentStageIndex ?? 0;
      setCurrentStage(Math.max(1, stageIndex + 1));
      lastBackendStageIndexRef.current = stageIndex;
      hasInitializedRef.current = true;
      console.log(`WorkflowView: Initial sync - backend stage ${stageIndex}, setting UI to stage ${stageIndex + 1}`);
    }
  }, [project?.id]);

  // When backend currentStageIndex changes (from completing a stage), sync to UI
  useEffect(() => {
    if (hasInitializedRef.current && project) {
      const stageIndex = project.currentStageIndex ?? 0;
      if (lastBackendStageIndexRef.current !== stageIndex) {
        console.log(`WorkflowView: Backend stage changed from ${lastBackendStageIndexRef.current} to ${stageIndex}`);
        setCurrentStage(Math.max(1, stageIndex + 1));
        lastBackendStageIndexRef.current = stageIndex;
      }
    }
  }, [project?.currentStageIndex]);

  // Handle stage navigation with unsaved changes check
  const handleStageNavigation = (stageId: number) => {
    if (!isStageAccessible(stageId)) return;

    // Check for unsaved changes before navigating
    if (currentStageHasUnsavedChanges && stageId !== currentStage) {
      setPendingNavigation({ type: 'stage', target: stageId });
      setShowUnsavedWarning(true);
      return;
    }

    setCurrentStage(stageId);
    console.log(`WorkflowView: Navigating to stage ${stageId} (local only)`);
  };

  // Handle back to projects with unsaved changes check
  const handleBackWithWarning = useCallback(() => {
    if (currentStageHasUnsavedChanges) {
      setPendingNavigation({ type: 'back' });
      setShowUnsavedWarning(true);
      return;
    }
    onBack();
  }, [currentStageHasUnsavedChanges, onBack]);

  // Navigation function to pass to stage components (bypasses unsaved check since stage handles it)
  const navigateToStage = (stageId: number) => {
    // When called from a stage's Save & Continue, the stage has already handled saving
    // Clear the unsaved state for current stage before navigating
    setStageUnsavedChanges(prev => ({ ...prev, [currentStage]: false }));
    setCurrentStage(stageId);
    console.log(`WorkflowView: Stage-initiated navigation to stage ${stageId}`);
  };

  // Confirm discard and proceed with navigation
  const confirmDiscardAndNavigate = useCallback(() => {
    setShowUnsavedWarning(false);
    setStageUnsavedChanges(prev => ({ ...prev, [currentStage]: false }));

    if (pendingNavigation?.type === 'back') {
      onBack();
    } else if (pendingNavigation?.type === 'stage' && pendingNavigation.target) {
      setCurrentStage(pendingNavigation.target);
    }
    setPendingNavigation(null);
  }, [pendingNavigation, currentStage, onBack]);

  // Save and then navigate
  const saveAndNavigate = useCallback(async () => {
    setShowUnsavedWarning(false);

    if (stageSaveHandlerRef.current) {
      try {
        await stageSaveHandlerRef.current();
        // After save, the stage's handleContinue will call navigateToStage
        // So we don't need to navigate here
      } catch (error) {
        console.error('Failed to save:', error);
        // Re-show warning or show error
      }
    }
    setPendingNavigation(null);
  }, []);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  }, []);

  // Check if a stage is accessible
  const isStageAccessible = (stageIndex: number) => {
    if (!project) return stageIndex === 1;

    // Can access current stage and all completed stages before it
    if (stageIndex <= currentStage) return true;

    // Always allow navigation to the next stage
    if (stageIndex === currentStage + 1) return true;

    // Allow access to any stage that was previously completed, even if now pending
    if (wasStageCompletedBefore(stageIndex)) return true;

    // Check if all previous stages are completed
    for (let i = 1; i < stageIndex; i++) {
      if (!isStageCompleted(i)) return false;
    }
    return true;
  };

  // Check if a stage is completed
  const isStageCompleted = (stageIndex: number) => {
    if (!project) return false;
    const stageName = STAGE_NAMES[stageIndex - 1];
    const stageExecution = project.stageExecutions?.[stageName];
    return stageExecution?.status === 'completed';
  };

  // Check if a stage was completed before (even if now pending)
  const wasStageCompletedBefore = (stageIndex: number) => {
    if (!project) return false;
    const stageName = STAGE_NAMES[stageIndex - 1];
    const stageExecution = project.stageExecutions?.[stageName];
    return !!stageExecution?.completedAt;
  };

  // Check if a stage is stale (was completed but now pending)
  const isStageStale = (stageIndex: number) => {
    if (!project) return false;
    const stageName = STAGE_NAMES[stageIndex - 1];
    const stageExecution = project.stageExecutions?.[stageName];

    const isPendingNow = stageExecution?.status === 'pending';
    const wasCompletedBefore = !!stageExecution?.completedAt;

    return isPendingNow && wasCompletedBefore;
  };

  // Show loading state only for non-temp projects
  if (isLoading && !project && !projectId.startsWith('temp-')) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4 inline-block">
            <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  const currentStageIndex = currentStage - 1;
  const CurrentStageComponent = stages[currentStageIndex]?.component;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left Sidebar */}
      <div className="w-80 bg-[#151515] border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                <span className="text-white">Flare</span>
                <span className="text-orange-500">Lab</span>
              </h1>
              <p className="text-xs text-gray-500">by pixology.ai</p>
            </div>
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBackWithWarning}
            className="mb-4 text-gray-400 hover:text-white rounded-lg -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>

          {/* Sport Type Badge */}
          {project && (
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {project.sportType || 'Hockey'}
              </span>
            </div>
          )}

          {/* Project Info */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-1">{project?.name || 'New Campaign'}</h2>
              <p className="text-gray-500">7-Stage Workflow</p>
            </div>
            {!projectId.startsWith('temp-') && (
              <Button
                onClick={() => setShowShareDialog(true)}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                title="Share project"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stage Navigation */}
        <div className="flex-1 p-4 space-y-2">
          {stages.map((stage) => {
            const isActive = stage.id === currentStage;
            const isCompleted = isStageCompleted(stage.id);
            const isStale = isStageStale(stage.id);
            const isAccessible = isStageAccessible(stage.id);

            return (
              <button
                key={stage.id}
                onClick={() => handleStageNavigation(stage.id)}
                disabled={!isAccessible}
                className={`
                  w-full text-left px-4 py-3 rounded-lg transition-all
                  ${isActive ? 'bg-orange-500' : 'hover:bg-gray-800/50'}
                  ${isCompleted && !isActive && !isStale ? 'bg-gray-800/30' : ''}
                  ${isStale ? 'bg-amber-900/20 border border-amber-500/30' : ''}
                  ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm
                      ${isActive ? 'bg-white text-orange-500' : ''}
                      ${isCompleted && !isActive && !isStale ? 'bg-orange-500/20 text-orange-300' : ''}
                      ${isStale ? 'bg-amber-500/20 text-amber-500' : ''}
                      ${!isActive && !isCompleted && !isStale ? 'bg-gray-700 text-gray-300' : ''}
                    `}
                  >
                    {isCompleted && !isStale ? (
                      <Check className="w-5 h-5" />
                    ) : isStale ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <span>{stage.id}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-300'}`}>
                      {stage.name}
                    </div>
                    {isCompleted && !isActive && !isStale && (
                      <div className="text-xs text-orange-400/70 mt-0.5">Completed</div>
                    )}
                    {isStale && (
                      <div className="text-xs text-amber-500 mt-0.5">Needs Regeneration</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Unsaved Changes</h3>
                <p className="text-sm text-gray-400">You have unsaved changes that will be lost.</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              {pendingNavigation?.type === 'back'
                ? 'Would you like to save your changes before leaving the project?'
                : 'Would you like to save your changes before switching stages?'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelNavigation}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDiscardAndNavigate}
                variant="outline"
                size="sm"
                className="border-red-600/50 text-red-400 hover:bg-red-500/10"
              >
                Discard Changes
              </Button>
              {stageSaveHandlerRef.current && (
                <Button
                  onClick={saveAndNavigate}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save First
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {CurrentStageComponent && (
          <CurrentStageComponent
            project={project}
            navigateToStage={navigateToStage}
            // Pass all hook methods to stage components
            createProject={createProject}
            loadProject={loadProject}
            updateProject={updateProject}
            markStageCompleted={markStageCompleted}
            markStageInProgress={markStageInProgress}
            updateContextBrief={updateContextBrief}
            updateConceptGallery={updateConceptGallery}
            updateCastingCall={updateCastingCall}
            updateHighFidelityCapture={updateHighFidelityCapture}
            updateTextStudio={updateTextStudio}
            updateKineticActivation={updateKineticActivation}
            updatePolishDownload={updatePolishDownload}
            // Unsaved changes callback for stages that support it
            onUnsavedChangesChange={onUnsavedChangesChange}
          />
        )}
      </div>

      {/* Share Project Dialog */}
      {showShareDialog && project && (
        <ShareProjectDialog
          open={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          projectId={projectId}
          projectTitle={project.name || 'Project'}
          isOwner={project.ownerId === user?.id}
          productType="flarelab"
        />
      )}
    </div>
  );
};
