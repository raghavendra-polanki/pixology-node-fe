import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useGameLabProject } from '../hooks/useGameLabProject';
import { DEFAULT_WORKFLOW_STAGES, STAGE_NAMES } from '../types/project.types';

// Import stages
import { Stage1ContextBrief } from './stages/Stage1ContextBrief';
import { Stage2ConceptGallery } from './stages/Stage2ConceptGallery';
import { Stage3CastingCall } from './stages/Stage3CastingCall';
import { Stage4HighFidelityCapture } from './stages/Stage4HighFidelityCapture';
import { Stage5KineticActivation } from './stages/Stage5KineticActivation';
import { Stage6PolishDownload } from './stages/Stage6PolishDownload';

interface WorkflowViewProps {
  projectId: string;
  onBack: () => void;
}

const stages = [
  { id: 1, name: 'Context Brief', component: Stage1ContextBrief },
  { id: 2, name: 'Concept Gallery', component: Stage2ConceptGallery },
  { id: 3, name: 'Casting Call', component: Stage3CastingCall },
  { id: 4, name: 'High-Fidelity Capture', component: Stage4HighFidelityCapture },
  { id: 5, name: 'Kinetic Activation', component: Stage5KineticActivation },
  { id: 6, name: 'Polish & Download', component: Stage6PolishDownload },
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
    updateKineticActivation,
    updatePolishDownload,
  } = useGameLabProject({ autoLoad: true, projectId });

  // Local UI state - tracks which stage component to display
  const [currentStage, setCurrentStage] = useState(1);

  // Track backend's currentStageIndex to avoid override on navigation
  const lastBackendStageIndexRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

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

  // Handle stage navigation (local only, no backend call)
  const handleStageNavigation = (stageId: number) => {
    if (isStageAccessible(stageId)) {
      setCurrentStage(stageId);
      console.log(`WorkflowView: Navigating to stage ${stageId} (local only)`);
    }
  };

  // Navigation function to pass to stage components
  const navigateToStage = (stageId: number) => {
    handleStageNavigation(stageId);
  };

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
            <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full"></div>
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
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                <span className="text-white">Game</span>
                <span className="text-green-500">Lab</span>
              </h1>
              <p className="text-xs text-gray-500">by pixology.ai</p>
            </div>
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-gray-400 hover:text-white rounded-lg -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>

          {/* Sport Type Badge */}
          {project && (
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                {project.sportType || 'Hockey'}
              </span>
            </div>
          )}

          {/* Project Info */}
          <h2 className="text-white mb-1">{project?.name || 'New Campaign'}</h2>
          <p className="text-gray-500">6-Stage Workflow</p>
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
                  ${isActive ? 'bg-green-500' : 'hover:bg-gray-800/50'}
                  ${isCompleted && !isActive && !isStale ? 'bg-gray-800/30' : ''}
                  ${isStale ? 'bg-orange-900/20 border border-orange-500/30' : ''}
                  ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm
                      ${isActive ? 'bg-white text-green-500' : ''}
                      ${isCompleted && !isActive && !isStale ? 'bg-green-500/20 text-green-400' : ''}
                      ${isStale ? 'bg-orange-500/20 text-orange-500' : ''}
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
                      <div className="text-xs text-green-500 mt-0.5">Completed</div>
                    )}
                    {isStale && (
                      <div className="text-xs text-orange-500 mt-0.5">Needs Regeneration</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
            updateKineticActivation={updateKineticActivation}
            updatePolishDownload={updatePolishDownload}
          />
        )}
      </div>
    </div>
  );
};
