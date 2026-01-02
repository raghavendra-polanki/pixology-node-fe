import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Camera, Sparkles, Check, RefreshCw, AlertCircle, Users, Maximize2, X, Edit2, Wand2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PromptTemplateEditor } from '@/shared/components/PromptTemplateEditor';
import { AIImageEditor } from '@/shared/components/AIImageEditor';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { THEME_CATEGORIES } from '../../types/project.types';
import type { FlareLabProject, GeneratedImage, CreateProjectInput, ThemeCategoryId } from '../../types/project.types';
import TeamsService from '@/shared/services/teamsService';

interface Stage4Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
}

interface ThemeWithPlayers {
  themeId: string;
  themeName: string;
  themeDescription?: string;
  themeCategory: string;
  thumbnailUrl?: string;
  playerCount: number;
  selectedPlayers: Array<{
    id: string;
    name: string;
    number: string;
    position: string;
    teamId: string;
    photoUrl?: string;
  }>;
}

interface GenerationProgress {
  stage: string;
  message: string;
  progress: number;
  current: number;
  total: number;
}

const teamsService = new TeamsService();

// Player headshot with hover preview
const PlayerHeadshot = ({ player }: { player: { id: string; name: string; number: string; photoUrl?: string } }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-[#151515] overflow-hidden bg-gray-700 cursor-pointer transition-transform hover:scale-110 hover:z-10"
        title={`${player.name} #${player.number}`}
      >
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            {player.number}
          </div>
        )}
      </div>

      {/* Hover preview - larger image */}
      {showPreview && player.photoUrl && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 rounded-lg p-1 shadow-xl border border-gray-700">
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="text-center mt-1 px-2 pb-1">
              <p className="text-white text-xs font-medium truncate">{player.name}</p>
              <p className="text-gray-400 text-xs">#{player.number}</p>
            </div>
          </div>
          {/* Arrow pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
};

export const Stage4HighFidelityCapture = ({ project, markStageCompleted, navigateToStage, loadProject }: Stage4Props) => {
  const { canEditPrompts } = useAuth();
  const [themeMappings, setThemeMappings] = useState<ThemeWithPlayers[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingThemeIds, setGeneratingThemeIds] = useState<Set<string>>(new Set());
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Dialog state for viewing full-size images
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingMapping, setViewingMapping] = useState<ThemeWithPlayers | null>(null);
  const [viewingImage, setViewingImage] = useState<GeneratedImage | null>(null);

  // AI Image Editor state
  const [aiEditingImage, setAiEditingImage] = useState<{
    image: GeneratedImage;
    mapping: ThemeWithPlayers;
  } | null>(null);

  // Load theme-player mappings from Stage 3 and refresh player photos
  useEffect(() => {
    const loadMappingsWithFreshPlayerData = async () => {
      if (!project?.castingCall?.themePlayerMappings) return;

      // Get currently selected theme IDs from Stage 2 (source of truth)
      const selectedThemeIds = new Set(
        (project.conceptGallery?.selectedThemes || []).map((t: any) => t.id)
      );

      // Filter mappings to only include themes that are still selected in Stage 2
      // (This handles the case where old mappings persist due to Firestore merge)
      const allMappings = Object.values(project.castingCall.themePlayerMappings) as ThemeWithPlayers[];
      const mappings = allMappings.filter(m => selectedThemeIds.has(m.themeId));

      console.log('[Stage4] Filtered mappings:', mappings.length, 'of', allMappings.length,
        '(selected theme IDs:', Array.from(selectedThemeIds).join(', '), ')');

      // Also load any previously generated images (filtered to current themes)
      if (project?.highFidelityCapture?.generatedImages) {
        const filteredImages = project.highFidelityCapture.generatedImages.filter(
          (img: any) => selectedThemeIds.has(img.themeId)
        );
        setGeneratedImages(filteredImages);
        console.log('[Stage4] Filtered images:', filteredImages.length, 'of',
          project.highFidelityCapture.generatedImages.length);
      }

      // Try to refresh player photos from current team data
      const homeTeamId = project?.contextBrief?.homeTeam?.teamId;
      const awayTeamId = project?.contextBrief?.awayTeam?.teamId;

      if (homeTeamId && awayTeamId) {
        try {
          setIsLoadingPlayers(true);
          console.log('[Stage4] Refreshing player photos from teams:', homeTeamId, awayTeamId);

          // Fetch current player data from both teams
          const [homeTeamData, awayTeamData] = await Promise.all([
            teamsService.getTeamWithPlayers('hockey', homeTeamId),
            teamsService.getTeamWithPlayers('hockey', awayTeamId),
          ]);

          // Build lookup maps by ID and by name (for fallback matching)
          const allPlayers = [...(homeTeamData.players || []), ...(awayTeamData.players || [])];
          const playerPhotoMapById: Record<string, string | undefined> = {};
          const playerPhotoMapByName: Record<string, string | undefined> = {};

          allPlayers.forEach(player => {
            if (player.images?.headshot) {
              if (player.playerId) {
                playerPhotoMapById[player.playerId] = player.images.headshot;
              }
              if (player.name) {
                playerPhotoMapByName[player.name.toLowerCase()] = player.images.headshot;
              }
            }
          });

          console.log('[Stage4] Built photo maps - by ID:', Object.keys(playerPhotoMapById).length, ', by name:', Object.keys(playerPhotoMapByName).length);

          // Update mappings with fresh player photos
          const enrichedMappings = mappings.map(mapping => ({
            ...mapping,
            selectedPlayers: mapping.selectedPlayers.map(player => {
              // Try to match by ID first, then by name
              const photoById = playerPhotoMapById[player.id];
              const photoByName = player.name ? playerPhotoMapByName[player.name.toLowerCase()] : undefined;
              const newPhotoUrl = photoById || photoByName || player.photoUrl;

              if (photoById) {
                console.log(`[Stage4] Found photo for ${player.name} by ID: ${player.id}`);
              } else if (photoByName) {
                console.log(`[Stage4] Found photo for ${player.name} by name fallback`);
              } else {
                console.log(`[Stage4] No updated photo found for ${player.name} (ID: ${player.id}), using existing: ${player.photoUrl?.substring(0, 50)}...`);
              }

              return {
                ...player,
                photoUrl: newPhotoUrl,
              };
            }),
          }));

          console.log('[Stage4] Updated player photos for', allPlayers.length, 'players from database');
          setThemeMappings(enrichedMappings);
        } catch (err) {
          console.error('[Stage4] Failed to refresh player photos:', err);
          // Fall back to original mappings
          setThemeMappings(mappings);
        } finally {
          setIsLoadingPlayers(false);
        }
      } else {
        console.log('[Stage4] No team IDs found in contextBrief, using mappings as-is. homeTeamId:', homeTeamId, ', awayTeamId:', awayTeamId);
        // No team IDs, use mappings as-is
        setThemeMappings(mappings);
      }
    };

    loadMappingsWithFreshPlayerData();
  }, [project?.castingCall?.themePlayerMappings, project?.highFidelityCapture?.generatedImages, project?.contextBrief?.homeTeam?.teamId, project?.contextBrief?.awayTeam?.teamId]);

  /**
   * Start generating images for all themes
   */
  const handleGenerateImages = async () => {
    if (!project?.id || themeMappings.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setGenerationProgress({
      stage: 'init',
      message: 'Preparing image generation...',
      progress: 0,
      current: 0,
      total: themeMappings.length,
    });

    try {
      // Build the request payload
      const themePlayerMappings: Record<string, any> = {};
      themeMappings.forEach((mapping) => {
        themePlayerMappings[mapping.themeId] = {
          ...mapping,
          themeDescription: project.conceptGallery?.selectedThemes?.find(
            (t: any) => t.id === mapping.themeId
          )?.description || '',
        };
      });

      // DEBUG: Log exactly what players are being sent for each theme
      console.log('[Stage4 DEBUG] ====== PLAYERS BEING SENT TO BACKEND ======');
      Object.values(themePlayerMappings).forEach((mapping: any) => {
        console.log(`[Stage4 DEBUG] Theme: "${mapping.themeName}"`);
        mapping.selectedPlayers?.forEach((p: any, idx: number) => {
          console.log(`[Stage4 DEBUG]   Player ${idx + 1}: ${p.name} (#${p.number}) - ID: ${p.id}`);
        });
      });
      console.log('[Stage4 DEBUG] ==========================================');

      const contextBrief = {
        sportType: 'Hockey',
        homeTeam: project.contextBrief?.homeTeam,
        awayTeam: project.contextBrief?.awayTeam,
        contextPills: project.contextBrief?.contextPills || [],
        campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
      };

      // Use SSE for streaming updates
      const response = await fetch('/api/flarelab/generation/images-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          themePlayerMappings,
          contextBrief,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start image generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(currentEvent, data);
            } catch (e) {
              console.error('[Stage4] Failed to parse SSE data:', e);
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      console.error('[Stage4] Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  /**
   * Generate image for a single theme
   */
  const handleGenerateSingleImage = async (themeId: string) => {
    if (!project?.id) return;

    const mapping = themeMappings.find(m => m.themeId === themeId);
    if (!mapping) return;

    // Mark this theme as generating
    setGeneratingThemeIds(prev => new Set(prev).add(themeId));
    setError(null);

    try {
      // Build request payload for single theme
      const themePlayerMappings: Record<string, any> = {
        [themeId]: {
          ...mapping,
          themeDescription: project.conceptGallery?.selectedThemes?.find(
            (t: any) => t.id === themeId
          )?.description || '',
        },
      };

      const contextBrief = {
        sportType: 'Hockey',
        homeTeam: project.contextBrief?.homeTeam,
        awayTeam: project.contextBrief?.awayTeam,
        contextPills: project.contextBrief?.contextPills || [],
        campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
      };

      console.log('[Stage4] Generating single image for theme:', mapping.themeName);

      const response = await fetch('/api/flarelab/generation/images-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          themePlayerMappings,
          contextBrief,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start image generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              // Handle the events for single image generation
              if (currentEvent === 'image') {
                // Remove old image for this theme if exists
                setGeneratedImages(prev => {
                  const filtered = prev.filter(img => img.themeId !== themeId);
                  return [...filtered, data.image];
                });
              } else if (currentEvent === 'error' && data.fatal) {
                setError(data.message);
              } else if (currentEvent === 'complete') {
                console.log('[Stage4] Single image generation complete');
                // Don't reload project here - local state already has all images
                // Reloading would cause backend to overwrite existing images with only the new one
              }
            } catch (e) {
              console.error('[Stage4] Failed to parse SSE data:', e);
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      console.error('[Stage4] Single image generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingThemeIds(prev => {
        const next = new Set(prev);
        next.delete(themeId);
        return next;
      });
    }
  };

  /**
   * Handle SSE events from the server
   */
  const handleSSEEvent = (eventType: string, data: any) => {
    console.log('[Stage4] SSE Event:', eventType, data);

    switch (eventType) {
      case 'start':
        setGenerationProgress({
          stage: 'init',
          message: data.message,
          progress: 5,
          current: 0,
          total: data.totalThemes,
        });
        break;

      case 'progress':
        setGenerationProgress({
          stage: data.stage,
          message: data.message,
          progress: data.progress,
          current: data.current || 0,
          total: data.total || themeMappings.length,
        });
        break;

      case 'image':
        // Add new generated image
        setGeneratedImages((prev) => [...prev, data.image]);
        setGenerationProgress((prev) =>
          prev
            ? {
                ...prev,
                current: data.themeIndex,
                message: `Generated ${data.themeIndex}/${data.totalThemes}`,
              }
            : null
        );
        break;

      case 'error':
        if (data.fatal) {
          setError(data.message);
        } else {
          console.warn('[Stage4] Non-fatal error:', data);
        }
        break;

      case 'complete':
        setGenerationProgress(null);
        console.log('[Stage4] Generation complete:', data);
        // Reload project to get latest data from Firestore (backend already saved)
        if (loadProject && project?.id) {
          console.log('[Stage4] Reloading project to fetch saved images from database');
          loadProject(project.id);
        }
        break;
    }
  };

  /**
   * Save and continue to next stage (Text Studio)
   */
  const handleContinue = async () => {
    if (generatedImages.length === 0) return;

    try {
      setIsSaving(true);

      console.log('[Stage4] Saving', generatedImages.length, 'generated images');

      // Optimize storage by only saving essential fields (not full player objects)
      const optimizedImages = generatedImages.map(img => ({
        id: img.id,
        themeId: img.themeId,
        themeName: img.themeName,
        themeCategory: img.themeCategory,
        thumbnailUrl: img.thumbnailUrl,
        url: img.url,
        // Only store player IDs and names, not full player objects
        players: img.players?.map((p: any) => ({
          id: p.id,
          name: p.name,
          number: p.number,
        })) || [],
        hasAlphaChannel: img.hasAlphaChannel,
        resolution: img.resolution,
        generatedAt: img.generatedAt,
        error: img.error,
      }));

      console.log('[Stage4] Optimized images payload size:', JSON.stringify(optimizedImages).length, 'bytes');

      const highFidelityCaptureData = {
        generatedImages: optimizedImages,
        generatedAt: new Date(),
      };

      await markStageCompleted('high-fidelity-capture', undefined, {
        highFidelityCapture: highFidelityCaptureData,
      });

      console.log('[Stage4] Save completed successfully');

      if (navigateToStage) {
        navigateToStage(5);
      }
    } catch (err) {
      console.error('[Stage4] Failed to save:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if we have themes to work with
  const hasThemes = themeMappings.length > 0;
  const hasGeneratedImages = generatedImages.length > 0;

  /**
   * Handle saving AI edited generated image
   */
  const handleAiEditSave = async (newImageUrl: string) => {
    if (!aiEditingImage) return;

    try {
      // Update local state
      setGeneratedImages(prev =>
        prev.map(img =>
          img.id === aiEditingImage.image.id
            ? { ...img, url: newImageUrl }
            : img
        )
      );

      // Save to database via API
      await fetch('/api/flarelab/image-edit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: newImageUrl,
          targetType: 'generated-image',
          targetId: aiEditingImage.image.id,
          stageType: 'stage_4_images',
        }),
      });

      // Reload project to get fresh data
      if (loadProject) {
        await loadProject(project.id);
      }

      console.log('[Stage4] AI edited generated image saved successfully');
    } catch (error) {
      console.error('[Stage4] Failed to save AI edited image:', error);
      throw error;
    }
  };

  // Show prompt editor if enabled
  if (showPromptEditor) {
    return (
      <PromptTemplateEditor
        stageType="stage_4_images"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        accentColor="#f97316"
        apiBasePath="/api/flarelab/prompts"
        themeSelector={{
          themes: themeMappings.map(tm => ({
            id: tm.themeId,
            name: tm.themeName,
            description: tm.themeDescription,
            category: tm.themeCategory,
            thumbnailUrl: tm.thumbnailUrl,
            players: tm.selectedPlayers.map(p => ({
              id: p.id,
              name: p.name,
              number: p.number,
              position: p.position,
              photoUrl: p.photoUrl,
            })),
          })),
          contextData: {
            sportType: project?.contextBrief?.sportType || 'Hockey',
            homeTeam: project?.contextBrief?.homeTeam?.name || '',
            awayTeam: project?.contextBrief?.awayTeam?.name || '',
            contextPills: project?.contextBrief?.contextPills?.join(', ') || '',
            campaignGoal: project?.contextBrief?.campaignGoal || '',
          },
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create Images</h2>
              <p className="text-gray-400">Generate broadcast-ready images with your selected players</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEditPrompts && (
              <Button
                onClick={() => setShowPromptEditor(true)}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Prompts
              </Button>
            )}
            {hasGeneratedImages && (
              <Button
                onClick={handleContinue}
                disabled={isSaving}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue to Text Studio'}
                {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button & Progress - at TOP */}
      {hasThemes && (
        <div className="mb-6">
          {(() => {
            const pendingCount = themeMappings.filter(m => !generatedImages.find(img => img.themeId === m.themeId)).length;
            const generatedCount = generatedImages.length;
            return (
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleGenerateImages}
                  disabled={isGenerating || generatingThemeIds.size > 0 || themeMappings.length === 0}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : generatedCount > 0 ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Regenerate All ({themeMappings.length})
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate All ({themeMappings.length})
                    </>
                  )}
                </Button>
                {pendingCount > 0 && pendingCount < themeMappings.length && (
                  <span className="text-sm text-yellow-400">
                    {pendingCount} image{pendingCount > 1 ? 's' : ''} pending generation
                  </span>
                )}
                {generatedCount > 0 && (
                  <span className="text-sm text-gray-400">
                    {generatedCount} of {themeMappings.length} generated
                  </span>
                )}
              </div>
            );
          })()}

          {/* Progress indicator */}
          {generationProgress && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{generationProgress.message}</span>
                <span className="text-sm text-orange-400">{generationProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* No themes warning */}
      {!hasThemes && (
        <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-center mb-6">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-400 mb-2">No themes with players selected.</p>
          <p className="text-gray-400 text-sm mb-4">
            Please complete Stage 3 to select players for your themes.
          </p>
          <Button
            onClick={() => navigateToStage(3)}
            variant="outline"
            className="border-yellow-500/50 text-yellow-400"
          >
            Go to Stage 3
          </Button>
        </div>
      )}

      {/* Themes Preview */}
      {hasThemes && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Themes & Players ({themeMappings.length} themes)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themeMappings.map((mapping) => {
                const category = THEME_CATEGORIES[mapping.themeCategory as ThemeCategoryId];
                const generatedImage = generatedImages.find((img) => img.themeId === mapping.themeId);

                return (
                  <div
                    key={mapping.themeId}
                    className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden group"
                  >
                    {/* Theme Image or Generated Image */}
                    <div className="aspect-video relative bg-gray-900">
                      {generatedImage?.url ? (
                        <img
                          src={generatedImage.url}
                          alt={mapping.themeName}
                          className="w-full h-full object-cover"
                        />
                      ) : mapping.thumbnailUrl ? (
                        <img
                          src={mapping.thumbnailUrl}
                          alt={mapping.themeName}
                          className="w-full h-full object-cover opacity-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-12 h-12 text-gray-700" />
                        </div>
                      )}

                      {/* Action Buttons */}
                      {(generatedImage?.url || mapping.thumbnailUrl) && (
                        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingMapping(mapping);
                              setViewingImage(generatedImage || null);
                              setViewDialogOpen(true);
                            }}
                            className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                            title="View full size"
                          >
                            <Maximize2 className="w-4 h-4 text-white" />
                          </button>
                          {generatedImage?.url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiEditingImage({ image: generatedImage, mapping });
                              }}
                              className="w-8 h-8 bg-orange-500/80 hover:bg-orange-500 rounded-full flex items-center justify-center"
                              title="AI Edit Image"
                            >
                              <Wand2 className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Status badge and Generate button */}
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {generatingThemeIds.has(mapping.themeId) ? (
                          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Generating...
                          </div>
                        ) : generatedImage?.url ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSingleImage(mapping.themeId);
                              }}
                              disabled={isGenerating || generatingThemeIds.size > 0}
                              className="bg-gray-800/80 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                              title="Regenerate this image"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Regenerate
                            </button>
                            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Generated
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateSingleImage(mapping.themeId);
                            }}
                            disabled={isGenerating || generatingThemeIds.size > 0}
                            className="border border-orange-500 bg-black/60 hover:bg-orange-500 text-orange-400 hover:text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-600 disabled:text-gray-500 disabled:hover:bg-black/60"
                            title="Generate image for this theme"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate
                          </button>
                        )}
                      </div>

                      {/* Category badge */}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {category?.icon} {category?.name}
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="p-4">
                      <h4 className="text-white font-medium mb-2">{mapping.themeName}</h4>

                      {/* Selected Players */}
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex -space-x-1">
                          {mapping.selectedPlayers.map((player) => (
                            <PlayerHeadshot key={player.id} player={player} />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400 truncate">
                          {mapping.selectedPlayers.map((p) => p.name).join(' & ')}
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}


      {/* AI Image Editor */}
      {aiEditingImage && aiEditingImage.image.url && (
        <AIImageEditor
          originalImageUrl={aiEditingImage.image.url}
          title={aiEditingImage.mapping.themeName}
          accentColor="#f97316"
          context={{
            themeName: aiEditingImage.mapping.themeName,
            themeDescription: aiEditingImage.mapping.themeDescription,
            category: aiEditingImage.mapping.themeCategory
              ? THEME_CATEGORIES[aiEditingImage.mapping.themeCategory as ThemeCategoryId]?.name
              : undefined,
            sportType: project.contextBrief?.sportType,
            homeTeam: project.contextBrief?.homeTeam?.name,
            awayTeam: project.contextBrief?.awayTeam?.name,
            playerName: aiEditingImage.mapping.selectedPlayers.map(p => p.name).join(', '),
          }}
          stageType="stage_4_images"
          projectId={project.id}
          onSave={handleAiEditSave}
          onClose={() => setAiEditingImage(null)}
        />
      )}

      {/* Full Size Image Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[85vh] p-0 bg-gray-900 border-gray-700 sm:!max-w-[90vw]">
          <DialogHeader className="px-6 py-4 border-b border-gray-700">
            <DialogTitle className="text-2xl font-bold text-white">
              {viewingMapping?.themeName}
            </DialogTitle>
          </DialogHeader>

          {viewingMapping && (
            <div className="flex h-[calc(85vh-80px)] overflow-hidden">
              {/* Left Side - Full Size Image */}
              <div className="flex-1 flex items-center justify-center bg-black p-8">
                {viewingImage?.url ? (
                  <img
                    src={viewingImage.url}
                    alt={viewingMapping.themeName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : viewingMapping.thumbnailUrl ? (
                  <img
                    src={viewingMapping.thumbnailUrl}
                    alt={viewingMapping.themeName}
                    className="max-w-full max-h-full object-contain rounded-lg opacity-70"
                  />
                ) : (
                  <div className="flex items-center justify-center text-gray-500">
                    <Camera className="w-24 h-24" />
                  </div>
                )}
              </div>

              {/* Right Side - Details Panel */}
              <div className="w-80 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
                {/* Status Badge & Generate Button */}
                <div className="mb-6">
                  {generatingThemeIds.has(viewingMapping.themeId) ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : viewingImage?.url ? (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm w-fit">
                        <Check className="w-4 h-4" />
                        Generated
                      </span>
                      <Button
                        onClick={() => {
                          handleGenerateSingleImage(viewingMapping.themeId);
                        }}
                        disabled={isGenerating || generatingThemeIds.size > 0}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Image
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm w-fit">
                        <AlertCircle className="w-4 h-4" />
                        Pending Generation
                      </span>
                      <Button
                        onClick={() => {
                          handleGenerateSingleImage(viewingMapping.themeId);
                        }}
                        disabled={isGenerating || generatingThemeIds.size > 0}
                        variant="outline"
                        className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Image
                      </Button>
                    </div>
                  )}
                </div>

                {/* Theme Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Theme Category</h3>
                  <p className="text-white">
                    {THEME_CATEGORIES[viewingMapping.themeCategory as ThemeCategoryId]?.icon}{' '}
                    {THEME_CATEGORIES[viewingMapping.themeCategory as ThemeCategoryId]?.name}
                  </p>
                </div>

                {/* Theme Description */}
                {viewingMapping.themeDescription && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                    <p className="text-gray-300 text-sm">{viewingMapping.themeDescription}</p>
                  </div>
                )}

                {/* Selected Players */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    Selected Players ({viewingMapping.selectedPlayers.length})
                  </h3>
                  <div className="space-y-4">
                    {viewingMapping.selectedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl"
                      >
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0">
                          {player.photoUrl ? (
                            <img
                              src={player.photoUrl}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                              #{player.number}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{player.name}</p>
                          <p className="text-gray-400">
                            #{player.number} · {player.position}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generation Info */}
                {viewingImage?.generatedAt && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Generated</h3>
                    <p className="text-gray-300 text-sm">
                      {new Date(viewingImage.generatedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  onClick={() => setViewDialogOpen(false)}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
