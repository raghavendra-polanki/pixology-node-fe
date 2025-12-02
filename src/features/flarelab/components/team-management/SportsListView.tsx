import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import TeamsService, { Sport } from '@/shared/services/teamsService';

const teamsService = new TeamsService();

interface SportsListViewProps {
  onSelectSport: (sport: string) => void;
}

export const SportsListView = ({ onSelectSport }: SportsListViewProps) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    setIsLoading(true);
    try {
      const sportsData = await teamsService.getSports();
      setSports(sportsData);
    } catch (error) {
      console.error('Error loading sports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSportIcon = (icon: string) => {
    return (
      <div className="text-4xl">{icon}</div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    );
  }

  if (sports.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-gray-400 mb-2">No Sports Available</h3>
        <p className="text-gray-500 mb-6">
          Sports will appear here once they are added to the system
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-400">Select a sport to manage its teams and players</p>
        <Button
          onClick={() => {/* TODO: Implement add sport */}}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sport
        </Button>
      </div>

      {/* Sports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sports.map((sport) => (
          <Card
            key={sport.id}
            onClick={() => onSelectSport(sport.id)}
            className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all cursor-pointer group"
          >
            <div className="p-6">
              {/* Sport Icon & Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                    {getSportIcon(sport.icon)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors mb-1">
                      {sport.name}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {sport.league} • {sport.season}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium">Teams</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{sport.teamsCount}</div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Players</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{sport.playersCount}</div>
                </div>
              </div>

              {/* Action Hint */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Click to view teams</span>
                  <TrendingUp className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
