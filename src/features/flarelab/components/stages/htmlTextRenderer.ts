/**
 * HTML/CSS Text Renderer for Broadcast-Quality Text
 *
 * Renders text using HTML/CSS for superior visual effects:
 * - Multiple stacked text-shadows for 3D depth
 * - CSS gradients with background-clip
 * - Glow effects with filters
 * - Then captures as image for canvas placement
 */

import type { TextStyle, TextStylePreset, LibraryTextStyle } from '../../types/project.types';

/**
 * CSS-based preset styles for broadcast-quality text
 * These use CSS features that Fabric.js can't achieve:
 * - Multiple text-shadows for 3D depth
 * - background-clip for gradient text
 * - drop-shadow filters for glow
 */
export interface CSSTextPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  css: {
    fontFamily: string;
    fontWeight: number;
    letterSpacing: string;
    textTransform: string;
    // Gradient fill using background-clip
    background: string;
    WebkitBackgroundClip: string;
    WebkitTextFillColor: string;
    backgroundClip: string;
    // Stroke
    WebkitTextStroke: string;
    // Multiple shadows for 3D depth
    textShadow: string;
    // Glow filter
    filter?: string;
  };
}

export const CSS_TEXT_PRESETS: CSSTextPreset[] = [
  // ===== METALLIC / CINEMATIC STYLES =====
  {
    id: 'frozen-knightfall',
    name: 'Frozen Knightfall',
    category: 'cinematic',
    description: 'Premium broadcast metallic with strong 3D depth - like ESPN/NBC Sports',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      // Silver metallic gradient
      background: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 20%, #c0c0c0 50%, #909090 80%, #606060 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      // Dark stroke
      WebkitTextStroke: '1px #1a1a1a',
      // 3D depth with multiple shadows
      textShadow: `
        1px 1px 0 #000,
        2px 2px 0 #111,
        3px 3px 0 #222,
        4px 4px 0 #333,
        5px 5px 2px rgba(0,0,0,0.5),
        6px 6px 4px rgba(0,0,0,0.4),
        8px 8px 8px rgba(0,0,0,0.3)
      `,
      filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
    },
  },
  {
    id: 'ice-storm',
    name: 'Ice Storm',
    category: 'ice',
    description: 'Frozen ice effect with cyan glow - perfect for hockey',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      // Ice blue gradient
      background: 'linear-gradient(180deg, #ffffff 0%, #e0f7fa 20%, #80deea 50%, #26c6da 80%, #00838f 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      WebkitTextStroke: '1px #004d5a',
      textShadow: `
        1px 1px 0 #003d4a,
        2px 2px 0 #002d3a,
        3px 3px 0 #001d2a,
        4px 4px 2px rgba(0,77,90,0.6),
        0 0 20px rgba(0,188,212,0.8),
        0 0 40px rgba(0,188,212,0.4)
      `,
      filter: 'drop-shadow(0 0 15px rgba(0,188,212,0.6))',
    },
  },
  {
    id: 'championship-gold',
    name: 'Championship Gold',
    category: 'metallic',
    description: 'Luxurious gold with 3D emboss effect',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      // Gold metallic gradient
      background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 15%, #fcd34d 40%, #f59e0b 60%, #d97706 80%, #b45309 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      WebkitTextStroke: '1px #78350f',
      textShadow: `
        1px 1px 0 #713f12,
        2px 2px 0 #5c3310,
        3px 3px 0 #47280e,
        4px 4px 2px rgba(120,53,15,0.7),
        5px 5px 4px rgba(0,0,0,0.5),
        0 0 20px rgba(245,158,11,0.5)
      `,
      filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))',
    },
  },
  {
    id: 'fire-rivalry',
    name: 'Fire Rivalry',
    category: 'fire',
    description: 'Intense fire effect with burning glow',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      // Fire gradient
      background: 'linear-gradient(180deg, #fef08a 0%, #fde047 20%, #fb923c 50%, #ea580c 75%, #9a3412 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      WebkitTextStroke: '1px #7c2d12',
      textShadow: `
        1px 1px 0 #6b2610,
        2px 2px 0 #5a1f0e,
        3px 3px 0 #49180c,
        4px 4px 3px rgba(124,45,18,0.8),
        0 0 30px rgba(251,146,60,0.8),
        0 0 60px rgba(234,88,12,0.5)
      `,
      filter: 'drop-shadow(0 0 20px rgba(251,146,60,0.6))',
    },
  },
  {
    id: 'neon-electric',
    name: 'Neon Electric',
    category: 'neon',
    description: 'Vibrant neon with electric glow',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      // Cyan neon
      background: 'linear-gradient(180deg, #ffffff 0%, #a5f3fc 30%, #22d3ee 60%, #06b6d4 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      WebkitTextStroke: '1px #0e7490',
      textShadow: `
        0 0 5px #22d3ee,
        0 0 10px #22d3ee,
        0 0 20px #22d3ee,
        0 0 40px #06b6d4,
        0 0 80px #06b6d4,
        2px 2px 2px rgba(0,0,0,0.8)
      `,
      filter: 'drop-shadow(0 0 25px rgba(34,211,238,0.8))',
    },
  },
  {
    id: 'broadcast-pro',
    name: 'Broadcast Pro',
    category: 'broadcast',
    description: 'Clean professional broadcast style with subtle depth',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      // Clean white gradient
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #e2e8f0 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      WebkitTextStroke: '2px #0f172a',
      textShadow: `
        2px 2px 0 #0f172a,
        3px 3px 0 #1e293b,
        4px 4px 2px rgba(0,0,0,0.6),
        5px 5px 4px rgba(0,0,0,0.4)
      `,
    },
  },
  {
    id: 'sports-bold',
    name: 'Sports Bold',
    category: 'broadcast',
    description: 'Bold athletic style - high contrast and readable',
    css: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      background: '#ffffff',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: '#ffffff',
      backgroundClip: 'text',
      WebkitTextStroke: '3px #000000',
      textShadow: `
        3px 3px 0 #000,
        4px 4px 0 #111,
        5px 5px 0 #222,
        6px 6px 4px rgba(0,0,0,0.7)
      `,
    },
  },
];

