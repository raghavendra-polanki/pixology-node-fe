import { useState } from 'react';
import { Plus, Folder, Clock, Activity, Trash2, LogOut, RefreshCw, MoreVertical } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import type { GameLabProject } from '../types/project.types';

interface ProjectsDashboardProps {
  projects: GameLabProject[];
  onCreateProject: () => void;
  onSelectProject: (project: GameLabProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onLogout?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ProjectsDashboard = ({
  projects,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onLogout,
  isLoading,
  error,
  onRetry
}: ProjectsDashboardProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(projectId);
    setMenuOpenId(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId && onDeleteProject) {
      onDeleteProject(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };
  const handleCreateNew = () => {
    onCreateProject();
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
    <div className="min-h-screen bg-[#0a0a0a] px-6 md:px-8 lg:px-12 py-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header with Logout */}
        <div className="mb-12 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-lime-400 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Game<span className="text-emerald-400">Lab</span>
                </h1>
                <p className="text-xs text-gray-500">by pixology.ai</p>
              </div>
            </div>
            <p className="text-gray-400">
              Transform static assets into broadcast-ready content
            </p>
          </div>
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              className="gap-2 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800/50"
              size="sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          )}
        </div>

        {/* Create New Project Button */}
        <Button
          onClick={handleCreateNew}
          disabled={isLoading}
          className="mb-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Project
        </Button>

        {/* Projects Grid */}
        {isLoading && projects.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin">
              <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first GameLab project to get started
            </p>
            <Button
              onClick={handleCreateNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all cursor-pointer group"
                onClick={() => onSelectProject(project)}
              >
                <div className="p-6">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white mb-2 group-hover:text-emerald-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-gray-500">
                        Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {/* Menu Button */}
                    <div className="relative ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === project.id ? null : project.id);
                        }}
                        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenId === project.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg z-50">
                          <button
                            onClick={(e) => handleDeleteClick(project.id, e)}
                            className="w-full text-left px-4 py-3 text-red-500 hover:bg-gray-800/50 flex items-center gap-2 rounded-lg transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs capitalize border ${
                      project.status === 'complete'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : project.status === 'generating'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      <Clock className="w-4 h-4" />
                      {project.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Stage {(project.currentStageIndex || 0) + 1} of 6</span>
                      <span>{Math.round(((project.currentStageIndex || 0) + 1) / 6 * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-lime-400 rounded-full transition-all"
                        style={{ width: `${Math.round(((project.currentStageIndex || 0) + 1) / 6 * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent className="bg-[#151515] border border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Project?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. The project and all its data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 text-white hover:bg-red-700 border-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
