import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Flame, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { Player } from '../../types/project.types';

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPlayers: Player[]) => void;
  themeName: string;
  themeCategory: string;
  playerCount: number; // How many players to select
  availablePlayers: Player[];
  currentSelection: Player[];
  recommendedPlayerIds: string[];
  getRecommendationReason: (playerId: string) => string | null;
}

export const PlayerSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  themeName,
  themeCategory,
  playerCount,
  availablePlayers,
  currentSelection,
  recommendedPlayerIds,
  getRecommendationReason,
}: PlayerSelectionModalProps) => {
  const [selected, setSelected] = useState<Player[]>(currentSelection);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(currentSelection);
      setSearchQuery('');
    }
  }, [isOpen, currentSelection]);

  if (!isOpen) return null;

  // Filter players based on theme category
  const getFilteredPlayers = () => {
    let filtered = [...availablePlayers];

    // Filter by team based on category
    if (themeCategory === 'home-team') {
      filtered = filtered.filter(p => p.teamId === 'home');
    } else if (themeCategory === 'away-team') {
      filtered = filtered.filter(p => p.teamId === 'away');
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.position?.toLowerCase().includes(query) ||
        p.number?.toString().includes(query)
      );
    }

    return filtered;
  };

  // Sort players: recommended first, then by performance
  const sortedPlayers = getFilteredPlayers().sort((a, b) => {
    const aRec = recommendedPlayerIds.includes(a.id);
    const bRec = recommendedPlayerIds.includes(b.id);
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    return (b.performanceScore || 0) - (a.performanceScore || 0);
  });

  const togglePlayer = (player: Player) => {
    const isSelected = selected.some(p => p.id === player.id);

    if (isSelected) {
      setSelected(selected.filter(p => p.id !== player.id));
    } else {
      if (selected.length >= playerCount) {
        // Replace last selection
        setSelected([...selected.slice(0, -1), player]);
      } else {
        setSelected([...selected, player]);
      }
    }
  };

  const isPlayerSelected = (playerId: string) => selected.some(p => p.id === playerId);
  const isPlayerRecommended = (playerId: string) => recommendedPlayerIds.includes(playerId);
  const canConfirm = selected.length === playerCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Select Players</h2>
            <p className="text-sm text-gray-400">
              {themeName} • Select {playerCount} player{playerCount > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search players by name, position, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Selection Status */}
        <div className="px-5 py-3 bg-gray-900/50 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Selected: <span className={`font-medium ${canConfirm ? 'text-orange-400' : 'text-white'}`}>
                  {selected.length}/{playerCount}
                </span>
              </span>
              {selected.length > 0 && (
                <div className="flex items-center gap-2">
                  {selected.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded-full"
                    >
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{player.number}</span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-white">{player.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlayer(player); }}
                        className="w-4 h-4 rounded-full bg-gray-700 hover:bg-red-500/80 flex items-center justify-center ml-0.5"
                      >
                        <X className="w-2.5 h-2.5 text-gray-400 hover:text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {recommendedPlayerIds.length > 0 && selected.length === 0 && (
              <Button
                onClick={() => {
                  const recommended = availablePlayers.filter(p =>
                    recommendedPlayerIds.includes(p.id)
                  ).slice(0, playerCount);
                  setSelected(recommended);
                }}
                variant="outline"
                size="sm"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Use AI Picks
              </Button>
            )}
          </div>
        </div>

        {/* Player Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedPlayers.map((player) => {
              const isSelected = isPlayerSelected(player.id);
              const isRecommended = isPlayerRecommended(player.id);
              const reason = getRecommendationReason(player.id);

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10'
                      : isRecommended
                      ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
                      : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* AI badge */}
                  {!isSelected && isRecommended && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 rounded-full">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-xs font-medium text-white">AI</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Player photo or number */}
                    {player.photoUrl ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-white">#{player.number}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium truncate">{player.name}</h4>
                        {player.isHighlighted && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>#{player.number}</span>
                        <span>•</span>
                        <span>{player.position}</span>
                        <span>•</span>
                        <span className={player.teamId === 'home' ? 'text-blue-400' : 'text-red-400'}>
                          {player.teamId === 'home' ? 'Home' : 'Away'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI reason tooltip */}
                  {isRecommended && reason && (
                    <p className="mt-2 text-xs text-amber-300/80 line-clamp-2">{reason}</p>
                  )}
                </div>
              );
            })}
          </div>

          {sortedPlayers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No players found matching your search.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-800 bg-gray-900/50">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selected)}
            disabled={!canConfirm}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
};
