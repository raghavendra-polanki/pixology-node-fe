import { useState, useEffect } from 'react';
import { ArrowRight, Play, Zap, RefreshCw, Check, AlertCircle, Sparkles, Video, Image as ImageIcon, FileText, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { GameLabProject, GeneratedImage, CreateProjectInput } from '../../types/project.types';

interface Stage5Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

interface AnimationData {
  themeId: string;
  themeName: string;
  imageUrl: string;
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
}

interface GenerationProgress {
  stage: string;
  message: string;
  progress: number;
  current: number;
  total: number;
  themeId?: string;
  themeName?: string;
}

export const Stage5KineticActivation = ({ project, markStageCompleted, navigateToStage, loadProject }: Stage5Props) => {
  const [imagesToAnimate, setImagesToAnimate] = useState<GeneratedImage[]>([]);
  const [animations, setAnimations] = useState<AnimationData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null); // Track individual generation
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedScreenplay, setExpandedScreenplay] = useState<string | null>(null);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  // Load images selected for animation from Stage 4
  useEffect(() => {
    if (!project?.highFidelityCapture) return;

    const selectedForAnimation = project.highFidelityCapture.selectedForAnimation || [];
    const allImages = project.highFidelityCapture.generatedImages || [];

    // Filter to only images selected for animation
    const animationImages = allImages.filter((img: GeneratedImage) =>
      selectedForAnimation.includes(img.themeId || '')
    );

    console.log('[Stage5] Images for animation:', animationImages.length, 'of', allImages.length);
    setImagesToAnimate(animationImages);

    // Load existing animations if any
    if (project.kineticActivation?.animations) {
      setAnimations(project.kineticActivation.animations);
      console.log('[Stage5] Loaded existing animations:', project.kineticActivation.animations.length);
    }

    // Load existing export selections
    if (project.kineticActivation?.selectedForExport) {
      setSelectedForExport(new Set(project.kineticActivation.selectedForExport));
      console.log('[Stage5] Loaded export selections:', project.kineticActivation.selectedForExport.length);
    }
  }, [project?.highFidelityCapture, project?.kineticActivation]);

  /**
   * Handle SSE events from the server
   */
  const handleSSEEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'start':
        console.log('[Stage5] Animation generation started:', data);
        break;

      case 'progress':
        setGenerationProgress({
          stage: data.stage,
          message: data.message,
          progress: data.progress || data.overallProgress || 0,
          current: data.current || 0,
          total: data.total || imagesToAnimate.length,
          themeId: data.themeId,
          themeName: data.themeName,
        });
        break;

      case 'animation':
        // Add or update animation in state
        setAnimations(prev => {
          const existing = prev.findIndex(a => a.themeId === data.animation.themeId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.animation;
            return updated;
          }
          return [...prev, data.animation];
        });
        break;

      case 'error':
        if (data.fatal) {
          setError(data.message);
          setIsGenerating(false);
        } else {
          console.warn('[Stage5] Non-fatal error:', data);
        }
        break;

      case 'complete':
        setGenerationProgress(null);
        setIsGenerating(false);
        console.log('[Stage5] Generation complete:', data);
        // Reload project to get saved data
        if (loadProject && project?.id) {
          loadProject(project.id);
        }
        break;
    }
  };

  /**
   * Start generating animations for all selected images
   */
  const handleGenerateAnimations = async () => {
    if (!project?.id || imagesToAnimate.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setAnimations([]);
    setGenerationProgress({
      stage: 'init',
      message: 'Preparing animation generation...',
      progress: 0,
      current: 0,
      total: imagesToAnimate.length,
    });

    try {
      // Build the request payload with full context
      const images = imagesToAnimate.map(img => ({
        themeId: img.themeId,
        themeName: img.themeName,
        themeDescription: project.conceptGallery?.selectedThemes?.find(
          (t: any) => t.id === img.themeId
        )?.description || '',
        themeCategory: img.themeCategory,
        url: img.url,
        players: img.players || [],
      }));

      const contextBrief = {
        sportType: project.contextBrief?.sportType || 'Hockey',
        homeTeam: project.contextBrief?.homeTeam,
        awayTeam: project.contextBrief?.awayTeam,
        contextPills: project.contextBrief?.contextPills || [],
        campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
      };

      console.log('[Stage5] Starting animation generation for', images.length, 'images');

      // Use SSE for streaming updates
      const response = await fetch('/api/gamelab/generation/animations-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          images,
          contextBrief,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start animation generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEventType = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEventType = line.substring(7).trim();
            } else if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.substring(5).trim());
                handleSSEEvent(currentEventType, data);
              } catch (e) {
                console.warn('[Stage5] Failed to parse SSE data:', line);
              }
            }
          }
        }
      }

    } catch (err) {
      console.error('[Stage5] Animation generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate animations');
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  /**
   * Generate animation for a single image
   */
  const handleGenerateSingleAnimation = async (image: GeneratedImage) => {
    if (!project?.id || !image.themeId) return;

    const themeId = image.themeId;
    setGeneratingImageId(themeId);
    setError(null);

    try {
      // Get theme description
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

      console.log('[Stage5] Generating single animation for:', image.themeName);

      // Step 1: Generate screenplay
      setGenerationProgress({
        stage: 'screenplay',
        message: `Analyzing image and generating screenplay for ${image.themeName}...`,
        progress: 25,
        current: 1,
        total: 1,
        themeId,
        themeName: image.themeName,
      });

      const screenplayResponse = await fetch('/api/gamelab/generation/animation-screenplay', {
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

      if (!screenplayResponse.ok) {
        const errData = await screenplayResponse.json();
        throw new Error(errData.message || 'Failed to generate screenplay');
      }

      const screenplayData = await screenplayResponse.json();
      const screenplay = screenplayData.data?.screenplay;

      if (!screenplay) {
        throw new Error('No screenplay generated');
      }

      // Update animations with screenplay (intermediate state)
      setAnimations(prev => {
        const existing = prev.findIndex(a => a.themeId === themeId);
        const newAnimation: AnimationData = {
          themeId,
          themeName: image.themeName || '',
          imageUrl: image.url,
          screenplay,
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newAnimation;
          return updated;
        }
        return [...prev, newAnimation];
      });

      // Step 2: Generate video
      setGenerationProgress({
        stage: 'video',
        message: `Generating 4-second video for ${image.themeName}...`,
        progress: 60,
        current: 1,
        total: 1,
        themeId,
        themeName: image.themeName,
      });

      const videoResponse = await fetch('/api/gamelab/generation/animation-video', {
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

      // Update animations with video result
      setAnimations(prev => {
        const existing = prev.findIndex(a => a.themeId === themeId);
        const newAnimation: AnimationData = {
          themeId,
          themeName: image.themeName || '',
          imageUrl: image.url,
          screenplay,
          video: {
            videoUrl: video.videoUrl,
            duration: video.duration || '4s',
            generatedAt: video.generatedAt || new Date().toISOString(),
          },
          generatedAt: new Date().toISOString(),
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newAnimation;
          return updated;
        }
        return [...prev, newAnimation];
      });

      // Save to project
      setGenerationProgress({
        stage: 'saving',
        message: 'Saving animation...',
        progress: 90,
        current: 1,
        total: 1,
      });

      // Update the project's kineticActivation data
      const updatedAnimations = animations.map(a =>
        a.themeId === themeId
          ? {
              ...a,
              screenplay,
              video: {
                videoUrl: video.videoUrl,
                duration: video.duration || '4s',
                generatedAt: video.generatedAt || new Date().toISOString(),
              },
              generatedAt: new Date().toISOString(),
            }
          : a
      );

      // If this animation wasn't in the list, add it
      if (!animations.find(a => a.themeId === themeId)) {
        updatedAnimations.push({
          themeId,
          themeName: image.themeName || '',
          imageUrl: image.url,
          screenplay,
          video: {
            videoUrl: video.videoUrl,
            duration: video.duration || '4s',
            generatedAt: video.generatedAt || new Date().toISOString(),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      console.log('[Stage5] Single animation generated successfully');

    } catch (err) {
      console.error('[Stage5] Single animation generation failed:', err);

      // Update animation state with error
      setAnimations(prev => {
        const existing = prev.findIndex(a => a.themeId === themeId);
        const errorAnimation: AnimationData = {
          themeId,
          themeName: image.themeName || '',
          imageUrl: image.url,
          error: err instanceof Error ? err.message : 'Failed to generate animation',
          generatedAt: new Date().toISOString(),
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = errorAnimation;
          return updated;
        }
        return [...prev, errorAnimation];
      });
    } finally {
      setGeneratingImageId(null);
      setGenerationProgress(null);
    }
  };

  /**
   * Toggle export selection for a video
   */
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

  /**
   * Save and continue to next stage
   */
  const handleContinue = async () => {
    if (animations.length === 0) return;

    try {
      setIsSaving(true);

      const kineticActivationData = {
        animations,
        selectedForExport: Array.from(selectedForExport),
        generatedAt: new Date(),
        successCount: animations.filter(a => !a.error).length,
        errorCount: animations.filter(a => a.error).length,
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

  const hasImagesToAnimate = imagesToAnimate.length > 0;
  const hasAnimations = animations.length > 0;
  const successfulAnimations = animations.filter(a => !a.error && a.video?.videoUrl);

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Kinetic Activation</h2>
            <p className="text-gray-400">Generate 4-second animations from your images</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-green-300 text-sm">
                <strong>Two-Step AI Process:</strong> First, AI analyzes each image and creates a custom animation screenplay.
                Then, it generates a professional 4-second video with subtle, broadcast-quality motion.
              </p>
              <p className="text-green-400/70 text-xs mt-1">
                No camera movement • No audio • Optimized for sports broadcasting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No images selected message */}
      {!hasImagesToAnimate && (
        <div className="text-center py-16">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Images Selected for Animation</h3>
          <p className="text-gray-400 mb-6">
            Go back to Stage 4 and select images for animation by clicking the "Animate" button on each card.
          </p>
          <Button
            onClick={() => navigateToStage(4)}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Back to Stage 4
          </Button>
        </div>
      )}

      {/* Images Grid */}
      {hasImagesToAnimate && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Images to Animate ({imagesToAnimate.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imagesToAnimate.map((image) => {
                const animation = animations.find(a => a.themeId === image.themeId);
                const isExpanded = expandedScreenplay === image.themeId;

                return (
                  <div
                    key={image.themeId}
                    className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden"
                  >
                    {/* Image or Video Preview */}
                    <div className="aspect-video relative bg-gray-900">
                      {animation?.video?.videoUrl ? (
                        <video
                          src={animation.video.videoUrl}
                          className="w-full h-full object-cover"
                          controls
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={image.url}
                          alt={image.themeName}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Status Badge */}
                      {animation?.video?.videoUrl ? (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Animated
                        </div>
                      ) : animation?.error ? (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </div>
                      ) : animation?.screenplay ? (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Screenplay Ready
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Pending
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h4 className="text-white font-medium mb-2">{image.themeName}</h4>

                      {/* Action Buttons */}
                      <div className="mb-3 space-y-2">
                        {/* Generate/Regenerate Button */}
                        <Button
                          onClick={() => handleGenerateSingleAnimation(image)}
                          disabled={isGenerating || generatingImageId !== null}
                          size="sm"
                          variant={animation?.video?.videoUrl ? 'outline' : 'default'}
                          className={
                            animation?.video?.videoUrl
                              ? 'w-full border-green-500/50 text-green-400 hover:bg-green-500/10'
                              : 'w-full bg-green-500 hover:bg-green-600 text-white'
                          }
                        >
                          {generatingImageId === image.themeId ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : animation?.video?.videoUrl ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Video
                            </>
                          ) : animation?.error ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retry Generation
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Generate Video
                            </>
                          )}
                        </Button>

                        {/* Export Selection Button - only show when video exists */}
                        {animation?.video?.videoUrl && (
                          <Button
                            onClick={() => image.themeId && toggleExportSelection(image.themeId)}
                            size="sm"
                            variant="outline"
                            className={
                              selectedForExport.has(image.themeId || '')
                                ? 'w-full border-amber-500 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'w-full border-gray-600 text-gray-400 hover:bg-gray-800'
                            }
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {selectedForExport.has(image.themeId || '') ? 'Selected for Export' : 'Select for Export'}
                          </Button>
                        )}
                      </div>

                      {/* Screenplay Preview */}
                      {animation?.screenplay && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedScreenplay(isExpanded ? null : image.themeId || null)}
                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {isExpanded ? 'Hide Screenplay' : 'View Screenplay'}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs">
                              <p className="text-gray-300 mb-2">
                                <strong className="text-green-400">Concept:</strong> {animation.screenplay.animationConcept}
                              </p>
                              <div className="space-y-1 text-gray-400">
                                <p><strong>0-1s:</strong> {animation.screenplay.screenplay.second1}</p>
                                <p><strong>1-2s:</strong> {animation.screenplay.screenplay.second2}</p>
                                <p><strong>2-3s:</strong> {animation.screenplay.screenplay.second3}</p>
                                <p><strong>3-4s:</strong> {animation.screenplay.screenplay.second4}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {animation?.error && (
                        <p className="text-red-400 text-xs mt-2">{animation.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate All Button */}
          <div className="mb-8">
            <Button
              onClick={handleGenerateAnimations}
              disabled={isGenerating || generatingImageId !== null || imagesToAnimate.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating All...
                </>
              ) : successfulAnimations.length > 0 ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Regenerate All ({imagesToAnimate.length})
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Generate All ({imagesToAnimate.length})
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Or generate individual videos using the buttons on each card above
            </p>

            {/* Progress indicator */}
            {generationProgress && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{generationProgress.message}</span>
                  <span className="text-sm text-green-400">{generationProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress.progress}%` }}
                  />
                </div>
                {generationProgress.current > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Processing {generationProgress.current} of {generationProgress.total}
                    {generationProgress.themeName && `: ${generationProgress.themeName}`}
                  </p>
                )}
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Summary & Continue Button */}
      {hasAnimations && (
        <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${successfulAnimations.length > 0 ? 'bg-green-500' : 'bg-gray-600'}`} />
                <span className="text-sm text-gray-300">
                  <span className="font-medium text-green-400">{successfulAnimations.length}</span> animations generated
                </span>
              </div>
              {animations.filter(a => a.error).length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-red-400">{animations.filter(a => a.error).length}</span> failed
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Download className={`w-4 h-4 ${selectedForExport.size > 0 ? 'text-amber-400' : 'text-gray-600'}`} />
                <span className="text-sm text-gray-300">
                  <span className={`font-medium ${selectedForExport.size > 0 ? 'text-amber-400' : 'text-gray-500'}`}>{selectedForExport.size}</span> selected for export
                </span>
              </div>
            </div>
            <Button
              onClick={handleContinue}
              disabled={isSaving || successfulAnimations.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl"
              size="lg"
            >
              {isSaving ? 'Saving...' : 'Continue to Export'}
              {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
          {successfulAnimations.length === 0 && (
            <p className="text-sm text-yellow-400 mt-3">
              Generate at least one animation to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
};
