import { useState, useEffect } from 'react';
import { ArrowRight, Flame, Users as UsersIcon, Check, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import TeamsService, { Team, Player as TeamPlayer } from '@/shared/services/teamsService';
import type { GameLabProject, Player, CreateProjectInput, ThemeCategoryId } from '../../types/project.types';
import { THEME_CATEGORIES } from '../../types/project.types';

interface Stage3Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

const teamsService = new TeamsService();

/**
 * Transform team players to the format expected by Stage 3 UI
 */
const transformPlayersForUI = (
  teamPlayers: TeamPlayer[],
  teamId: 'home' | 'away',
  teamName: string
): Player[] => {
  return teamPlayers.map((player, index) => ({
    id: player.playerId,
    name: player.name,
    number: player.jerseyNumber,
    position: player.position,
    teamId,
    teamName,
    performanceScore: 80 + Math.floor(Math.random() * 15), // TODO: Get real stats
    socialSentiment: 70 + Math.floor(Math.random() * 20), // TODO: Get real stats
    isHighlighted: index < 3, // Top 3 by roster order are highlighted
    photoUrl: player.images?.headshot || undefined,
  }));
};

interface SelectedTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  tags?: string[];
}

interface ThemePlayerState {
  themeId: string;
  themeName: string;
  themeCategory: string;
  thumbnailUrl?: string;
  playerCount: number; // 1 or 2 players required
  selectedPlayers: Player[];
  isCollapsed: boolean;
}

