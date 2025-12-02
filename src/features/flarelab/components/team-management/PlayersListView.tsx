import { useState, useEffect } from 'react';
import { Plus, Users, Search, Filter, User, RefreshCw, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import TeamsService, { Team, Player } from '@/shared/services/teamsService';
import { PlayerDetailModal } from './PlayerDetailModal';
import { PlayerFormModal } from './PlayerFormModal';
import { EditPlayerPage } from './EditPlayerPage';

const teamsService = new TeamsService();

interface PlayersListViewProps {
  sport: string;
  teamId: string;
}

type SortOption = 'name' | 'jerseyNumber' | 'position';
type FilterPosition = 'all' | 'F' | 'D' | 'G' | 'C' | 'L' | 'R';

export const PlayersListView = ({ sport, teamId }: PlayersListViewProps) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('jerseyNumber');
  const [filterPosition, setFilterPosition] = useState<FilterPosition>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [showEditPage, setShowEditPage] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const teamData = await teamsService.getTeam(sport, teamId);
      setTeam(teamData);
      setPlayers(teamData.players || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlayer = async (playerData: Partial<Player> | Player) => {
    try {
      // TODO: Implement API call to save player
      console.log('Saving player:', playerData);
      // For now, just reload the players
      await loadPlayers();
      setShowEditPage(false);
      setPlayerToEdit(null);
    } catch (error) {
      console.error('Error saving player:', error);
      throw error;
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      // TODO: Implement API call to delete player
      console.log('Deleting player:', playerId);
      // For now, just reload the players
      await loadPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  // Filter and sort players
  const getFilteredAndSortedPlayers = () => {
    let filtered = players.filter(player => {
      const matchesSearch =
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.jerseyNumber.includes(searchQuery) ||
        player.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPosition =
        filterPosition === 'all' ||
        player.position.startsWith(filterPosition);

      return matchesSearch && matchesPosition;
    });

    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'jerseyNumber':
          return parseInt(a.jerseyNumber || '0') - parseInt(b.jerseyNumber || '0');
        case 'position':
          return a.position.localeCompare(b.position);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredPlayers = getFilteredAndSortedPlayers();

  // Get position badge color
  const getPositionColor = (position: string) => {
    if (position.startsWith('G')) return 'text-red-400 border-red-400 bg-red-400/10';
    if (position.startsWith('D')) return 'text-blue-400 border-blue-400 bg-blue-400/10';
    if (position.startsWith('C')) return 'text-purple-400 border-purple-400 bg-purple-400/10';
    if (position.startsWith('L') || position.startsWith('R')) return 'text-green-400 border-green-400 bg-green-400/10';
    return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
  };

  // Show Edit Player Page when editing
  if (showEditPage && playerToEdit) {
    return (
      <EditPlayerPage
        player={playerToEdit}
        teamId={teamId}
        sport={sport}
        onSave={handleSavePlayer}
        onCancel={() => {
          setShowEditPage(false);
          setPlayerToEdit(null);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8 text-green-500" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-gray-400 mb-2">Team Not Found</h3>
        <p className="text-gray-500">
          Unable to load team data
        </p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-gray-400 mb-2">No Players Found</h3>
        <p className="text-gray-500 mb-6">
          Get started by adding your first player to {team.name}
        </p>
        <Button
          onClick={() => {/* TODO: Open add player modal */}}
          className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Team Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{team.name} Roster</h3>
          <p className="text-gray-400">{players.length} players</p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search by name, jersey number, or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Position Filter */}
        <div className="flex gap-2">
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value as FilterPosition)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Positions</option>
            <option value="C">Centers</option>
            <option value="L">Left Wing</option>
            <option value="R">Right Wing</option>
            <option value="D">Defense</option>
            <option value="G">Goalies</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="jerseyNumber">Jersey #</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
          </select>
        </div>

        {/* Add Player Button */}
        <Button
          onClick={() => {
            // Create a new empty player for adding
            const newPlayer: Player = {
              playerId: `new-${Date.now()}`,
              name: '',
              jerseyNumber: '',
              position: '',
            };
            setPlayerToEdit(newPlayer);
            setShowEditPage(true);
          }}
          className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {/* Players Grid - Compact Gallery Style */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredPlayers.map((player) => (
          <Card
            key={player.playerId}
            onClick={() => {
              setSelectedPlayer(player);
              setIsDetailModalOpen(true);
            }}
            className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden hover:border-green-500/50 transition-all cursor-pointer group relative"
          >
            <div className="p-3">
              {/* Large Player Headshot - Primary Focus */}
              <div className="relative mb-3">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-800/50 group-hover:ring-2 group-hover:ring-green-500/30 transition-all">
                  {player.images?.headshot ? (
                    <img
                      src={player.images.headshot}
                      alt={`${player.name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-800/50"><svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Jersey Number Badge - Overlaid on Image */}
                <div className="absolute top-2 left-2">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold shadow-lg"
                    style={{
                      background: `${team.colors.primary}`,
                      color: '#ffffff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {player.jerseyNumber || '-'}
                  </span>
                </div>

                {/* Menu Button - Overlaid on Image */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === player.playerId ? null : player.playerId);
                    }}
                    className="p-1 rounded-md bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpenId === player.playerId && (
                    <div className="absolute right-0 mt-1 w-32 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(null);
                          setPlayerToEdit(player);
                          setShowEditPage(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800/50 flex items-center gap-2 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(null);
                          if (confirm(`Are you sure you want to delete ${player.name}?`)) {
                            handleDeletePlayer(player.playerId);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-gray-800/50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Name - Clean Typography */}
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold text-white group-hover:text-green-400 transition-colors leading-tight line-clamp-2">
                  {player.name}
                </h3>
              </div>

              {/* Position Badge - Compact */}
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getPositionColor(
                    player.position
                  )}`}
                >
                  {player.position}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* No Results Message */}
      {filteredPlayers.length === 0 && (searchQuery || filterPosition !== 'all') && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 mb-2">No players found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        team={team}
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Player Form Modal */}
      <PlayerFormModal
        player={playerToEdit}
        open={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setPlayerToEdit(null);
        }}
        onSave={handleSavePlayer}
      />
    </div>
  );
};
