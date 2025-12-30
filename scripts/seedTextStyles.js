#!/usr/bin/env node

/**
 * Seed System Text Styles for Style Library
 * Seeds the default text style presets that come with FlareLab
 * Run: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKeyGoogle.json node scripts/seedTextStyles.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.log('Run with: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKeyGoogle.json node scripts/seedTextStyles.js');
  process.exit(1);
}

console.log(`✓ Using service account: ${serviceAccountPath}`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID || 'core-silicon-476114-i0',
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const flarelabDatabaseId = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
db.settings({ databaseId: flarelabDatabaseId });

/**
 * System Text Styles
 * These are the built-in styles available to all users
 */
const SYSTEM_TEXT_STYLES = [
  // Headlines - Bold, impactful styles
  {
    id: 'system-bold-white',
    name: 'Bold White',
    category: 'headlines',
    description: 'Clean, bold white text for maximum impact',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    fontSize: 96,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
    fill: { type: 'solid', color: '#FFFFFF' },
    stroke: { color: '#000000', width: 2, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 50, offsetX: 0, offsetY: 4, blur: 12 },
    ],
  },
  {
    id: 'system-chrome-gradient',
    name: 'Chrome Gradient',
    category: 'headlines',
    description: 'Metallic chrome gradient with shine effect',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    fontSize: 96,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
    fill: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#FFFFFF', position: 0 },
          { color: '#C0C0C0', position: 30 },
          { color: '#808080', position: 50 },
          { color: '#C0C0C0', position: 70 },
          { color: '#FFFFFF', position: 100 },
        ],
      },
    },
    stroke: { color: '#333333', width: 1.5, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 60, offsetX: 0, offsetY: 4, blur: 8 },
    ],
  },
  {
    id: 'system-gold-premium',
    name: 'Gold Premium',
    category: 'headlines',
    description: 'Luxurious gold gradient for premium content',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    fontSize: 96,
    letterSpacing: 0.03,
    textTransform: 'uppercase',
    fill: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#FFD700', position: 0 },
          { color: '#FFA500', position: 50 },
          { color: '#FF8C00', position: 100 },
        ],
      },
    },
    stroke: { color: '#8B4513', width: 2, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 50, offsetX: 0, offsetY: 4, blur: 12 },
      { color: '#FFD700', opacity: 30, offsetX: 0, offsetY: 0, blur: 20 },
    ],
  },
  {
    id: 'system-fire-intense',
    name: 'Fire Intense',
    category: 'headlines',
    description: 'Hot fire gradient for intense moments',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Anton',
    fontWeight: 400,
    fontSize: 96,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
    fill: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#FFFF00', position: 0 },
          { color: '#FF8C00', position: 40 },
          { color: '#FF0000', position: 100 },
        ],
      },
    },
    stroke: { color: '#8B0000', width: 2, position: 'outside' },
    shadows: [
      { color: '#FF4500', opacity: 60, offsetX: 0, offsetY: 0, blur: 20 },
      { color: '#000000', opacity: 50, offsetX: 0, offsetY: 4, blur: 8 },
    ],
    glow: { enabled: true, color: '#FF4500', opacity: 40, blur: 30 },
  },
  {
    id: 'system-ice-blue',
    name: 'Ice Blue',
    category: 'headlines',
    description: 'Cool ice blue gradient for hockey and winter themes',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Oswald',
    fontWeight: 700,
    fontSize: 96,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
    fill: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#FFFFFF', position: 0 },
          { color: '#87CEEB', position: 40 },
          { color: '#0066CC', position: 100 },
        ],
      },
    },
    stroke: { color: '#003366', width: 2, position: 'outside' },
    shadows: [
      { color: '#0066CC', opacity: 50, offsetX: 0, offsetY: 0, blur: 15 },
      { color: '#000000', opacity: 40, offsetX: 0, offsetY: 4, blur: 8 },
    ],
  },

  // Lower Thirds - Clean, readable styles for name plates
  {
    id: 'system-clean-nameplate',
    name: 'Clean Nameplate',
    category: 'lower-thirds',
    description: 'Simple, clean style for player names',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Roboto Condensed',
    fontWeight: 700,
    fontSize: 48,
    letterSpacing: 0.05,
    textTransform: 'uppercase',
    fill: { type: 'solid', color: '#FFFFFF' },
    stroke: { color: '#000000', width: 1, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 70, offsetX: 0, offsetY: 2, blur: 4 },
    ],
  },
  {
    id: 'system-broadcast-standard',
    name: 'Broadcast Standard',
    category: 'lower-thirds',
    description: 'TV-ready standard broadcast typography',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Montserrat',
    fontWeight: 600,
    fontSize: 42,
    letterSpacing: 0.03,
    textTransform: 'uppercase',
    fill: { type: 'solid', color: '#FFFFFF' },
    stroke: { color: '#1a1a1a', width: 1.5, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 80, offsetX: 0, offsetY: 2, blur: 6 },
    ],
  },

  // Scores - Number-focused styles
  {
    id: 'system-scoreboard',
    name: 'Scoreboard',
    category: 'scores',
    description: 'Classic scoreboard number style',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Oswald',
    fontWeight: 700,
    fontSize: 120,
    letterSpacing: 0.05,
    textTransform: 'none',
    fill: { type: 'solid', color: '#FFFFFF' },
    stroke: { color: '#FF0000', width: 3, position: 'outside' },
    shadows: [
      { color: '#000000', opacity: 60, offsetX: 0, offsetY: 4, blur: 8 },
    ],
  },
  {
    id: 'system-digital-led',
    name: 'Digital LED',
    category: 'scores',
    description: 'LED-style digital numbers',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Bebas Neue',
    fontWeight: 400,
    fontSize: 120,
    letterSpacing: 0.1,
    textTransform: 'none',
    fill: { type: 'solid', color: '#00FF00' },
    shadows: [
      { color: '#00FF00', opacity: 50, offsetX: 0, offsetY: 0, blur: 10 },
      { color: '#000000', opacity: 60, offsetX: 0, offsetY: 2, blur: 4 },
    ],
    glow: { enabled: true, color: '#00FF00', opacity: 40, blur: 20 },
  },

  // Promo - Marketing and promotional styles
  {
    id: 'system-neon-glow',
    name: 'Neon Glow',
    category: 'promo',
    description: 'Vibrant neon effect for promotional content',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Bebas Neue',
    fontWeight: 700,
    fontSize: 72,
    letterSpacing: 0.05,
    textTransform: 'uppercase',
    fill: { type: 'solid', color: '#FF00FF' },
    shadows: [
      { color: '#FF00FF', opacity: 80, offsetX: 0, offsetY: 0, blur: 20 },
      { color: '#FF00FF', opacity: 50, offsetX: 0, offsetY: 0, blur: 40 },
    ],
    glow: { enabled: true, color: '#FF00FF', opacity: 60, blur: 30 },
  },
  {
    id: 'system-electric-blue',
    name: 'Electric Blue',
    category: 'promo',
    description: 'Electric blue neon for high-energy promotions',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Anton',
    fontWeight: 400,
    fontSize: 72,
    letterSpacing: 0.03,
    textTransform: 'uppercase',
    fill: { type: 'solid', color: '#00BFFF' },
    shadows: [
      { color: '#00BFFF', opacity: 70, offsetX: 0, offsetY: 0, blur: 15 },
      { color: '#0000FF', opacity: 40, offsetX: 0, offsetY: 0, blur: 30 },
    ],
    glow: { enabled: true, color: '#00BFFF', opacity: 50, blur: 25 },
  },
  {
    id: 'system-retro-3d',
    name: 'Retro 3D',
    category: 'promo',
    description: 'Retro 80s style with 3D depth effect',
    isSystem: true,
    isFavorite: false,
    fontFamily: 'Oswald',
    fontWeight: 700,
    fontSize: 80,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
    fill: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#FF6B6B', position: 0 },
          { color: '#C44569', position: 100 },
        ],
      },
    },
    stroke: { color: '#2D3436', width: 2, position: 'outside' },
    shadows: [
      { color: '#2D3436', opacity: 100, offsetX: 4, offsetY: 4, blur: 0 },
      { color: '#000000', opacity: 30, offsetX: 6, offsetY: 6, blur: 10 },
    ],
  },
];

