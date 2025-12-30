/**
 * Puppeteer Render Service
 * Renders text overlays on images using headless browser for pixel-perfect output
 */

import puppeteer from 'puppeteer';

/**
 * CSS Text Presets - matches frontend htmlTextRenderer.ts exactly
 * This is the authoritative source for Puppeteer rendering
 */
const CSS_TEXT_PRESETS = {
  // ===== PRIMARY PRESETS (from frontend) =====
  'frozen-knightfall': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 20%, #c0c0c0 50%, #909090 80%, #606060 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #1a1a1a',
    textShadow: '1px 1px 0 #000, 2px 2px 0 #111, 3px 3px 0 #222, 4px 4px 0 #333, 5px 5px 2px rgba(0,0,0,0.5), 6px 6px 4px rgba(0,0,0,0.4), 8px 8px 8px rgba(0,0,0,0.3)',
    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
  },
  'ice-storm': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #ffffff 0%, #e0f7fa 20%, #80deea 50%, #26c6da 80%, #00838f 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #004d5a',
    textShadow: '1px 1px 0 #003d4a, 2px 2px 0 #002d3a, 3px 3px 0 #001d2a, 4px 4px 2px rgba(0,77,90,0.6), 0 0 20px rgba(0,188,212,0.8), 0 0 40px rgba(0,188,212,0.4)',
    filter: 'drop-shadow(0 0 15px rgba(0,188,212,0.6))',
  },
  'championship-gold': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 15%, #fcd34d 40%, #f59e0b 60%, #d97706 80%, #b45309 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #78350f',
    textShadow: '1px 1px 0 #713f12, 2px 2px 0 #5c3310, 3px 3px 0 #47280e, 4px 4px 2px rgba(120,53,15,0.7), 5px 5px 4px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.5)',
    filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))',
  },
  'fire-rivalry': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fef08a 0%, #fde047 20%, #fb923c 50%, #ea580c 75%, #9a3412 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #7c2d12',
    textShadow: '1px 1px 0 #6b2610, 2px 2px 0 #5a1f0e, 3px 3px 0 #49180c, 4px 4px 3px rgba(124,45,18,0.8), 0 0 30px rgba(251,146,60,0.8), 0 0 60px rgba(234,88,12,0.5)',
    filter: 'drop-shadow(0 0 20px rgba(251,146,60,0.6))',
  },
  'neon-electric': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #ffffff 0%, #a5f3fc 30%, #22d3ee 60%, #06b6d4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #0e7490',
    textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #06b6d4, 0 0 80px #06b6d4, 2px 2px 2px rgba(0,0,0,0.8)',
    filter: 'drop-shadow(0 0 25px rgba(34,211,238,0.8))',
  },
  'broadcast-pro': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: 'none',
    WebkitBackgroundClip: 'initial',
    WebkitTextFillColor: '#ffffff',
    backgroundClip: 'initial',
    WebkitTextStroke: '2px #0f172a',
    textShadow: '2px 2px 0 #0f172a, 3px 3px 0 #1e293b, 4px 4px 2px rgba(0,0,0,0.6), 5px 5px 4px rgba(0,0,0,0.4)',
    filter: 'none',
  },
  'sports-bold': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    background: '#ffffff',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: '#ffffff',
    backgroundClip: 'text',
    WebkitTextStroke: '3px #000000',
    textShadow: '3px 3px 0 #000, 4px 4px 0 #111, 5px 5px 0 #222, 6px 6px 4px rgba(0,0,0,0.7)',
    filter: 'none',
  },

  // ===== LEGACY ALIASES (for backwards compatibility) =====
  // These map to the primary presets above
  'broadcast-clean': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: 'none',
    WebkitBackgroundClip: 'initial',
    WebkitTextFillColor: '#ffffff',
    backgroundClip: 'initial',
    WebkitTextStroke: '2px #0f172a',
    textShadow: '2px 2px 0 #0f172a, 3px 3px 0 #1e293b, 4px 4px 2px rgba(0,0,0,0.6), 5px 5px 4px rgba(0,0,0,0.4)',
    filter: 'none',
  },
  'frozen-ice': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #ffffff 0%, #e0f7fa 20%, #80deea 50%, #26c6da 80%, #00838f 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #004d5a',
    textShadow: '1px 1px 0 #003d4a, 2px 2px 0 #002d3a, 3px 3px 0 #001d2a, 4px 4px 2px rgba(0,77,90,0.6), 0 0 20px rgba(0,188,212,0.8), 0 0 40px rgba(0,188,212,0.4)',
    filter: 'drop-shadow(0 0 15px rgba(0,188,212,0.6))',
  },
  'metallic-gold': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 15%, #fcd34d 40%, #f59e0b 60%, #d97706 80%, #b45309 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #78350f',
    textShadow: '1px 1px 0 #713f12, 2px 2px 0 #5c3310, 3px 3px 0 #47280e, 4px 4px 2px rgba(120,53,15,0.7), 5px 5px 4px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.5)',
    filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))',
  },
  'fire-intensity': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fef08a 0%, #fde047 20%, #fb923c 50%, #ea580c 75%, #9a3412 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #7c2d12',
    textShadow: '1px 1px 0 #6b2610, 2px 2px 0 #5a1f0e, 3px 3px 0 #49180c, 4px 4px 3px rgba(124,45,18,0.8), 0 0 30px rgba(251,146,60,0.8), 0 0 60px rgba(234,88,12,0.5)',
    filter: 'drop-shadow(0 0 20px rgba(251,146,60,0.6))',
  },
  'rivalry-clash': {
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fef08a 0%, #fde047 20%, #fb923c 50%, #ea580c 75%, #9a3412 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    WebkitTextStroke: '1px #7c2d12',
    textShadow: '1px 1px 0 #6b2610, 2px 2px 0 #5a1f0e, 3px 3px 0 #49180c, 4px 4px 3px rgba(124,45,18,0.8), 0 0 30px rgba(251,146,60,0.8), 0 0 60px rgba(234,88,12,0.5)',
    filter: 'drop-shadow(0 0 20px rgba(251,146,60,0.6))',
  },
};

