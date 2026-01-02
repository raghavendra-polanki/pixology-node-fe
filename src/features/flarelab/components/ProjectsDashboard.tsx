import { useState, useMemo } from 'react';
import { Plus, Folder, Clock, Trash2, LogOut, RefreshCw, MoreVertical, Zap, User, Share2, Copy, Users } from 'lucide-react';
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
import { ShareProjectDialog } from '@/shared/components/ShareProjectDialog';
import type { FlareLabProject } from '../types/project.types';

interface ProjectsDashboardProps {
  projects: FlareLabProject[];
  onCreateProject: () => void;
  onSelectProject: (project: FlareLabProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onDuplicateProject?: (projectId: string) => void;
  onLogout?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  currentUserId?: string;
}

export const ProjectsDashboard = ({
  projects,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onDuplicateProject,
  onLogout,
  isLoading,
  error,
  onRetry,
  currentUserId,
}: ProjectsDashboardProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<FlareLabProject | null>(null);
  const [projectFilter, setProjectFilter] = useState<'mine' | 'others' | 'all'>('mine');

  // Filter projects based on selected filter
  const filteredProjects = useMemo(() => {
    if (!currentUserId) return projects;

    switch (projectFilter) {
      case 'mine':
        return projects.filter(p => p.ownerId === currentUserId);
      case 'others':
        return projects.filter(p => p.ownerId !== currentUserId);
      case 'all':
      default:
        return projects;
    }
  }, [projects, projectFilter, currentUserId]);

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

  const getStageLabel = (stage: number, isLegacy: boolean = false) => {
    // 7-stage workflow (with Text Studio)
    const stages = [
      'Context Brief',
      'Concept Gallery',
      'Casting Call',
      'High-Fidelity Capture',
      'Text Studio',
      'Kinetic Activation',
      'Export'
    ];
    // Legacy 6-stage workflow (without Text Studio)
    const legacyStages = [
      'Context Brief',
      'Concept Gallery',
      'Casting Call',
      'High-Fidelity Capture',
      'Kinetic Activation',
      'Polish & Download'
    ];
    const stageList = isLegacy ? legacyStages : stages;
    return stageList[stage - 1] || 'Unknown';
  };

  /**
   * Detect if a project is using the legacy 6-stage workflow (without Text Studio)
   * Legacy projects were created before Text Studio was added and don't have
   * 'text-studio' in their stageExecutions.
   */
  const isLegacyProject = (project: FlareLabProject): boolean => {
    // If project has textStudio data, it's definitely a new project
    if (project.textStudio) return false;

    // If project has text-studio in stageExecutions, it's a new project
    if (project.stageExecutions?.['text-studio']) return false;

    // If project has completed stages beyond stage 4 in the old workflow,
    // it's likely a legacy project
    const hasKineticActivation = project.stageExecutions?.['kinetic-activation'];
    const hasPolishDownload = project.stageExecutions?.['polish-download'];

    // If they have kinetic-activation or polish-download completed without text-studio,
    // it's a legacy project
    if ((hasKineticActivation?.status === 'completed' || hasPolishDownload?.status === 'completed')) {
      return true;
    }

    // For projects still in early stages (1-4), treat as new workflow
    // They will use the 7-stage workflow going forward
    return false;
  };

  /**
   * Get the total number of stages for a project
   */
  const getTotalStages = (project: FlareLabProject): number => {
    return isLegacyProject(project) ? 6 : 7;
  };

  /**
   * Calculate progress percentage for a project
   */
  const getProgressPercentage = (project: FlareLabProject): number => {
    const totalStages = getTotalStages(project);
    const currentStage = (project.currentStageIndex || 0) + 1;
    return Math.round((currentStage / totalStages) * 100);
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Projects Header with Create Button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Projects</h2>
          <p className="text-gray-400 text-sm">Create and manage your campaign projects</p>
        </div>
        <Button
          onClick={handleCreateNew}
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Project
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-gray-900/50 rounded-lg w-fit">
        <button
          onClick={() => setProjectFilter('mine')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            projectFilter === 'mine'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-3 h-3" />
          My Projects
        </button>
        <button
          onClick={() => setProjectFilter('others')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            projectFilter === 'others'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-3 h-3" />
          Shared with Me
        </button>
        <button
          onClick={() => setProjectFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            projectFilter === 'all'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Folder className="w-3 h-3" />
          All
        </button>
      </div>

        {/* Projects Grid */}
        {isLoading && projects.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin">
              <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 mb-2">
              {projectFilter === 'mine' ? 'No projects yet' :
               projectFilter === 'others' ? 'No shared projects' : 'No projects found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {projectFilter === 'mine' ? 'Create your first FlareLab project to get started' :
               projectFilter === 'others' ? 'Projects shared with you will appear here' : 'No projects available'}
            </p>
            {projectFilter === 'mine' && (
              <Button
                onClick={handleCreateNew}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all cursor-pointer group"
                onClick={() => onSelectProject(project)}
              >
                <div className="p-6">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white mb-2 group-hover:text-orange-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                      {project.ownerName && (
                        <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {project.ownerName}
                        </p>
                      )}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareProject(project);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-800/50 flex items-center gap-2 transition-colors first:rounded-t-lg"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateProject?.(project.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-800/50 flex items-center gap-2 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(project.id, e)}
                            className="w-full text-left px-4 py-3 text-red-500 hover:bg-gray-800/50 flex items-center gap-2 transition-colors last:rounded-b-lg"
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
                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                        : project.status === 'generating'
                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      <Clock className="w-4 h-4" />
                      {project.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Stage {(project.currentStageIndex || 0) + 1} of {getTotalStages(project)}</span>
                      <span>{getProgressPercentage(project)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(project)}%` }}
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

        {/* Share Project Dialog */}
        {shareProject && (
          <ShareProjectDialog
            open={!!shareProject}
            onClose={() => setShareProject(null)}
            projectId={shareProject.id}
            projectTitle={shareProject.name}
            isOwner={shareProject.ownerId === currentUserId}
            productType="flarelab"
            onDuplicate={() => onDuplicateProject?.(shareProject.id)}
          />
        )}
    </div>
  );
};
