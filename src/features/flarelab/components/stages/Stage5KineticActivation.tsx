import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Play, Zap, RefreshCw, Check, AlertCircle, Sparkles, Video, Edit2, Pencil, Wand2, Layers, RotateCcw, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '../ui/textarea';
import { PromptTemplateEditor } from '@/shared/components/PromptTemplateEditor';
import FlareLabProjectService from '@/shared/services/flareLabProjectService';
import type {
  FlareLabProject,
  GeneratedImage,
  CreateProjectInput,
  AnimationRecommendation,
} from '../../types/project.types';

const projectService = new FlareLabProjectService();

interface Stage5Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
}

// Full animation data for an image
interface AnimationData {
  themeId: string;
  themeName: string;
  imageUrl: string;
  // AI Recommendations
  recommendations?: AnimationRecommendation[];
  imageAnalysis?: string;
  isLoadingRecommendations?: boolean;
  // Selected style (persisted for regeneration)
  selectedStyle?: AnimationRecommendation | null;
  customPrompt?: string;
  useCustomPrompt?: boolean;
  // Generated video
  screenplay?: {
    imageAnalysis: string;
    animationConcept: string;
    screenplay: {
      second1: string;
      second2: string;
      second3: string;
      second4: string;
    };
    videoGenerationPrompt: string;
  };
  video?: {
    videoUrl: string;
    duration: string;
    generatedAt: string;
  };
  error?: string;
  generatedAt?: string;
  // Generation state
  isGenerating?: boolean;
  generationStage?: 'analyzing' | 'generating' | 'complete';
}

interface GenerationProgress {
  stage: string;
  message: string;
  progress: number;
  current: number;
  total: number;
  themeId?: string;
}

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #505050;
  }