/**
 * Get a CSS preset by ID
 */
export function getCSSPresetById(id: string): CSSTextPreset | undefined {
  return CSS_TEXT_PRESETS.find(p => p.id === id);
}

/**
 * Map old preset IDs to new CSS preset IDs
 */
export function mapToCSSSPreset(oldPresetId: string): string {
  const mapping: Record<string, string> = {
    'frozen-ice': 'ice-storm',
    'arctic-blast': 'ice-storm',
    'chrome-steel': 'frozen-knightfall',
    'metallic-gold': 'championship-gold',
    'epic-cinematic': 'frozen-knightfall',
    'fire-intensity': 'fire-rivalry',
    'inferno': 'fire-rivalry',
    'neon-electric': 'neon-electric',
    'cyber-blue': 'neon-electric',
    'broadcast-clean': 'broadcast-pro',
    'sports-bold': 'sports-bold',
    'headline-impact': 'broadcast-pro',
    'team-primary': 'sports-bold',
    'rivalry-clash': 'fire-rivalry',
  };
  return mapping[oldPresetId] || 'frozen-knightfall';
}

/**
 * Render text as an image using HTML/CSS
 *
 * @param text - The text to render
 * @param presetId - The CSS preset ID to use
 * @param fontSize - Font size in pixels
 * @param maxWidth - Maximum width for the text container
 * @returns Promise<string> - Base64 data URL of the rendered text
 */
/**
 * Parse gradient string to extract color stops
 */
function parseGradient(gradientStr: string): Array<{ offset: number; color: string }> {
  const stops: Array<{ offset: number; color: string }> = [];
  // Match color stops like "#ffffff 0%", "rgba(0,0,0,0.5) 50%"
  const regex = /(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))\s+(\d+)%/g;
  let match;
  while ((match = regex.exec(gradientStr)) !== null) {
    stops.push({
      color: match[1],
      offset: parseInt(match[2]) / 100,
    });
  }
  return stops.length > 0 ? stops : [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#cccccc' }];
}

/**
 * Parse text-shadow string to extract shadow layers
 */
function parseTextShadows(shadowStr: string): Array<{ x: number; y: number; blur: number; color: string }> {
  const shadows: Array<{ x: number; y: number; blur: number; color: string }> = [];
  // Split by comma but not commas inside rgba()
  const parts = shadowStr.split(/,(?![^(]*\))/);

  for (const part of parts) {
    const trimmed = part.trim();
    // Match patterns like "1px 1px 0 #000" or "0 0 20px rgba(0,0,0,0.5)"
    const match = trimmed.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px?\s+(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))/);
    if (match) {
      shadows.push({
        x: parseInt(match[1]),
        y: parseInt(match[2]),
        blur: parseInt(match[3]),
        color: match[4],
      });
    }
  }
  return shadows;
}

