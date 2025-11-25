import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import type { Project } from '../types';

// Import stages
import { Stage1ContextBrief } from './stages/Stage1ContextBrief';
import { Stage2ConceptGallery } from './stages/Stage2ConceptGallery';
import { Stage3CastingCall } from './stages/Stage3CastingCall';
import { Stage4HighFidelityCapture } from './stages/Stage4HighFidelityCapture';
import { Stage5KineticActivation } from './stages/Stage5KineticActivation';
import { Stage6PolishDownload } from './stages/Stage6PolishDownload';

interface WorkflowViewProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
}

const stages = [
  { id: 1, name: 'Context Brief', component: Stage1ContextBrief },
  { id: 2, name: 'Concept Gallery', component: Stage2ConceptGallery },
  { id: 3, name: 'Casting Call', component: Stage3CastingCall },
  { id: 4, name: 'High-Fidelity Capture', component: Stage4HighFidelityCapture },
  { id: 5, name: 'Kinetic Activation', component: Stage5KineticActivation },
  { id: 6, name: 'Polish & Download', component: Stage6PolishDownload },
];

export const WorkflowView = ({ project, onBack, onUpdateProject }: WorkflowViewProps) => {
  const currentStageIndex = project.currentStage - 1;
  const CurrentStageComponent = stages[currentStageIndex]?.component;

  const handleNext = () => {
    if (project.currentStage < 6) {
      onUpdateProject({
        ...project,
        currentStage: project.currentStage + 1,
        data: {
          ...project.data,
          currentStageIndex: project.currentStage,
        },
      });
    }
  };

  const handlePrevious = () => {
    if (project.currentStage > 1) {
      onUpdateProject({
        ...project,
        currentStage: project.currentStage - 1,
        data: {
          ...project.data,
          currentStageIndex: project.currentStage - 2,
        },
      });
    }
  };

  const handleStageClick = (stageId: number) => {
    onUpdateProject({
      ...project,
      currentStage: stageId,
      data: {
        ...project.data,
        currentStageIndex: stageId - 1,
      },
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <h2 className="text-lg font-semibold text-white">{project.name}</h2>
          </div>

          {/* Stage Progress */}
          <div className="flex items-center gap-2">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => handleStageClick(stage.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    stage.id === project.currentStage
                      ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-600/50'
                      : stage.id < project.currentStage
                      ? 'bg-slate-800/50 border border-slate-700 hover:border-orange-600/30'
                      : 'bg-slate-800/30 border border-slate-800 opacity-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    stage.id < project.currentStage
                      ? 'bg-orange-600 text-white'
                      : stage.id === project.currentStage
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {stage.id < project.currentStage ? <Check className="w-4 h-4" /> : stage.id}
                  </div>
                  <span className={`text-xs font-medium ${
                    stage.id === project.currentStage
                      ? 'text-orange-400'
                      : stage.id < project.currentStage
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}>
                    {stage.name}
                  </span>
                </button>
                {index < stages.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    stage.id < project.currentStage ? 'bg-orange-600' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="bg-slate-900/50 border-slate-800/50">
          {CurrentStageComponent && (
            <CurrentStageComponent
              project={project}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onUpdateProject={onUpdateProject}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