`;

export const Stage5KineticActivation = ({ project, markStageCompleted, navigateToStage, loadProject }: Stage5Props) => {
  const [imagesToAnimate, setImagesToAnimate] = useState<GeneratedImage[]>([]);
  const [animations, setAnimations] = useState<Map<string, AnimationData>>(new Map());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<Map<string, 'styles' | 'custom'>>(new Map());

  // Track if initial load is done to prevent re-fetching
  const initialLoadDone = useRef(false);
  const loadingInProgress = useRef<Set<string>>(new Set());

  // Helper to update animation data
  const updateAnimation = useCallback((themeId: string, updates: Partial<AnimationData>) => {
    setAnimations(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(themeId) || { themeId, themeName: '', imageUrl: '' };
      newMap.set(themeId, { ...existing, ...updates });
      return newMap;
    });
  }, []);

  // Save animations to project (for persistence) - using proper service with auth
  const saveAnimationsToProject = useCallback(async (animData: Map<string, AnimationData>) => {
    if (!project?.id) return;

    try {
      const animationsArray = Array.from(animData.values()).map(anim => ({
        ...anim,
        // Remove transient state before saving
        isLoadingRecommendations: undefined,
        isGenerating: undefined,
        generationStage: undefined,
      }));

      // Only save if there's data to save
      if (animationsArray.length === 0) return;

      await projectService.updateKineticActivation(project.id, {
        animations: animationsArray,
        updatedAt: new Date().toISOString(),
      });

      console.log('[Stage5] Saved animations to project');
    } catch (err) {
      console.error('[Stage5] Failed to save animations:', err);
    }
  }, [project?.id]);

  // Get animation recommendations for an image
  const getRecommendations = useCallback(async (image: GeneratedImage, forceRefresh = false): Promise<AnimationRecommendation[] | null> => {
    if (!project?.id || !image.themeId) return null;

    const themeId = image.themeId;

    // Check if already loading
    if (loadingInProgress.current.has(themeId)) {
      return null;
    }

    // Check if we already have recommendations (unless forcing refresh)
    if (!forceRefresh) {
      const existing = animations.get(themeId);
      if (existing?.recommendations && existing.recommendations.length > 0) {
        return existing.recommendations;
      }
    }

    // Mark as loading
    loadingInProgress.current.add(themeId);
    updateAnimation(themeId, { isLoadingRecommendations: true });

    try {
      const themeDescription = project.conceptGallery?.selectedThemes?.find(
        (t: any) => t.id === themeId
      )?.description || '';

      const contextBrief = {
        sportType: project.contextBrief?.sportType || 'Hockey',
        homeTeam: project.contextBrief?.homeTeam,
        awayTeam: project.contextBrief?.awayTeam,
        contextPills: project.contextBrief?.contextPills || [],
        campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
      };

      const response = await fetch('/api/flarelab/generation/animation-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: image.url,
          themeId,
          themeName: image.themeName,
          themeDescription,
          themeCategory: image.themeCategory,
          players: image.players || [],
          contextBrief,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const result = await response.json();
      const data = result.data;

      const recommendations = data.recommendations || [];

      // Update state with recommendations
      setAnimations(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(themeId) || { themeId, themeName: '', imageUrl: '' };
        newMap.set(themeId, {
          ...existing,
          themeId,
          themeName: image.themeName || '',
          imageUrl: image.url,
          recommendations,
          imageAnalysis: data.imageAnalysis,
          isLoadingRecommendations: false,
          // Auto-select AI pick if no selection exists
          selectedStyle: existing.selectedStyle || recommendations.find((r: AnimationRecommendation) => r.isRecommended) || recommendations[0] || null,
        });

        // Save to project after update
        setTimeout(() => {
          saveAnimationsToProject(newMap);
        }, 100);

        return newMap;
      });

      loadingInProgress.current.delete(themeId);
      return recommendations;
    } catch (err) {
      console.error('[Stage5] Failed to get recommendations:', err);
      updateAnimation(themeId, { isLoadingRecommendations: false });
      loadingInProgress.current.delete(themeId);
      return null;
    }
  }, [project, updateAnimation, saveAnimationsToProject]);

  // Load images selected for animation from Stage 4
  useEffect(() => {
    if (!project?.highFidelityCapture) return;

    const selectedForAnimation = project.highFidelityCapture.selectedForAnimation || [];
    const allImages = project.highFidelityCapture.generatedImages || [];

    const animationImages = allImages.filter((img: GeneratedImage) =>
      selectedForAnimation.includes(img.themeId || '')
    );

    setImagesToAnimate(animationImages);

    // Load existing animation data from project (only on first load)
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;

      if (project.kineticActivation?.animations && project.kineticActivation.animations.length > 0) {
        console.log('[Stage5] Loading saved animations from project:', project.kineticActivation.animations.length);
        const animMap = new Map<string, AnimationData>();
        for (const anim of project.kineticActivation.animations) {
          animMap.set(anim.themeId, {
            ...anim,
            isLoadingRecommendations: false,
            isGenerating: false,
          });
        }
        setAnimations(animMap);
      }

      if (project.kineticActivation?.selectedForExport) {
        setSelectedForExport(new Set(project.kineticActivation.selectedForExport));
      }
    }

    // Initialize tabs
    const tabs = new Map<string, 'styles' | 'custom'>();
    animationImages.forEach(img => tabs.set(img.themeId || '', 'styles'));
    setActiveTab(tabs);
  }, [project?.highFidelityCapture, project?.kineticActivation]);

  // Auto-load recommendations for images that don't have them
  useEffect(() => {
    if (imagesToAnimate.length === 0) return;

    // Small delay to let the animations state settle from project load
    const timer = setTimeout(() => {
      imagesToAnimate.forEach(image => {
        if (!image.themeId) return;
        const existing = animations.get(image.themeId);
        // Only fetch if no recommendations AND not already loading
        if ((!existing?.recommendations || existing.recommendations.length === 0) &&
            !loadingInProgress.current.has(image.themeId)) {
          console.log('[Stage5] Auto-loading recommendations for:', image.themeName);
          getRecommendations(image);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [imagesToAnimate, animations, getRecommendations]);

  // Generate video with a specific style
  const generateVideoWithStyle = async (
    image: GeneratedImage,
    style: AnimationRecommendation,
    customPrompt?: string
  ): Promise<boolean> => {
    if (!project?.id || !image.themeId) return false;

    const themeId = image.themeId;

    try {
      const contextBrief = {
        sportType: project.contextBrief?.sportType || 'Hockey',
        homeTeam: project.contextBrief?.homeTeam,
        awayTeam: project.contextBrief?.awayTeam,
        contextPills: project.contextBrief?.contextPills || [],
        campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
      };

      const screenplay = {
        imageAnalysis: '',
        animationConcept: style.screenplay.animationConcept,
        screenplay: {
          second1: style.screenplay.second1,
          second2: style.screenplay.second2,
          second3: style.screenplay.second3,
          second4: style.screenplay.second4,
        },
        videoGenerationPrompt: customPrompt || style.videoGenerationPrompt,
      };

      const videoResponse = await fetch('/api/flarelab/generation/animation-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: image.url,
          themeId,
          themeName: image.themeName,
          screenplay,
          contextBrief,
        }),
      });

      if (!videoResponse.ok) {
        const errData = await videoResponse.json();
        throw new Error(errData.message || 'Failed to generate video');
      }

      const videoData = await videoResponse.json();
      const video = videoData.data;

      // Update animation with video
      setAnimations(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(themeId) || { themeId, themeName: '', imageUrl: '' };
        newMap.set(themeId, {
          ...existing,
          selectedStyle: style,
          customPrompt: customPrompt || undefined,
          useCustomPrompt: !!customPrompt,
          screenplay,
          video: {
            videoUrl: video.videoUrl,
            duration: video.duration || '4s',
            generatedAt: video.generatedAt || new Date().toISOString(),
          },
          error: undefined,
          generatedAt: new Date().toISOString(),
          isGenerating: false,
          generationStage: 'complete',
        });

        // Save to project
        setTimeout(() => saveAnimationsToProject(newMap), 100);

        return newMap;
      });

      return true;
    } catch (err) {
      updateAnimation(themeId, {
        error: err instanceof Error ? err.message : 'Failed',
        isGenerating: false,
      });
      return false;
    }
  };

  // Generate for single image - RESPECTS USER SELECTION
  const generateSingle = async (image: GeneratedImage, useExistingStyleForRegenerate = false) => {
    if (!project?.id || !image.themeId) return;

    const themeId = image.themeId;
    const existing = animations.get(themeId);

    updateAnimation(themeId, {
      isGenerating: true,
      generationStage: 'analyzing',
      error: undefined,
    });

    try {
      // Priority 1: Custom prompt (if user is on custom tab and has entered text)
      if (existing?.useCustomPrompt && existing?.customPrompt?.trim()) {
        updateAnimation(themeId, { generationStage: 'generating' });

        const customStyle: AnimationRecommendation = {
          id: 'custom',
          styleName: 'Custom Animation',
          category: 'subtle',
          description: 'Custom user-defined animation',
          whyItWorks: 'User specified',
          isRecommended: false,
          screenplay: {
            animationConcept: existing.customPrompt,
            second1: 'Custom motion',
            second2: 'Custom motion',
            second3: 'Custom motion',
            second4: 'Custom motion',
          },
          videoGenerationPrompt: existing.customPrompt,
        };

        await generateVideoWithStyle(image, customStyle, existing.customPrompt);
        return;
      }

      // Priority 2: User-selected style (THIS IS THE FIX - always use selected style if available)
      if (existing?.selectedStyle) {
        updateAnimation(themeId, { generationStage: 'generating' });
        await generateVideoWithStyle(image, existing.selectedStyle);
        return;
      }

      // Priority 3: No selection - get recommendations and use AI pick
      let recommendations = existing?.recommendations;
      if (!recommendations || recommendations.length === 0) {
        recommendations = await getRecommendations(image);
      }

      if (!recommendations || recommendations.length === 0) {
        throw new Error('No animation styles available');
      }

      // Pick AI recommended or first
      const aiPick = recommendations.find(r => r.isRecommended) || recommendations[0];

      updateAnimation(themeId, {
        selectedStyle: aiPick,
        generationStage: 'generating',
      });

      await generateVideoWithStyle(image, aiPick);

    } catch (err) {
      console.error('[Stage5] Generation failed:', err);
      updateAnimation(themeId, {
        error: err instanceof Error ? err.message : 'Generation failed',
        isGenerating: false,
      });
    }
  };

  // Generate All - batch operation
  const generateAll = async (regenerate = false) => {
    if (imagesToAnimate.length === 0) return;

    setIsGeneratingAll(true);
    setError(null);

    const total = imagesToAnimate.length;

    for (let i = 0; i < imagesToAnimate.length; i++) {
      const image = imagesToAnimate[i];

      setGenerationProgress({
        stage: 'processing',
        message: `Processing ${image.themeName}...`,
        progress: Math.round(((i + 0.5) / total) * 100),
        current: i + 1,
        total,
        themeId: image.themeId,
      });

      await generateSingle(image, regenerate);

      if (i < imagesToAnimate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setGenerationProgress(null);
    setIsGeneratingAll(false);
  };

  // Select a style for an image
  const selectStyle = (themeId: string, style: AnimationRecommendation) => {
    setAnimations(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(themeId) || { themeId, themeName: '', imageUrl: '' };
      newMap.set(themeId, {
        ...existing,
        selectedStyle: style,
        useCustomPrompt: false,
      });

      // Save selection to project
      setTimeout(() => saveAnimationsToProject(newMap), 100);

      return newMap;
    });
  };

  // Set custom prompt
  const setCustomPromptValue = (themeId: string, prompt: string) => {
    updateAnimation(themeId, {
      customPrompt: prompt,
      useCustomPrompt: prompt.trim().length > 0,
    });
  };

  // Toggle export selection
  const toggleExportSelection = (themeId: string) => {
    setSelectedForExport(prev => {
      const newSet = new Set(prev);
      if (newSet.has(themeId)) {
        newSet.delete(themeId);
      } else {
        newSet.add(themeId);
      }
      return newSet;
    });
  };

  // Handle continue to next stage
  const handleContinue = async () => {
    const animationsArray = Array.from(animations.values());
    const successfulAnimations = animationsArray.filter(a => !a.error && a.video?.videoUrl);

    if (successfulAnimations.length === 0) return;

    try {
      setIsSaving(true);

      const kineticActivationData = {
        animations: animationsArray,
        selectedForExport: Array.from(selectedForExport),
        generatedAt: new Date(),
        successCount: successfulAnimations.length,
        errorCount: animationsArray.filter(a => a.error).length,
      };

      await markStageCompleted('kinetic-activation', undefined, {
        kineticActivation: kineticActivationData,
      });

      if (navigateToStage) {
        navigateToStage(6);
      }
    } catch (err) {
      console.error('[Stage5] Failed to save:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Regenerate styles for a specific image
  const regenerateStyles = (image: GeneratedImage) => {
    if (!image.themeId) return;
    loadingInProgress.current.delete(image.themeId);
    getRecommendations(image, true);
  };

  // Computed values
  const animationsArray = Array.from(animations.values());
  const successfulAnimations = animationsArray.filter(a => !a.error && a.video?.videoUrl);
  const hasImagesToAnimate = imagesToAnimate.length > 0;
  const canGenerateAll = hasImagesToAnimate && !isGeneratingAll;
  const hasAnyVideos = successfulAnimations.length > 0;

  if (showPromptEditor) {
    return (
      <PromptTemplateEditor
        stageType="stage_5_animation"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        accentColor="#f97316"
        apiBasePath="/api/flarelab/prompts"
        stageData={{}}
      />
    );
  }

  return (
    <>
      {/* Inject custom scrollbar styles */}
      <style>{scrollbarStyles}</style>

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Kinetic Activation</h2>
                <p className="text-sm text-gray-400">Generate 4-second animated videos</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPromptEditor(true)}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Prompts
            </Button>
          </div>
        </div>

        {/* Generate All Button */}
        {hasImagesToAnimate && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Batch Generation</p>
                  <p className="text-sm text-gray-400">
                    {hasAnyVideos
                      ? 'Regenerate uses your selected styles for each image.'
                      : 'Uses your selected style for each image (or AI pick if none selected).'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {hasAnyVideos && (
                  <Button
                    onClick={() => generateAll(true)}
                    disabled={!canGenerateAll}
                    variant="outline"
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate All
                  </Button>
                )}
                <Button
                  onClick={() => generateAll(false)}
                  disabled={!canGenerateAll}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  {isGeneratingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate All ({imagesToAnimate.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {generationProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{generationProgress.message}</span>
                  <span className="text-sm text-orange-400">{generationProgress.current}/{generationProgress.total}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* No images message */}
        {!hasImagesToAnimate && (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Images Selected for Animation</h3>
            <p className="text-gray-400 mb-6">Go back to Stage 4 and select images for animation.</p>
            <Button
              onClick={() => navigateToStage(4)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Back to Stage 4
            </Button>
          </div>
        )}

        {/* Image Cards - Two Column Layout */}
        {hasImagesToAnimate && (
          <div className="space-y-6">
            {imagesToAnimate.map((image) => {
              const themeId = image.themeId || '';
              const animation = animations.get(themeId);
              const isGenerating = animation?.isGenerating;
              const isLoadingRecs = animation?.isLoadingRecommendations;
              const hasVideo = animation?.video?.videoUrl;
              const recommendations = animation?.recommendations || [];
              const hasRecommendations = recommendations.length > 0;
              const currentTab = activeTab.get(themeId) || 'styles';
              const selectedStyle = animation?.selectedStyle;
              const customPrompt = animation?.customPrompt || '';
              const useCustom = currentTab === 'custom' && customPrompt.trim().length > 0;

              // Determine if we can generate
              const canGenerate = (hasRecommendations && selectedStyle) || useCustom;

              return (
                <div
                  key={themeId}
                  className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Two-column layout */}
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Large Preview */}
                    <div className="lg:w-1/2 p-4">
                      <div className="aspect-video relative bg-gray-900 rounded-lg overflow-hidden">
                        {hasVideo ? (
                          <video
                            src={animation.video!.videoUrl}
                            className="w-full h-full object-cover"
                            controls
                            loop
                            muted
                            playsInline
                            autoPlay
                          />
                        ) : (
                          <img
                            src={image.url}
                            alt={image.themeName}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Generating overlay */}
                        {isGenerating && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-orange-400 animate-spin mb-3" />
                            <p className="text-white font-medium">
                              {animation?.generationStage === 'analyzing' ? 'Analyzing image...' : 'Generating video...'}
                            </p>
                          </div>
                        )}

                        {/* Status badge */}
                        {hasVideo && !isGenerating && (
                          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Video Ready
                          </div>
                        )}

                        {animation?.error && (
                          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </div>
                        )}
                      </div>

                      {/* Below preview: Title + Actions */}
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">{image.themeName}</h3>
                          {selectedStyle && !useCustom && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Style: <span className="text-orange-400">{selectedStyle.styleName}</span>
                            </p>
                          )}
                          {useCustom && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Using <span className="text-orange-400">custom prompt</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasVideo && (
                            <Button
                              onClick={() => toggleExportSelection(themeId)}
                              size="sm"
                              variant="outline"
                              className={
                                selectedForExport.has(themeId)
                                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                                  : 'border-gray-600 text-gray-400 hover:border-amber-500/50'
                              }
                            >
                              {selectedForExport.has(themeId) ? (
                                <CheckSquare className="w-4 h-4 mr-1" />
                              ) : (
                                <Square className="w-4 h-4 mr-1" />
                              )}
                              For Export
                            </Button>
                          )}
                        </div>
                      </div>

                      {animation?.error && (
                        <p className="text-red-400 text-xs mt-2">{animation.error}</p>
                      )}
                    </div>

                    {/* Right: Style Selection Panel */}
                    <div className="lg:w-1/2 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-800 flex-shrink-0">
                        <button
                          onClick={() => setActiveTab(prev => new Map(prev).set(themeId, 'styles'))}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            currentTab === 'styles'
                              ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/5'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 inline mr-2" />
                          AI Styles
                        </button>
                        <button
                          onClick={() => setActiveTab(prev => new Map(prev).set(themeId, 'custom'))}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            currentTab === 'custom'
                              ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/5'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Pencil className="w-4 h-4 inline mr-2" />
                          Custom Prompt
                        </button>
                      </div>

                      {/* Tab Content - Scrollable area with custom scrollbar */}
                      <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ maxHeight: '320px' }}>
                          {currentTab === 'styles' ? (
                            <>
                              {/* AI Analysis + Regenerate button */}
                              {animation?.imageAnalysis && (
                                <div className="mb-3 p-3 bg-gray-800/50 rounded-lg">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs text-gray-300 flex-1">
                                      <span className="text-orange-400 font-medium">AI Analysis:</span>{' '}
                                      {animation.imageAnalysis}
                                    </p>
                                    <button
                                      onClick={() => regenerateStyles(image)}
                                      disabled={isLoadingRecs}
                                      className="text-gray-500 hover:text-orange-400 transition-colors flex-shrink-0"
                                      title="Regenerate styles"
                                    >
                                      <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Loading state */}
                              {isLoadingRecs && !hasRecommendations && (
                                <div className="text-center py-8">
                                  <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mx-auto mb-3" />
                                  <p className="text-gray-400 text-sm">Analyzing image and generating styles...</p>
                                </div>
                              )}

                              {/* Style options */}
                              {hasRecommendations && (
                                <div className="space-y-2">
                                  {recommendations.map((rec) => {
                                    const isSelected = selectedStyle?.id === rec.id;

                                    return (
                                      <button
                                        key={rec.id}
                                        onClick={() => selectStyle(themeId, rec)}
                                        disabled={isGenerating}
                                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                                          isSelected
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <div className="flex items-start gap-3">
                                          {/* Radio indicator */}
                                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                            isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-500'
                                          }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-white font-medium text-sm">{rec.styleName}</span>
                                              {rec.isRecommended && (
                                                <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">
                                                  AI PICK
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>

                                            {/* Screenplay preview when selected */}
                                            {isSelected && (
                                              <div className="mt-2 pt-2 border-t border-gray-700/50">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">4-Second Screenplay</p>
                                                <div className="text-xs text-gray-500 space-y-0.5">
                                                  <p>0-1s: {rec.screenplay.second1}</p>
                                                  <p>1-2s: {rec.screenplay.second2}</p>
                                                  <p>2-3s: {rec.screenplay.second3}</p>
                                                  <p>3-4s: {rec.screenplay.second4}</p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Empty state with regenerate */}
                              {!isLoadingRecs && !hasRecommendations && (
                                <div className="text-center py-8">
                                  <p className="text-gray-500 text-sm mb-3">No styles available</p>
                                  <Button
                                    onClick={() => regenerateStyles(image)}
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-700 text-gray-400"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Generate Styles
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : (
                            /* Custom Prompt Tab */
                            <div>
                              <p className="text-sm text-gray-400 mb-3">
                                Describe the animation you want. Be specific about motion, timing, and effects.
                              </p>
                              <Textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPromptValue(themeId, e.target.value)}
                                placeholder="Example: The player slowly turns their head to face the camera, a subtle breath vapor visible. Jersey fabric ripples gently. Dramatic lighting shifts slightly..."
                                className="bg-gray-900/50 border-gray-700 text-white text-sm min-h-[140px]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Generate button - Always visible at bottom */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-[#151515]">
                          <Button
                            onClick={() => generateSingle(image, false)}
                            disabled={!canGenerate || isGenerating || isGeneratingAll}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : hasVideo ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Regenerate Video
                              </>
                            ) : currentTab === 'custom' && customPrompt.trim() ? (
                              <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Generate with Custom Prompt
                              </>
                            ) : selectedStyle ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Generate "{selectedStyle.styleName}"
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Select a style to generate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary & Continue */}
        {successfulAnimations.length > 0 && (
          <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-green-400">{successfulAnimations.length}</span> videos ready
                  </span>
                </div>
                {animationsArray.filter(a => a.error).length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-300">
                      <span className="font-medium text-red-400">{animationsArray.filter(a => a.error).length}</span> failed
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {selectedForExport.size > 0 ? (
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm text-gray-300">
                    <span className={`font-medium ${selectedForExport.size > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {selectedForExport.size}
                    </span> selected for export
                  </span>
                </div>
              </div>
              <Button
                onClick={handleContinue}
                disabled={isSaving}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl"
                size="lg"
              >
                {isSaving ? 'Saving...' : 'Continue to Export'}
                {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
