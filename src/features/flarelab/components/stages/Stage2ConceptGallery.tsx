import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Palette, Check, Loader2, AlertCircle, X, Maximize2, ChevronDown, ChevronUp, Plus, RefreshCw, Edit2, Wand2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { PromptTemplateEditor } from '@/shared/components/PromptTemplateEditor';
import { AIImageEditor } from '@/shared/components/AIImageEditor';
import type { FlareLabProject, Theme, ThemeCategoryId, CreateProjectInput } from '../../types/project.types';
import { THEME_CATEGORIES } from '../../types/project.types';

interface Stage2Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
  updateConceptGallery: (conceptGallery: any, projectId?: string) => Promise<FlareLabProject | null>;
}

interface CategoryState {
  themes: Theme[];
  isGenerating: boolean;
  isCollapsed: boolean;
  generatedAt?: Date;
  progress: number;
  message: string;
  error: string | null;
}

export const Stage2ConceptGallery = ({
  project,
  markStageCompleted,
  navigateToStage,
  loadProject,
  updateConceptGallery,
}: Stage2Props) => {
  // Category states - one state object per category
  const [categoryStates, setCategoryStates] = useState<Record<ThemeCategoryId, CategoryState>>({
    'home-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
    'away-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
    'rivalry': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
    'posed': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
    'broadcast': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
  });

  // Selected themes (can be from any category) - now supporting multi-selection
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state for viewing theme details
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingTheme, setViewingTheme] = useState<Theme | null>(null);

  // Prompt editor state
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // AI Image Editor state
  const [aiEditingTheme, setAiEditingTheme] = useState<Theme | null>(null);

  // Track last loaded themes to prevent unnecessary reloads (StoryLab pattern)
  const lastLoadedThemesRef = useRef<string>('');
  const [locallyModified, setLocallyModified] = useState(false);

  // Load existing themes from project - only if not locally modified (StoryLab pattern)
  useEffect(() => {
    // Only reload from project if we haven't made local modifications
    // This prevents tab switching from overwriting unsaved local changes
    if (!locallyModified && project?.conceptGallery?.aiGeneratedThemes) {
      const aiThemes = project.conceptGallery.aiGeneratedThemes;

      // Create a hash of the theme data to detect actual changes
      const themeDataHash = JSON.stringify(
        aiThemes.categorizedThemes
          ? Object.entries(aiThemes.categorizedThemes).map(([catId, catData]: [string, any]) => ({
              category: catId,
              themeIds: catData.themes?.map((t: Theme) => t.id) || [],
            }))
          : []
      );

      // Only reload if the theme data has actually changed
      if (themeDataHash !== lastLoadedThemesRef.current) {
        // Initialize fresh category states
        const newStates: Record<ThemeCategoryId, CategoryState> = {
          'home-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
          'away-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
          'rivalry': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
          'posed': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
          'broadcast': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
        };

        // Legacy: Load from flat themes array
        if (aiThemes.themes && aiThemes.themes.length > 0) {
          aiThemes.themes.forEach(theme => {
            if (theme.category && newStates[theme.category]) {
              newStates[theme.category].themes.push(theme);
            }
          });
        }

        // New: Load from categorized themes (overwrites legacy if exists)
        if (aiThemes.categorizedThemes) {
          Object.entries(aiThemes.categorizedThemes).forEach(([catId, catData]: [string, any]) => {
            if (newStates[catId as ThemeCategoryId]) {
              newStates[catId as ThemeCategoryId].themes = catData.themes || [];
            }
          });
        }

        // Only update if there are actually themes to load
        const hasThemes = Object.values(newStates).some(cat => cat.themes.length > 0);
        if (hasThemes) {
          setCategoryStates(newStates);

          // Load selected themes if they exist (multi-selection support)
          if (project.conceptGallery.selectedStyles && Array.isArray(project.conceptGallery.selectedStyles)) {
            const selectedThemesList: Theme[] = [];
            project.conceptGallery.selectedStyles.forEach((styleId: string) => {
              Object.values(newStates).forEach(catState => {
                const found = catState.themes.find(t => t.id === styleId);
                if (found) {
                  selectedThemesList.push(found);
                }
              });
            });
            setSelectedThemes(selectedThemesList);
          }
        }

        lastLoadedThemesRef.current = themeDataHash;
      }
    } else if (!project?.conceptGallery?.aiGeneratedThemes && !locallyModified) {
      // Clear themes if project has no themes
      setCategoryStates({
        'home-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
        'away-team': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
        'rivalry': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
        'posed': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
        'broadcast': { themes: [], isGenerating: false, isCollapsed: false, progress: 0, message: '', error: null },
      });
      lastLoadedThemesRef.current = '';
    }
    // Note: locallyModified is intentionally NOT in the dependency array
    // We only want to reload when project data changes, not when the flag changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.conceptGallery?.aiGeneratedThemes]); // Reload themes when conceptGallery data changes (stage navigation)

  /**
   * Generate themes for a specific category
   * @param mode - 'replace' to overwrite existing themes, 'append' to add to existing themes
   */
  const handleGenerateCategory = async (
    categoryId: ThemeCategoryId,
    numberOfThemes: number = 5,
    mode: 'replace' | 'append' = 'replace'
  ) => {
    if (!project) return;

    const category = THEME_CATEGORIES[categoryId];

    try {
      // Reset tracking flags when starting new generation (StoryLab pattern)
      setLocallyModified(false);
      if (mode === 'replace') {
        // Only reset hash when replacing, not when appending
        lastLoadedThemesRef.current = '';
      }

      // Update category state to generating
      setCategoryStates(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          isGenerating: true,
          progress: 0,
          message: 'Initializing...',
          error: null,
        }
      }));

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
        category: categoryId,
        categoryName: category.name,
        categoryModifier: category.promptModifier || '',
        numberOfThemes,
        mode, // 'replace' or 'append'
      };

      console.log(`[Stage2] Generating ${category.name} themes:`, requestBody);

      // Call streaming endpoint
      const response = await fetch('/api/flarelab/generation/themes-stream', {
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
      const newThemes: Theme[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

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

              if (currentEventType === 'theme') {
                console.log(`[Stage2] Theme parsed for ${category.name}:`, data.theme.title);
                newThemes.push(data.theme);
                setCategoryStates(prev => ({
                  ...prev,
                  [categoryId]: {
                    ...prev[categoryId],
                    themes: [...prev[categoryId].themes, data.theme],
                    progress: data.progress || 0,
                  }
                }));
              } else if (currentEventType === 'image') {
                console.log(`[Stage2] Image generated for ${category.name}`);
                setCategoryStates(prev => ({
                  ...prev,
                  [categoryId]: {
                    ...prev[categoryId],
                    themes: prev[categoryId].themes.map(t =>
                      t.id === data.themeId
                        ? { ...t, image: { url: data.imageUrl } }
                        : t
                    ),
                    progress: data.progress || 0,
                  }
                }));
              } else if (currentEventType === 'progress') {
                setCategoryStates(prev => ({
                  ...prev,
                  [categoryId]: {
                    ...prev[categoryId],
                    message: data.message || '',
                    progress: data.progress || 0,
                  }
                }));
              } else if (currentEventType === 'complete') {
                console.log(`[Stage2] ${category.name} generation complete`);
                setCategoryStates(prev => ({
                  ...prev,
                  [categoryId]: {
                    ...prev[categoryId],
                    isGenerating: false,
                    progress: 100,
                    message: 'Generation complete!',
                    generatedAt: new Date(),
                  }
                }));

                // Reload project to get latest data from Firestore (StoryLab pattern)
                // The useEffect will detect changes via hash comparison and update state
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

      console.log(`[Stage2] ${category.name} generation completed successfully`);
    } catch (error) {
      console.error(`[Stage2] ${category.name} generation error:`, error);
      setCategoryStates(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          isGenerating: false,
          error: error instanceof Error ? error.message : 'Failed to generate themes',
        }
      }));
    }
  };

  /**
   * Regenerate all themes in a category
   */
  const handleRegenerateCategory = async (categoryId: ThemeCategoryId) => {
    // Clear existing themes
    setCategoryStates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        themes: [],
      }
    }));

    // Generate new themes
    await handleGenerateCategory(categoryId);
  };

  /**
   * Generate more themes in a category (add to existing)
   */
  const handleGenerateMore = async (categoryId: ThemeCategoryId, additionalCount: number = 3) => {
    await handleGenerateCategory(categoryId, additionalCount, 'append');
  };

  /**
   * Toggle category collapsed state
   */
  const toggleCategoryCollapse = (categoryId: ThemeCategoryId) => {
    setCategoryStates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        isCollapsed: !prev[categoryId].isCollapsed,
      }
    }));
  };

  /**
   * Toggle theme selection (multi-select)
   */
  const toggleThemeSelection = (theme: Theme) => {
    setSelectedThemes(prev => {
      const isSelected = prev.some(t => t.id === theme.id);
      if (isSelected) {
        return prev.filter(t => t.id !== theme.id);
      } else {
        return [...prev, theme];
      }
    });
  };

  /**
   * Check if a theme is selected
   */
  const isThemeSelected = (themeId: string) => {
    return selectedThemes.some(t => t.id === themeId);
  };

  /**
   * Handle continue to next stage
   */
  const handleContinue = async () => {
    if (selectedThemes.length === 0) return;

    try {
      setIsSaving(true);

      const conceptGalleryData = {
        // Store multiple selected themes
        selectedStyles: selectedThemes.map(theme => theme.id),
        selectedThemes: selectedThemes.map(theme => ({
          id: theme.id,
          name: theme.title,
          description: theme.description,
          category: theme.category,
          thumbnailUrl: theme.image?.url,
          tags: theme.tags || [],
        })),
        availableStyles: Object.values(categoryStates).flatMap(catState =>
          catState.themes.map(theme => ({
            id: theme.id,
            name: theme.title,
            description: theme.description,
            thumbnailUrl: theme.image?.url || '',
            tags: theme.tags || [],
          }))
        ),
        selectedAt: new Date(),
        aiGeneratedThemes: project.conceptGallery?.aiGeneratedThemes,
      };

      await markStageCompleted('concept-gallery', undefined, {
        conceptGallery: conceptGalleryData,
      });

      // Reset flag so fresh data loads when returning to this stage (StoryLab pattern)
      setLocallyModified(false);

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

  const hasAnyThemes = Object.values(categoryStates).some(cat => cat.themes.length > 0);
  const canContinue = hasAnyThemes && selectedThemes.length > 0;

  /**
   * Handle saving AI edited theme image
   */
  const handleAiEditSave = async (newImageUrl: string) => {
    if (!aiEditingTheme) return;

    try {
      setLocallyModified(true);

      // Update local state
      setCategoryStates(prev => {
        const newStates = { ...prev };
        Object.keys(newStates).forEach(catId => {
          newStates[catId as ThemeCategoryId] = {
            ...newStates[catId as ThemeCategoryId],
            themes: newStates[catId as ThemeCategoryId].themes.map(t =>
              t.id === aiEditingTheme.id
                ? { ...t, image: { url: newImageUrl } }
                : t
            ),
          };
        });
        return newStates;
      });

      // Also update selectedThemes if this theme is selected
      setSelectedThemes(prev =>
        prev.map(t =>
          t.id === aiEditingTheme.id
            ? { ...t, image: { url: newImageUrl } }
            : t
        )
      );

      // Save to database via API
      await fetch('/api/flarelab/image-edit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: newImageUrl,
          targetType: 'theme',
          targetId: aiEditingTheme.id,
          stageType: 'stage_2_themes',
        }),
      });

      // Reload project to get fresh data
      if (loadProject) {
        await loadProject(project.id);
      }

      console.log('[Stage2] AI edited theme image saved successfully');
    } catch (error) {
      console.error('[Stage2] Failed to save AI edited image:', error);
      throw error;
    }
  };

  // Show prompt editor if editing
  if (showPromptEditor) {
    return (
      <PromptTemplateEditor
        stageType="stage_2_themes"
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
          categoryFocus: 'All Categories',
          numberOfThemes: '3',
          categoryModifier: '',
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Palette className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Theme Gallery</h2>
              <p className="text-gray-400">Generate broadcast-ready themes organized by category</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowPromptEditor(true)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              size="sm"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Prompts
            </Button>
            {canContinue && (
              <Button
                onClick={handleContinue}
                disabled={isSaving}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue to Select Players'}
                {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            )}
          </div>
        </div>
        {selectedThemes.length > 0 && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-orange-500" />
              <span className="text-orange-400 font-medium">
                {selectedThemes.length} theme{selectedThemes.length !== 1 ? 's' : ''} selected
              </span>
              <span className="text-gray-400 text-sm">
                ({selectedThemes.map(t => t.title).join(', ')})
              </span>
            </div>
          </div>
        )}
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

      {/* Category Accordions */}
      <div className="space-y-4">
        {Object.entries(THEME_CATEGORIES).map(([catId, category]) => {
          const categoryId = catId as ThemeCategoryId;
          const state = categoryStates[categoryId];
          const hasThemes = state.themes.length > 0;

          return (
            <div
              key={categoryId}
              className="border-2 border-gray-700 rounded-xl overflow-hidden bg-gray-900/50"
            >
              {/* Category Header */}
              <div
                onClick={() => hasThemes && toggleCategoryCollapse(categoryId)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="text-left">
                    <h3 className="text-white font-medium text-lg">{category.name}</h3>
                    <p className="text-gray-400 text-sm">{category.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {hasThemes && (
                    <span className="text-sm text-gray-500">
                      {state.themes.length} theme{state.themes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!hasThemes && !state.isGenerating && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateCategory(categoryId);
                      }}
                      className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30"
                      size="sm"
                      disabled={!project.contextBrief}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate 5 Themes
                    </Button>
                  )}
                  {hasThemes && !state.isGenerating && (
                    state.isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Generation Progress */}
              {state.isGenerating && (
                <div className="px-5 pb-5">
                  <div className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                      <span className="text-white font-medium">Generating {category.name}...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{state.message}</span>
                        <span className="text-gray-400">{state.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${state.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {state.error && (
                <div className="px-5 pb-5">
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-red-400 font-medium mb-1">Generation Failed</h4>
                      <p className="text-red-300/80 text-sm">{state.error}</p>
                      <Button
                        onClick={() => handleGenerateCategory(categoryId)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Themes Grid */}
              {hasThemes && !state.isCollapsed && (
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {state.themes.map((theme) => (
                      <div
                        key={theme.id}
                        onClick={() => toggleThemeSelection(theme)}
                        className={`group rounded-xl border-2 transition-all text-left overflow-hidden relative cursor-pointer ${
                          isThemeSelected(theme.id)
                            ? 'border-orange-500 ring-4 ring-orange-500/20'
                            : 'border-gray-700 hover:border-orange-500/50'
                        }`}
                      >
                        {/* Image */}
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

                          {/* Selected checkmark */}
                          {isThemeSelected(theme.id) && (
                            <div className="absolute top-4 right-4 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-10">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}

                          {/* Action buttons */}
                          {theme.image?.url && (
                            <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingTheme(theme);
                                  setViewDialogOpen(true);
                                }}
                                className="w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                                title="View full size"
                              >
                                <Maximize2 className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAiEditingTheme(theme);
                                }}
                                className="w-8 h-8 bg-orange-500/80 hover:bg-orange-500 rounded-full flex items-center justify-center"
                                title="AI Edit Image"
                              >
                                <Wand2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Content */}
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
                      </div>
                    ))}
                  </div>

                  {/* Category Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleGenerateMore(categoryId)}
                      disabled={state.isGenerating}
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Generate 3 More
                    </Button>
                    <Button
                      onClick={() => handleRegenerateCategory(categoryId)}
                      disabled={state.isGenerating}
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate All ({state.themes.length})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* AI Image Editor */}
      {aiEditingTheme && aiEditingTheme.image?.url && (
        <AIImageEditor
          originalImageUrl={aiEditingTheme.image.url}
          title={aiEditingTheme.title}
          accentColor="#f97316"
          context={{
            themeName: aiEditingTheme.title,
            themeDescription: aiEditingTheme.description,
            category: aiEditingTheme.category ? THEME_CATEGORIES[aiEditingTheme.category].name : undefined,
            sportType: project.contextBrief?.sportType,
            homeTeam: project.contextBrief?.homeTeam?.name,
            awayTeam: project.contextBrief?.awayTeam?.name,
          }}
          stageType="stage_2_themes"
          projectId={project.id}
          onSave={handleAiEditSave}
          onClose={() => setAiEditingTheme(null)}
        />
      )}

      {/* Theme Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[85vh] p-0 bg-gray-900 border-gray-700 sm:!max-w-[90vw]">
          <DialogHeader className="px-6 py-4 border-b border-gray-700">
            <DialogTitle className="text-2xl font-bold text-white">
              {viewingTheme?.title}
            </DialogTitle>
          </DialogHeader>

          {viewingTheme && (
            <div className="flex h-[calc(85vh-80px)] overflow-hidden">
              {/* Left Side - Full Size Image */}
              <div className="flex-1 flex items-center justify-center bg-black p-8">
                {viewingTheme.image?.url ? (
                  <img
                    src={viewingTheme.image.url}
                    alt={viewingTheme.title}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-gray-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* Right Side - Details Panel */}
              <div className="w-[450px] bg-gray-900 border-l border-gray-700 overflow-y-auto flex-shrink-0">
                <div className="p-6 space-y-6">
                  {/* Category Badge */}
                  {viewingTheme.category && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
                      <span className="text-xl">{THEME_CATEGORIES[viewingTheme.category].icon}</span>
                      <span className="text-sm text-gray-300">{THEME_CATEGORIES[viewingTheme.category].name}</span>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Description
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {viewingTheme.description}
                    </p>
                  </div>

                  {/* Tags */}
                  {viewingTheme.tags && viewingTheme.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingTheme.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context Metadata */}
                  {viewingTheme.contextMetadata && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Campaign Context
                      </h3>
                      <div className="space-y-3">
                        {viewingTheme.contextMetadata.sportType && (
                          <div>
                            <span className="text-gray-500 text-sm">Sport:</span>
                            <p className="text-gray-300">{viewingTheme.contextMetadata.sportType}</p>
                          </div>
                        )}
                        {viewingTheme.contextMetadata.homeTeam && viewingTheme.contextMetadata.awayTeam && (
                          <div>
                            <span className="text-gray-500 text-sm">Matchup:</span>
                            <p className="text-gray-300">
                              {viewingTheme.contextMetadata.homeTeam} vs {viewingTheme.contextMetadata.awayTeam}
                            </p>
                          </div>
                        )}
                        {viewingTheme.contextMetadata.contextPills && viewingTheme.contextMetadata.contextPills.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-sm">Context:</span>
                            <p className="text-gray-300">
                              {viewingTheme.contextMetadata.contextPills.join(', ')}
                            </p>
                          </div>
                        )}
                        {viewingTheme.contextMetadata.campaignGoal && (
                          <div>
                            <span className="text-gray-500 text-sm">Goal:</span>
                            <p className="text-gray-300">{viewingTheme.contextMetadata.campaignGoal}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selection Button */}
                  <div className="pt-4 border-t border-gray-700">
                    {!isThemeSelected(viewingTheme.id) ? (
                      <Button
                        onClick={() => {
                          toggleThemeSelection(viewingTheme);
                          setViewDialogOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                        size="lg"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        Select This Theme
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-orange-500 py-3">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Currently Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
