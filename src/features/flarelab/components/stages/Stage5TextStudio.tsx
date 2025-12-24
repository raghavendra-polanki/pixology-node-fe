import { useState, useEffect } from 'react';
import { ArrowRight, Type, Sparkles, Edit2, Plus, Trash2, Lock, Unlock, Undo, Redo, Square, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type {
  FlareLabProject,
  GeneratedImage,
  CreateProjectInput,
  TextOverlay,
  ImageTextOverlays,
  TextStylePreset,
} from '../../types/project.types';

interface Stage5Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
  updateTextStudio?: (data: any) => Promise<FlareLabProject | null>;
}

export const Stage5TextStudio = ({ project, markStageCompleted, navigateToStage, loadProject, updateTextStudio }: Stage5Props) => {
  // Images from Stage 4 that are selected for text overlay
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Text overlays per image
  const [imageOverlays, setImageOverlays] = useState<Record<string, ImageTextOverlays>>({});

  // Currently selected text layer
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Selection state for export/animation
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [selectedForAnimation, setSelectedForAnimation] = useState<Set<string>>(new Set());

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);

  // Load images from Stage 4
  useEffect(() => {
    if (project?.highFidelityCapture?.generatedImages) {
      // Get images that have been generated
      const generatedImages = project.highFidelityCapture.generatedImages.filter(img => img.url);
      setImages(generatedImages);

      // Initialize overlays from saved data or create empty
      if (project?.textStudio?.imageOverlays) {
        setImageOverlays(project.textStudio.imageOverlays);
      } else {
        // Initialize empty overlays for each image
        const initialOverlays: Record<string, ImageTextOverlays> = {};
        generatedImages.forEach(img => {
          if (img.themeId) {
            initialOverlays[img.themeId] = {
              themeId: img.themeId,
              imageUrl: img.url,
              overlays: [],
            };
          }
        });
        setImageOverlays(initialOverlays);
      }

      // Load selection state
      if (project?.textStudio?.selectedForExport) {
        setSelectedForExport(new Set(project.textStudio.selectedForExport));
      }
      if (project?.textStudio?.selectedForAnimation) {
        setSelectedForAnimation(new Set(project.textStudio.selectedForAnimation));
      }
    }
  }, [project?.highFidelityCapture?.generatedImages, project?.textStudio]);

  // Get current image
  const currentImage = images[currentImageIndex];
  const currentOverlays = currentImage?.themeId ? imageOverlays[currentImage.themeId]?.overlays || [] : [];

  // Navigation
  const goToPreviousImage = () => {
    setCurrentImageIndex(prev => Math.max(0, prev - 1));
    setSelectedOverlayId(null);
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1));
    setSelectedOverlayId(null);
  };

  // Toggle selection for export
  const toggleExportSelection = (themeId: string) => {
    setSelectedForExport(prev => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
      } else {
        next.add(themeId);
      }
      return next;
    });
  };

  // Toggle selection for animation
  const toggleAnimationSelection = (themeId: string) => {
    setSelectedForAnimation(prev => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
      } else {
        next.add(themeId);
      }
      return next;
    });
  };

  // Add new text overlay
  const addTextOverlay = () => {
    if (!currentImage?.themeId) return;

    const newOverlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      position: { x: 50, y: 50 }, // Center
      style: {
        fontFamily: 'Bebas Neue',
        fontSize: 48,
        fontWeight: 700,
        fillType: 'solid',
        fillColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        textTransform: 'uppercase',
        letterSpacing: 2,
      },
      aiGenerated: false,
    };

    setImageOverlays(prev => ({
      ...prev,
      [currentImage.themeId!]: {
        ...prev[currentImage.themeId!],
        overlays: [...(prev[currentImage.themeId!]?.overlays || []), newOverlay],
      },
    }));

    setSelectedOverlayId(newOverlay.id);
  };

  // Delete text overlay
  const deleteOverlay = (overlayId: string) => {
    if (!currentImage?.themeId) return;

    setImageOverlays(prev => ({
      ...prev,
      [currentImage.themeId!]: {
        ...prev[currentImage.themeId!],
        overlays: prev[currentImage.themeId!]?.overlays.filter(o => o.id !== overlayId) || [],
      },
    }));

    if (selectedOverlayId === overlayId) {
      setSelectedOverlayId(null);
    }
  };

  // Get AI text suggestions
  const getAISuggestions = async () => {
    if (!currentImage || !project) return;

    setIsLoadingAISuggestions(true);
    try {
      // TODO: Call backend API for AI suggestions
      console.log('[Stage5] Getting AI suggestions for image:', currentImage.themeId);

      // Placeholder: Add sample AI-generated text
      const aiOverlay: TextOverlay = {
        id: `ai-${Date.now()}`,
        text: currentImage.themeName || 'GAME DAY',
        position: { x: 50, y: 80 },
        style: {
          fontFamily: 'Bebas Neue',
          fontSize: 64,
          fontWeight: 700,
          fillType: 'gradient',
          gradient: {
            type: 'linear',
            angle: 180,
            stops: [
              { offset: 0, color: '#FFFFFF' },
              { offset: 1, color: '#80DEEA' },
            ],
          },
          strokeColor: '#006064',
          strokeWidth: 2,
          glowColor: '#00BCD4',
          glowBlur: 20,
          textTransform: 'uppercase',
          letterSpacing: 4,
        },
        aiGenerated: true,
      };

      if (currentImage.themeId) {
        setImageOverlays(prev => ({
          ...prev,
          [currentImage.themeId!]: {
            ...prev[currentImage.themeId!],
            overlays: [...(prev[currentImage.themeId!]?.overlays || []), aiOverlay],
          },
        }));
        setSelectedOverlayId(aiOverlay.id);
      }
    } catch (error) {
      console.error('[Stage5] Failed to get AI suggestions:', error);
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  // Save and continue
  const handleContinue = async () => {
    if (selectedForExport.size === 0 && selectedForAnimation.size === 0) return;

    setIsSaving(true);
    try {
      const textStudioData = {
        imageOverlays,
        selectedForExport: Array.from(selectedForExport),
        selectedForAnimation: Array.from(selectedForAnimation),
        updatedAt: new Date(),
      };

      await markStageCompleted('text-studio', undefined, {
        textStudio: textStudioData,
      });

      navigateToStage(6);
    } catch (error) {
      console.error('[Stage5] Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // No images warning
  if (images.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-8 lg:p-12">
        <div className="text-center py-16">
          <Type className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Images Available</h2>
          <p className="text-gray-400 mb-6">
            Please complete Stage 4 to generate images first.
          </p>
          <Button
            onClick={() => navigateToStage(4)}
            variant="outline"
            className="border-orange-500 text-orange-400"
          >
            Go to Stage 4
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Type className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Text Studio</h2>
              <p className="text-gray-400">Add text overlays to your images</p>
            </div>
          </div>
          <Button
            onClick={() => {/* TODO: Open prompt editor */}}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Prompts
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden">
            {/* Canvas Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Button
                  onClick={goToPreviousImage}
                  disabled={currentImageIndex === 0}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm text-gray-400">
                  {currentImageIndex + 1} / {images.length}
                </span>
                <Button
                  onClick={goToNextImage}
                  disabled={currentImageIndex === images.length - 1}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={addTextOverlay}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Text
                </Button>
                <Button
                  onClick={getAISuggestions}
                  disabled={isLoadingAISuggestions}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isLoadingAISuggestions ? (
                    <Sparkles className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  AI Suggest
                </Button>
              </div>
            </div>

            {/* Canvas - Placeholder for Fabric.js */}
            <div className="relative aspect-video bg-black">
              {currentImage?.url && (
                <img
                  src={currentImage.url}
                  alt={currentImage.themeName || 'Generated image'}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Text overlays preview (simplified - will be replaced by Fabric.js) */}
              {currentOverlays.map(overlay => (
                <div
                  key={overlay.id}
                  onClick={() => setSelectedOverlayId(overlay.id)}
                  className={`absolute cursor-pointer transition-all ${
                    selectedOverlayId === overlay.id ? 'ring-2 ring-orange-500' : ''
                  }`}
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontFamily: overlay.style.fontFamily,
                    fontSize: `${overlay.style.fontSize}px`,
                    fontWeight: overlay.style.fontWeight,
                    color: overlay.style.fillColor || '#FFFFFF',
                    textTransform: overlay.style.textTransform,
                    letterSpacing: `${overlay.style.letterSpacing}px`,
                    WebkitTextStroke: overlay.style.strokeWidth
                      ? `${overlay.style.strokeWidth}px ${overlay.style.strokeColor}`
                      : undefined,
                    textShadow: overlay.style.glowColor
                      ? `0 0 ${overlay.style.glowBlur}px ${overlay.style.glowColor}`
                      : undefined,
                  }}
                >
                  {overlay.text}
                </div>
              ))}
            </div>

            {/* Image Info */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{currentImage?.themeName}</h3>
                  <p className="text-sm text-gray-400">{currentOverlays.length} text layer(s)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => currentImage?.themeId && toggleExportSelection(currentImage.themeId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      currentImage?.themeId && selectedForExport.has(currentImage.themeId)
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {currentImage?.themeId && selectedForExport.has(currentImage.themeId) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    For Export
                  </button>
                  <button
                    onClick={() => currentImage?.themeId && toggleAnimationSelection(currentImage.themeId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      currentImage?.themeId && selectedForAnimation.has(currentImage.themeId)
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {currentImage?.themeId && selectedForAnimation.has(currentImage.themeId) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    For Animation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Text Properties</h3>

            {selectedOverlayId ? (
              <div className="space-y-4">
                {/* Selected overlay properties */}
                {(() => {
                  const overlay = currentOverlays.find(o => o.id === selectedOverlayId);
                  if (!overlay) return null;

                  return (
                    <>
                      {/* Text Content */}
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Text</label>
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => {
                            if (!currentImage?.themeId) return;
                            setImageOverlays(prev => ({
                              ...prev,
                              [currentImage.themeId!]: {
                                ...prev[currentImage.themeId!],
                                overlays: prev[currentImage.themeId!]?.overlays.map(o =>
                                  o.id === selectedOverlayId ? { ...o, text: e.target.value } : o
                                ) || [],
                              },
                            }));
                          }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        />
                      </div>

                      {/* Font Size */}
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">
                          Font Size: {overlay.style.fontSize}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="200"
                          value={overlay.style.fontSize}
                          onChange={(e) => {
                            if (!currentImage?.themeId) return;
                            setImageOverlays(prev => ({
                              ...prev,
                              [currentImage.themeId!]: {
                                ...prev[currentImage.themeId!],
                                overlays: prev[currentImage.themeId!]?.overlays.map(o =>
                                  o.id === selectedOverlayId
                                    ? { ...o, style: { ...o.style, fontSize: parseInt(e.target.value) } }
                                    : o
                                ) || [],
                              },
                            }));
                          }}
                          className="w-full"
                        />
                      </div>

                      {/* Color */}
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Color</label>
                        <input
                          type="color"
                          value={overlay.style.fillColor || '#FFFFFF'}
                          onChange={(e) => {
                            if (!currentImage?.themeId) return;
                            setImageOverlays(prev => ({
                              ...prev,
                              [currentImage.themeId!]: {
                                ...prev[currentImage.themeId!],
                                overlays: prev[currentImage.themeId!]?.overlays.map(o =>
                                  o.id === selectedOverlayId
                                    ? { ...o, style: { ...o.style, fillColor: e.target.value } }
                                    : o
                                ) || [],
                              },
                            }));
                          }}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Delete Button */}
                      <Button
                        onClick={() => deleteOverlay(selectedOverlayId)}
                        variant="outline"
                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Text
                      </Button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8">
                <Type className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Select a text layer to edit its properties
                </p>
                <Button
                  onClick={addTextOverlay}
                  variant="outline"
                  size="sm"
                  className="mt-4 border-gray-700 text-gray-300"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Text
                </Button>
              </div>
            )}
          </div>

          {/* Style Presets - Placeholder */}
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 mt-4">
            <h3 className="text-white font-semibold mb-4">Style Presets</h3>
            <p className="text-gray-400 text-sm">
              Coming soon: Pre-designed text styles like Frozen, Fire, Metallic Gold, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="mt-6 p-4 bg-[#151515] border border-gray-800 rounded-xl">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={img.themeId || index}
              onClick={() => {
                setCurrentImageIndex(index);
                setSelectedOverlayId(null);
              }}
              className={`relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentImageIndex
                  ? 'border-orange-500'
                  : 'border-transparent hover:border-gray-600'
              }`}
            >
              <img
                src={img.url}
                alt={img.themeName}
                className="w-full h-full object-cover"
              />
              {/* Selection indicators */}
              <div className="absolute bottom-1 right-1 flex gap-0.5">
                {img.themeId && selectedForExport.has(img.themeId) && (
                  <div className="w-2 h-2 rounded-full bg-orange-500" title="For Export" />
                )}
                {img.themeId && selectedForAnimation.has(img.themeId) && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" title="For Animation" />
                )}
              </div>
              {/* Overlay count */}
              {img.themeId && (imageOverlays[img.themeId]?.overlays?.length || 0) > 0 && (
                <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1 rounded">
                  {imageOverlays[img.themeId]?.overlays?.length}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${selectedForExport.size > 0 ? 'bg-orange-500' : 'bg-gray-600'}`} />
              <span className="text-sm text-gray-300">
                <span className="font-medium text-orange-400">{selectedForExport.size}</span> for Export
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${selectedForAnimation.size > 0 ? 'bg-amber-500' : 'bg-gray-600'}`} />
              <span className="text-sm text-gray-300">
                <span className="font-medium text-amber-400">{selectedForAnimation.size}</span> for Animation
              </span>
            </div>
          </div>
          <Button
            onClick={handleContinue}
            disabled={isSaving || (selectedForExport.size === 0 && selectedForAnimation.size === 0)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
            size="lg"
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
            {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
        {selectedForExport.size === 0 && selectedForAnimation.size === 0 && (
          <p className="text-sm text-yellow-400 mt-3">
            Select at least one image for Export or Animation to continue
          </p>
        )}
      </div>
    </div>
  );
};
