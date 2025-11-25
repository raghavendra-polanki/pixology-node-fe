import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Flame, Sparkles } from 'lucide-react';
import type { Project, Player } from '../../types';

interface Stage3Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'John Smith', number: '23', position: 'Forward', teamId: 'home', performanceScore: 95, socialSentiment: 88, isHighlighted: true },
  { id: '2', name: 'Mike Johnson', number: '7', position: 'Guard', teamId: 'home', performanceScore: 82, socialSentiment: 76 },
  { id: '3', name: 'Chris Davis', number: '12', position: 'Center', teamId: 'home', performanceScore: 78, socialSentiment: 71 },
  { id: '4', name: 'Tom Wilson', number: '34', position: 'Forward', teamId: 'away', performanceScore: 91, socialSentiment: 85, isHighlighted: true },
  { id: '5', name: 'Dave Brown', number: '10', position: 'Guard', teamId: 'away', performanceScore: 75, socialSentiment: 69 },
];

export const Stage3CastingCall = ({ project, onNext, onPrevious, onUpdateProject }: Stage3Props) => {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(
    project.data.castingCall?.availablePlayers || []
  );
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(
    project.data.castingCall?.selectedPlayers || []
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setAvailablePlayers(MOCK_PLAYERS);
      setIsGenerating(false);
    }, 1500);
  };

  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev =>
      prev.some(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleSave = () => {
    onUpdateProject({
      ...project,
      data: {
        ...project.data,
        castingCall: {
          selectedPlayers,
          availablePlayers,
        },
      },
    });
    onNext();
  };

  return (
    <>
      <CardHeader className="border-b border-slate-800/50">
        <CardTitle className="text-2xl text-white">Stage 3: Casting Call</CardTitle>
        <CardDescription className="text-slate-400">
          Identify the best players for the clip
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Top Action Area */}
        <div className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border border-orange-900/50 rounded-xl p-6">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-lg"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isGenerating ? 'Analyzing...' : 'Generate Player Suggestions'}
          </Button>
          <p className="text-sm text-slate-400 mt-3 text-center">
            Based on last 5 games performance & social sentiment
          </p>
        </div>

        {/* The Roster List */}
        {availablePlayers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Available Players</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                    selectedPlayers.some(p => p.id === player.id)
                      ? 'border-orange-600 bg-orange-950/30'
                      : 'border-slate-700 bg-slate-800/30 hover:border-orange-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{player.name}</span>
                        {player.isHighlighted && <Flame className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="text-sm text-slate-400">
                        #{player.number} • {player.position}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Performance</div>
                      <div className="text-white font-semibold">{player.performanceScore}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Sentiment</div>
                      <div className="text-white font-semibold">{player.socialSentiment}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Players */}
        {selectedPlayers.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Selected Players ({selectedPlayers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map(player => (
                <div
                  key={player.id}
                  className="px-3 py-2 bg-orange-950/30 border border-orange-600/50 rounded-lg text-white text-sm"
                >
                  {player.name} #{player.number}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-800/50 flex justify-between">
          <Button onClick={onPrevious} variant="outline" className="border-slate-700 text-white">
            Previous
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedPlayers.length === 0}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8"
            size="lg"
          >
            Continue with Selected Players
          </Button>
        </div>
      </CardContent>
    </>
  );
};
