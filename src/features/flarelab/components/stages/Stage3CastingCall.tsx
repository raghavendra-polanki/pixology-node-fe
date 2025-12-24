import { useState, useEffect } from 'react';
import { ArrowRight, Users as UsersIcon, Check, Sparkles, RefreshCw, Edit2, X, ZoomIn } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import TeamsService, { Player as TeamPlayer } from '@/shared/services/teamsService';
import { PromptTemplateEditor } from '@/shared/components/PromptTemplateEditor';
import type { FlareLabProject, Player, CreateProjectInput, ThemeCategoryId } from '../../types/project.types';
import { THEME_CATEGORIES } from '../../types/project.types';
import { PlayerSelectionModal } from './PlayerSelectionModal';

interface Stage3Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
}

const teamsService = new TeamsService();

interface SelectedTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
}

interface ThemePlayerState {
  themeId: string;
  themeName: string;
  themeDescription: string;
  themeCategory: string;
  thumbnailUrl?: string;
  playerCount: number;
  selectedPlayers: Player[];
}

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
    performanceScore: 80 + Math.floor(Math.random() * 15),
    socialSentiment: 70 + Math.floor(Math.random() * 20),
    isHighlighted: index < 3,
    photoUrl: player.images?.headshot || undefined,
  }));
};

export const Stage3CastingCall = ({ project, markStageCompleted, navigateToStage }: Stage3Props) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [themePlayerStates, setThemePlayerStates] = useState<Record<string, ThemePlayerState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Record<string, any>>({});
  const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Fetch players
  useEffect(() => {
    const loadPlayers = async () => {
      const homeTeamId = project?.contextBrief?.homeTeam?.teamId;
      const awayTeamId = project?.contextBrief?.awayTeam?.teamId;

      if (!homeTeamId || !awayTeamId) {
        setIsLoadingPlayers(false);
        return;
      }

      try {
        setIsLoadingPlayers(true);
        const [homeTeamData, awayTeamData] = await Promise.all([
          teamsService.getTeamWithPlayers('hockey', homeTeamId),
          teamsService.getTeamWithPlayers('hockey', awayTeamId),
        ]);

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

        setPlayers([...homePlayers, ...awayPlayers]);
      } catch (error) {
        console.error('[Stage3] Failed to load players:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [project?.contextBrief?.homeTeam?.teamId, project?.contextBrief?.awayTeam?.teamId]);

  // Load themes and recommendations
  useEffect(() => {
    if (project?.conceptGallery?.selectedThemes && players.length > 0) {
      const selectedThemes: SelectedTheme[] = project.conceptGallery.selectedThemes;
      const existingMappings = project?.castingCall?.themePlayerMappings || {};

      const initialStates: Record<string, ThemePlayerState> = {};
      selectedThemes.forEach((theme) => {
        const playerCount = getPlayerCountForTheme(theme.category as ThemeCategoryId, theme.name);
        const previousSelection = existingMappings[theme.id];

        initialStates[theme.id] = {
          themeId: theme.id,
          themeName: theme.name,
          themeDescription: theme.description || '',
          themeCategory: theme.category,
          thumbnailUrl: theme.thumbnailUrl,
          playerCount,
          selectedPlayers: previousSelection?.selectedPlayers || [],
        };
      });

      setThemePlayerStates(initialStates);

      if (project?.castingCall?.aiRecommendations) {
        const savedRecs = project.castingCall.aiRecommendations;
        setRecommendations(savedRecs);
        setHasLoadedRecommendations(true);

        // Update player counts from saved AI recommendations
        setThemePlayerStates(prev => {
          const updated = { ...prev };
          Object.values(savedRecs).forEach((rec: any) => {
            if (rec.imageAnalysis?.playerCount && updated[rec.themeId]) {
              console.log(`[Stage3] Loading saved AI playerCount: ${rec.imageAnalysis.playerCount} for ${rec.themeName}`);
              updated[rec.themeId] = {
                ...updated[rec.themeId],
                playerCount: rec.imageAnalysis.playerCount,
              };
            }
          });
          return updated;
        });
      } else if (!hasLoadedRecommendations && players.length > 0) {
        fetchPlayerRecommendations(selectedThemes);
      }
    }
  }, [project?.conceptGallery?.selectedThemes, project?.castingCall?.aiRecommendations, players]);

  const fetchPlayerRecommendations = async (selectedThemes: SelectedTheme[]) => {
    if (!selectedThemes || selectedThemes.length === 0 || !project?.id) return;

    setIsLoadingRecommendations(true);

    try {
      const themes = selectedThemes.map(theme => ({
        id: theme.id,
        title: theme.name,
        description: theme.description,
        category: theme.category,
        imageUrl: theme.thumbnailUrl,
      }));

      const contextBrief = {
        sportType: project?.contextBrief?.sportType || 'Hockey',
        homeTeam: project?.contextBrief?.homeTeam || { name: 'Home Team' },
        awayTeam: project?.contextBrief?.awayTeam || { name: 'Away Team' },
        contextPills: project?.contextBrief?.contextPills || [],
        campaignGoal: project?.contextBrief?.campaignGoal || 'Social Hype',
      };

      const response = await fetch('/api/flarelab/generation/players-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          themes,
          availablePlayers: players,
          contextBrief,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      const recommendationsByTheme: Record<string, any> = {};

      // Collect all recommendations
      data.recommendations.forEach((rec: any) => {
        recommendationsByTheme[rec.themeId] = rec;
      });

      // Update player counts from AI analysis in a single state update
      setThemePlayerStates(prev => {
        const updated = { ...prev };
        data.recommendations.forEach((rec: any) => {
          if (rec.imageAnalysis?.playerCount && updated[rec.themeId]) {
            const aiPlayerCount = rec.imageAnalysis.playerCount;
            console.log(`[Stage3] AI detected ${aiPlayerCount} players for theme: ${rec.themeName}`);

            // Update player count from AI analysis
            updated[rec.themeId] = {
              ...updated[rec.themeId],
              playerCount: aiPlayerCount,
              // Trim selection if it exceeds new count
              selectedPlayers: updated[rec.themeId].selectedPlayers.slice(0, aiPlayerCount),
            };
          }
        });
        return updated;
      });

      setRecommendations(recommendationsByTheme);
      setHasLoadedRecommendations(true);
      await saveRecommendationsToProject(recommendationsByTheme);
    } catch (error) {
      console.error('[Stage3] Failed to fetch recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const saveRecommendationsToProject = async (recs: Record<string, any>) => {
    try {
      await markStageCompleted('casting-call', undefined, {
        castingCall: { aiRecommendations: recs, recommendationsGeneratedAt: new Date() },
      });
    } catch (error) {
      console.error('[Stage3] Failed to save recommendations:', error);
    }
  };

  const regenerateRecommendations = async () => {
    if (!project?.conceptGallery?.selectedThemes) return;
    setHasLoadedRecommendations(false);
    await fetchPlayerRecommendations(project.conceptGallery.selectedThemes);
  };

  const getPlayerCountForTheme = (category: ThemeCategoryId, themeName?: string): number => {
    if (category === 'rivalry' || category === 'posed') return 2;
    if (themeName) {
      const lowerName = themeName.toLowerCase();
      const twoPlayerKeywords = ['clash', 'vs', 'versus', 'face-off', 'showdown', 'duel', 'battle', 'rivalry', 'matchup'];
      if (twoPlayerKeywords.some(keyword => lowerName.includes(keyword))) return 2;
    }
    return 1;
  };

  const getPlayersForTheme = (themeCategory: string): Player[] => {
    if (themeCategory === 'home-team') return players.filter(p => p.teamId === 'home');
    if (themeCategory === 'away-team') return players.filter(p => p.teamId === 'away');
    return players;
  };

  const getRecommendedPlayerIds = (themeId: string): string[] => {
    const rec = recommendations[themeId];
    if (!rec?.recommendedPlayers) return [];
    return rec.recommendedPlayers.map((p: any) => p.playerId);
  };

  const getRecommendedPlayers = (themeId: string): { id: string; name: string; reason?: string }[] => {
    const rec = recommendations[themeId];
    if (!rec?.recommendedPlayers) return [];
    return rec.recommendedPlayers.map((p: any) => ({
      id: p.playerId,
      name: p.name,
      reason: p.reason,
    }));
  };

  const getRecommendationReason = (themeId: string, playerId: string): string | null => {
    const rec = recommendations[themeId];
    if (!rec?.recommendedPlayers) return null;
    const playerRec = rec.recommendedPlayers.find((p: any) => p.playerId === playerId);
    return playerRec?.reason || null;
  };

  const acceptAIPicks = (themeId: string) => {
    const rec = recommendations[themeId];
    if (!rec?.recommendedPlayers) return;

    const themeState = themePlayerStates[themeId];
    const recommendedIds = rec.recommendedPlayers.map((p: any) => p.playerId);
    const selectedPlayers = players.filter(p => recommendedIds.includes(p.id)).slice(0, themeState.playerCount);

    setThemePlayerStates(prev => ({
      ...prev,
      [themeId]: { ...prev[themeId], selectedPlayers },
    }));
  };

  const openPlayerModal = (themeId: string) => {
    setActiveThemeId(themeId);
    setModalOpen(true);
  };

  const handleModalConfirm = (selectedPlayers: Player[]) => {
    if (!activeThemeId) return;

    setThemePlayerStates(prev => ({
      ...prev,
      [activeThemeId]: { ...prev[activeThemeId], selectedPlayers },
    }));
    setModalOpen(false);
    setActiveThemeId(null);
  };

  const allThemesComplete = (): boolean => {
    const states = Object.values(themePlayerStates);
    // Must have states for all selected themes, and all must have required players
    if (states.length === 0 || states.length !== selectedThemes.length) return false;
    return states.every(
      state => state.selectedPlayers.length === state.playerCount
    );
  };

  const handleContinue = async () => {
    if (!allThemesComplete()) return;

    try {
      setIsSaving(true);

      const themePlayerMappings: Record<string, any> = {};
      Object.values(themePlayerStates).forEach(state => {
        themePlayerMappings[state.themeId] = {
          themeId: state.themeId,
          themeName: state.themeName,
          themeCategory: state.themeCategory,
          thumbnailUrl: state.thumbnailUrl,
          playerCount: state.playerCount,
          selectedPlayers: state.selectedPlayers,
        };
      });

      await markStageCompleted('casting-call', undefined, {
        castingCall: {
          themePlayerMappings,
          selectedPlayers: Object.values(themePlayerStates).flatMap(s => s.selectedPlayers),
          availablePlayers: players,
          selectedAt: new Date(),
        },
      });

      navigateToStage(4);
    } catch (error) {
      console.error('[Stage3] Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if selection matches AI recommendation
  const selectionMatchesAI = (themeId: string): boolean => {
    const themeState = themePlayerStates[themeId];
    const recommendedIds = getRecommendedPlayerIds(themeId);
    if (!themeState || recommendedIds.length === 0) return false;

    const selectedIds = themeState.selectedPlayers.map(p => p.id);
    return selectedIds.length === recommendedIds.length &&
           selectedIds.every(id => recommendedIds.includes(id));
  };

  const selectedThemes = project?.conceptGallery?.selectedThemes || [];
  const activeTheme = activeThemeId ? themePlayerStates[activeThemeId] : null;

  // Player chip component with hover preview
  const PlayerChip = ({
    player,
    size = 'md',
    variant = 'default',
    showAiBadge = false
  }: {
    player: Player;
    size?: 'sm' | 'md';
    variant?: 'default' | 'ai-suggested';
    showAiBadge?: boolean;
  }) => {
    const [showPopover, setShowPopover] = useState(false);

    const bgColor = variant === 'ai-suggested' ? 'bg-amber-900/40 border border-amber-500/30' : 'bg-gray-800';
    const textColor = variant === 'ai-suggested' ? 'text-amber-200' : 'text-white';

    return (
      <div
        className="relative"
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        {/* Chip */}
        <div className={`flex items-center gap-1.5 rounded-full cursor-pointer transition-all hover:ring-1 hover:ring-orange-500/50 ${bgColor} ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className={`rounded-full object-cover ${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'}`}
            />
          ) : (
            <div className={`bg-orange-500 rounded-full flex items-center justify-center ${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'}`}>
              <span className={`font-bold text-white ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>{player.number}</span>
            </div>
          )}
          <span className={`font-medium ${textColor} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{player.name}</span>
          {showAiBadge && (
            <Sparkles className="w-3 h-3 text-amber-400 ml-0.5" />
          )}
        </div>

        {/* Hover Popover */}
        {showPopover && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl min-w-[160px]">
              {/* Player Photo */}
              <div className="flex justify-center mb-2">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={player.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 bg-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{player.number}</span>
                  </div>
                )}
              </div>
              {/* Player Info */}
              <div className="text-center">
                <p className="text-white font-semibold text-sm">{player.name}</p>
                <p className="text-gray-400 text-xs">#{player.number} • {player.position}</p>
                <p className="text-gray-500 text-xs mt-0.5">{player.teamName}</p>
              </div>
              {/* Arrow pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-900 border-r border-b border-gray-700 transform rotate-45" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show prompt editor if editing
  if (showPromptEditor) {
    return (
      <PromptTemplateEditor
        stageType="stage_3_players"
        projectId={project.id}
        onBack={() => setShowPromptEditor(false)}
        accentColor="#f97316"
        apiBasePath="/api/flarelab/prompts"
        stageData={{
          sportType: project.contextBrief?.sportType || 'Hockey',
          homeTeam: project.contextBrief?.homeTeam?.name || '',
          awayTeam: project.contextBrief?.awayTeam?.name || '',
          contextPills: project.contextBrief?.contextPills?.join(', ') || '',
          campaignGoal: project.contextBrief?.campaignGoal || '',
          themeName: selectedThemes[0]?.name || '',
          themeDescription: selectedThemes[0]?.description || '',
          themeCategory: selectedThemes[0]?.category || '',
          availablePlayers: '(Player list from team rosters)',
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Select Players</h2>
              <p className="text-gray-400">Choose players for each theme based on AI recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowPromptEditor(true)}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Prompts
            </Button>
            {hasLoadedRecommendations && !isLoadingRecommendations && (
              <Button
                onClick={regenerateRecommendations}
                variant="outline"
                size="sm"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate AI
            </Button>
          )}
        </div>
      </div>
      </div>

      {/* Loading State */}
      {(isLoadingPlayers || isLoadingRecommendations || (selectedThemes.length > 0 && Object.keys(themePlayerStates).length === 0)) && (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-10 h-10 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-400">
            {isLoadingPlayers ? 'Loading players...' : isLoadingRecommendations ? 'AI is analyzing themes and recommending players...' : 'Loading theme selections...'}
          </p>
        </div>
      )}

      {/* Theme Cards - 2 Column Grid */}
      {!isLoadingPlayers && !isLoadingRecommendations && selectedThemes.length > 0 && Object.keys(themePlayerStates).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {selectedThemes.map((theme: SelectedTheme) => {
            const themeState = themePlayerStates[theme.id];
            if (!themeState) return null;

            const category = THEME_CATEGORIES[theme.category as ThemeCategoryId];
            const hasSelection = themeState.selectedPlayers.length > 0;
            const isComplete = themeState.selectedPlayers.length === themeState.playerCount;
            const aiRecommendedPlayers = getRecommendedPlayers(theme.id);
            const hasRecommendations = aiRecommendedPlayers.length > 0;
            const matchesAI = selectionMatchesAI(theme.id);

            return (
              <div
                key={theme.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  isComplete ? 'border-orange-500/50' : 'border-gray-800'
                }`}
              >
                {/* Top: Theme Image - Larger, better aspect ratio */}
                <div
                  className="relative w-full h-48 cursor-pointer group bg-gray-900"
                  onClick={() => theme.thumbnailUrl && setImagePreviewUrl(theme.thumbnailUrl)}
                >
                  {theme.thumbnailUrl ? (
                    <>
                      <img
                        src={theme.thumbnailUrl}
                        alt={theme.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Hover zoom icon */}
                      <div className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-6xl">{category?.icon}</span>
                    </div>
                  )}

                  {/* Theme title overlay on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{category?.icon}</span>
                      <h3 className="text-lg font-semibold text-white">{theme.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-black/50 text-gray-300 rounded-full">
                        {themeState.playerCount} player{themeState.playerCount > 1 ? 's' : ''}
                      </span>
                      {isComplete && (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    {themeState.themeDescription && (
                      <p className="text-sm text-gray-300 line-clamp-1">{themeState.themeDescription}</p>
                    )}
                  </div>
                </div>

                {/* Bottom: Selection Area */}
                <div className={`p-4 ${isComplete ? 'bg-orange-500/5' : 'bg-gray-900/50'}`}>
                  {/* AI Recommendation - Compact inline with chips */}
                  {hasRecommendations && (
                    <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-800">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-amber-400 flex-shrink-0">AI:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {aiRecommendedPlayers.slice(0, themeState.playerCount).map((rec) => {
                            const player = players.find(p => p.id === rec.id);
                            if (!player) return null;
                            return (
                              <PlayerChip
                                key={rec.id}
                                player={player}
                                size="sm"
                                variant="ai-suggested"
                              />
                            );
                          })}
                        </div>
                        {matchesAI && hasSelection && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded flex-shrink-0">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      {!hasSelection && (
                        <Button
                          onClick={() => acceptAIPicks(theme.id)}
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs"
                        >
                          Accept
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Current Selection */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Your pick:</span>
                      {hasSelection ? (
                        <div className="flex items-center gap-1.5">
                          {themeState.selectedPlayers.map((player) => (
                            <PlayerChip key={player.id} player={player} size="sm" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">None selected</span>
                      )}
                    </div>
                    <Button
                      onClick={() => openPlayerModal(theme.id)}
                      variant="outline"
                      size="sm"
                      className={hasSelection
                        ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 h-8"
                        : "border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-8"
                      }
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {hasSelection ? 'Change' : 'Select'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Continue Button - Outside grid */}
      {!isLoadingPlayers && !isLoadingRecommendations && selectedThemes.length > 0 && Object.keys(themePlayerStates).length > 0 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-gray-800/30 border border-gray-700 rounded-xl">
            <div className="text-sm text-gray-400">
              {allThemesComplete() ? (
                <span className="text-orange-400 font-medium">
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
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
              size="lg"
            >
              {isSaving ? 'Saving...' : 'Continue to Create Images'}
              {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
        </div>
      )}

      {/* Player Selection Modal */}
      {activeTheme && (
        <PlayerSelectionModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setActiveThemeId(null);
          }}
          onConfirm={handleModalConfirm}
          themeName={activeTheme.themeName}
          themeCategory={activeTheme.themeCategory}
          playerCount={activeTheme.playerCount}
          availablePlayers={getPlayersForTheme(activeTheme.themeCategory)}
          currentSelection={activeTheme.selectedPlayers}
          recommendedPlayerIds={getRecommendedPlayerIds(activeTheme.themeId)}
          getRecommendationReason={(playerId) => getRecommendationReason(activeTheme.themeId, playerId)}
        />
      )}

      {/* Image Preview Modal */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setImagePreviewUrl(null)}
        >
          <button
            onClick={() => setImagePreviewUrl(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={imagePreviewUrl}
            alt="Theme preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
