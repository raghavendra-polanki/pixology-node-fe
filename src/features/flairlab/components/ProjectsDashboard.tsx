import { Plus, Folder, Clock, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { Project } from '../types';

interface ProjectsDashboardProps {
  projects: Project[];
  onCreateProject: (project: Project) => void;
  onOpenProject: (project: Project) => void;
}

export const ProjectsDashboard = ({ projects, onCreateProject, onOpenProject }: ProjectsDashboardProps) => {
  const handleCreateNew = () => {
    const newProject: Project = {
      id: `flairlab-${Date.now()}`,
      name: `Project ${projects.length + 1}`,
      status: 'draft',
      currentStage: 1,
      createdAt: new Date().toISOString(),
      data: {
        id: `flairlab-${Date.now()}`,
        title: `Project ${projects.length + 1}`,
        status: 'draft',
        currentStageIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'current-user',
      },
    };
    onCreateProject(newProject);
  };

  const getStageLabel = (stage: number) => {
    const stages = [
      'Context Brief',
      'Concept Gallery',
      'Casting Call',
      'High-Fidelity Capture',
      'Kinetic Activation',
      'Polish & Download'
    ];
    return stages[stage - 1] || 'Unknown';
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">FlairLab Projects</h1>
              <p className="text-slate-400">Transform static assets into broadcast-ready content</p>
            </div>
          </div>
          <Button
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Folder className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Create your first FlairLab project to get started</p>
              <Button
                onClick={handleCreateNew}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-slate-900/50 border-slate-800/50 hover:border-orange-600/50 transition-all cursor-pointer group"
                onClick={() => onOpenProject(project)}
              >
                <CardHeader>
                  <CardTitle className="text-white group-hover:text-orange-400 transition-colors">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Stage {project.currentStage}/6</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.status === 'complete'
                        ? 'bg-green-500/20 text-green-400'
                        : project.status === 'generating'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {getStageLabel(project.currentStage)}
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${(project.currentStage / 6) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
