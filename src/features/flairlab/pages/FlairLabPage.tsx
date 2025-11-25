import { useState } from 'react';
import { ProjectsDashboard } from '../components/ProjectsDashboard';
import { WorkflowView } from '../components/WorkflowView';
import type { Project } from '../types';

export const FlairLabPage = () => {
  const [currentView, setCurrentView] = useState<'projects' | 'workflow'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const handleCreateProject = (project: Project) => {
    setProjects([project, ...projects]);
    setSelectedProject(project);
    setCurrentView('workflow');
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('workflow');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950/20 to-slate-900">
      {currentView === 'projects' ? (
        <ProjectsDashboard
          projects={projects}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
        />
      ) : (
        <WorkflowView
          project={selectedProject!}
          onBack={handleBackToProjects}
          onUpdateProject={handleUpdateProject}
        />
      )}
    </div>
  );
};
