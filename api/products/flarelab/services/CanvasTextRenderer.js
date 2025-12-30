/**
 * Canvas Text Renderer
 * Renders text using @napi-rs/canvas (Canvas 2D API) - same as browser frontend
 * This ensures pixel-perfect match with Stage 5 preview
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to register Bebas Neue font if available locally
const fontPaths = [
  path.join(__dirname, '../../../fonts/BebasNeue-Regular.ttf'),
  path.join(__dirname, '../../../../public/fonts/BebasNeue-Regular.ttf'),
  path.join(__dirname, '../../../../src/assets/fonts/BebasNeue-Regular.ttf'),
  '/usr/share/fonts/truetype/bebas/BebasNeue-Regular.ttf',
];

let fontRegistered = false;
for (const fontPath of fontPaths) {
  if (fs.existsSync(fontPath)) {
    try {
      GlobalFonts.registerFromPath(fontPath, 'Bebas Neue');
      fontRegistered = true;
      console.log('[CanvasTextRenderer] Registered Bebas Neue font from:', fontPath);
      break;
    } catch (e) {
      console.warn('[CanvasTextRenderer] Failed to register font:', e.message);
    }
  }
}

if (!fontRegistered) {
  console.warn('[CanvasTextRenderer] Bebas Neue font not found, will use fallback');
}

/**
 * CSS Text Presets - matches frontend htmlTextRenderer.ts exactly
 */
const CSS_TEXT_PRESETS = {
  'frozen-knightfall': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#ffffff' },
      { offset: 0.2, color: '#f0f0f0' },
      { offset: 0.5, color: '#c0c0c0' },
      { offset: 0.8, color: '#909090' },
      { offset: 1, color: '#606060' },
    ],
    stroke: { width: 1, color: '#1a1a1a' },
    shadows: [
      { x: 1, y: 1, blur: 0, color: '#000000' },
      { x: 2, y: 2, blur: 0, color: '#111111' },
      { x: 3, y: 3, blur: 0, color: '#222222' },
      { x: 4, y: 4, blur: 0, color: '#333333' },
      { x: 5, y: 5, blur: 2, color: 'rgba(0,0,0,0.5)' },
      { x: 6, y: 6, blur: 4, color: 'rgba(0,0,0,0.4)' },
      { x: 8, y: 8, blur: 8, color: 'rgba(0,0,0,0.3)' },
    ],
  },
  'ice-storm': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#ffffff' },
      { offset: 0.2, color: '#e0f7fa' },
      { offset: 0.5, color: '#80deea' },
      { offset: 0.8, color: '#26c6da' },
      { offset: 1, color: '#00838f' },
    ],
    stroke: { width: 1, color: '#004d5a' },
    shadows: [
      { x: 1, y: 1, blur: 0, color: '#003d4a' },
      { x: 2, y: 2, blur: 0, color: '#002d3a' },
      { x: 3, y: 3, blur: 0, color: '#001d2a' },
      { x: 4, y: 4, blur: 2, color: 'rgba(0,77,90,0.6)' },
      { x: 0, y: 0, blur: 20, color: 'rgba(0,188,212,0.8)' },
      { x: 0, y: 0, blur: 40, color: 'rgba(0,188,212,0.4)' },
    ],
  },
  'championship-gold': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.05,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#fffbeb' },
      { offset: 0.15, color: '#fef3c7' },
      { offset: 0.4, color: '#fcd34d' },
      { offset: 0.6, color: '#f59e0b' },
      { offset: 0.8, color: '#d97706' },
      { offset: 1, color: '#b45309' },
    ],
    stroke: { width: 1, color: '#78350f' },
    shadows: [
      { x: 1, y: 1, blur: 0, color: '#713f12' },
      { x: 2, y: 2, blur: 0, color: '#5c3310' },
      { x: 3, y: 3, blur: 0, color: '#47280e' },
      { x: 4, y: 4, blur: 2, color: 'rgba(120,53,15,0.7)' },
      { x: 5, y: 5, blur: 4, color: 'rgba(0,0,0,0.5)' },
      { x: 0, y: 0, blur: 20, color: 'rgba(245,158,11,0.5)' },
    ],
  },
  'fire-rivalry': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#fef08a' },
      { offset: 0.2, color: '#fde047' },
      { offset: 0.5, color: '#fb923c' },
      { offset: 0.75, color: '#ea580c' },
      { offset: 1, color: '#9a3412' },
    ],
    stroke: { width: 1, color: '#7c2d12' },
    shadows: [
      { x: 1, y: 1, blur: 0, color: '#6b2610' },
      { x: 2, y: 2, blur: 0, color: '#5a1f0e' },
      { x: 3, y: 3, blur: 0, color: '#49180c' },
      { x: 4, y: 4, blur: 3, color: 'rgba(124,45,18,0.8)' },
      { x: 0, y: 0, blur: 30, color: 'rgba(251,146,60,0.8)' },
      { x: 0, y: 0, blur: 60, color: 'rgba(234,88,12,0.5)' },
    ],
  },
  'neon-electric': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#ffffff' },
      { offset: 0.3, color: '#a5f3fc' },
      { offset: 0.6, color: '#22d3ee' },
      { offset: 1, color: '#06b6d4' },
    ],
    stroke: { width: 1, color: '#0e7490' },
    shadows: [
      { x: 0, y: 0, blur: 5, color: '#22d3ee' },
      { x: 0, y: 0, blur: 10, color: '#22d3ee' },
      { x: 0, y: 0, blur: 20, color: '#22d3ee' },
      { x: 0, y: 0, blur: 40, color: '#06b6d4' },
      { x: 2, y: 2, blur: 2, color: 'rgba(0,0,0,0.8)' },
    ],
  },
  'broadcast-pro': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    gradient: [
      { offset: 0, color: '#ffffff' },
      { offset: 0.4, color: '#f8fafc' },
      { offset: 1, color: '#e2e8f0' },
    ],
    stroke: { width: 2, color: '#0f172a' },
    shadows: [
      { x: 2, y: 2, blur: 0, color: '#0f172a' },
      { x: 3, y: 3, blur: 0, color: '#1e293b' },
      { x: 4, y: 4, blur: 2, color: 'rgba(0,0,0,0.6)' },
      { x: 5, y: 5, blur: 4, color: 'rgba(0,0,0,0.4)' },
    ],
  },
  'sports-bold': {
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    letterSpacing: 0.05,
    textTransform: 'uppercase',
    solidColor: '#ffffff',
    stroke: { width: 3, color: '#000000' },
    shadows: [
      { x: 3, y: 3, blur: 0, color: '#000000' },
      { x: 4, y: 4, blur: 0, color: '#111111' },
      { x: 5, y: 5, blur: 0, color: '#222222' },
      { x: 6, y: 6, blur: 4, color: 'rgba(0,0,0,0.7)' },
    ],
  },
};

