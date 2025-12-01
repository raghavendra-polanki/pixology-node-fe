import { useState } from 'react';
import { Folder, Users, LogOut, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ProjectsDashboard } from './ProjectsDashboard';
import { TeamManagement } from './team-management/TeamManagement';
import type { GameLabProject } from '../types/project.types';

interface GameLabHomeProps {
  // Project Management props
  projects: GameLabProject[];
  onCreateProject: () => void;
  onSelectProject: (project: GameLabProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onLogout?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type NavSection = 'projects' | 'teams';

export const GameLabHome = ({
  projects,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onLogout,
  isLoading,
  error,
  onRetry,
}: GameLabHomeProps) => {
  const [activeSection, setActiveSection] = useState<NavSection>('projects');

  const navItems = [
    {
      id: 'projects' as NavSection,
      label: 'Project Management',
      icon: Folder,
      description: 'Create and manage campaigns',
    },
    {
      id: 'teams' as NavSection,
      label: 'Team Management',
      icon: Users,
      description: 'Manage teams and players',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Navigation Sidebar */}
      <aside className="w-60 bg-[#0f0f0f] border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                Game<span className="text-green-400">Lab</span>
              </h1>
              <p className="text-[10px] text-gray-500">by pixology.ai</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-gray-800" />

        {/* Navigation Label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Menu</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group flex items-center gap-3 ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-green-400' : ''}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-green-400' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer with Logout */}
        {onLogout && (
          <div className="px-3 py-3 border-t border-gray-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {activeSection === 'projects' && (
          <div className="px-8 py-8">
            <ProjectsDashboard
              projects={projects}
              onCreateProject={onCreateProject}
              onSelectProject={onSelectProject}
              onDeleteProject={onDeleteProject}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
            />
          </div>
        )}

        {activeSection === 'teams' && (
          <div className="px-8 py-8">
            <TeamManagement />
          </div>
        )}
      </main>
    </div>
  );
};
