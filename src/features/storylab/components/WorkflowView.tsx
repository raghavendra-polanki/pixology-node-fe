import { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Logo } from './Logo';
import { useStoryLabProject } from '../hooks/useStoryLabProject';
import { Stage1CampaignDetails } from './stages/Stage1CampaignDetails';
import { Stage2Personas } from './stages/Stage2Personas';
import { Stage3Narratives } from './stages/Stage3Narratives';
import { Stage4Storyboard } from './stages/Stage4Storyboard';
import { Stage5Screenplay } from './stages/Stage5Screenplay';
import { Stage6GenerateVideo } from './stages/Stage6GenerateVideo';

interface WorkflowViewProps {
  projectId: string;
  onBack: () => void;
}

const STAGE_NAMES = ['campaign-details', 'personas', 'narrative', 'storyboard', 'screenplay', 'video'];

const stages = [
  { id: 1, name: 'Campaign Details', component: Stage1CampaignDetails },
  { id: 2, name: 'Generate Personas', component: Stage2Personas },
  { id: 3, name: 'Select Narrative', component: Stage3Narratives },
  { id: 4, name: 'Build Storyboard', component: Stage4Storyboard },
  { id: 5, name: 'Create Screenplay', component: Stage5Screenplay },
  { id: 6, name: 'Generate Video', component: Stage6GenerateVideo },
];

export function WorkflowView({ projectId, onBack }: WorkflowViewProps) {
  // Load project using new hook - this is the SINGLE source of truth for project state
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

  // Sync current stage with project data when loaded
  useEffect(() => {
    if (project) {
      setCurrentStage(project.currentStageIndex + 1);
    }
  }, [project?.currentStageIndex, project]);

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

  const CurrentStageComponent = stages[currentStage - 1].component;

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Left Sidebar - Stage Navigation */}
      <div className="w-80 bg-[#151515] border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <Logo size="sm" className="mb-6" />
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white rounded-lg -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <h2 className="text-white mb-1">{project?.name || 'Project'}</h2>
          <p className="text-gray-500">6-Stage Workflow</p>
        </div>

        {/* Stage List */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {stages.map((stage) => {
              const isActive = stage.id === currentStage;
              const isCompleted = isStageCompleted(stage.id);
              const isAccessible = isStageAccessible(stage.id);

              return (
                <button
                  key={stage.id}
                  onClick={() => isAccessible && setCurrentStage(stage.id)}
                  disabled={!isAccessible}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-all
                    ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800/50'}
                    ${isCompleted && !isActive ? 'bg-gray-800/30' : ''}
                    ${!isAccessible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm
                        ${isActive ? 'bg-white text-blue-600' : ''}
                        ${isCompleted ? 'bg-green-500/20 text-green-400' : ''}
                        ${!isActive && !isCompleted ? 'bg-gray-700 text-gray-300' : ''}
                      `}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span>{stage.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-300'}`}>
                        {stage.name}
                      </div>
                      {isCompleted && (
                        <div className="text-xs text-green-500 mt-0.5">Completed</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {isLoading && !project ? (
          // Only show loading if we're actually loading an existing project
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading project...</p>
          </div>
        ) : (
          // Render the stage component - pass shared project state and functions
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
        )}
      </div>
    </div>
  );
}