// Legacy aliases
CSS_TEXT_PRESETS['broadcast-clean'] = CSS_TEXT_PRESETS['broadcast-pro'];
CSS_TEXT_PRESETS['frozen-ice'] = CSS_TEXT_PRESETS['ice-storm'];
CSS_TEXT_PRESETS['metallic-gold'] = CSS_TEXT_PRESETS['championship-gold'];
CSS_TEXT_PRESETS['fire-intensity'] = CSS_TEXT_PRESETS['fire-rivalry'];
CSS_TEXT_PRESETS['rivalry-clash'] = CSS_TEXT_PRESETS['fire-rivalry'];

/**
 * Map old preset IDs to new ones
 */
function mapPresetId(presetId) {
  const mapping = {
    'frozen-ice': 'ice-storm',
    'arctic-blast': 'ice-storm',
    'chrome-steel': 'frozen-knightfall',
    'metallic-gold': 'championship-gold',
    'epic-cinematic': 'frozen-knightfall',
    'fire-intensity': 'fire-rivalry',
    'inferno': 'fire-rivalry',
    'cyber-blue': 'neon-electric',
    'broadcast-clean': 'broadcast-pro',
    'headline-impact': 'broadcast-pro',
    'team-primary': 'sports-bold',
    'rivalry-clash': 'fire-rivalry',
  };
  return mapping[presetId] || presetId;
}

/**
 * Parse shadow color to RGBA
 */
function parseColor(color) {
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: parseFloat(match[4]) };
    }
  }
  // Hex color
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16),
    a: 1,
  };
}

/**
 * Render a single text overlay as an image buffer
 * Matches frontend htmlTextRenderer.ts exactly for pixel-perfect results
 */
