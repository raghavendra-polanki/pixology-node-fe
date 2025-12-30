/**
 * Text Style Editor
 * Full-featured editor for creating and modifying text styles with live preview
 */

import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Sparkles, Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import TextStylesService from '@/shared/services/textStylesService';
import type {
  LibraryTextStyle,
  TextStyleCategory,
  GradientDefinition,
  ShadowDefinition,
  StrokeDefinition,
  GlowDefinition,
} from '../../types/project.types';

const textStylesService = new TextStylesService();

// Available fonts
const AVAILABLE_FONTS = [
  'Bebas Neue',
  'Oswald',
  'Anton',
  'Roboto Condensed',
  'Montserrat',
  'Impact',
  'Arial Black',
  'Poppins',
  'Raleway',
  'Teko',
];

// Font weights
const FONT_WEIGHTS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

interface TextStyleEditorProps {
  style?: LibraryTextStyle;
  onSave: (style: LibraryTextStyle) => void;
  onCancel: () => void;
}

export const TextStyleEditor = ({ style, onSave, onCancel }: TextStyleEditorProps) => {
  const isEditing = !!style;

  // Form state
  const [name, setName] = useState(style?.name || '');
  const [category, setCategory] = useState<TextStyleCategory>(style?.category || 'custom');
  const [fontFamily, setFontFamily] = useState(style?.fontFamily || 'Bebas Neue');
  const [fontWeight, setFontWeight] = useState(style?.fontWeight || 700);
  const [fontSize, setFontSize] = useState(style?.fontSize || 72);
  const [letterSpacing, setLetterSpacing] = useState(style?.letterSpacing || 0);
  const [textTransform, setTextTransform] = useState(style?.textTransform || 'uppercase');

  // Fill state
  const [fillType, setFillType] = useState<'solid' | 'gradient'>(style?.fill.type || 'solid');
  const [fillColor, setFillColor] = useState(style?.fill.color || '#FFFFFF');
  const [gradient, setGradient] = useState<GradientDefinition>(
    style?.fill.gradient || {
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#888888', position: 100 },
      ],
    }
  );

  // Stroke state
  const [strokeEnabled, setStrokeEnabled] = useState(!!style?.stroke);
  const [stroke, setStroke] = useState<StrokeDefinition>(
    style?.stroke || { color: '#000000', width: 2, position: 'outside' }
  );

  // Shadow state
  const [shadows, setShadows] = useState<ShadowDefinition[]>(style?.shadows || []);

  // Glow state
  const [glowEnabled, setGlowEnabled] = useState(style?.glow?.enabled || false);
  const [glow, setGlow] = useState<GlowDefinition>(
    style?.glow || { enabled: false, color: '#FFFFFF', opacity: 50, blur: 20 }
  );

  // Preview
  const [previewText, setPreviewText] = useState('GAME DAY');
  const [previewBackground, setPreviewBackground] = useState<'dark' | 'light' | 'gradient'>('dark');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview styles
  const previewStyles = useMemo(() => {
    const css: React.CSSProperties = {
      fontFamily: `"${fontFamily}", sans-serif`,
      fontWeight,
      fontSize: `${Math.min(fontSize, 120)}px`,
      textTransform: textTransform as any,
      letterSpacing: `${letterSpacing}em`,
      lineHeight: 1.1,
      // Font smoothing for crisp text
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
    };

    // Collect all filters for drop-shadow effects
    const filters: string[] = [];

    // Shadow - use text-shadow for depth effects
    const allShadows: string[] = [];
    if (shadows.length > 0) {
      shadows.forEach((s) => {
        const r = parseInt(s.color.slice(1, 3), 16) || 0;
        const g = parseInt(s.color.slice(3, 5), 16) || 0;
        const b = parseInt(s.color.slice(5, 7), 16) || 0;
        allShadows.push(`${s.offsetX}px ${s.offsetY}px ${s.blur}px rgba(${r}, ${g}, ${b}, ${s.opacity / 100})`);
      });
    }

    // Stroke - use drop-shadow filter for cleaner edges (instead of -webkit-text-stroke which causes jagged edges with gradients)
    if (strokeEnabled && stroke && stroke.width > 0) {
      // Create multiple drop-shadows to simulate stroke (cleaner than -webkit-text-stroke)
      const strokeWidth = Math.min(stroke.width, 3);
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * (Math.PI / 180);
        const x = Math.round(Math.cos(angle) * strokeWidth);
        const y = Math.round(Math.sin(angle) * strokeWidth);
        filters.push(`drop-shadow(${x}px ${y}px 0 ${stroke.color})`);
      }
    }

    // Glow - use drop-shadow filter
    if (glowEnabled && glow) {
      const r = parseInt(glow.color.slice(1, 3), 16) || 255;
      const g = parseInt(glow.color.slice(3, 5), 16) || 255;
      const b = parseInt(glow.color.slice(5, 7), 16) || 255;
      filters.push(`drop-shadow(0 0 ${glow.blur}px rgba(${r}, ${g}, ${b}, ${glow.opacity / 100}))`);
    }

    // Apply text-shadow for depth effects
    if (allShadows.length > 0) {
      css.textShadow = allShadows.join(', ');
    }

    // Apply filter for stroke and glow (cleaner rendering)
    if (filters.length > 0) {
      css.filter = filters.join(' ');
    }

    // Fill - apply after stroke/glow setup
    if (fillType === 'solid') {
      css.color = fillColor;
    } else {
      const stops = gradient.stops.map((s) => `${s.color} ${s.position}%`).join(', ');
      css.background = `linear-gradient(${gradient.angle}deg, ${stops})`;
      css.WebkitBackgroundClip = 'text';
      css.WebkitTextFillColor = 'transparent';
      css.backgroundClip = 'text';
    }

    return css;
  }, [fontFamily, fontWeight, fontSize, letterSpacing, textTransform, fillType, fillColor, gradient, strokeEnabled, stroke, shadows, glowEnabled, glow]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Style name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const styleData = {
        name: name.trim(),
        category,
        fontFamily,
        fontWeight,
        fontSize,
        letterSpacing,
        textTransform,
        fill: fillType === 'solid' ? { type: 'solid' as const, color: fillColor } : { type: 'gradient' as const, gradient },
        stroke: strokeEnabled ? stroke : undefined,
        shadows,
        glow: glowEnabled ? { ...glow, enabled: true } : undefined,
      };

      let savedStyle: LibraryTextStyle;
      if (isEditing && style) {
        savedStyle = await textStylesService.updateTextStyle(style.id, styleData);
      } else {
        savedStyle = await textStylesService.createTextStyle(styleData);
      }

      onSave(savedStyle);
    } catch (err) {
      console.error('Error saving style:', err);
      setError(err instanceof Error ? err.message : 'Failed to save style');
    } finally {
      setIsSaving(false);
    }
  };

  const addShadow = () => {
    setShadows([...shadows, { color: '#000000', opacity: 50, offsetX: 0, offsetY: 4, blur: 8 }]);
  };

  const removeShadow = (index: number) => {
    setShadows(shadows.filter((_, i) => i !== index));
  };

  const updateShadow = (index: number, updates: Partial<ShadowDefinition>) => {
    setShadows(shadows.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const updateGradientStop = (index: number, updates: Partial<{ color: string; position: number }>) => {
    setGradient({
      ...gradient,
      stops: gradient.stops.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    });
  };

  const addGradientStop = () => {
    const newPosition = gradient.stops.length > 0 ? Math.min(gradient.stops[gradient.stops.length - 1].position + 25, 100) : 50;
    setGradient({
      ...gradient,
      stops: [...gradient.stops, { color: '#CCCCCC', position: newPosition }],
    });
  };

  const removeGradientStop = (index: number) => {
    if (gradient.stops.length <= 2) return;
    setGradient({
      ...gradient,
      stops: gradient.stops.filter((_, i) => i !== index),
    });
  };

  const getPreviewBg = () => {
    switch (previewBackground) {
      case 'light': return 'bg-gray-200';
      case 'gradient': return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800';
      default: return 'bg-[#0a0a0a]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{isEditing ? 'Edit Style' : 'Create Style'}</h1>
            <p className="text-gray-500 text-sm">{isEditing ? `Editing "${style.name}"` : 'Design a new text style'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {isSaving ? 'Saving...' : 'Save Style'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Layout - Two columns */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left Column - Preview (2 cols) */}
        <div className="col-span-2 space-y-4">
          {/* Preview Card */}
          <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0d0d0d]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-400">Live Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
                {(['dark', 'light', 'gradient'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setPreviewBackground(bg)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      previewBackground === bg
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {bg.charAt(0).toUpperCase() + bg.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Area */}
            <div className={`h-64 flex items-center justify-center p-8 ${getPreviewBg()}`}>
              <span style={previewStyles} className="text-center max-w-full break-words select-none">
                {previewText}
              </span>
            </div>

            {/* Preview Text Input */}
            <div className="px-4 py-3 border-t border-gray-800 bg-[#0d0d0d]">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Preview text..."
                className="w-full bg-[#1a1a1a] border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Style Name & Category Card */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-white">Style Info</span>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Style Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bold Headlines"
                className="w-full bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TextStyleCategory)}
                className="w-full bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="headlines">Headlines</option>
                <option value="lower-thirds">Lower Thirds</option>
                <option value="scores">Scores</option>
                <option value="promo">Promo</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Properties (3 cols) */}
        <div className="col-span-3 space-y-4">
          {/* Typography Card */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-4">Typography</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Font Weight</label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(parseInt(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                >
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label} ({w.value})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Default Size</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    min={24}
                    max={200}
                    className="flex-1 h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-sm text-orange-400 font-medium w-14 text-right">{fontSize}px</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Letter Spacing</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={letterSpacing * 100}
                    onChange={(e) => setLetterSpacing(parseInt(e.target.value) / 100)}
                    min={-10}
                    max={30}
                    className="flex-1 h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-sm text-orange-400 font-medium w-14 text-right">{letterSpacing.toFixed(2)}em</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs text-gray-500 mb-2 block">Text Transform</label>
              <div className="flex items-center gap-2">
                {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTextTransform(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      textTransform === t
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#0a0a0a] text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                    }`}
                  >
                    {t === 'none' ? 'None' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fill Card */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-4">Fill</h3>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setFillType('solid')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  fillType === 'solid' ? 'bg-orange-500 text-white' : 'bg-[#0a0a0a] text-gray-400 hover:bg-gray-800'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => setFillType('gradient')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  fillType === 'gradient' ? 'bg-orange-500 text-white' : 'bg-[#0a0a0a] text-gray-400 hover:bg-gray-800'
                }`}
              >
                Gradient
              </button>
            </div>

            {fillType === 'solid' ? (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-700"
                />
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Angle: {gradient.angle}°</label>
                  <input
                    type="range"
                    value={gradient.angle}
                    onChange={(e) => setGradient({ ...gradient, angle: parseInt(e.target.value) })}
                    min={0}
                    max={360}
                    className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500">Color Stops</label>
                    <button onClick={addGradientStop} className="text-xs text-orange-400 hover:text-orange-300">+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {gradient.stops.map((stop, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => updateGradientStop(index, { color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                        />
                        <input
                          type="number"
                          value={stop.position}
                          onChange={(e) => updateGradientStop(index, { position: parseInt(e.target.value) || 0 })}
                          min={0}
                          max={100}
                          className="w-16 px-2 py-1.5 bg-[#0a0a0a] border border-gray-700/50 rounded text-white text-sm"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        {gradient.stops.length > 2 && (
                          <button onClick={() => removeGradientStop(index)} className="p-1 text-gray-500 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stroke & Effects Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stroke Card */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Stroke</h3>
                <button
                  onClick={() => setStrokeEnabled(!strokeEnabled)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${strokeEnabled ? 'bg-orange-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${strokeEnabled ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {strokeEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stroke.color}
                      onChange={(e) => setStroke({ ...stroke, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                    />
                    <input
                      type="text"
                      value={stroke.color}
                      onChange={(e) => setStroke({ ...stroke, color: e.target.value })}
                      className="flex-1 bg-[#0a0a0a] border border-gray-700/50 rounded px-2 py-1.5 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Width: {stroke.width}px</label>
                    <input
                      type="range"
                      value={stroke.width}
                      onChange={(e) => setStroke({ ...stroke, width: parseInt(e.target.value) })}
                      min={0}
                      max={10}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Glow Card */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Glow</h3>
                <button
                  onClick={() => setGlowEnabled(!glowEnabled)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${glowEnabled ? 'bg-orange-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${glowEnabled ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {glowEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={glow.color}
                      onChange={(e) => setGlow({ ...glow, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                    />
                    <input
                      type="text"
                      value={glow.color}
                      onChange={(e) => setGlow({ ...glow, color: e.target.value })}
                      className="flex-1 bg-[#0a0a0a] border border-gray-700/50 rounded px-2 py-1.5 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Blur: {glow.blur}px</label>
                    <input
                      type="range"
                      value={glow.blur}
                      onChange={(e) => setGlow({ ...glow, blur: parseInt(e.target.value) })}
                      min={0}
                      max={50}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Opacity: {glow.opacity}%</label>
                    <input
                      type="range"
                      value={glow.opacity}
                      onChange={(e) => setGlow({ ...glow, opacity: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shadows Card */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Drop Shadows</h3>
              <button onClick={addShadow} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Shadow
              </button>
            </div>
            {shadows.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No shadows added</p>
            ) : (
              <div className="space-y-3">
                {shadows.map((shadow, index) => (
                  <div key={index} className="p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">Shadow {index + 1}</span>
                      <button onClick={() => removeShadow(index)} className="p-1 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-1">Color</label>
                        <input
                          type="color"
                          value={shadow.color}
                          onChange={(e) => updateShadow(index, { color: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer border border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-1">X</label>
                        <input
                          type="number"
                          value={shadow.offsetX}
                          onChange={(e) => updateShadow(index, { offsetX: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-[#141414] border border-gray-700/50 rounded text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-1">Y</label>
                        <input
                          type="number"
                          value={shadow.offsetY}
                          onChange={(e) => updateShadow(index, { offsetY: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-[#141414] border border-gray-700/50 rounded text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-1">Blur</label>
                        <input
                          type="number"
                          value={shadow.blur}
                          onChange={(e) => updateShadow(index, { blur: parseInt(e.target.value) || 0 })}
                          min={0}
                          className="w-full px-2 py-1.5 bg-[#141414] border border-gray-700/50 rounded text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] text-gray-600 block mb-1">Opacity: {shadow.opacity}%</label>
                      <input
                        type="range"
                        value={shadow.opacity}
                        onChange={(e) => updateShadow(index, { opacity: parseInt(e.target.value) })}
                        min={0}
                        max={100}
                        className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