async function seedTextStyles() {
  try {
    console.log('\n📝 Seeding System Text Styles for Style Library...\n');
    console.log(`Database: ${flarelabDatabaseId}`);
    console.log(`Styles to seed: ${SYSTEM_TEXT_STYLES.length}`);

    // List styles by category
    const byCategory = SYSTEM_TEXT_STYLES.reduce((acc, style) => {
      acc[style.category] = acc[style.category] || [];
      acc[style.category].push(style);
      return acc;
    }, {});

    console.log('\nStyles by category:');
    Object.entries(byCategory).forEach(([category, styles]) => {
      console.log(`  ${category}: ${styles.length} styles`);
      styles.forEach((s) => console.log(`    - ${s.name} (${s.id})`));
    });

    // Seed each style
    console.log('\n🔄 Seeding styles...\n');
    const batch = db.batch();

    for (const style of SYSTEM_TEXT_STYLES) {
      const docRef = db.collection('text_styles').doc(style.id);
      const existingDoc = await docRef.get();

      if (existingDoc.exists) {
        console.log(`  ⚠️  ${style.name} - updating existing`);
      } else {
        console.log(`  ➕ ${style.name} - creating new`);
      }

      batch.set(docRef, {
        ...style,
        createdAt: existingDoc.exists ? existingDoc.data().createdAt : new Date(),
        updatedAt: new Date(),
      });
    }

    await batch.commit();
    console.log('\n✅ All styles seeded successfully!');

    // Verify count
    const verifySnapshot = await db.collection('text_styles').where('isSystem', '==', true).get();
    console.log(`\n🔍 Verification: ${verifySnapshot.size} system styles in database`);

    console.log('\n✨ Text styles seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding text styles:', error);
    process.exit(1);
  }
}

seedTextStyles();