export function renderTextOverlay(text, presetId, fontSize) {
  // Resolve preset
  const resolvedPresetId = mapPresetId(presetId);
  const preset = CSS_TEXT_PRESETS[resolvedPresetId] || CSS_TEXT_PRESETS['frozen-knightfall'];

  console.log(`[CanvasTextRenderer] Rendering "${text}" with preset: ${resolvedPresetId}, fontSize: ${fontSize}`);

  // Apply text transform (same as frontend)
  let displayText = text;
  if (preset.textTransform === 'uppercase') {
    displayText = text.toUpperCase();
  } else if (preset.textTransform === 'lowercase') {
    displayText = text.toLowerCase();
  }

  // Create canvas for measurement
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext('2d');

  // Set font for measurement (same as frontend)
  const fontFamily = fontRegistered ? 'Bebas Neue' : 'Impact';
  const fontWeight = preset.fontWeight || 700;
  measureCtx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;

  // Measure text (simple measurement like frontend - no letter spacing in canvas)
  const metrics = measureCtx.measureText(displayText);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2; // Same as frontend

  // Add padding for shadows and effects (same as frontend: Math.max(fontSize * 0.3, 20))
  const padding = Math.max(fontSize * 0.3, 20);
  const canvasWidth = Math.ceil(textWidth + padding * 2);
  const canvasHeight = Math.ceil(textHeight + padding * 2);

  // Create main canvas
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Clear with transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Re-set font after canvas resize (same as frontend)
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Draw shadows (each shadow is drawn as a separate layer)
  // Frontend doesn't scale shadows - uses them as-is
  if (preset.shadows) {
    for (const shadow of preset.shadows) {
      ctx.save();
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.x;
      ctx.shadowOffsetY = shadow.y;
      ctx.fillStyle = shadow.color;
      ctx.fillText(displayText, centerX, centerY);
      ctx.restore();
    }
  }

  // Draw stroke (same as frontend: width * 2)
  if (preset.stroke && preset.stroke.width > 0) {
    ctx.save();
    ctx.strokeStyle = preset.stroke.color;
    ctx.lineWidth = preset.stroke.width * 2; // Double for proper stroke width (same as frontend)
    ctx.lineJoin = 'round';
    ctx.strokeText(displayText, centerX, centerY);
    ctx.restore();
  }

  // Draw fill (gradient or solid)
  ctx.save();
  if (preset.gradient) {
    // Create vertical gradient (same as frontend)
    const gradient = ctx.createLinearGradient(
      centerX,
      centerY - fontSize / 2,
      centerX,
      centerY + fontSize / 2
    );
    for (const stop of preset.gradient) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = gradient;
  } else if (preset.solidColor) {
    ctx.fillStyle = preset.solidColor;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(displayText, centerX, centerY);
  ctx.restore();

  // Return the canvas buffer as PNG
  return {
    buffer: canvas.toBuffer('image/png'),
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * Render all text overlays and composite onto image
 *
 * The fontSize stored represents the size at a 1920px base width.
 * Frontend preview scales: displayFontSize = fontSize * (previewWidth / 1920)
 * Backend must render at the same PROPORTIONAL size on the actual image.
 *
 * @param {Buffer} imageBuffer - The image to composite onto
 * @param {Array} overlays - Text overlays with position, style, text
 * @param {number} imageWidth - Actual image width in pixels
 * @param {number} imageHeight - Actual image height in pixels
 * @param {number} previewWidth - Width of preview canvas used in Stage 5 (for scaling)
 */
export async function renderTextOnImage(imageBuffer, overlays, imageWidth, imageHeight, previewWidth = 0) {
  const sharp = (await import('sharp')).default;

  // Calculate the display font size the user SAW in preview
  // Frontend formula: displayFontSize = fontSize * (previewWidth / 1920)
  // We render at THIS exact size so it matches what user saw
  const previewScaleFactor = previewWidth > 0 ? previewWidth / 1920 : 1;

  console.log(`[CanvasTextRenderer] Compositing ${overlays.length} overlays onto ${imageWidth}x${imageHeight} image`);
  console.log(`[CanvasTextRenderer] Preview width: ${previewWidth}, scale factor: ${previewScaleFactor.toFixed(3)}`);

  // Prepare composite operations
  const compositeOps = [];

  for (const overlay of overlays) {
    const { text, position, style, cssPresetId, presetId } = overlay;
    if (!text || !position) continue;

    // Resolve preset ID
    const resolvedPresetId = cssPresetId || mapPresetId(presetId) || 'frozen-knightfall';

    // Calculate fontSize: render at the EXACT pixel size the user saw in preview
    // Frontend formula: displayFontSize = baseFontSize * (previewWidth / 1920)
    // We use this directly - text will be same absolute pixel size as preview
    const baseFontSize = style?.fontSize || 96;
    const fontSize = previewWidth > 0
      ? Math.round(baseFontSize * (previewWidth / 1920))
      : Math.round(baseFontSize * (imageWidth / 1920));

    console.log(`[CanvasTextRenderer] Overlay "${text}": baseFontSize=${baseFontSize}, displayFontSize=${fontSize} (previewWidth=${previewWidth})`);

    // Render text overlay
    const rendered = renderTextOverlay(text, resolvedPresetId, fontSize);

    // Calculate position (percentage to pixels, centered)
    const x = Math.round((position.x / 100) * imageWidth - rendered.width / 2);
    const y = Math.round((position.y / 100) * imageHeight - rendered.height / 2);

    console.log(`[CanvasTextRenderer] Overlay "${text}" at (${x}, ${y}), size: ${rendered.width}x${rendered.height}`);

    compositeOps.push({
      input: rendered.buffer,
      left: Math.max(0, x),
      top: Math.max(0, y),
    });
  }

  // Composite all text overlays onto the image
  const result = await sharp(imageBuffer)
    .composite(compositeOps)
    .png()
    .toBuffer();

  console.log(`[CanvasTextRenderer] Final image: ${result.length} bytes`);

  return result;
}

export default {
  renderTextOverlay,
  renderTextOnImage,
  CSS_TEXT_PRESETS,
};
