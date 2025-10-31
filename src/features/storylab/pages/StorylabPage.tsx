import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import ProjectsService, { Project as ApiProject } from '@/shared/services/projectsService';
import { ProjectsDashboard } from '../components/ProjectsDashboard';
import { WorkflowView } from '../components/WorkflowView';
import type { Project } from '../types';

const projectsService = new ProjectsService();

export const StorylabPage = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'workflow'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());

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

      const apiProjects = await projectsService.getProjects();

      // Transform API projects to match workflow project format
      const formattedProjects: Project[] = apiProjects.map((apiProject: ApiProject) => {
        // Handle date parsing - createdAt might be:
        // 1. A Date object
        // 2. An ISO string
        // 3. A Firestore Timestamp object with _seconds and _nanoseconds
        // 4. A Unix timestamp in milliseconds
        let createdAtStr = '';
        try {
          let dateObj: Date;

          if (apiProject.createdAt instanceof Date) {
            dateObj = apiProject.createdAt;
          } else if (typeof apiProject.createdAt === 'object' && apiProject.createdAt !== null) {
            // Handle Firestore Timestamp: {_seconds: number, _nanoseconds: number}
            const timestamp = apiProject.createdAt as any;
            if (typeof timestamp._seconds === 'number') {
              // Convert Firestore timestamp to Date (seconds to milliseconds)
              dateObj = new Date(timestamp._seconds * 1000);
            } else {
              throw new Error('Invalid timestamp object');
            }
          } else if (typeof apiProject.createdAt === 'string') {
            // ISO string or other string format
            dateObj = new Date(apiProject.createdAt);
          } else if (typeof apiProject.createdAt === 'number') {
            // Unix timestamp (might be in seconds or milliseconds)
            const timestamp = apiProject.createdAt;
            // If the number is smaller than a reasonable millisecond timestamp, assume it's in seconds
            dateObj = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
          } else {
            throw new Error('Unknown date format');
          }

          createdAtStr = dateObj.toISOString().split('T')[0];
        } catch (e) {
          createdAtStr = new Date().toISOString().split('T')[0];
        }

        return {
          id: apiProject.id,
          name: apiProject.title,
          status: apiProject.status === 'draft' ? 'draft' : apiProject.status === 'published' ? 'complete' : 'generating',
          currentStage: 1,
          createdAt: createdAtStr,
          data: {
            campaignDetails: undefined,
            personas: [],
            narrative: undefined,
            storyboard: [],
            screenplay: [],
            video: undefined,
          },
        };
      });

      setProjects(formattedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = () => {
    // Create a temporary local project without saving to database yet
    // It will be saved when the user completes Stage 1 and clicks "Save & Proceed"
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

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('workflow');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setError(null);
      await projectsService.deleteProject(projectId);

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

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      const isNewProject = updatedProject.id.startsWith('temp-');

      if (isNewProject) {
        // Save new project to database on first stage completion
        const newApiProject = await projectsService.createProject({
          title: updatedProject.name,
          description: '',
          thumbnail: '',
          status: 'draft',
        });

        // Create the project with the real ID from the API
        const savedProject: Project = {
          ...updatedProject,
          id: newApiProject.id,
          createdAt: newApiProject.createdAt instanceof Date
            ? newApiProject.createdAt.toISOString().split('T')[0]
            : typeof newApiProject.createdAt === 'object' && newApiProject.createdAt !== null
            ? (newApiProject.createdAt as any)._seconds
              ? new Date((newApiProject.createdAt as any)._seconds * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        };

        // Update projects list - replace temp project with saved project
        setProjects(projects.map((p) => (p.id === updatedProject.id ? savedProject : p)));
        setSelectedProject(savedProject);
        setSavedProjectIds(new Set([...savedProjectIds, savedProject.id]));
      } else {
        // Update existing project
        setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        setSelectedProject(updatedProject);

        // Update via API
        await projectsService.updateProject(updatedProject.id, {
          title: updatedProject.name,
          description: '',
          thumbnail: '',
          status: updatedProject.status === 'draft' ? 'draft' : updatedProject.status === 'complete' ? 'published' : 'draft',
        });
      }
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
          project={selectedProject}
          onBack={handleBackToProjects}
          onUpdateProject={handleUpdateProject}
        />
      ) : null}
    </>
  );
};
