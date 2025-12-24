import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Type, Sparkles, Edit2, Plus, Trash2, Undo, Redo, Square, CheckSquare, ChevronLeft, ChevronRight, Palette, Copy } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import * as fabric from 'fabric';
import type {
  FlareLabProject,
  GeneratedImage,
  CreateProjectInput,
  TextOverlay,
  ImageTextOverlays,
  TextStyle,
} from '../../types/project.types';
import { TEXT_STYLE_PRESETS } from './textStylePresets';

interface Stage5Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
  updateTextStudio?: (data: any) => Promise<FlareLabProject | null>;
}

// History state for undo/redo
interface HistoryEntry {
  overlays: TextOverlay[];
  timestamp: number;
}

export const Stage5TextStudio = ({ project, markStageCompleted, navigateToStage, loadProject, updateTextStudio }: Stage5Props) => {
  // Images from Stage 4
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
  const [showPresets, setShowPresets] = useState(false);

  // Undo/Redo history per image
  const [historyMap, setHistoryMap] = useState<Record<string, { entries: HistoryEntry[]; currentIndex: number }>>({});

  // Fabric.js refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container element - using callback ref pattern
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);

  // Callback ref to capture container element when mounted
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      requestAnimationFrame(() => {
        setContainerElement(node);
      });
    }
  }, []);

  // Load images from Stage 4
  useEffect(() => {
    if (project?.highFidelityCapture?.generatedImages) {
      const generatedImages = project.highFidelityCapture.generatedImages.filter(img => img.url);
      setImages(generatedImages);

      // Initialize overlays from saved data or create empty
      if (project?.textStudio?.imageOverlays) {
        setImageOverlays(project.textStudio.imageOverlays);

        // Initialize history for each image
        const newHistoryMap: Record<string, { entries: HistoryEntry[]; currentIndex: number }> = {};
        Object.entries(project.textStudio.imageOverlays).forEach(([themeId, data]) => {
          newHistoryMap[themeId] = {
            entries: [{ overlays: data.overlays || [], timestamp: Date.now() }],
            currentIndex: 0,
          };
        });
        setHistoryMap(newHistoryMap);
      } else {
        const initialOverlays: Record<string, ImageTextOverlays> = {};
        const newHistoryMap: Record<string, { entries: HistoryEntry[]; currentIndex: number }> = {};

        generatedImages.forEach(img => {
          if (img.themeId) {
            initialOverlays[img.themeId] = {
              themeId: img.themeId,
              imageUrl: img.url,
              overlays: [],
            };
            newHistoryMap[img.themeId] = {
              entries: [{ overlays: [], timestamp: Date.now() }],
              currentIndex: 0,
            };
          }
        });
        setImageOverlays(initialOverlays);
        setHistoryMap(newHistoryMap);
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

  // Get current image and overlays
  const currentImage = images[currentImageIndex];
  const currentThemeId = currentImage?.themeId;
  const currentOverlays = currentThemeId ? imageOverlays[currentThemeId]?.overlays || [] : [];

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerElement) return;

    // Dispose existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    // Create new canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Handle selection
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.data?.overlayId) {
        setSelectedOverlayId(selected.data.overlayId);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.data?.overlayId) {
        setSelectedOverlayId(selected.data.overlayId);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedOverlayId(null);
    });

    // Handle object modification
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj && obj.data?.overlayId && currentThemeId) {
        const overlayId = obj.data.overlayId;

        // Calculate percentage position
        const canvasWidth = canvas.width || 1;
        const canvasHeight = canvas.height || 1;
        const x = ((obj.left || 0) / canvasWidth) * 100;
        const y = ((obj.top || 0) / canvasHeight) * 100;

        // Update overlay position
        updateOverlayPosition(overlayId, x, y, obj.angle || 0);
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [currentImageIndex, containerElement]);

  // Load image and overlays onto canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentImage?.url || !containerElement) return;

    // Clear canvas
    canvas.clear();

    // Get container dimensions - use clientWidth/clientHeight with fallbacks
    const containerWidth = containerElement.clientWidth || containerElement.offsetWidth || 800;
    const containerHeight = containerElement.clientHeight || containerElement.offsetHeight || 450;

    // Use container dimensions (aspect-video class gives us 16:9)
    const canvasWidth = containerWidth;
    const canvasHeight = containerHeight > 0 ? containerHeight : containerWidth * (9/16);

    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);

    // Load background image using HTML Image element for better CORS handling
    const loadImage = async () => {
      try {
        // Create an HTML image element first
        const imgElement = new Image();
        imgElement.crossOrigin = 'anonymous';

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          imgElement.onload = () => resolve();
          imgElement.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
          imgElement.src = currentImage.url;
        });

        // Create Fabric image from the loaded element
        const img = new fabric.FabricImage(imgElement);

        if (!img || !canvas) return;

        // Scale image to fit canvas
        const scale = Math.min(
          canvasWidth / (img.width || 1),
          canvasHeight / (img.height || 1)
        );

        img.scale(scale);
        img.set({
          left: (canvasWidth - (img.width || 0) * scale) / 2,
          top: (canvasHeight - (img.height || 0) * scale) / 2,
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = img;
        canvas.renderAll();

        // Add text overlays
        currentOverlays.forEach(overlay => {
          addTextToCanvas(overlay, canvas, canvasWidth, canvasHeight);
        });
      } catch (error) {
        console.error('[Stage5] Failed to load image:', error);
        // Try alternative approach without CORS
        try {
          const img = await fabric.FabricImage.fromURL(currentImage.url);
          if (!img || !canvas) return;

          const scale = Math.min(
            canvasWidth / (img.width || 1),
            canvasHeight / (img.height || 1)
          );

          img.scale(scale);
          img.set({
            left: (canvasWidth - (img.width || 0) * scale) / 2,
            top: (canvasHeight - (img.height || 0) * scale) / 2,
            selectable: false,
            evented: false,
          });

          canvas.backgroundImage = img;
          canvas.renderAll();

          currentOverlays.forEach(overlay => {
            addTextToCanvas(overlay, canvas, canvasWidth, canvasHeight);
          });
        } catch (fallbackError) {
          console.error('[Stage5] Fallback image load also failed:', fallbackError);
        }
      }
    };

    loadImage();
  }, [currentImage?.url, currentOverlays, currentImageIndex, containerElement]);

  // Add a text object to the canvas
  const addTextToCanvas = (overlay: TextOverlay, canvas: fabric.Canvas, canvasWidth: number, canvasHeight: number) => {
    const style = overlay.style;

    // Create text object
    const textOptions: fabric.TextboxProps = {
      left: (overlay.position.x / 100) * canvasWidth,
      top: (overlay.position.y / 100) * canvasHeight,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight as any,
      fill: style.fillType === 'solid' ? style.fillColor : createGradient(style, canvasHeight),
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth || 0,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      angle: style.rotation || 0,
      charSpacing: (style.letterSpacing || 0) * 10,
      data: { overlayId: overlay.id },
    };

    // Apply shadow/glow
    if (style.glowColor || style.shadowColor) {
      textOptions.shadow = new fabric.Shadow({
        color: style.glowColor || style.shadowColor || 'rgba(0,0,0,0.5)',
        blur: style.glowBlur || style.shadowBlur || 10,
        offsetX: style.shadowOffsetX || 0,
        offsetY: style.shadowOffsetY || 0,
      });
    }

    const text = new fabric.Textbox(
      style.textTransform === 'uppercase' ? overlay.text.toUpperCase() :
      style.textTransform === 'lowercase' ? overlay.text.toLowerCase() :
      overlay.text,
      textOptions
    );

    canvas.add(text);
  };

  // Create gradient fill
  const createGradient = (style: TextStyle, height: number): fabric.Gradient<'linear'> | string => {
    if (!style.gradient) return style.fillColor || '#FFFFFF';

    return new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: height,
      },
      colorStops: style.gradient.stops.map(stop => ({
        offset: stop.offset,
        color: stop.color,
      })),
    });
  };

  // Update overlay position from canvas
  const updateOverlayPosition = (overlayId: string, x: number, y: number, rotation: number) => {
    if (!currentThemeId) return;

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === overlayId
            ? { ...o, position: { x, y }, style: { ...o.style, rotation } }
            : o
        ) || [],
      },
    }));
  };

  // Push to history for undo/redo
  const pushHistory = useCallback(() => {
    if (!currentThemeId) return;

    const currentHistory = historyMap[currentThemeId] || { entries: [], currentIndex: -1 };
    const newEntries = currentHistory.entries.slice(0, currentHistory.currentIndex + 1);
    newEntries.push({
      overlays: JSON.parse(JSON.stringify(currentOverlays)),
      timestamp: Date.now(),
    });

    // Keep max 50 history entries
    if (newEntries.length > 50) {
      newEntries.shift();
    }

    setHistoryMap(prev => ({
      ...prev,
      [currentThemeId]: {
        entries: newEntries,
        currentIndex: newEntries.length - 1,
      },
    }));
  }, [currentThemeId, currentOverlays, historyMap]);

  // Undo
  const undo = () => {
    if (!currentThemeId) return;
    const history = historyMap[currentThemeId];
    if (!history || history.currentIndex <= 0) return;

    const newIndex = history.currentIndex - 1;
    const previousState = history.entries[newIndex];

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: JSON.parse(JSON.stringify(previousState.overlays)),
      },
    }));

    setHistoryMap(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        currentIndex: newIndex,
      },
    }));
  };

  // Redo
  const redo = () => {
    if (!currentThemeId) return;
    const history = historyMap[currentThemeId];
    if (!history || history.currentIndex >= history.entries.length - 1) return;

    const newIndex = history.currentIndex + 1;
    const nextState = history.entries[newIndex];

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: JSON.parse(JSON.stringify(nextState.overlays)),
      },
    }));

    setHistoryMap(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        currentIndex: newIndex,
      },
    }));
  };

  const canUndo = currentThemeId && historyMap[currentThemeId]?.currentIndex > 0;
  const canRedo = currentThemeId && historyMap[currentThemeId]?.currentIndex < (historyMap[currentThemeId]?.entries.length || 0) - 1;

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
    if (!currentThemeId) return;

    pushHistory();

    const newOverlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      position: { x: 50, y: 50 },
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
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: [...(prev[currentThemeId]?.overlays || []), newOverlay],
      },
    }));

    setSelectedOverlayId(newOverlay.id);
  };

  // Delete text overlay
  const deleteOverlay = (overlayId: string) => {
    if (!currentThemeId) return;

    pushHistory();

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.filter(o => o.id !== overlayId) || [],
      },
    }));

    if (selectedOverlayId === overlayId) {
      setSelectedOverlayId(null);
    }
  };

  // Update overlay property
  const updateOverlayProperty = (overlayId: string, updates: Partial<TextOverlay>) => {
    if (!currentThemeId) return;

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === overlayId ? { ...o, ...updates } : o
        ) || [],
      },
    }));
  };

  // Update overlay style
  const updateOverlayStyle = (overlayId: string, styleUpdates: Partial<TextStyle>) => {
    if (!currentThemeId) return;

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === overlayId ? { ...o, style: { ...o.style, ...styleUpdates } } : o
        ) || [],
      },
    }));
  };

  // Apply preset to selected overlay
  const applyPreset = (presetId: string) => {
    if (!selectedOverlayId || !currentThemeId) return;

    const preset = TEXT_STYLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    pushHistory();

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === selectedOverlayId
            ? { ...o, style: { ...preset.style }, presetId }
            : o
        ) || [],
      },
    }));

    setShowPresets(false);
  };

  // Get AI text suggestions
  const getAISuggestions = async () => {
    if (!currentImage || !project) return;

    setIsLoadingAISuggestions(true);
    try {
      console.log('[Stage5] Getting AI suggestions for image:', currentThemeId);

      // Get theme description from Stage 2 concept gallery
      const selectedTheme = project.conceptGallery?.selectedThemes?.find(
        (t: any) => t.id === currentThemeId
      );
      const themeDescription = selectedTheme?.description || '';

      // Call backend API for AI suggestions
      const response = await fetch('/api/flarelab/generation/text-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: currentImage.url,
          themeId: currentThemeId,
          themeName: currentImage.themeName,
          themeDescription,
          themeCategory: currentImage.themeCategory,
          players: currentImage.players || [],
          contextBrief: {
            sportType: project.contextBrief?.sportType || 'Hockey',
            homeTeam: project.contextBrief?.homeTeam,
            awayTeam: project.contextBrief?.awayTeam,
            contextPills: project.contextBrief?.contextPills || [],
            campaignGoal: project.contextBrief?.campaignGoal || 'Social Hype',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const result = await response.json();
      const suggestions = result.data?.suggestions || [];

      if (suggestions.length === 0) {
        console.log('[Stage5] No AI suggestions returned, using fallback');
        // Fallback to default suggestion
        const suggestedPreset = TEXT_STYLE_PRESETS[0];
        const aiOverlay: TextOverlay = {
          id: `ai-${Date.now()}`,
          text: currentImage.themeName || 'GAME DAY',
          position: { x: 50, y: 85 },
          style: { ...suggestedPreset.style },
          aiGenerated: true,
          presetId: suggestedPreset.id,
        };

        pushHistory();
        if (currentThemeId) {
          setImageOverlays(prev => ({
            ...prev,
            [currentThemeId]: {
              ...prev[currentThemeId],
              overlays: [...(prev[currentThemeId]?.overlays || []), aiOverlay],
            },
          }));
          setSelectedOverlayId(aiOverlay.id);
        }
        return;
      }

      // Add AI-suggested text overlays
      pushHistory();

      const newOverlays: TextOverlay[] = suggestions.map((suggestion: any, index: number) => {
        // Find matching preset
        const preset = TEXT_STYLE_PRESETS.find(p => p.id === suggestion.presetId) || TEXT_STYLE_PRESETS[0];

        return {
          id: `ai-${Date.now()}-${index}`,
          text: suggestion.text || 'GAME DAY',
          position: suggestion.position || { x: 50, y: 85 - (index * 10) },
          style: { ...preset.style },
          aiGenerated: true,
          presetId: preset.id,
        };
      });

      if (currentThemeId) {
        // Add only the first suggestion (user can request more)
        const firstOverlay = newOverlays[0];
        setImageOverlays(prev => ({
          ...prev,
          [currentThemeId]: {
            ...prev[currentThemeId],
            overlays: [...(prev[currentThemeId]?.overlays || []), firstOverlay],
          },
        }));
        setSelectedOverlayId(firstOverlay.id);
      }

      console.log('[Stage5] AI suggestions applied:', newOverlays.length);
    } catch (error) {
      console.error('[Stage5] Failed to get AI suggestions:', error);
      // Fallback on error
      const suggestedPreset = TEXT_STYLE_PRESETS[0];
      const aiOverlay: TextOverlay = {
        id: `ai-${Date.now()}`,
        text: currentImage.themeName || 'GAME DAY',
        position: { x: 50, y: 85 },
        style: { ...suggestedPreset.style },
        aiGenerated: true,
        presetId: suggestedPreset.id,
      };

      pushHistory();
      if (currentThemeId) {
        setImageOverlays(prev => ({
          ...prev,
          [currentThemeId]: {
            ...prev[currentThemeId],
            overlays: [...(prev[currentThemeId]?.overlays || []), aiOverlay],
          },
        }));
        setSelectedOverlayId(aiOverlay.id);
      }
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  // Rasterize image with text overlays
  const rasterizeImage = async (
    image: GeneratedImage,
    overlays: TextOverlay[]
  ): Promise<string | null> => {
    if (!overlays || overlays.length === 0) {
      // No overlays, return original image
      return image.url;
    }

    try {
      // Create offscreen canvas for compositing
      const offscreenCanvas = document.createElement('canvas');
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return image.url;

      // Load the original image
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        imgElement.onload = () => resolve();
        imgElement.onerror = () => reject(new Error('Failed to load image'));
        imgElement.src = image.url;
      });

      // Set canvas to image dimensions
      offscreenCanvas.width = imgElement.naturalWidth;
      offscreenCanvas.height = imgElement.naturalHeight;

      // Draw the background image
      ctx.drawImage(imgElement, 0, 0);

      // Draw each text overlay
      for (const overlay of overlays) {
        const style = overlay.style;

        // Calculate position based on percentage
        const x = (overlay.position.x / 100) * offscreenCanvas.width;
        const y = (overlay.position.y / 100) * offscreenCanvas.height;

        // Scale font size proportionally to image size (base 1920px width)
        const scaleFactor = offscreenCanvas.width / 1920;
        const scaledFontSize = style.fontSize * scaleFactor;

        // Set text properties
        ctx.save();
        ctx.translate(x, y);

        if (style.rotation) {
          ctx.rotate((style.rotation * Math.PI) / 180);
        }

        // Font setup
        const fontWeight = style.fontWeight || 700;
        ctx.font = `${fontWeight} ${scaledFontSize}px "${style.fontFamily}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Apply text transform
        let text = overlay.text;
        if (style.textTransform === 'uppercase') text = text.toUpperCase();
        else if (style.textTransform === 'lowercase') text = text.toLowerCase();

        // Shadow/glow
        if (style.shadowColor || style.glowColor) {
          ctx.shadowColor = style.glowColor || style.shadowColor || 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = (style.glowBlur || style.shadowBlur || 10) * scaleFactor;
          ctx.shadowOffsetX = (style.shadowOffsetX || 0) * scaleFactor;
          ctx.shadowOffsetY = (style.shadowOffsetY || 0) * scaleFactor;
        }

        // Stroke
        if (style.strokeColor && style.strokeWidth) {
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = style.strokeWidth * scaleFactor;
          ctx.strokeText(text, 0, 0);
        }

        // Fill - handle gradient or solid
        if (style.fillType === 'gradient' && style.gradient) {
          const gradient = ctx.createLinearGradient(
            0, -scaledFontSize / 2,
            0, scaledFontSize / 2
          );
          style.gradient.stops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
          });
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = style.fillColor || '#FFFFFF';
        }

        ctx.fillText(text, 0, 0);
        ctx.restore();
      }

      // Export as data URL
      const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);

      // Upload to backend
      const response = await fetch('/api/flarelab/generation/upload-composited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          themeId: image.themeId,
          imageData: dataUrl,
        }),
      });

      if (!response.ok) {
        console.error('[Stage5] Failed to upload composited image');
        return image.url; // Fall back to original
      }

      const result = await response.json();
      return result.data?.url || image.url;
    } catch (error) {
      console.error('[Stage5] Rasterization failed:', error);
      return image.url; // Fall back to original
    }
  };

  // Save and continue
  const handleContinue = async () => {
    if (selectedForExport.size === 0 && selectedForAnimation.size === 0) return;

    setIsSaving(true);
    try {
      // Rasterize images that have text overlays
      const compositedImages: Array<{
        themeId: string;
        originalUrl: string;
        compositedUrl: string;
      }> = [];

      const allSelectedThemeIds = new Set([...selectedForExport, ...selectedForAnimation]);

      for (const themeId of allSelectedThemeIds) {
        const image = images.find(img => img.themeId === themeId);
        const overlays = imageOverlays[themeId]?.overlays || [];

        if (image) {
          const compositedUrl = await rasterizeImage(image, overlays);
          if (compositedUrl) {
            compositedImages.push({
              themeId,
              originalUrl: image.url,
              compositedUrl,
            });
          }
        }
      }

      console.log('[Stage5] Composited images:', compositedImages.length);

      const textStudioData = {
        imageOverlays,
        selectedForExport: Array.from(selectedForExport),
        selectedForAnimation: Array.from(selectedForAnimation),
        compositedImages,
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

  // Get selected overlay
  const selectedOverlay = currentOverlays.find(o => o.id === selectedOverlayId);

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
                  onClick={undo}
                  disabled={!canUndo}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                  title="Undo"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  onClick={redo}
                  disabled={!canRedo}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                  title="Redo"
                >
                  <Redo className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-gray-700" />
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

            {/* Canvas */}
            <div ref={setContainerRef} className="relative bg-black aspect-video">
              <canvas ref={canvasRef} className="absolute inset-0" />
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
                    onClick={() => currentThemeId && toggleExportSelection(currentThemeId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      currentThemeId && selectedForExport.has(currentThemeId)
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {currentThemeId && selectedForExport.has(currentThemeId) ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    For Export
                  </button>
                  <button
                    onClick={() => currentThemeId && toggleAnimationSelection(currentThemeId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      currentThemeId && selectedForAnimation.has(currentThemeId)
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {currentThemeId && selectedForAnimation.has(currentThemeId) ? (
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
        <div className="lg:col-span-1 space-y-4">
          {/* Text Properties */}
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Text Properties</h3>

            {selectedOverlay ? (
              <div className="space-y-4">
                {/* Text Content */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Text</label>
                  <input
                    type="text"
                    value={selectedOverlay.text}
                    onChange={(e) => updateOverlayProperty(selectedOverlay.id, { text: e.target.value })}
                    onBlur={pushHistory}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                {/* Font Family */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Font</label>
                  <select
                    value={selectedOverlay.style.fontFamily}
                    onChange={(e) => {
                      pushHistory();
                      updateOverlayStyle(selectedOverlay.id, { fontFamily: e.target.value });
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Oswald">Oswald</option>
                    <option value="Roboto Condensed">Roboto Condensed</option>
                    <option value="Anton">Anton</option>
                    <option value="Teko">Teko</option>
                    <option value="Impact">Impact</option>
                    <option value="Arial Black">Arial Black</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Font Size: {selectedOverlay.style.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="200"
                    value={selectedOverlay.style.fontSize}
                    onChange={(e) => updateOverlayStyle(selectedOverlay.id, { fontSize: parseInt(e.target.value) })}
                    onMouseUp={pushHistory}
                    className="w-full"
                  />
                </div>

                {/* Font Weight */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Weight</label>
                  <select
                    value={selectedOverlay.style.fontWeight}
                    onChange={(e) => {
                      pushHistory();
                      updateOverlayStyle(selectedOverlay.id, { fontWeight: parseInt(e.target.value) });
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="400">Regular</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi-Bold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra Bold</option>
                    <option value="900">Black</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Fill Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedOverlay.style.fillColor || '#FFFFFF'}
                      onChange={(e) => {
                        updateOverlayStyle(selectedOverlay.id, { fillType: 'solid', fillColor: e.target.value });
                      }}
                      onBlur={pushHistory}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-gray-700"
                    />
                    <input
                      type="text"
                      value={selectedOverlay.style.fillColor || '#FFFFFF'}
                      onChange={(e) => updateOverlayStyle(selectedOverlay.id, { fillType: 'solid', fillColor: e.target.value })}
                      onBlur={pushHistory}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Stroke */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Stroke: {selectedOverlay.style.strokeWidth || 0}px
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedOverlay.style.strokeColor || '#000000'}
                      onChange={(e) => updateOverlayStyle(selectedOverlay.id, { strokeColor: e.target.value })}
                      onBlur={pushHistory}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-gray-700"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={selectedOverlay.style.strokeWidth || 0}
                      onChange={(e) => updateOverlayStyle(selectedOverlay.id, { strokeWidth: parseInt(e.target.value) })}
                      onMouseUp={pushHistory}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setShowPresets(!showPresets)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    <Palette className="w-4 h-4 mr-1" />
                    Presets
                  </Button>
                  <Button
                    onClick={() => deleteOverlay(selectedOverlay.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Type className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Select a text layer to edit
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

          {/* Style Presets */}
          {showPresets && selectedOverlay && (
            <div className="bg-[#151515] border border-gray-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">Style Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {TEXT_STYLE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedOverlay.presetId === preset.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Layers List */}
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Layers ({currentOverlays.length})</h3>
            {currentOverlays.length > 0 ? (
              <div className="space-y-2">
                {currentOverlays.map(overlay => (
                  <button
                    key={overlay.id}
                    onClick={() => setSelectedOverlayId(overlay.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      selectedOverlayId === overlay.id
                        ? 'bg-orange-500/20 border border-orange-500'
                        : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
                    }`}
                  >
                    <Type className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white truncate flex-1 text-left">
                      {overlay.text}
                    </span>
                    {overlay.aiGenerated && (
                      <Sparkles className="w-3 h-3 text-orange-400" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No text layers yet
              </p>
            )}
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
