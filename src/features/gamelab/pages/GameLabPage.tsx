import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import GameLabProjectService from '@/shared/services/gameLabProjectService';
import { ProjectsDashboard } from '../components/ProjectsDashboard';
import { WorkflowView } from '../components/WorkflowView';
import type { GameLabProject } from '../types/project.types';

const gameLabProjectService = new GameLabProjectService();

export const GameLabPage = () => {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [projects, setProjects] = useState<GameLabProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'workflow'>('projects');
  const [selectedProject, setSelectedProject] = useState<GameLabProject | null>(null);

  // Fetch projects after authentication is verified
  useEffect(() => {
    // Only fetch projects after auth check is complete and user is authenticated
    if (!authLoading && isAuthenticated) {
      fetchProjects();
    } else if (!authLoading && !isAuthenticated) {
      // If auth check is complete but user is not authenticated, show error
      setIsLoading(false);
      setError('Please log in to view projects');
    }
  }, [authLoading, isAuthenticated]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await gameLabProjectService.getProjects();
      setProjects(response.projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    // Create a temporary local project without saving to database yet
    // It will be saved when the user completes Stage 1 and clicks "Continue"
    const tempId = `temp-${Date.now()}`;
    const newProject: GameLabProject = {
      id: tempId,
      name: 'New Campaign',
      title: 'New Campaign',
      status: 'draft',
      currentStageIndex: 0,
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.uid || '',
      stageExecutions: {},
    };

    setProjects([newProject, ...projects]);
    setSelectedProject(newProject);
    setCurrentView('workflow');
  };

  const handleSelectProject = (project: GameLabProject) => {
    setSelectedProject(project);
    setCurrentView('workflow');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setError(null);
      await gameLabProjectService.deleteProject(projectId);

      // Remove project from local state
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
    fetchProjects(); // Refresh projects
  };

  const handleLogout = async () => {
    await logout();
    // Router will handle redirect to login page
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4 inline-block">
            <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950/20 to-slate-900">
      {currentView === 'projects' ? (
        <ProjectsDashboard
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onLogout={handleLogout}
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
    </div>
  );
};
