import { useState } from 'react';
import { ArrowRight, Flame, Users as UsersIcon, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { GameLabProject, Player, CreateProjectInput } from '../../types/project.types';

interface Stage3Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

const PLAYERS: Player[] = [
  {
    id: '1',
    name: 'Connor McDavid',
    number: '97',
    position: 'Center',
    teamId: 'home',
    performanceScore: 95,
    socialSentiment: 88,
    isHighlighted: true,
    photoUrl: 'https://images.unsplash.com/photo-1546525848-3ce03ca516f6?w=200&h=200&fit=crop'
  },
  {
    id: '2',
    name: 'Nathan MacKinnon',
    number: '29',
    position: 'Center',
    teamId: 'home',
    performanceScore: 92,
    socialSentiment: 85,
    isHighlighted: true,
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop'
  },
  {
    id: '3',
    name: 'Cale Makar',
    number: '8',
    position: 'Defense',
    teamId: 'home',
    performanceScore: 88,
    socialSentiment: 82,
    isHighlighted: true,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop'
  },
  {
    id: '4',
    name: 'Mikko Rantanen',
    number: '96',
    position: 'Right Wing',
    teamId: 'home',
    performanceScore: 86,
    socialSentiment: 79,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'
  },
  {
    id: '5',
    name: 'Gabriel Landeskog',
    number: '92',
    position: 'Left Wing',
    teamId: 'home',
    performanceScore: 84,
    socialSentiment: 77,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'
  },
  {
    id: '6',
    name: 'Devon Toews',
    number: '7',
    position: 'Defense',
    teamId: 'home',
    performanceScore: 82,
    socialSentiment: 74,
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop'
  },
];

export const Stage3CastingCall = ({ project, markStageCompleted, navigateToStage }: Stage3Props) => {
  const [players] = useState<Player[]>(PLAYERS); // Pre-populated
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([PLAYERS[0], PLAYERS[1]]); // Pre-select 2
  const [isSaving, setIsSaving] = useState(false);

  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev =>
      prev.some(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleContinue = async () => {
    if (selectedPlayers.length === 0) return;

    try {
      setIsSaving(true);

      const castingCallData = {
        selectedPlayers,
        availablePlayers: players,
        selectedAt: new Date(),
      };

      // Mark stage as completed with casting call data
      await markStageCompleted('casting-call', undefined, {
        castingCall: castingCallData,
      });
      // Navigate to next stage (Stage 4 - High-Fidelity Capture)
      if (navigateToStage) {
        navigateToStage(4);
      }
    } catch (error) {
      console.error('[Stage3] Failed to save casting call:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-white">Suggest Players</h2>
            <p className="text-gray-400">Select the players to feature in the clip</p>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {players.map((player) => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          return (
            <button
              key={player.id}
              onClick={() => togglePlayer(player)}
              className={`group relative rounded-xl border-2 transition-all text-left overflow-hidden bg-[#151515] ${
                isSelected
                  ? 'border-green-500 ring-2 ring-green-500'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Background gradient fill for selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-lime-400/10" />
              )}

              {/* Check mark for selected */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {player.photoUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                      <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-white">#{player.number}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white">{player.name}</h3>
                      {player.isHighlighted && <Flame className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-lime-400 rounded">#{player.number}</span>
                      <span className="text-gray-400">{player.position}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.performanceScore && `${player.performanceScore}G, ${player.socialSentiment}A last 5 games`}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={selectedPlayers.length === 0 || isSaving}
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Images'}
          {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
