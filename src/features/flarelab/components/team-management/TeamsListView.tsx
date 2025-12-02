import { useState, useEffect } from 'react';
import { Plus, Shield, Users, Edit, Trash2, MoreVertical, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import TeamsService, { Team } from '@/shared/services/teamsService';
import { TeamFormModal } from './TeamFormModal';

const teamsService = new TeamsService();

interface TeamsListViewProps {
  sport: string;
  onSelectTeam: (teamId: string) => void;
}

export const TeamsListView = ({ sport, onSelectTeam }: TeamsListViewProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  useEffect(() => {
    loadTeams();
  }, [sport]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const teamsData = await teamsService.getTeams(sport);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTeam = async (teamData: Partial<Team>) => {
    try {
      if (teamData.teamId) {
        // Update existing team
        console.log('Updating team:', teamData);
        await teamsService.updateTeam(sport, teamData.teamId, teamData);
      } else {
        // TODO: Implement create team API
        console.log('Creating new team:', teamData);
      }
      // Reload teams to get fresh data
      await loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      throw error;
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      // TODO: Implement API call to delete team
      console.log('Deleting team:', teamId);
      // For now, just reload the teams
      await loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-gray-400 mb-2">No Teams Found</h3>
        <p className="text-gray-500 mb-6">
          Get started by adding your first team
        </p>
        <Button
          onClick={() => {
            setTeamToEdit(null);
            setIsFormModalOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Search and Actions */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search teams by name, city, or abbreviation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
        <Button
          onClick={() => {
            setTeamToEdit(null);
            setIsFormModalOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>

      {/* Teams Grid - Compact Gallery Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTeams.map((team) => (
          <Card
            key={team.teamId}
            onClick={() => onSelectTeam(team.teamId)}
            className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all cursor-pointer group relative"
          >
            <div className="p-4">
              {/* Large Team Logo - Primary Focus */}
              <div className="flex items-center justify-center mb-4 h-32">
                {team.logo?.primary ? (
                  <img
                    src={team.logo.primary}
                    alt={`${team.name} logo`}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Shield className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Team Name - Clean Typography */}
              <div className="text-center mb-2">
                <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors leading-tight">
                  {team.name}
                </h3>
              </div>

              {/* Team Abbreviation Badge - Compact */}
              <div className="flex justify-center mb-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded text-xs font-bold"
                  style={{
                    background: `${team.colors.primary}20`,
                    border: `1px solid ${team.colors.primary}`,
                    color: '#ffffff',
                  }}
                >
                  {team.abbreviation}
                </span>
              </div>

              {/* Minimal Stats */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{team.players?.length || 0}</span>
                </div>
                <span>•</span>
                <span>{team.city}</span>
              </div>

              {/* Menu Button - Compact */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === team.teamId ? null : team.teamId);
                  }}
                  className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {menuOpenId === team.teamId && (
                  <div className="absolute right-0 mt-1 w-36 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setTeamToEdit(team);
                        setIsFormModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800/50 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        if (confirm(`Are you sure you want to delete ${team.name}?`)) {
                          handleDeleteTeam(team.teamId);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-800/50 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && searchQuery && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 mb-2">No teams found</h3>
          <p className="text-gray-500">
            Try adjusting your search query
          </p>
        </div>
      )}

      {/* Team Form Modal */}
      <TeamFormModal
        team={teamToEdit}
        open={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTeamToEdit(null);
        }}
        onSave={handleSaveTeam}
      />
    </div>
  );
};
