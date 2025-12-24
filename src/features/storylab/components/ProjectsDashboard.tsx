import { useState } from 'react';
import { Plus, Video, Clock, CheckCircle2, Sparkles, MoreVertical, Trash2, LogOut, User, Share2, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Logo } from './Logo';
import { BrandFooter } from './BrandFooter';
import { ShareProjectDialog } from '@/shared/components/ShareProjectDialog';
import type { Project } from '../types';

interface ProjectsDashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onDuplicateProject?: (projectId: string) => void;
  onLogout?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  currentUserId?: string;
}

export function ProjectsDashboard({
  projects,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onDuplicateProject,
  onLogout,
  isLoading = false,
  error = null,
  onRetry,
  currentUserId,
}: ProjectsDashboardProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);

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

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'generating':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'generating':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 md:px-8 lg:px-12 py-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header with Logout */}
        <div className="mb-12 flex items-start justify-between">
          <div className="flex-1">
            <Logo size="lg" showTagline className="mb-4" />
            <p className="text-gray-400">
              Create professional marketing videos with AI-powered workflows
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

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400 mb-2">{error}</p>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-800 hover:bg-red-900/20"
              >
                Try Again
              </Button>
            )}
          </div>
        )}

        {/* Create New Project Button */}
        <Button
          onClick={onCreateProject}
          disabled={isLoading}
          className="mb-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Project
        </Button>

        {/* Loading State */}
        {isLoading && projects.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin">
              <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first AI-powered marketing video campaign
            </p>
            <Button
              onClick={onCreateProject}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <>
            {/* Projects Grid */}
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
                        <h3 className="text-white mb-2 group-hover:text-blue-400 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Created {new Date(project.createdAt).toLocaleDateString()}
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
                    <Badge
                      className={`mb-4 rounded-lg capitalize ${getStatusColor(project.status)}`}
                      variant="outline"
                    >
                      <span className="flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        {project.status}
                      </span>
                    </Badge>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Stage {project.currentStage} of 6</span>
                        <span>{Math.round((project.currentStage / 6) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                          style={{ width: `${(project.currentStage / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12">
              <BrandFooter />
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
            productType="storylab"
            onDuplicate={() => onDuplicateProject?.(shareProject.id)}
          />
        )}
      </div>
    </div>
  );
}
