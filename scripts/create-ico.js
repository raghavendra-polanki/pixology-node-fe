#!/usr/bin/env node

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

async function createFavicon() {
  try {
    const pngPath = path.join(publicDir, 'favicon.png');
    const icoPath = path.join(publicDir, 'favicon.ico');

    // Create multiple sizes for ICO format
    const sizes = [16, 32, 48, 64];
    const images = [];

    for (const size of sizes) {
      const image = await sharp(pngPath)
        .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
        .png()
        .toBuffer();

      images.push({
        size,
        buffer: image
      });
    }

    // For now, just copy the 32x32 as ICO (simplified)
    const ico32 = await sharp(pngPath)
      .resize(32, 32, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .toBuffer();

    fs.writeFileSync(icoPath, ico32);
    console.log('✓ Created favicon.ico (32x32)');
    console.log(`  File size: ${(ico32.length / 1024).toFixed(2)} KB`);

    // Also create favicon.png as alternate
    console.log('✓ favicon.png available as alternative (256x256)');

  } catch (error) {
    console.error('✗ Error creating favicon:', error.message);
    process.exit(1);
  }
}

createFavicon();