export const Stage3CastingCall = ({ project, markStageCompleted, navigateToStage }: Stage3Props) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [themePlayerStates, setThemePlayerStates] = useState<Record<string, ThemePlayerState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Record<string, any>>({});
  const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(false);

  // Fetch real players from selected teams
  useEffect(() => {
    const loadPlayers = async () => {
      const homeTeamId = project?.contextBrief?.homeTeam?.teamId;
      const awayTeamId = project?.contextBrief?.awayTeam?.teamId;

      if (!homeTeamId || !awayTeamId) {
        console.warn('[Stage3] Missing team IDs in context brief');
        setIsLoadingPlayers(false);
        return;
      }

      try {
        setIsLoadingPlayers(true);
        console.log('[Stage3] Loading players for teams:', homeTeamId, awayTeamId);

        // Fetch both teams with their players
        const [homeTeamData, awayTeamData] = await Promise.all([
          teamsService.getTeamWithPlayers('hockey', homeTeamId),
          teamsService.getTeamWithPlayers('hockey', awayTeamId),
        ]);

        // Transform players to UI format
        const homePlayers = transformPlayersForUI(
          homeTeamData.players || [],
          'home',
          `${homeTeamData.city} ${homeTeamData.name}`
        );
        const awayPlayers = transformPlayersForUI(
          awayTeamData.players || [],
          'away',
          `${awayTeamData.city} ${awayTeamData.name}`
        );

        const allPlayers = [...homePlayers, ...awayPlayers];
        console.log('[Stage3] Loaded', allPlayers.length, 'players');
        setPlayers(allPlayers);
      } catch (error) {
        console.error('[Stage3] Failed to load players:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [project?.contextBrief?.homeTeam?.teamId, project?.contextBrief?.awayTeam?.teamId]);

  // Load selected themes from Stage 2 and restore previous selections
  useEffect(() => {
    if (project?.conceptGallery?.selectedThemes && players.length > 0) {
      const selectedThemes: SelectedTheme[] = project.conceptGallery.selectedThemes;

      // Get existing player selections from project (if returning to this stage)
      const existingMappings = project?.castingCall?.themePlayerMappings || {};

      // Initialize state for each selected theme
      const initialStates: Record<string, ThemePlayerState> = {};
      selectedThemes.forEach((theme) => {
        // Determine player count based on category, theme name, or explicit playerCount
        const playerCount = getPlayerCountForTheme(
          theme.category as ThemeCategoryId,
          theme.name,
          (theme as any).playerCount // Use theme's explicit playerCount if available
        );

        // Restore previous selections if they exist
        const previousSelection = existingMappings[theme.id];
        const selectedPlayers = previousSelection?.selectedPlayers || [];

        initialStates[theme.id] = {
          themeId: theme.id,
          themeName: theme.name,
          themeCategory: theme.category,
          thumbnailUrl: theme.thumbnailUrl,
          playerCount,
          selectedPlayers,
          isCollapsed: false,
        };
      });

      setThemePlayerStates(initialStates);

      // Load existing AI recommendations or fetch new ones
      if (project?.castingCall?.aiRecommendations) {
        // Load saved recommendations from project
        console.log('[Stage3] Loading saved AI recommendations from project');
        setRecommendations(project.castingCall.aiRecommendations);
        setHasLoadedRecommendations(true);
      } else if (!hasLoadedRecommendations && players.length > 0) {
        // Fetch new recommendations only if they don't exist in project and we have players
        console.log('[Stage3] No saved recommendations found, fetching new ones');
        fetchPlayerRecommendations(selectedThemes);
      }
    }
  }, [project?.conceptGallery?.selectedThemes, project?.castingCall?.aiRecommendations, players]);

  /**
   * Fetch AI-powered player recommendations for all themes
   */
  const fetchPlayerRecommendations = async (selectedThemes: SelectedTheme[]) => {
    if (!selectedThemes || selectedThemes.length === 0) return;
    if (!project?.id) return;

    setIsLoadingRecommendations(true);

    try {
      const themes = selectedThemes.map(theme => ({
        id: theme.id,
        title: theme.name,
        description: theme.description,
        category: theme.category,
      }));

      const contextBrief = {
        sportType: project?.contextBrief?.homeTeam ? 'Hockey' : 'Hockey', // Default to Hockey
        homeTeam: project?.contextBrief?.homeTeam?.name || 'Home Team',
        awayTeam: project?.contextBrief?.awayTeam?.name || 'Away Team',
        contextPills: project?.contextBrief?.contextPills || [],
        campaignGoal: project?.contextBrief?.campaignGoal || 'Social Hype',
      };

      console.log('[Stage3] Fetching player recommendations for', themes.length, 'themes');

      const response = await fetch('/api/gamelab/generation/players-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          themes,
          availablePlayers: players,
          contextBrief,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      console.log('[Stage3] Recommendations received:', data);

      // Store recommendations by theme ID
      const recommendationsByTheme: Record<string, any> = {};
      data.recommendations.forEach((rec: any) => {
        recommendationsByTheme[rec.themeId] = rec;
        console.log('[Stage3] Theme:', rec.themeId, 'Recommended players:', rec.recommendedPlayers);
      });

      setRecommendations(recommendationsByTheme);
      setHasLoadedRecommendations(true);
      console.log('[Stage3] Recommendations state updated:', recommendationsByTheme);

      // Save recommendations to project
      await saveRecommendationsToProject(recommendationsByTheme);
    } catch (error) {
      console.error('[Stage3] Failed to fetch player recommendations:', error);
      console.log('[Stage3] Using fallback - showing all players without AI recommendations');

      // TEMPORARY: Add mock recommendations for testing UI
      if (process.env.NODE_ENV === 'development') {
        console.log('[Stage3] Adding mock recommendations for UI testing');
        const mockRecommendations: Record<string, any> = {};
        selectedThemes.forEach((theme, index) => {
          // Mock recommend the first 1-2 players based on category and theme name
          const playerCount = getPlayerCountForTheme(
            theme.category as ThemeCategoryId,
            theme.name,
            (theme as any).playerCount
          );
          const themePlayers = getPlayersForTheme(theme.category);
          const recommendedPlayerIds = themePlayers.slice(0, playerCount);

          mockRecommendations[theme.id] = {
            themeId: theme.id,
            themeName: theme.name,
            playerCount,
            recommendedPlayers: recommendedPlayerIds.map(p => ({
              playerId: p.id,
              name: p.name,
              reason: `Top ${p.position} for ${theme.category} themes with high performance score.`
            })),
            reasoning: `Selected based on ${theme.category} category and performance metrics.`,
          };
        });
        setRecommendations(mockRecommendations);
        setHasLoadedRecommendations(true);
        console.log('[Stage3] Mock recommendations set:', mockRecommendations);

        // Save mock recommendations to project
        await saveRecommendationsToProject(mockRecommendations);
      }
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  /**
   * Save AI recommendations to the project
   */
  const saveRecommendationsToProject = async (recs: Record<string, any>) => {
    try {
      await markStageCompleted('casting-call', undefined, {
        castingCall: {
          aiRecommendations: recs,
          recommendationsGeneratedAt: new Date(),
        },
      });
      console.log('[Stage3] AI recommendations saved to project');
    } catch (error) {
      console.error('[Stage3] Failed to save recommendations:', error);
    }
  };

  /**
   * Regenerate AI recommendations (manually triggered by user)
   */
  const regenerateRecommendations = async () => {
    if (!project?.conceptGallery?.selectedThemes) return;

    setHasLoadedRecommendations(false);
    const selectedThemes: SelectedTheme[] = project.conceptGallery.selectedThemes;
    await fetchPlayerRecommendations(selectedThemes);
  };

  /**
   * Determine how many players are needed based on theme category and title
   */
  const getPlayerCountForTheme = (category: ThemeCategoryId, themeName?: string, themePlayerCount?: number): number => {
    // If theme has explicit playerCount, use it
    if (themePlayerCount && themePlayerCount > 0) {
      return themePlayerCount;
    }

    // Rivalry and posed categories typically need 2 players
    if (category === 'rivalry' || category === 'posed') {
      return 2;
    }

    // Check theme name for keywords suggesting 2 players
    if (themeName) {
      const lowerName = themeName.toLowerCase();
      const twoPlayerKeywords = [
        'clash', 'vs', 'versus', 'face-off', 'faceoff', 'face off',
        'showdown', 'duel', 'battle', 'rivalry', 'matchup', 'match-up',
        'confrontation', 'standoff', 'duo', 'pair', 'two', '2'
      ];
      if (twoPlayerKeywords.some(keyword => lowerName.includes(keyword))) {
        return 2;
      }
    }

    // Other categories (home-team, away-team, broadcast) typically need 1 player
    return 1;
  };

  // Keep old function for backward compatibility
  const getPlayerCountForCategory = (category: ThemeCategoryId): number => {
    return getPlayerCountForTheme(category);
  };

  /**
   * Toggle player selection for a specific theme
   */
  const togglePlayerForTheme = (themeId: string, player: Player) => {
    setThemePlayerStates(prev => {
      const themeState = prev[themeId];
      if (!themeState) return prev;

      const isSelected = themeState.selectedPlayers.some(p => p.id === player.id);
      let newSelectedPlayers: Player[];

      if (isSelected) {
        // Deselect player
        newSelectedPlayers = themeState.selectedPlayers.filter(p => p.id !== player.id);
      } else {
        // Select player (respect max count)
        if (themeState.selectedPlayers.length >= themeState.playerCount) {
          // Replace the last selected player with the new one
          newSelectedPlayers = [...themeState.selectedPlayers.slice(0, -1), player];
        } else {
          newSelectedPlayers = [...themeState.selectedPlayers, player];
        }
      }

      return {
        ...prev,
        [themeId]: {
          ...themeState,
          selectedPlayers: newSelectedPlayers,
        },
      };
    });
  };

  /**
   * Check if a player is selected for a specific theme
   */
  const isPlayerSelectedForTheme = (themeId: string, playerId: string): boolean => {
    return themePlayerStates[themeId]?.selectedPlayers.some(p => p.id === playerId) || false;
  };

  /**
   * Check if a player is AI-recommended for a specific theme
   */
  const isPlayerRecommended = (themeId: string, playerId: string): boolean => {
    const themeRec = recommendations[themeId];
    if (!themeRec || !themeRec.recommendedPlayers) return false;
    return themeRec.recommendedPlayers.some((rec: any) => rec.playerId === playerId);
  };

  /**
   * Get recommendation reason for a player in a theme
   */
  const getRecommendationReason = (themeId: string, playerId: string): string | null => {
    const themeRec = recommendations[themeId];
    if (!themeRec || !themeRec.recommendedPlayers) return null;
    const playerRec = themeRec.recommendedPlayers.find((rec: any) => rec.playerId === playerId);
    return playerRec?.reason || null;
  };

  /**
   * Get filtered and sorted players for a specific theme
   * Filters by team based on category, then sorts recommended players to the top
   */
  const getPlayersForTheme = (themeCategory: string): Player[] => {
    let filteredPlayers = [...players];

    // Filter by team based on theme category
    if (themeCategory === 'home-team') {
      filteredPlayers = players.filter(p => p.teamId === 'home');
    } else if (themeCategory === 'away-team') {
      filteredPlayers = players.filter(p => p.teamId === 'away');
    }
    // For rivalry, posed, and broadcast - show all players

    return filteredPlayers;
  };

  /**
   * Sort players to show recommended ones first
   */
  const sortPlayersByRecommendation = (playersToSort: Player[], themeId: string): Player[] => {
    return [...playersToSort].sort((a, b) => {
      const aIsRecommended = isPlayerRecommended(themeId, a.id);
      const bIsRecommended = isPlayerRecommended(themeId, b.id);

      if (aIsRecommended && !bIsRecommended) return -1;
      if (!aIsRecommended && bIsRecommended) return 1;
      return 0;
    });
  };

  /**
   * Toggle collapsed state for a theme section
   */
  const toggleThemeCollapse = (themeId: string) => {
    setThemePlayerStates(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        isCollapsed: !prev[themeId].isCollapsed,
      },
    }));
  };

  /**
   * Check if all themes have the required number of players selected
   */
  const allThemesComplete = (): boolean => {
    return Object.values(themePlayerStates).every(
      themeState => themeState.selectedPlayers.length === themeState.playerCount
    );
  };

  /**
   * Save and continue to next stage
   */
  const handleContinue = async () => {
    if (!allThemesComplete()) return;

    try {
      setIsSaving(true);

      // Build theme-player mappings
      const themePlayerMappings: Record<string, any> = {};
      Object.values(themePlayerStates).forEach(themeState => {
        themePlayerMappings[themeState.themeId] = {
          themeId: themeState.themeId,
          themeName: themeState.themeName,
          themeCategory: themeState.themeCategory,
          thumbnailUrl: themeState.thumbnailUrl,
          playerCount: themeState.playerCount,
          selectedPlayers: themeState.selectedPlayers,
        };
      });

      // Flatten all selected players for backward compatibility
      const allSelectedPlayers = Object.values(themePlayerStates)
        .flatMap(state => state.selectedPlayers);

      const castingCallData = {
        themePlayerMappings,
        selectedPlayers: allSelectedPlayers, // Legacy
        availablePlayers: players,
        selectedAt: new Date(),
      };

      // Mark stage as completed
      await markStageCompleted('casting-call', undefined, {
        castingCall: castingCallData,
      });

      // Navigate to Stage 4
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

  const selectedThemes = project?.conceptGallery?.selectedThemes || [];
  const hasNoThemes = selectedThemes.length === 0;

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Select Players</h2>
              <p className="text-gray-400">Choose players for each selected theme</p>
            </div>
          </div>
          {hasLoadedRecommendations && !isLoadingRecommendations && (
            <Button
              onClick={regenerateRecommendations}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              disabled={isLoadingRecommendations}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate AI Suggestions
            </Button>
          )}
        </div>

        {hasNoThemes && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400">
              No themes selected. Please go back to Stage 2 and select at least one theme.
            </p>
            <Button
              onClick={() => navigateToStage(2)}
              variant="outline"
              className="mt-3 border-yellow-500/50 text-yellow-400"
            >
              Go to Stage 2
            </Button>
          </div>
        )}
      </div>

      {/* Loading Players */}
      {isLoadingPlayers && (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-green-500 animate-spin mb-4" />
          <p className="text-gray-400">Loading players from selected teams...</p>
        </div>
      )}

      {/* No Players Warning */}
      {!isLoadingPlayers && players.length === 0 && !hasNoThemes && (
        <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-center">
          <UsersIcon className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-400 mb-2">No players found for the selected teams.</p>
          <p className="text-gray-400 text-sm mb-4">
            Please add players to your teams in Team Management first.
          </p>
          <Button
            onClick={() => navigateToStage(1)}
            variant="outline"
            className="border-yellow-500/50 text-yellow-400"
          >
            Go Back to Setup
          </Button>
        </div>
      )}

      {/* Theme Sections */}
      {!hasNoThemes && !isLoadingPlayers && players.length > 0 && (
        <div className="space-y-6">
          {selectedThemes.map((theme: SelectedTheme) => {
            const themeState = themePlayerStates[theme.id];
            if (!themeState) return null;

            const category = THEME_CATEGORIES[theme.category as ThemeCategoryId];
            const isComplete = themeState.selectedPlayers.length === themeState.playerCount;
            const selectionText = `${themeState.selectedPlayers.length}/${themeState.playerCount} player${themeState.playerCount > 1 ? 's' : ''} selected`;

            return (
              <div
                key={theme.id}
                className="border-2 border-gray-700 rounded-xl overflow-hidden bg-gray-900/50"
              >
                {/* Theme Header */}
                <div
                  onClick={() => toggleThemeCollapse(theme.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Theme Thumbnail */}
                    {theme.thumbnailUrl && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        <img
                          src={theme.thumbnailUrl}
                          alt={theme.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{category?.icon}</span>
                        <h3 className="text-white font-medium text-lg">{theme.name}</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{theme.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                          {category?.name}
                        </span>
                        <span className={`text-sm font-medium ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>
                          {isComplete && <Check className="w-4 h-4 inline mr-1" />}
                          {selectionText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {themeState.isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Player Grid */}
                {!themeState.isCollapsed && (
                  <div className="px-5 pb-5">
                    {isLoadingRecommendations ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-gray-400">AI is analyzing players for this theme...</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 text-sm">
                            Select <strong>{themeState.playerCount}</strong> player{themeState.playerCount > 1 ? 's' : ''} for this theme
                            {recommendations[theme.id] && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-400">
                                <Sparkles className="w-3 h-3" />
                                AI picks shown first
                              </span>
                            )}
                          </p>
                          {/* Debug info */}
                          {recommendations[theme.id] && (
                            <p className="text-xs text-gray-500 mt-1">
                              Debug: {recommendations[theme.id].recommendedPlayers?.length || 0} recommended,
                              IDs: {recommendations[theme.id].recommendedPlayers?.map((p: any) => p.playerId).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sortPlayersByRecommendation(
                            getPlayersForTheme(theme.category),
                            theme.id
                          ).map((player) => {
                            const isSelected = isPlayerSelectedForTheme(theme.id, player.id);
                            const isRecommended = isPlayerRecommended(theme.id, player.id);
                            const recommendationReason = getRecommendationReason(theme.id, player.id);
                            return (
                          <div
                            key={player.id}
                            onClick={() => togglePlayerForTheme(theme.id, player)}
                            className={`group relative rounded-xl border-2 transition-all text-left overflow-hidden bg-[#151515] cursor-pointer ${
                              isSelected
                                ? 'border-green-500 ring-2 ring-green-500'
                                : isRecommended
                                ? 'border-amber-500/50 hover:border-amber-500'
                                : 'border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            {/* Selected background */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-lime-400/10" />
                            )}

                            {/* AI Recommended background */}
                            {!isSelected && isRecommended && (
                              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-400/5" />
                            )}

                            {/* Check mark */}
                            {isSelected && (
                              <div className="absolute top-3 right-3 z-10 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-5 h-5 text-white" />
                              </div>
                            )}

                            {/* AI Recommendation badge */}
                            {!isSelected && isRecommended && (
                              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-amber-500/90 rounded-full shadow-lg">
                                <Sparkles className="w-3 h-3 text-white" />
                                <span className="text-xs font-medium text-white">AI Pick</span>
                              </div>
                            )}

                            <div className="relative p-5">
                              <div className="flex items-start gap-4">
                                {player.photoUrl ? (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                                    <img
                                      src={player.photoUrl}
                                      alt={player.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl font-bold text-white">#{player.number}</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white">
                                      {player.name}
                                      {/* Debug indicator */}
                                      <span className="text-xs text-gray-600 ml-2">ID:{player.id}</span>
                                    </h3>
                                    {player.isHighlighted && <Flame className="w-4 h-4 text-green-500" />}
                                    {isRecommended && <span className="text-xs bg-amber-500 px-1 rounded">REC</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-lime-400 rounded">
                                      #{player.number}
                                    </span>
                                    <span className="text-gray-400">{player.position}</span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {player.performanceScore && `${player.performanceScore}G, ${player.socialSentiment}A last 5 games`}
                                  </div>

                                  {/* AI Recommendation reason */}
                                  {isRecommended && recommendationReason && (
                                    <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 px-2 py-1 rounded">
                                      <Sparkles className="w-3 h-3 inline mr-1" />
                                      {recommendationReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Continue Button */}
          <div className="flex items-center justify-between mt-8 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
            <div className="text-sm text-gray-400">
              {allThemesComplete() ? (
                <span className="text-green-400 font-medium">
                  <Check className="w-4 h-4 inline mr-1" />
                  All themes have players selected
                </span>
              ) : (
                <span>Complete player selection for all themes to continue</span>
              )}
            </div>
            <Button
              onClick={handleContinue}
              disabled={!allThemesComplete() || isSaving}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl"
              size="lg"
            >
              {isSaving ? 'Saving...' : 'Continue to Create Images'}
              {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
