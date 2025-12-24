import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowRight, Type, Sparkles, Edit2, Plus, Trash2, Undo, Redo, Square, CheckSquare, ChevronLeft, ChevronRight, Palette, Copy, RefreshCw, ChevronDown, Layers, PenTool, Droplet, Sun } from 'lucide-react';
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
import { CSS_TEXT_PRESETS, renderTextAsImage, mapToCSSSPreset, getPresetPreviewStyles } from './htmlTextRenderer';

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
  const [useHTMLRendering, setUseHTMLRendering] = useState(true); // Use HTML/CSS rendering by default
  const [isRenderingText, setIsRenderingText] = useState(false);

  // Cache for rendered text images (to avoid re-rendering on every change)
  const renderedTextCache = useRef<Map<string, string>>(new Map());

  // Flag to prevent selection clear during canvas reload
  const isReloadingCanvas = useRef(false);

  // Debounce timer for canvas updates
  const canvasUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Track which overlay changed to do targeted updates
  const pendingOverlayUpdate = useRef<string | null>(null);

  // Accordion state for properties sections - only style expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['style']));

  // Refs for font size controls (avoid React re-renders during interaction)
  const fontSizeInputRef = useRef<HTMLInputElement>(null);
  const fontSizeSliderRef = useRef<HTMLInputElement>(null);
  const lastSelectedOverlayId = useRef<string | null>(null);
  const baseFontSizeRef = useRef<number>(72);
  const baseScaleRef = useRef<number>(1);

  // Toggle accordion section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

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

  // Sync font size inputs when selected overlay changes
  useEffect(() => {
    if (selectedOverlayId !== lastSelectedOverlayId.current) {
      lastSelectedOverlayId.current = selectedOverlayId;
      const overlay = currentOverlays.find(o => o.id === selectedOverlayId);
      if (overlay) {
        const fontSize = overlay.style.fontSize;
        baseFontSizeRef.current = fontSize;
        // Update input values directly via refs (no React state)
        if (fontSizeInputRef.current) {
          fontSizeInputRef.current.value = String(fontSize);
        }
        if (fontSizeSliderRef.current) {
          fontSizeSliderRef.current.value = String(Math.min(200, Math.max(24, fontSize)));
        }
      }
    }
  }, [selectedOverlayId, currentOverlays]);

  // Direct canvas update without React state (for real-time preview during slider drag)
  const updateCanvasTextSize = useCallback((fontSize: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedOverlayId) return;

    const obj = canvas.getObjects().find(o => o.data?.overlayId === selectedOverlayId);
    if (obj) {
      // For HTML-rendered text (images), we scale relative to base size
      if (obj.data?.isHTMLRendered) {
        const baseSize = baseFontSizeRef.current;
        const scaleFactor = fontSize / baseSize;
        obj.set({ scaleX: baseScaleRef.current * scaleFactor, scaleY: baseScaleRef.current * scaleFactor });
      } else if (obj instanceof fabric.Textbox) {
        obj.set({ fontSize });
      }
      canvas.renderAll();
    }
  }, [selectedOverlayId]);

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
      // Don't clear selection if we're in the middle of a canvas reload
      if (!isReloadingCanvas.current) {
        setSelectedOverlayId(null);
      }
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

  // Sync canvas selection when layer is selected from panel
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (selectedOverlayId) {
      // Find the canvas object with matching overlayId
      const objects = canvas.getObjects();
      const targetObj = objects.find(obj => obj.data?.overlayId === selectedOverlayId);

      if (targetObj) {
        // Only select if not already selected
        const activeObj = canvas.getActiveObject();
        if (activeObj !== targetObj) {
          canvas.setActiveObject(targetObj);
          canvas.renderAll();
        }
      }
    } else {
      // Deselect if no overlay selected
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, [selectedOverlayId]);

  // Load image and overlays onto canvas (debounced)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentImage?.url || !containerElement) return;

    // Clear any pending update timer
    if (canvasUpdateTimer.current) {
      clearTimeout(canvasUpdateTimer.current);
    }

    // Debounce canvas updates to prevent flicker
    canvasUpdateTimer.current = setTimeout(() => {
      loadCanvasContent();
    }, 150); // Increased delay to batch rapid updates and reduce flicker

    return () => {
      if (canvasUpdateTimer.current) {
        clearTimeout(canvasUpdateTimer.current);
      }
    };
  }, [currentImage?.url, currentOverlays, currentImageIndex, containerElement]);

  // Track last loaded image URL to avoid reloading background
  const lastLoadedImageUrl = useRef<string | null>(null);

  // Actual canvas loading logic (separated for debouncing)
  const loadCanvasContent = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !currentImage?.url || !containerElement) return;

    // Set flag to prevent selection clearing during reload
    isReloadingCanvas.current = true;

    // Get container dimensions
    const containerWidth = containerElement.clientWidth || containerElement.offsetWidth || 800;
    const containerHeight = containerElement.clientHeight || containerElement.offsetHeight || 450;
    const canvasWidth = containerWidth;
    const canvasHeight = containerHeight > 0 ? containerHeight : containerWidth * (9/16);

    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);

    // Check if we need to reload the background image or just update text overlays
    const needsBackgroundReload = lastLoadedImageUrl.current !== currentImage.url;

    // Only remove text objects, keep background if same image
    if (!needsBackgroundReload && canvas.backgroundImage) {
      // Remove only text objects (not background)
      const objects = canvas.getObjects();
      objects.forEach(obj => canvas.remove(obj));
    } else {
      // Full clear needed for new image
      canvas.clear();
    }

    try {
        // Only load background image if needed
        if (needsBackgroundReload) {
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
          lastLoadedImageUrl.current = currentImage.url;
        }

        // Add text overlays (async - need to await all)
        for (const overlay of currentOverlays) {
          await addTextToCanvas(overlay, canvas, canvasWidth, canvasHeight);
        }
        canvas.renderAll();

        // Re-select the previously selected object after reload
        if (selectedOverlayId) {
          const objects = canvas.getObjects();
          const targetObj = objects.find(obj => obj.data?.overlayId === selectedOverlayId);
          if (targetObj) {
            canvas.setActiveObject(targetObj);
            canvas.renderAll();
          }
        }

        // Reset reload flag
        isReloadingCanvas.current = false;
      } catch (error) {
        console.error('[Stage5] Failed to load image:', error);
        // Try alternative approach without CORS (only if background needed)
        if (needsBackgroundReload) {
          try {
            const img = await fabric.FabricImage.fromURL(currentImage.url);
            if (!img || !canvas) {
              isReloadingCanvas.current = false;
              return;
            }

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
            lastLoadedImageUrl.current = currentImage.url;

            // Add text overlays
            for (const overlay of currentOverlays) {
              await addTextToCanvas(overlay, canvas, canvasWidth, canvasHeight);
            }
            canvas.renderAll();

            // Re-select
            if (selectedOverlayId) {
              const objects = canvas.getObjects();
              const targetObj = objects.find(obj => obj.data?.overlayId === selectedOverlayId);
              if (targetObj) {
                canvas.setActiveObject(targetObj);
                canvas.renderAll();
              }
            }

            isReloadingCanvas.current = false;
          } catch (fallbackError) {
            console.error('[Stage5] Fallback image load also failed:', fallbackError);
            isReloadingCanvas.current = false;
          }
        } else {
          isReloadingCanvas.current = false;
        }
      }
  }, [currentImage?.url, currentOverlays, selectedOverlayId, containerElement, useHTMLRendering]);

  // Add a text object to the canvas (using HTML/CSS rendering for broadcast quality)
  const addTextToCanvas = async (overlay: TextOverlay, canvas: fabric.Canvas, canvasWidth: number, canvasHeight: number) => {
    const style = overlay.style;

    // Check if we should use HTML rendering (for CSS presets with broadcast-quality effects)
    const cssPresetId = overlay.cssPresetId || (overlay.presetId ? mapToCSSSPreset(overlay.presetId) : null);

    console.log('[Stage5] addTextToCanvas:', { text: overlay.text, cssPresetId, useHTMLRendering, canvasWidth, canvasHeight });

    if (useHTMLRendering && cssPresetId) {
      // Use HTML/CSS rendering for broadcast-quality text
      try {
        // Scale font size for display canvas (base: 1920px width)
        const displayScaleFactor = canvasWidth / 1920;
        const displayFontSize = Math.round((style.fontSize || 96) * displayScaleFactor);

        // Generate cache key with display size and font family
        const fontFamily = style.fontFamily || 'Bebas Neue';
        const cacheKey = `${overlay.text}-${cssPresetId}-${displayFontSize}-${fontFamily}`;

        // Check cache first
        let dataUrl = renderedTextCache.current.get(cacheKey);

        if (!dataUrl) {
          // Render text as image using HTML/CSS at display size
          const textToRender = style.textTransform === 'uppercase' ? overlay.text.toUpperCase() :
                               style.textTransform === 'lowercase' ? overlay.text.toLowerCase() :
                               overlay.text;

          console.log('[Stage5] Rendering text as image:', { textToRender, cssPresetId, displayFontSize, fontFamily, originalFontSize: style.fontSize });
          // Pass custom font family to renderer
          dataUrl = await renderTextAsImage(textToRender, cssPresetId, displayFontSize, canvasWidth, fontFamily);
          console.log('[Stage5] Rendered data URL length:', dataUrl?.length);
          renderedTextCache.current.set(cacheKey, dataUrl);
        }

        // Create fabric image from the rendered text
        const img = await fabric.FabricImage.fromURL(dataUrl);
        console.log('[Stage5] Created fabric image:', { width: img.width, height: img.height });

        // Position the image
        img.set({
          left: (overlay.position.x / 100) * canvasWidth,
          top: (overlay.position.y / 100) * canvasHeight,
          originX: 'center',
          originY: 'center',
          angle: style.rotation || 0,
          data: { overlayId: overlay.id, isHTMLRendered: true },
        });

        canvas.add(img);
        console.log('[Stage5] Added HTML-rendered text to canvas');
        return;
      } catch (error) {
        console.error('[Stage5] HTML rendering failed, falling back to Fabric.js:', error);
        // Fall through to Fabric.js rendering
      }
    }

    // Fallback: Create text object using Fabric.js (basic styling)
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

    // Default to broadcast-pro CSS preset for new text
    const defaultCSSPreset = CSS_TEXT_PRESETS.find(p => p.id === 'broadcast-pro') || CSS_TEXT_PRESETS[0];

    const newOverlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      position: { x: 50, y: 50 },
      style: {
        fontFamily: defaultCSSPreset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
        fontSize: 72,
        fontWeight: defaultCSSPreset.css.fontWeight,
        fillType: 'solid',
        fillColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        textTransform: 'uppercase',
        letterSpacing: 2,
      },
      aiGenerated: false,
      cssPresetId: defaultCSSPreset.id, // Use CSS preset for broadcast quality
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

    // Clear cache if text content changes (affects rendered image)
    if (updates.text) {
      renderedTextCache.current.clear();
    }

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

    // Clear cache if fontSize changes (affects rendered image)
    if (styleUpdates.fontSize) {
      renderedTextCache.current.clear();
    }

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

  // Apply basic preset to selected overlay (legacy)
  const applyPreset = (presetId: string) => {
    if (!selectedOverlayId || !currentThemeId) return;

    const preset = TEXT_STYLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    pushHistory();

    // Clear rendered text cache for this overlay
    renderedTextCache.current.clear();

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === selectedOverlayId
            ? { ...o, style: { ...preset.style }, presetId, cssPresetId: undefined }
            : o
        ) || [],
      },
    }));

    setShowPresets(false);
  };

  // Apply CSS preset for broadcast-quality text rendering
  const applyCSSPreset = (cssPresetId: string) => {
    if (!selectedOverlayId || !currentThemeId) return;

    const cssPreset = CSS_TEXT_PRESETS.find(p => p.id === cssPresetId);
    if (!cssPreset) return;

    pushHistory();

    // Clear rendered text cache to force re-render with new preset
    renderedTextCache.current.clear();

    setImageOverlays(prev => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        overlays: prev[currentThemeId]?.overlays.map(o =>
          o.id === selectedOverlayId
            ? {
                ...o,
                cssPresetId,
                presetId: undefined, // Clear basic preset
                style: {
                  ...o.style,
                  fontFamily: cssPreset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
                  fontWeight: cssPreset.css.fontWeight,
                },
              }
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
        // Fallback to default suggestion - use CSS preset for broadcast quality
        const fallbackCSSPreset = CSS_TEXT_PRESETS.find(p => p.id === 'frozen-knightfall') || CSS_TEXT_PRESETS[0];
        const aiOverlay: TextOverlay = {
          id: `ai-${Date.now()}`,
          text: currentImage.themeName || 'GAME DAY',
          position: { x: 50, y: 20 },
          style: {
            fontFamily: fallbackCSSPreset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
            fontSize: 96,
            fontWeight: fallbackCSSPreset.css.fontWeight,
            fillType: 'solid',
            fillColor: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 2,
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
          aiGenerated: true,
          cssPresetId: fallbackCSSPreset.id, // Use CSS preset for broadcast quality
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

      // Log image analysis from AI
      const imageAnalysis = result.data?.imageAnalysis;
      if (imageAnalysis) {
        console.log('[Stage5] AI Image Analysis:', imageAnalysis);
      }

      // Add ALL AI-suggested text overlays
      pushHistory();

      const newOverlays: TextOverlay[] = suggestions.map((suggestion: any, index: number) => {
        // Map AI-suggested preset to CSS preset for broadcast quality
        const cssPresetId = mapToCSSSPreset(suggestion.presetId || 'broadcast-clean');
        const cssPreset = CSS_TEXT_PRESETS.find(p => p.id === cssPresetId) || CSS_TEXT_PRESETS[0];

        // Use AI-suggested fontSize or fall back to appropriate size based on role
        const fontSize = suggestion.fontSize || (index === 0 ? 96 : index === 1 ? 64 : 48);

        return {
          id: `ai-${Date.now()}-${index}`,
          text: suggestion.text || 'GAME DAY',
          position: suggestion.position || { x: 50, y: 20 + (index * 15) },
          style: {
            fontFamily: cssPreset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
            fontSize,
            fontWeight: cssPreset.css.fontWeight,
            fillType: 'solid',
            fillColor: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 2,
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
          aiGenerated: true,
          cssPresetId, // Use CSS preset for broadcast quality
        };
      });

      if (currentThemeId && newOverlays.length > 0) {
        // Add ALL suggestions to give user a complete starting point
        setImageOverlays(prev => ({
          ...prev,
          [currentThemeId]: {
            ...prev[currentThemeId],
            overlays: [...(prev[currentThemeId]?.overlays || []), ...newOverlays],
          },
        }));
        // Select the headline (first suggestion)
        setSelectedOverlayId(newOverlays[0].id);
      }

      console.log('[Stage5] AI suggestions applied:', newOverlays.length);
      console.log('[Stage5] Suggestions:', newOverlays.map(o => ({ text: o.text, cssPreset: o.cssPresetId, fontSize: o.style.fontSize })));
    } catch (error) {
      console.error('[Stage5] Failed to get AI suggestions:', error);
      // Fallback on error - create context-aware defaults using CSS presets
      const themeKeywords = (currentImage.themeName || '').toLowerCase();
      const fallbackCSSPresetId = themeKeywords.includes('ice') || themeKeywords.includes('cold') ? 'ice-storm' :
                                  themeKeywords.includes('fire') || themeKeywords.includes('heat') ? 'fire-rivalry' :
                                  themeKeywords.includes('rival') ? 'fire-rivalry' : 'frozen-knightfall';

      const fallbackCSSPreset = CSS_TEXT_PRESETS.find(p => p.id === fallbackCSSPresetId) || CSS_TEXT_PRESETS[0];

      const aiOverlay: TextOverlay = {
        id: `ai-${Date.now()}`,
        text: currentImage.themeName?.toUpperCase() || 'GAME DAY',
        position: { x: 50, y: 20 },
        style: {
          fontFamily: fallbackCSSPreset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim(),
          fontSize: 96,
          fontWeight: fallbackCSSPreset.css.fontWeight,
          fillType: 'solid',
          fillColor: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 2,
          textTransform: 'uppercase',
          letterSpacing: 2,
        },
        aiGenerated: true,
        cssPresetId: fallbackCSSPresetId, // Use CSS preset for broadcast quality
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

      // Scale factor for font size (base 1920px width)
      const scaleFactor = offscreenCanvas.width / 1920;

      // Draw each text overlay
      for (const overlay of overlays) {
        const style = overlay.style;

        // Calculate position based on percentage
        const x = (overlay.position.x / 100) * offscreenCanvas.width;
        const y = (overlay.position.y / 100) * offscreenCanvas.height;

        // Scale font size proportionally to image size
        const scaledFontSize = style.fontSize * scaleFactor;

        // Apply text transform
        let text = overlay.text;
        if (style.textTransform === 'uppercase') text = text.toUpperCase();
        else if (style.textTransform === 'lowercase') text = text.toLowerCase();

        // Check if overlay uses CSS preset (broadcast-quality rendering)
        const cssPresetId = overlay.cssPresetId || (overlay.presetId ? mapToCSSSPreset(overlay.presetId) : null);

        if (useHTMLRendering && cssPresetId) {
          // Use HTML/CSS rendering for broadcast-quality text
          try {
            const fontFamily = style.fontFamily || 'Bebas Neue';
            const textDataUrl = await renderTextAsImage(text, cssPresetId, scaledFontSize, offscreenCanvas.width, fontFamily);

            // Load the rendered text image
            const textImg = new Image();
            await new Promise<void>((resolve, reject) => {
              textImg.onload = () => resolve();
              textImg.onerror = () => reject(new Error('Failed to load text image'));
              textImg.src = textDataUrl;
            });

            // Draw the text image centered at the position
            ctx.save();
            ctx.translate(x, y);

            if (style.rotation) {
              ctx.rotate((style.rotation * Math.PI) / 180);
            }

            // Draw centered
            ctx.drawImage(
              textImg,
              -textImg.width / 2,
              -textImg.height / 2
            );
            ctx.restore();
            continue; // Skip to next overlay
          } catch (error) {
            console.error('[Stage5] HTML rasterization failed for overlay, using fallback:', error);
            // Fall through to basic canvas rendering
          }
        }

        // Fallback: Basic canvas text rendering
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

  // Accordion Section Component
  const AccordionSection = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="border-b border-gray-800/30 last:border-b-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${isExpanded ? 'text-orange-400' : 'text-gray-500'}`} />
            <span className={`text-xs font-medium ${isExpanded ? 'text-gray-200' : 'text-gray-400'}`}>{title}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col px-6 py-4 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center ring-1 ring-orange-500/20">
            <Type className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Text Studio</h2>
            <p className="text-xs text-gray-500">Add broadcast-quality text overlays</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {/* TODO: Open prompt editor */}}
            variant="outline"
            size="sm"
            className="h-9 px-4 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Prompts
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isSaving || (selectedForExport.size === 0 && selectedForAnimation.size === 0)}
            className="h-9 px-5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
            {!isSaving && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Main Editor - Fills remaining viewport height */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Canvas Container */}
          <div className="flex-1 min-h-0 bg-[#0c0c0c] border border-gray-800/50 rounded-xl overflow-hidden flex flex-col">
            {/* Canvas Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/50 bg-[#0a0a0a] flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Navigation */}
                <div className="flex items-center bg-gray-800/50 rounded-lg p-0.5">
                  <Button onClick={goToPreviousImage} disabled={currentImageIndex === 0} variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white rounded-md disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400 tabular-nums px-3 min-w-[60px] text-center">
                    <span className="text-white font-medium">{currentImageIndex + 1}</span> / {images.length}
                  </span>
                  <Button onClick={goToNextImage} disabled={currentImageIndex === images.length - 1} variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white rounded-md disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <Button onClick={undo} disabled={!canUndo} variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white disabled:opacity-30">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button onClick={redo} disabled={!canRedo} variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white disabled:opacity-30">
                  <Redo className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={addTextOverlay} variant="outline" size="sm" className="h-8 border-gray-700 text-gray-300 hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Text
                </Button>
                <Button onClick={getAISuggestions} disabled={isLoadingAISuggestions} size="sm" className="h-8 bg-orange-500 hover:bg-orange-600 text-white">
                  <Sparkles className={`w-4 h-4 mr-1.5 ${isLoadingAISuggestions ? 'animate-spin' : ''}`} />
                  AI Suggest
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div ref={setContainerRef} className="relative bg-black flex-1 min-h-0">
              <canvas ref={canvasRef} className="absolute inset-0" />
            </div>

            {/* Canvas Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-800/50 bg-[#0a0a0a] flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-white">{currentImage?.themeName}</h3>
                <span className="text-xs text-gray-500">{currentOverlays.length} layer{currentOverlays.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentThemeId && toggleExportSelection(currentThemeId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentThemeId && selectedForExport.has(currentThemeId)
                      ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {currentThemeId && selectedForExport.has(currentThemeId) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Export
                </button>
                <button
                  onClick={() => currentThemeId && toggleAnimationSelection(currentThemeId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentThemeId && selectedForAnimation.has(currentThemeId)
                      ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {currentThemeId && selectedForAnimation.has(currentThemeId) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Animate
                </button>
              </div>
            </div>
          </div>

          {/* Thumbnail Strip - Below canvas */}
          <div className="flex-shrink-0 bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a] border border-gray-800/50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex gap-2.5 overflow-x-auto flex-1 py-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                {images.map((img, index) => {
                  const isSelected = index === currentImageIndex;
                  const hasExport = img.themeId && selectedForExport.has(img.themeId);
                  const hasAnimate = img.themeId && selectedForAnimation.has(img.themeId);
                  const layerCount = img.themeId ? (imageOverlays[img.themeId]?.overlays?.length || 0) : 0;

                  return (
                    <button
                      key={img.themeId || index}
                      onClick={() => { setCurrentImageIndex(index); setSelectedOverlayId(null); }}
                      className={`group relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? 'w-[96px] h-[60px] ring-2 ring-orange-500 shadow-xl shadow-orange-500/25 scale-105'
                          : 'w-[80px] h-[52px] opacity-50 hover:opacity-90 hover:scale-[1.03] ring-1 ring-gray-700/50'
                      }`}
                    >
                      <img src={img.url} alt={img.themeName} className="w-full h-full object-cover" />
                      {/* Gradient overlay */}
                      <div className={`absolute inset-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-t from-black/30 via-transparent to-transparent'
                          : 'bg-gradient-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/30 group-hover:via-transparent'
                      }`} />
                      {/* Inner glow for selected */}
                      {isSelected && <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg" />}
                      {/* Status indicators */}
                      <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                        {hasExport && <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-md shadow-orange-500/50 ring-1 ring-orange-400/30" />}
                        {hasAnimate && <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md shadow-amber-400/50 ring-1 ring-amber-300/30" />}
                      </div>
                      {/* Layer count badge */}
                      {layerCount > 0 && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          <Type className="w-2 h-2 text-orange-400" />
                          {layerCount}
                        </div>
                      )}
                      {/* Index number */}
                      {!isSelected && (
                        <div className="absolute bottom-1 right-1 text-[9px] font-semibold text-white/40 group-hover:text-white/70 transition-all">
                          {index + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Selection summary - pill style */}
              <div className="flex items-center gap-2 pl-4 border-l border-gray-700/50 flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                  selectedForExport.size > 0 ? 'bg-orange-500/15 ring-1 ring-orange-500/30' : 'bg-gray-800/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${selectedForExport.size > 0 ? 'bg-orange-500' : 'bg-gray-600'}`} />
                  <span className={`font-semibold tabular-nums ${selectedForExport.size > 0 ? 'text-orange-400' : 'text-gray-600'}`}>{selectedForExport.size}</span>
                  <span className="text-gray-500">export</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                  selectedForAnimation.size > 0 ? 'bg-amber-500/15 ring-1 ring-amber-500/30' : 'bg-gray-800/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${selectedForAnimation.size > 0 ? 'bg-amber-400' : 'bg-gray-600'}`} />
                  <span className={`font-semibold tabular-nums ${selectedForAnimation.size > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{selectedForAnimation.size}</span>
                  <span className="text-gray-500">animate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Properties Panel - Photoshop-style scrollable panel */}
        <div className="w-[340px] flex-shrink-0 bg-[#0c0c0c] border border-gray-800/50 rounded-xl flex flex-col overflow-hidden">
          {/* Layers Section - Fixed at top */}
          <div className="flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-800/50 bg-[#0a0a0a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-300">Layers</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">{currentOverlays.length}</span>
              </div>
            </div>

            {/* Layers List - Scrollable within fixed height */}
            <div className="max-h-[200px] overflow-y-auto border-b border-gray-800/50" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
              {currentOverlays.length > 0 ? (
                <div className="p-2 space-y-1.5">
                  {currentOverlays.map((overlay, index) => {
                    const isSelected = selectedOverlayId === overlay.id;
                    const styleName = CSS_TEXT_PRESETS.find(p => p.id === overlay.cssPresetId)?.name;
                    return (
                      <div
                        key={overlay.id}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 ring-1 ring-orange-500/40'
                            : 'hover:bg-white/[0.04] hover:ring-1 hover:ring-gray-700/50'
                        }`}
                        onClick={() => setSelectedOverlayId(overlay.id)}
                      >
                        {/* Layer icon with number */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-orange-500/25' : 'bg-gray-800/50 group-hover:bg-gray-700/50'
                        }`}>
                          <Type className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-gray-500'}`} />
                        </div>
                        {/* Text and style info */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate font-medium ${isSelected ? 'text-orange-300' : 'text-gray-300'}`}>
                            {overlay.text}
                          </div>
                          {styleName && (
                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                              {styleName} • {overlay.style.fontSize}px
                            </div>
                          )}
                        </div>
                        {/* AI badge */}
                        {overlay.aiGenerated && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/15 flex-shrink-0">
                            <Sparkles className="w-3 h-3 text-orange-500/70" />
                          </div>
                        )}
                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteOverlay(overlay.id); }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center mx-auto mb-3 ring-1 ring-gray-700/30">
                    <Type className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">No text layers</p>
                  <p className="text-xs text-gray-600 mb-4">Add text or use AI suggestions</p>
                  <button
                    onClick={addTextOverlay}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 ring-1 ring-orange-500/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text Layer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Properties Section - Scrollable, fills remaining height */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {selectedOverlay ? (
              <div>
                {/* Text Content */}
                <div className="p-4 border-b border-gray-800/30">
                  <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wide">Text Content</label>
                  <input
                    type="text"
                    value={selectedOverlay.text}
                    onChange={(e) => updateOverlayProperty(selectedOverlay.id, { text: e.target.value })}
                    onBlur={pushHistory}
                    placeholder="Enter text..."
                    className="w-full bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>

                {/* Style Preset */}
                <AccordionSection id="style" title="Style Preset" icon={Palette}>
                  <div className="grid grid-cols-3 gap-2.5">
                    {CSS_TEXT_PRESETS.map(preset => {
                      const isActive = selectedOverlay.cssPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyCSSPreset(preset.id)}
                          className={`group relative p-2.5 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-b from-orange-500/25 to-orange-600/15 ring-2 ring-orange-500/60 shadow-lg shadow-orange-500/10'
                              : 'bg-[#0a0a0a] hover:bg-[#111111] ring-1 ring-gray-700/50 hover:ring-gray-600/50'
                          }`}
                        >
                          {/* Preview - larger */}
                          <div
                            className="h-10 flex items-center justify-center rounded-lg bg-gradient-to-b from-black/40 to-black/60 overflow-hidden mb-2"
                            style={getPresetPreviewStyles(preset.id, 14)}
                          >
                            Aa
                          </div>
                          {/* Name */}
                          <div className={`text-[10px] font-medium truncate text-center ${isActive ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                            {preset.name}
                          </div>
                          {/* Active checkmark */}
                          {isActive && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
                              <CheckSquare className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </AccordionSection>

                {/* Typography */}
                <AccordionSection id="typography" title="Typography" icon={Type}>
                  <div className="space-y-5">
                    {/* Font Family */}
                    <div>
                      <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Font Family</div>
                      <div className="grid grid-cols-2 gap-2">
                        {['Bebas Neue', 'Oswald', 'Anton', 'Teko'].map(font => {
                          const isActive = selectedOverlay.style.fontFamily === font;
                          return (
                            <button
                              key={font}
                              onClick={() => { pushHistory(); renderedTextCache.current.clear(); updateOverlayStyle(selectedOverlay.id, { fontFamily: font }); }}
                              className={`relative px-3 py-3 rounded-xl text-base font-bold transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-b from-orange-500/25 to-orange-600/15 text-orange-400 ring-2 ring-orange-500/50'
                                  : 'bg-[#0a0a0a] text-gray-400 hover:bg-[#111111] hover:text-gray-300 ring-1 ring-gray-700/50'
                              }`}
                              style={{ fontFamily: font }}
                            >
                              {font.split(' ')[0]}
                              {isActive && (
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font Size - Using uncontrolled inputs to avoid React re-renders */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Size</span>
                        <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg ring-1 ring-gray-700/50 overflow-hidden">
                          <input
                            ref={fontSizeInputRef}
                            type="number"
                            min="12"
                            max="300"
                            defaultValue={selectedOverlay.style.fontSize}
                            onFocus={(e) => e.target.select()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 72;
                              const clamped = Math.min(300, Math.max(12, val));
                              e.target.value = String(clamped);
                              // Sync slider
                              if (fontSizeSliderRef.current) {
                                fontSizeSliderRef.current.value = String(Math.min(200, Math.max(24, clamped)));
                              }
                              // Commit to parent state
                              if (clamped !== selectedOverlay.style.fontSize) {
                                renderedTextCache.current.clear();
                                updateOverlayStyle(selectedOverlay.id, { fontSize: clamped });
                                pushHistory();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-14 bg-transparent text-sm font-semibold text-orange-400 tabular-nums text-center py-1.5 focus:outline-none focus:bg-orange-500/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-gray-500 pr-2.5">px</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          ref={fontSizeSliderRef}
                          type="range"
                          min="24"
                          max="200"
                          step="1"
                          defaultValue={Math.min(200, Math.max(24, selectedOverlay.style.fontSize))}
                          onMouseDown={() => {
                            // Capture base size and scale at start of drag
                            baseFontSizeRef.current = selectedOverlay.style.fontSize;
                            const canvas = fabricCanvasRef.current;
                            if (canvas && selectedOverlayId) {
                              const obj = canvas.getObjects().find(o => o.data?.overlayId === selectedOverlayId);
                              if (obj) {
                                baseScaleRef.current = obj.scaleX || 1;
                              }
                            }
                          }}
                          onInput={(e) => {
                            // Update during drag - no React state, direct DOM + canvas
                            const newSize = parseInt((e.target as HTMLInputElement).value);
                            // Sync number input
                            if (fontSizeInputRef.current) {
                              fontSizeInputRef.current.value = String(newSize);
                            }
                            // Direct canvas update
                            updateCanvasTextSize(newSize);
                          }}
                          onMouseUp={(e) => {
                            const newSize = parseInt((e.target as HTMLInputElement).value);
                            // Commit to parent state
                            if (newSize !== selectedOverlay.style.fontSize) {
                              renderedTextCache.current.clear();
                              updateOverlayStyle(selectedOverlay.id, { fontSize: newSize });
                              pushHistory();
                            }
                          }}
                          onTouchStart={() => {
                            baseFontSizeRef.current = selectedOverlay.style.fontSize;
                            const canvas = fabricCanvasRef.current;
                            if (canvas && selectedOverlayId) {
                              const obj = canvas.getObjects().find(o => o.data?.overlayId === selectedOverlayId);
                              if (obj) {
                                baseScaleRef.current = obj.scaleX || 1;
                              }
                            }
                          }}
                          onTouchEnd={(e) => {
                            const newSize = parseInt((e.target as HTMLInputElement).value);
                            if (newSize !== selectedOverlay.style.fontSize) {
                              renderedTextCache.current.clear();
                              updateOverlayStyle(selectedOverlay.id, { fontSize: newSize });
                              pushHistory();
                            }
                          }}
                          className="w-full h-2 bg-[#0a0a0a] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-orange-400 [&::-webkit-slider-thumb]:to-orange-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/30 [&::-webkit-slider-runnable-track]:rounded-full"
                        />
                        {/* Scale markers */}
                        <div className="flex justify-between mt-2 px-0.5 text-[9px] text-gray-600">
                          <span>24</span>
                          <span>72</span>
                          <span>120</span>
                          <span>200</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionSection>

                {/* Colors */}
                <AccordionSection id="colors" title="Colors" icon={Droplet}>
                  <div className="bg-gray-800/30 rounded-lg p-3 text-xs text-gray-500">
                    Colors are controlled by the style preset. Custom color controls coming soon.
                  </div>
                </AccordionSection>

                {/* Effects */}
                <AccordionSection id="effects" title="Effects" icon={Sun}>
                  <div className="bg-gray-800/30 rounded-lg p-3 text-xs text-gray-500">
                    Shadow, glow, and stroke effects are part of the style preset.
                  </div>
                </AccordionSection>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                <Type className="w-12 h-12 text-gray-700 mb-3" />
                <h4 className="text-sm font-medium text-gray-400 mb-1">No Layer Selected</h4>
                <p className="text-xs text-gray-500 text-center mb-4">Select a layer to edit its properties</p>
                <button
                  onClick={addTextOverlay}
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                >
                  + Add Text Layer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