/**
 * Map old preset IDs to new CSS preset IDs
 * Matches frontend htmlTextRenderer.ts mapToCSSSPreset function
 */
function mapToCSSSPreset(oldPresetId) {
  const mapping = {
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
  return mapping[oldPresetId] || oldPresetId;
}

/**
 * Convert CSS preset object to inline style string
 * Note: CSS rendering differs from Canvas API - we amplify effects to compensate
 */
function presetToStyleString(preset, fontSize) {
  const scaleFactor = fontSize / 96; // Base font size is 96px
  // Amplify shadows/glows because CSS composites differently than Canvas API
  const shadowAmplifier = 1.5;

  const styles = [];
  styles.push(`font-family: ${preset.fontFamily}`);
  styles.push(`font-weight: ${preset.fontWeight}`);
  styles.push(`font-size: ${fontSize}px`);
  styles.push(`letter-spacing: ${preset.letterSpacing}`);
  styles.push(`text-transform: ${preset.textTransform}`);

  const hasGradient = preset.background && preset.background !== 'none' && preset.background !== '#ffffff' && preset.background.includes('gradient');

  if (hasGradient) {
    // For gradient text - use specific CSS structure for Chrome/Puppeteer
    // IMPORTANT: Don't use -webkit-text-stroke with gradient text as it interferes
    styles.push(`color: transparent`);
    styles.push(`background: ${preset.background}`);
    styles.push(`-webkit-background-clip: text`);
    styles.push(`background-clip: text`);
    styles.push(`-webkit-text-fill-color: transparent`);
    styles.push(`display: inline-block`);
    // Use text-shadow to simulate stroke effect for gradient text
    // Extract stroke color from preset and create outline shadow
    if (preset.WebkitTextStroke) {
      const strokeMatch = preset.WebkitTextStroke.match(/(\d+(?:\.\d+)?)(px)\s*(.*)/);
      if (strokeMatch) {
        const strokeWidth = Math.round(parseFloat(strokeMatch[1]) * scaleFactor);
        const strokeColor = strokeMatch[3];
        // Create outline effect using multiple shadows
        const outlineShadows = [
          `${strokeWidth}px 0 0 ${strokeColor}`,
          `${-strokeWidth}px 0 0 ${strokeColor}`,
          `0 ${strokeWidth}px 0 ${strokeColor}`,
          `0 ${-strokeWidth}px 0 ${strokeColor}`,
        ].join(', ');
        // Prepend outline shadows to existing text-shadow
        if (preset.textShadow) {
          const scaledShadow = scaleTextShadow(preset.textShadow, scaleFactor * shadowAmplifier);
          styles.push(`text-shadow: ${outlineShadows}, ${scaledShadow}`);
        } else {
          styles.push(`text-shadow: ${outlineShadows}`);
        }
      }
    } else if (preset.textShadow) {
      const scaledShadow = scaleTextShadow(preset.textShadow, scaleFactor * shadowAmplifier);
      styles.push(`text-shadow: ${scaledShadow}`);
    }
  } else {
    // For solid colors or white backgrounds, use direct color
    const fillColor = preset.WebkitTextFillColor || '#ffffff';
    styles.push(`color: ${fillColor}`);
    styles.push(`-webkit-text-fill-color: ${fillColor}`);

    if (preset.WebkitTextStroke) {
      // Scale stroke width
      const strokeMatch = preset.WebkitTextStroke.match(/(\d+(?:\.\d+)?)(px)\s*(.*)/);
      if (strokeMatch) {
        const scaledWidth = Math.round(parseFloat(strokeMatch[1]) * scaleFactor);
        styles.push(`-webkit-text-stroke: ${scaledWidth}px ${strokeMatch[3]}`);
      } else {
        styles.push(`-webkit-text-stroke: ${preset.WebkitTextStroke}`);
      }
    }

    if (preset.textShadow) {
      const scaledShadow = scaleTextShadow(preset.textShadow, scaleFactor * shadowAmplifier);
      styles.push(`text-shadow: ${scaledShadow}`);
    }
  }

  if (preset.filter && preset.filter !== 'none') {
    // Scale and amplify filter effects
    const scaledFilter = scaleFilter(preset.filter, scaleFactor * shadowAmplifier);
    styles.push(`filter: ${scaledFilter}`);
  }

  return styles.join('; ');
}

/**
 * Scale text-shadow values based on font size ratio
 */
function scaleTextShadow(shadowStr, scaleFactor) {
  // Parse shadow values and scale pixel values
  return shadowStr.replace(/(\d+(?:\.\d+)?)(px)/g, (match, num) => {
    return `${Math.round(parseFloat(num) * scaleFactor)}px`;
  });
}

/**
 * Scale filter values (drop-shadow) based on font size ratio
 */
function scaleFilter(filterStr, scaleFactor) {
  return filterStr.replace(/(\d+(?:\.\d+)?)(px)/g, (match, num) => {
    return `${Math.round(parseFloat(num) * scaleFactor)}px`;
  });
}

/**
 * Generate HTML page for rendering
 */
function generateHTML(imageUrl, overlays, width, height) {
  const overlayDivs = overlays.map(overlay => {
    const { text, position, style, cssPresetId, presetId } = overlay;

    // Get CSS preset - try cssPresetId first, then map presetId, then fallback
    let resolvedPresetId = cssPresetId;
    if (!resolvedPresetId && presetId) {
      resolvedPresetId = mapToCSSSPreset(presetId);
    }
    if (!resolvedPresetId) {
      resolvedPresetId = 'frozen-knightfall'; // Default to high-quality preset
    }

    // Look up the preset, fallback if not found
    const preset = CSS_TEXT_PRESETS[resolvedPresetId] || CSS_TEXT_PRESETS['frozen-knightfall'];
    console.log(`[PuppeteerRender] Overlay "${text}" using preset: ${resolvedPresetId}`);
    console.log(`[PuppeteerRender] Preset background: ${preset.background?.substring(0, 50)}...`);

    // Calculate position in pixels
    const left = (position.x / 100) * width;
    const top = (position.y / 100) * height;

    // Get font size (scale relative to 1920px base)
    const fontSize = style?.fontSize || 96;

    // Apply text transform
    let displayText = text;
    const textTransform = style?.textTransform || preset?.textTransform || 'none';
    if (textTransform === 'uppercase') displayText = text.toUpperCase();
    else if (textTransform === 'lowercase') displayText = text.toLowerCase();

    // Get style string from preset
    const styleString = preset ? presetToStyleString(preset, fontSize) : `
      font-family: 'Bebas Neue', sans-serif;
      font-size: ${fontSize}px;
      color: ${style?.fillColor || '#ffffff'};
    `;

    // Add rotation if present
    const rotation = style?.rotation || 0;
    const transform = rotation !== 0 ? `transform: rotate(${rotation}deg);` : '';

    return `
      <div class="text-overlay" style="
        left: ${left}px;
        top: ${top}px;
        transform: translate(-50%, -50%) ${rotation !== 0 ? `rotate(${rotation}deg)` : ''};
        ${styleString}
      ">${displayText}</div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=block" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Bebas Neue';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url(https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2) format('woff2');
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: transparent;
      font-family: 'Bebas Neue', Impact, sans-serif;
    }

    .container {
      position: relative;
      width: ${width}px;
      height: ${height}px;
    }

    .background-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .text-overlay {
      position: absolute;
      white-space: nowrap;
      font-family: 'Bebas Neue', Impact, sans-serif;
    }
  </style>
</head>
<body>
  <div class="container">
    <img class="background-image" src="${imageUrl}" />
    ${overlayDivs}
  </div>
</body>
</html>
  `;
}

/**
 * Render image with text overlays using Puppeteer
 * @param {string} imageSource - URL or base64 data URL of the base image
 * @param {Array} overlays - Array of text overlays
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Buffer} PNG image buffer
 */
export async function renderWithPuppeteer(imageSource, overlays, width, height) {
  let browser = null;

  try {
    console.log('[PuppeteerRender] Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-font-antialiasing',
        '--force-color-profile=srgb',
      ],
    });

    const page = await browser.newPage();

    // Set viewport to exact image dimensions
    await page.setViewport({
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor: 1,
    });

    // Generate HTML content
    const html = generateHTML(imageSource, overlays, width, height);
    console.log('[PuppeteerRender] Generated HTML, setting content...');

    // Set content and wait for fonts and images to load
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    // Wait for fonts to fully load and render
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('[PuppeteerRender] Taking screenshot...');

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
    });

    console.log('[PuppeteerRender] Screenshot captured:', screenshotBuffer.length, 'bytes');

    return screenshotBuffer;
  } catch (error) {
    console.error('[PuppeteerRender] Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default {
  renderWithPuppeteer,
  CSS_TEXT_PRESETS,
};