export async function renderTextAsImage(
  text: string,
  presetId: string,
  fontSize: number = 96,
  maxWidth: number = 1200,
  customFontFamily?: string
): Promise<string> {
  const preset = getCSSPresetById(presetId) || CSS_TEXT_PRESETS[0];
  // Use custom font if provided, otherwise use preset's font
  const fontFamily = customFontFamily || preset.css.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
  const fontWeight = preset.css.fontWeight;

  // Wait for fonts to be ready
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  try {
    await document.fonts.load(`${fontWeight} ${fontSize}px "${fontFamily}"`);
  } catch (e) {
    console.warn('[htmlTextRenderer] Font load warning:', e);
  }

  // Create canvas for measuring and drawing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set font for measurement
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2; // Approximate height

  // Add padding for shadows and effects
  const padding = Math.max(fontSize * 0.3, 20);
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(textHeight + padding * 2);

  // Clear with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Re-set font after resize
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Parse and apply text shadows for 3D depth
  if (preset.css.textShadow) {
    const shadows = parseTextShadows(preset.css.textShadow);
    for (const shadow of shadows) {
      ctx.save();
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.x;
      ctx.shadowOffsetY = shadow.y;
      ctx.fillStyle = shadow.color;
      ctx.fillText(text, centerX, centerY);
      ctx.restore();
    }
  }

  // Parse stroke from WebkitTextStroke
  if (preset.css.WebkitTextStroke) {
    const strokeMatch = preset.css.WebkitTextStroke.match(/(\d+)px\s+(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))/);
    if (strokeMatch) {
      ctx.strokeStyle = strokeMatch[2];
      ctx.lineWidth = parseInt(strokeMatch[1]) * 2; // Double for proper stroke width
      ctx.lineJoin = 'round';
      ctx.strokeText(text, centerX, centerY);
    }
  }

  // Apply gradient fill
  const gradientStops = parseGradient(preset.css.background);
  const gradient = ctx.createLinearGradient(centerX, centerY - fontSize / 2, centerX, centerY + fontSize / 2);
  for (const stop of gradientStops) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.fillText(text, centerX, centerY);

  const dataUrl = canvas.toDataURL('image/png');
  console.log('[htmlTextRenderer] Canvas rendered:', {
    text,
    presetId,
    width: canvas.width,
    height: canvas.height,
  });
  return dataUrl;
}

/**
 * Render text with custom CSS styles
 */
