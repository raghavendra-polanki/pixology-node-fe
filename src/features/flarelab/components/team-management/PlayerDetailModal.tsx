import { User, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Player, Team } from '@/shared/services/teamsService';

interface PlayerDetailModalProps {
  player: Player | null;
  team: Team | null;
  open: boolean;
  onClose: () => void;
}

export const PlayerDetailModal = ({ player, team, open, onClose }: PlayerDetailModalProps) => {
  if (!player || !team) return null;

  // Get position badge color
  const getPositionColor = (position: string) => {
    if (position.startsWith('G')) return 'text-red-400 border-red-400 bg-red-400/10';
    if (position.startsWith('D')) return 'text-blue-400 border-blue-400 bg-blue-400/10';
    if (position.startsWith('C')) return 'text-purple-400 border-purple-400 bg-purple-400/10';
    if (position.startsWith('L') || position.startsWith('R')) return 'text-orange-400 border-orange-400 bg-orange-400/10';
    return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Player Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Header with Image */}
          <div className="flex items-start gap-6">
            {/* Large Player Headshot */}
            <div className="flex-shrink-0">
              {player.images?.headshot ? (
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-800/50">
                  <img
                    src={player.images.headshot}
                    alt={`${player.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-800/50"><svg class="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                    }}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-gray-800/50 flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-600" />
                </div>
              )}
            </div>

            {/* Player Basic Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{player.name}</h2>
                  <p className="text-gray-400">{team.name}</p>
                </div>
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg"
                  style={{
                    background: `${team.colors.primary}`,
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {player.jerseyNumber || '-'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded text-sm font-bold border ${getPositionColor(
                    player.position
                  )}`}
                >
                  {player.position}
                </span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded text-sm font-bold"
                  style={{
                    background: `${team.colors.primary}20`,
                    border: `1px solid ${team.colors.primary}`,
                    color: '#ffffff',
                  }}
                >
                  {team.abbreviation}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Player Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Physical Stats */}
            {player.height && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Height</div>
                <div className="text-lg font-semibold text-white">{player.height}</div>
              </div>
            )}
            {player.weight && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Weight</div>
                <div className="text-lg font-semibold text-white">{player.weight} lbs</div>
              </div>
            )}
            {player.age && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Age</div>
                <div className="text-lg font-semibold text-white">{player.age} years</div>
              </div>
            )}
            {player.birthDate && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Birth Date</div>
                <div className="text-lg font-semibold text-white">{player.birthDate}</div>
              </div>
            )}
          </div>

          {/* Birth Information */}
          {(player.birthCity || player.birthCountry) && (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Birthplace</div>
              <div className="text-base font-semibold text-white">
                {player.birthCity && player.birthCountry
                  ? `${player.birthCity}, ${player.birthCountry}`
                  : player.birthCity || player.birthCountry}
              </div>
            </div>
          )}

          {/* Shoots/Catches */}
          {player.shootsCatches && (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">
                {player.position.startsWith('G') ? 'Catches' : 'Shoots'}
              </div>
              <div className="text-base font-semibold text-white">{player.shootsCatches}</div>
            </div>
          )}

          {/* Additional Info */}
          {player.nationality && (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Nationality</div>
              <div className="text-base font-semibold text-white">{player.nationality}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
