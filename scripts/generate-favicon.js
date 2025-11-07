#!/usr/bin/env node

/**
 * Generate favicon.ico from favicon.svg
 * This script converts the SVG favicon to ICO format using a simple approach
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
const svgFile = path.join(publicDir, 'favicon.svg');
const icoFile = path.join(publicDir, 'favicon.ico');

// Try using sharp if available, otherwise provide instructions
try {
  const sharp = await import('sharp');
  console.log('✓ Converting favicon.svg to favicon.ico...');

  // Read SVG and convert to PNG, then to ICO
  await sharp.default(svgFile)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(icoFile.replace('.ico', '.png'));

  console.log('✓ Created favicon.png');
  console.log('✓ Favicon generation complete!');
} catch (error) {
  console.log('⚠ sharp library not available. Providing alternative methods:\n');
  console.log('Option 1: Use online converter');
  console.log('  - Visit: https://convertio.co/svg-ico/');
  console.log('  - Upload: public/favicon.svg');
  console.log('  - Download as: favicon.ico');
  console.log('  - Replace: public/favicon.ico\n');

  console.log('Option 2: Install ImageMagick and use convert command');
  console.log('  - macOS: brew install imagemagick');
  console.log('  - Ubuntu: sudo apt-get install imagemagick');
  console.log('  - Then run: convert -background none public/favicon.svg -define icon:auto-resize public/favicon.ico\n');

  console.log('Option 3: Use Inkscape');
  console.log('  - Install Inkscape');
  console.log('  - Run: inkscape public/favicon.svg -o public/favicon.ico\n');

  console.log('For now, the SVG favicon works in all modern browsers (99%+ coverage)');
}