export async function renderTextWithCustomCSS(
  text: string,
  cssStyles: Partial<CSSStyleDeclaration>,
  fontSize: number = 96
): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.padding = '40px 60px';
  container.style.background = 'transparent';

  const textElement = document.createElement('div');
  textElement.textContent = text;

  Object.assign(textElement.style, {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: '700',
    fontSize: `${fontSize}px`,
    lineHeight: '1.1',
    whiteSpace: 'nowrap',
    display: 'inline-block',
    textTransform: 'uppercase',
    ...cssStyles,
  });

  container.appendChild(textElement);
  document.body.appendChild(container);

  try {
    const dataUrl = await toPng(container, {
      backgroundColor: 'transparent',
      pixelRatio: 2,
    });
    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Preview component styles (for displaying in preset picker)
 */
export function getPresetPreviewStyles(presetId: string, fontSize: number = 32): React.CSSProperties {
  const preset = getCSSPresetById(presetId);
  if (!preset) return {};

  return {
    fontFamily: preset.css.fontFamily,
    fontWeight: preset.css.fontWeight,
    fontSize: `${fontSize}px`,
    letterSpacing: preset.css.letterSpacing,
    textTransform: preset.css.textTransform as any,
    background: preset.css.background,
    WebkitBackgroundClip: preset.css.WebkitBackgroundClip as any,
    WebkitTextFillColor: preset.css.WebkitTextFillColor,
    backgroundClip: preset.css.backgroundClip as any,
    WebkitTextStroke: preset.css.WebkitTextStroke,
    textShadow: preset.css.textShadow,
    filter: preset.css.filter,
    lineHeight: 1.2,
  };
}

/**
 * Convert LibraryTextStyle to CSSTextPreset for rendering
 */
export function libraryStyleToCSSPreset(style: LibraryTextStyle): CSSTextPreset {
  // Build gradient or solid fill
  let background: string;
  if (style.fill.type === 'gradient' && style.fill.gradient) {
    const stops = style.fill.gradient.stops
      .map(s => `${s.color} ${s.position}%`)
      .join(', ');
    background = `linear-gradient(${style.fill.gradient.angle}deg, ${stops})`;
  } else {
    background = style.fill.color || '#FFFFFF';
  }

  // Build text-shadow from shadows array
  const shadowParts: string[] = [];
  if (style.shadows && style.shadows.length > 0) {
    style.shadows.forEach(s => {
      const r = parseInt(s.color.slice(1, 3), 16) || 0;
      const g = parseInt(s.color.slice(3, 5), 16) || 0;
      const b = parseInt(s.color.slice(5, 7), 16) || 0;
      shadowParts.push(
        `${s.offsetX}px ${s.offsetY}px ${s.blur}px rgba(${r}, ${g}, ${b}, ${s.opacity / 100})`
      );
    });
  }

  // Add glow as an additional shadow
  if (style.glow?.enabled) {
    const r = parseInt(style.glow.color.slice(1, 3), 16) || 255;
    const g = parseInt(style.glow.color.slice(3, 5), 16) || 255;
    const b = parseInt(style.glow.color.slice(5, 7), 16) || 255;
    shadowParts.push(
      `0 0 ${style.glow.blur}px rgba(${r}, ${g}, ${b}, ${style.glow.opacity / 100})`
    );
  }

  // Build stroke
  let stroke = 'none';
  if (style.stroke) {
    stroke = `${style.stroke.width}px ${style.stroke.color}`;
  }

  // Build glow filter
  let filter = '';
  if (style.glow?.enabled) {
    const r = parseInt(style.glow.color.slice(1, 3), 16) || 255;
    const g = parseInt(style.glow.color.slice(3, 5), 16) || 255;
    const b = parseInt(style.glow.color.slice(5, 7), 16) || 255;
    filter = `drop-shadow(0 0 ${style.glow.blur / 2}px rgba(${r}, ${g}, ${b}, ${style.glow.opacity / 100}))`;
  }

  return {
    id: `library-${style.id}`,
    name: style.name,
    category: style.category,
    description: style.description || '',
    css: {
      fontFamily: `"${style.fontFamily}", sans-serif`,
      fontWeight: style.fontWeight,
      letterSpacing: `${style.letterSpacing}em`,
      textTransform: style.textTransform,
      background,
      WebkitBackgroundClip: style.fill.type === 'gradient' ? 'text' : 'initial',
      WebkitTextFillColor: style.fill.type === 'gradient' ? 'transparent' : (style.fill.color || '#FFFFFF'),
      backgroundClip: style.fill.type === 'gradient' ? 'text' : 'initial',
      WebkitTextStroke: stroke,
      textShadow: shadowParts.join(', ') || 'none',
      filter: filter || undefined,
    },
  };
}

/**
 * Get preview styles for a LibraryTextStyle
 */
export function getLibraryStylePreviewStyles(style: LibraryTextStyle, fontSize: number = 32): React.CSSProperties {
  const cssPreset = libraryStyleToCSSPreset(style);
  return {
    fontFamily: cssPreset.css.fontFamily,
    fontWeight: cssPreset.css.fontWeight,
    fontSize: `${fontSize}px`,
    letterSpacing: cssPreset.css.letterSpacing,
    textTransform: cssPreset.css.textTransform as any,
    background: cssPreset.css.background,
    WebkitBackgroundClip: cssPreset.css.WebkitBackgroundClip as any,
    WebkitTextFillColor: cssPreset.css.WebkitTextFillColor,
    backgroundClip: cssPreset.css.backgroundClip as any,
    WebkitTextStroke: cssPreset.css.WebkitTextStroke,
    textShadow: cssPreset.css.textShadow,
    filter: cssPreset.css.filter,
    lineHeight: 1.2,
  };
}

/**
 * Render text using a LibraryTextStyle
 * Uses the same canvas-based approach as renderTextAsImage for consistency
 */
export async function renderTextWithLibraryStyle(
  text: string,
  style: LibraryTextStyle,
  fontSize: number = 96,
  maxWidth: number = 1200
): Promise<string> {
  // Convert library style to CSS preset format and use existing renderer
  const cssPreset = libraryStyleToCSSPreset(style);

  // Temporarily add to presets array so renderTextAsImage can find it
  const tempId = `library-${style.id}`;
  const existingIndex = CSS_TEXT_PRESETS.findIndex(p => p.id === tempId);
  if (existingIndex === -1) {
    CSS_TEXT_PRESETS.push(cssPreset);
  } else {
    CSS_TEXT_PRESETS[existingIndex] = cssPreset;
  }

  // Use existing canvas-based renderer
  return renderTextAsImage(text, tempId, fontSize, maxWidth, style.fontFamily);
}
