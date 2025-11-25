import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Palette, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { GameLabProject, Theme, CreateProjectInput } from '../../types/project.types';

interface Stage2Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
  updateConceptGallery: (conceptGallery: any, projectId?: string) => Promise<GameLabProject | null>;
}

export const Stage2ConceptGallery = ({
  project,
  markStageCompleted,
  navigateToStage,
  loadProject,
  updateConceptGallery,
}: Stage2Props) => {
  // State for AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Themes state
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing themes from project on mount
  useEffect(() => {
    if (project?.conceptGallery?.aiGeneratedThemes?.themes) {
      const existingThemes = project.conceptGallery.aiGeneratedThemes.themes;
      setThemes(existingThemes);

      // Set first theme as selected by default
      if (existingThemes.length > 0 && !selectedTheme) {
        setSelectedTheme(existingThemes[0]);
      }
    }
  }, [project?.conceptGallery?.aiGeneratedThemes]);

  /**
   * Handle theme generation via streaming endpoint
   */
  const handleGenerateThemes = async () => {
    if (!project) return;

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setGenerationProgress(0);
      setGenerationMessage('Initializing...');
      setThemes([]); // Clear existing themes

      // Get context from Stage 1
      const contextBrief = project.contextBrief;
      if (!contextBrief) {
        throw new Error('Stage 1 (Setup Project) must be completed first');
      }

      // Prepare request payload
      const requestBody = {
        projectId: project.id,
        sportType: project.sportType || 'Hockey',
        homeTeam: contextBrief.homeTeam?.name || 'Home Team',
        awayTeam: contextBrief.awayTeam?.name || 'Away Team',
        contextPills: contextBrief.contextPills || [],
        campaignGoal: contextBrief.campaignGoal || 'Social Hype',
        numberOfThemes: 6,
      };

      console.log('[Stage2] Generating themes with payload:', requestBody);

      // Call streaming endpoint
      const response = await fetch('/api/gamelab/generation/themes-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by newlines to process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.substring(7).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.substring(5).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              // Handle different event types
              if (currentEventType === 'start') {
                console.log('[Stage2] Generation started');
              } else if (currentEventType === 'theme') {
                // Add theme as it's generated
                console.log('[Stage2] Theme parsed:', data.theme.title);
                setThemes(prev => [...prev, data.theme]);
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'image') {
                // Update theme with image
                console.log('[Stage2] Image generated for theme:', data.themeNumber);
                setThemes(prev =>
                  prev.map(t =>
                    t.id === data.themeId
                      ? { ...t, image: { url: data.imageUrl } }
                      : t
                  )
                );
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'progress') {
                setGenerationMessage(data.message || '');
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'complete') {
                console.log('[Stage2] Generation complete');
                setGenerationProgress(100);
                setGenerationMessage('Generation complete!');

                // Reload project to get fresh data
                if (loadProject) {
                  await loadProject(project.id);
                }
              } else if (currentEventType === 'error') {
                throw new Error(data.message || 'Generation failed');
              }
            } catch (parseError) {
              console.error('[Stage2] Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      console.log('[Stage2] Theme generation completed successfully');
    } catch (error) {
      console.error('[Stage2] Theme generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate themes');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle continue to next stage
   */
  const handleContinue = async () => {
    if (!selectedTheme) return;

    try {
      setIsSaving(true);

      const conceptGalleryData = {
        selectedStyle: {
          id: selectedTheme.id,
          name: selectedTheme.title,
          description: selectedTheme.description,
          thumbnailUrl: selectedTheme.image?.url,
          tags: selectedTheme.tags || [],
        },
        availableStyles: themes.map(theme => ({
          id: theme.id,
          name: theme.title,
          description: theme.description,
          thumbnailUrl: theme.image?.url || '',
          tags: theme.tags || [],
        })),
        selectedAt: new Date(),
        aiGeneratedThemes: project.conceptGallery?.aiGeneratedThemes, // Preserve generated themes
      };

      // Mark stage as completed with concept gallery data
      await markStageCompleted('concept-gallery', undefined, {
        conceptGallery: conceptGalleryData,
      });

      // Navigate to next stage (Stage 3 - Suggest Players)
      if (navigateToStage) {
        navigateToStage(3);
      }
    } catch (error) {
      console.error('[Stage2] Failed to save concept gallery:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasGeneratedThemes = themes.length > 0;
  const canContinue = hasGeneratedThemes && selectedTheme;

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Palette className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Generate Themes</h2>
            <p className="text-gray-400">AI-powered broadcast-ready themes for your campaign</p>
          </div>
        </div>
      </div>

      {/* Context Summary */}
      {project.contextBrief && (
        <div className="mb-6 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
          <h3 className="text-white mb-2 font-medium">Campaign Context:</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p><span className="text-gray-500">Matchup:</span> {project.contextBrief.homeTeam?.name} vs {project.contextBrief.awayTeam?.name}</p>
            <p><span className="text-gray-500">Context:</span> {project.contextBrief.contextPills?.join(', ')}</p>
            <p><span className="text-gray-500">Goal:</span> {project.contextBrief.campaignGoal}</p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!hasGeneratedThemes && !isGenerating && (
        <div className="mb-8">
          <Button
            onClick={handleGenerateThemes}
            disabled={isGenerating || !project.contextBrief}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Themes with AI
          </Button>
          {!project.contextBrief && (
            <p className="text-sm text-gray-500 mt-2">Complete Stage 1 (Setup Project) first</p>
          )}
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-8 p-6 bg-gray-800/30 border border-gray-700 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
            <h3 className="text-white font-medium">Generating Themes...</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{generationMessage}</span>
              <span className="text-gray-400">{generationProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Generation Error */}
      {generationError && (
        <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium mb-1">Generation Failed</h3>
            <p className="text-red-300/80 text-sm">{generationError}</p>
            <Button
              onClick={handleGenerateThemes}
              variant="outline"
              size="sm"
              className="mt-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Themes Grid */}
      {hasGeneratedThemes && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-white font-medium">{themes.length} themes generated</h3>
            <Button
              onClick={handleGenerateThemes}
              variant="outline"
              size="sm"
              disabled={isGenerating}
              className="border-gray-700 text-gray-400 hover:bg-gray-800"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`group rounded-xl border-2 transition-all text-left overflow-hidden relative ${
                  selectedTheme?.id === theme.id
                    ? 'border-green-500 ring-4 ring-green-500/20'
                    : 'border-gray-700 hover:border-green-500/50'
                }`}
              >
                {/* Image section */}
                <div className="aspect-video relative flex items-center justify-center overflow-hidden bg-gray-900">
                  {theme.image?.url ? (
                    <img
                      src={theme.image.url}
                      alt={theme.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
                    </div>
                  )}

                  {/* Check mark for selected */}
                  {selectedTheme?.id === theme.id && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-10">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Content section */}
                <div className="bg-[#151515] p-5 border-t border-gray-800">
                  <h3 className="text-white mb-2 font-medium">{theme.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-3">
                    {theme.description}
                  </p>
                  {theme.tags && theme.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {theme.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Continue Button */}
      {hasGeneratedThemes && (
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!canContinue || isSaving}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl"
            size="lg"
          >
            {isSaving ? 'Saving...' : 'Continue to Players'}
            {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      )}
    </div>
  );
};
