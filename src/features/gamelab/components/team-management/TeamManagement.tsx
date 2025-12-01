import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SportsListView } from './SportsListView';
import { TeamsListView } from './TeamsListView';
import { PlayersListView } from './PlayersListView';

type View = 'sports' | 'teams' | 'players';

interface NavigationState {
  view: View;
  selectedSport?: string;
  selectedTeam?: string;
}

export const TeamManagement = () => {
  const [navState, setNavState] = useState<NavigationState>({
    view: 'sports',
  });

  const handleSelectSport = (sport: string) => {
    setNavState({
      view: 'teams',
      selectedSport: sport,
    });
  };

  const handleSelectTeam = (teamId: string) => {
    setNavState({
      ...navState,
      view: 'players',
      selectedTeam: teamId,
    });
  };

  const handleBack = () => {
    if (navState.view === 'players') {
      setNavState({
        view: 'teams',
        selectedSport: navState.selectedSport,
      });
    } else if (navState.view === 'teams') {
      setNavState({
        view: 'sports',
      });
    }
  };

  // Breadcrumb rendering
  const renderBreadcrumbs = () => {
    const crumbs: { label: string; onClick?: () => void }[] = [];

    crumbs.push({
      label: 'Sports',
      onClick: navState.view !== 'sports' ? () => setNavState({ view: 'sports' }) : undefined,
    });

    if (navState.selectedSport) {
      crumbs.push({
        label: navState.selectedSport.charAt(0).toUpperCase() + navState.selectedSport.slice(1),
        onClick: navState.view === 'players' ? handleBack : undefined,
      });
    }

    if (navState.selectedTeam && navState.view === 'players') {
      crumbs.push({
        label: 'Players',
      });
    }

    return (
      <div className="flex items-center gap-2 mb-6">
        {crumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-600">/</span>}
            {crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-gray-400">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header with Back Button */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {navState.view !== 'sports' && (
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">Team Management</h2>
          </div>
        </div>
        {renderBreadcrumbs()}
      </div>

      {/* Dynamic Content Based on View */}
      {navState.view === 'sports' && <SportsListView onSelectSport={handleSelectSport} />}

      {navState.view === 'teams' && navState.selectedSport && (
        <TeamsListView sport={navState.selectedSport} onSelectTeam={handleSelectTeam} />
      )}

      {navState.view === 'players' && navState.selectedTeam && navState.selectedSport && (
        <PlayersListView sport={navState.selectedSport} teamId={navState.selectedTeam} />
      )}
    </div>
  );
};
