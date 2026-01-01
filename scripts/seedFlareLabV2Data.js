/**
 * Seed FlareLab V2 Data Structure
 *
 * This script:
 * 1. Reads team data from CSV file
 * 2. Uploads images from local folders to GCS
 * 3. Populates Firestore with the new v2 data structure
 *
 * IMPORTANT: Uses _v2 suffix to avoid overwriting existing data
 *
 * Usage:
 *   node scripts/seedFlareLabV2Data.js
 *
 * Options:
 *   --team=colorado-avalanche    Process only specific team
 *   --skip-images                Skip image upload (database only)
 *   --skip-db                    Skip database (images only)
 *   --dry-run                    Preview without making changes
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  team: args.find(a => a.startsWith('--team='))?.split('=')[1] || null,
  skipImages: args.includes('--skip-images'),
  skipDb: args.includes('--skip-db'),
  dryRun: args.includes('--dry-run'),
};

console.log('🚀 FlareLab V2 Data Seeder');
console.log('   Options:', JSON.stringify(options, null, 2));
console.log('');

// ============================================
// FIREBASE INITIALIZATION
// ============================================

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    await fs.readFile('./serviceAccountKeyGoogle.json', 'utf8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const FLARELAB_DB_ID = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
console.log('📦 Database:', FLARELAB_DB_ID);

const db = admin.firestore();
db.settings({ databaseId: FLARELAB_DB_ID });

// ============================================
// GCS INITIALIZATION
// ============================================

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

// Use a new folder path to avoid conflicts with existing data
const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';
const GCS_BASE_PATH = 'sports-v2';  // New base path for v2 data

console.log('☁️  GCS Bucket:', bucketName);
console.log('📁 GCS Base Path:', GCS_BASE_PATH);
console.log('');

// ============================================
// CONFIGURATION
// ============================================

// CSV file path
const CSV_PATH = '/Users/raghav/Desktop/team-data.csv';

// Team assets folder (for Colorado example)
const TEAM_ASSETS_BASE = '/Users/raghav/Desktop';

// Image folder mapping
const FOLDER_MAPPING = {
  'Logo - Primary': { gcsFolder: 'logos', gcsName: 'primary' },
  'Logo - Alternate': { gcsFolder: 'logos', gcsName: 'alternate' },
  'Logo - Secondary Shoulder': { gcsFolder: 'logos', gcsName: 'shoulder' },
  'Jersey - Home': { gcsFolder: 'jerseys', prefix: 'home' },
  'Jersey - Away': { gcsFolder: 'jerseys', prefix: 'away' },
  'Jersey - Alternate': { gcsFolder: 'jerseys', prefix: 'alternate' },
  'Socks - Home': { gcsFolder: 'socks', gcsName: 'home' },
  'Socks - Away': { gcsFolder: 'socks', gcsName: 'away' },
  'Socks - Alternate': { gcsFolder: 'socks', gcsName: 'alternate' },
  'Player Headshots': { gcsFolder: 'players', isPlayers: true },
};

// Team name to ID mapping
function teamNameToId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Player name to ID mapping
function playerNameToId(name) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]}-${parts[0]}`.toLowerCase().replace(/[^a-z-]/g, '');
  }
  return name.toLowerCase().replace(/[^a-z-]/g, '');
}

// Get file extension
function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

// ============================================
// CSV PARSING
// ============================================

async function parseTeamsCSV() {
  console.log('📄 Parsing CSV file:', CSV_PATH);

  const content = await fs.readFile(CSV_PATH, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`   Found ${records.length} teams`);

  return records.map(row => ({
    // Identity
    teamId: teamNameToId(row['Team']),
    sport: row['Sport'].toLowerCase(),
    league: row['League'],

    // Basic Info
    name: row['Team'],
    fullName: row['Team'],
    city: row['City'].split(',')[0].trim(),
    state: row['City'].split(',')[1]?.trim() || '',
    mascot: row['Mascot'],
    nickname: row['Nickname'],
    abbreviation: row['Abbreviation'],

    // Organization
    conference: row['Conference'],
    division: row['Division'],
    foundingYear: parseInt(row['Founding Year']) || null,
    franchiseValue: parseFloat(row['Franchise Value ($ in Billions)']?.trim()) || null,

    // Stadium
    stadium: {
      name: row['Stadium'],
      averageAttendance: parseInt(row['Average Attendance']?.replace(/,/g, '')) || 0,
      location: row['City'],
    },

    // Staff
    staff: {
      headCoach: row['Coach'],
    },

    // Season Stats
    seasonStats: {
      season: '2024-2025',
      gamesPlayed: parseInt(row['GP']) || 0,
      wins: parseInt(row['W']) || 0,
      losses: parseInt(row['L']) || 0,
      overtimeLosses: parseInt(row['OTL']) || 0,
      shootoutLosses: parseInt(row['SOL']) || 0,
      points: parseInt(row['Pts']) || 0,
      goalsFor: parseInt(row['GF']) || 0,
      goalsAgainst: parseInt(row['GA']) || 0,
    },

    // Metadata
    activeRosterSize: parseInt(row['Active Roster Positions']) || 23,
  }));
}

// ============================================
// IMAGE UPLOAD
// ============================================

async function uploadImageToGCS(localPath, gcsPath) {
  if (options.dryRun) {
    console.log(`      [DRY RUN] Would upload: ${localPath} -> ${gcsPath}`);
    return gcsPath;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsPath);

    const content = await fs.readFile(localPath);
    const ext = getExtension(localPath);

    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    };

    await file.save(content, {
      metadata: {
        contentType: contentTypes[ext] || 'application/octet-stream',
        cacheControl: 'public, max-age=86400',
      },
    });

    return gcsPath;
  } catch (error) {
    console.error(`      ❌ Failed to upload ${localPath}:`, error.message);
    return null;
  }
}

async function processTeamAssets(teamId, abbreviation, assetsFolder) {
  console.log(`\n📸 Processing assets for ${teamId}...`);

  const assets = {
    logos: {},
    jerseys: {
      home: {},
      away: {},
      alternate: {},
    },
    socks: {},
  };

  const players = [];

  // Check if assets folder exists
  try {
    await fs.access(assetsFolder);
  } catch {
    console.log(`   ⚠️  Assets folder not found: ${assetsFolder}`);
    return { assets, players };
  }

  // Process each folder
  for (const [folderName, config] of Object.entries(FOLDER_MAPPING)) {
    const folderPath = path.join(assetsFolder, folderName);

    try {
      await fs.access(folderPath);
    } catch {
      console.log(`   ⏭️  Skipping (not found): ${folderName}`);
      continue;
    }

    const files = await fs.readdir(folderPath);
    const imageFiles = files.filter(f => ['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(getExtension(f)));

    if (imageFiles.length === 0) {
      console.log(`   ⏭️  Skipping (empty): ${folderName}`);
      continue;
    }

    console.log(`   📁 ${folderName}: ${imageFiles.length} files`);

    if (config.isPlayers) {
      // Process player headshots
      for (const file of imageFiles) {
        const playerName = path.basename(file, getExtension(file));
        const playerId = playerNameToId(playerName);
        const ext = getExtension(file);

        const gcsPath = `${GCS_BASE_PATH}/hockey/${teamId}/players/${playerId}/headshot${ext}`;
        const localPath = path.join(folderPath, file);

        if (!options.skipImages) {
          const uploadedPath = await uploadImageToGCS(localPath, gcsPath);
          if (uploadedPath) {
            console.log(`      ✅ ${playerName}`);
          }
        }

        players.push({
          playerId,
          name: playerName,
          teamId,
          images: {
            headshots: {
              primary: gcsPath,
            },
          },
        });
      }
    } else if (config.prefix) {
      // Process jersey images (with front/back/both)
      for (const file of imageFiles) {
        const ext = getExtension(file);
        const fileName = path.basename(file, ext).toLowerCase();

        let variant = 'full';
        if (fileName.includes('front')) variant = 'front';
        else if (fileName.includes('back')) variant = 'back';
        else if (fileName.includes('both')) variant = 'full';

        const gcsPath = `${GCS_BASE_PATH}/hockey/${teamId}/${config.gcsFolder}/${config.prefix}-${variant}${ext}`;
        const localPath = path.join(folderPath, file);

        if (!options.skipImages) {
          const uploadedPath = await uploadImageToGCS(localPath, gcsPath);
          if (uploadedPath) {
            console.log(`      ✅ ${config.prefix}-${variant}`);
          }
        }

        assets.jerseys[config.prefix][variant] = gcsPath;
      }
    } else {
      // Process logos and socks (single file per category)
      for (const file of imageFiles) {
        const ext = getExtension(file);
        const gcsPath = `${GCS_BASE_PATH}/hockey/${teamId}/${config.gcsFolder}/${config.gcsName}${ext}`;
        const localPath = path.join(folderPath, file);

        if (!options.skipImages) {
          const uploadedPath = await uploadImageToGCS(localPath, gcsPath);
          if (uploadedPath) {
            console.log(`      ✅ ${config.gcsFolder}/${config.gcsName}`);
          }
        }

        if (config.gcsFolder === 'logos') {
          assets.logos[config.gcsName] = gcsPath;
        } else if (config.gcsFolder === 'socks') {
          assets.socks[config.gcsName] = gcsPath;
        }
      }
    }
  }

  return { assets, players };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveTeamToFirestore(teamData, assets) {
  if (options.skipDb) {
    console.log(`   [SKIP DB] Team: ${teamData.name}`);
    return;
  }

  if (options.dryRun) {
    console.log(`   [DRY RUN] Would save team: ${teamData.name}`);
    return;
  }

  const teamDoc = {
    ...teamData,
    assets,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    dataVersion: 2,
  };

  await db.collection('teams_v2').doc(teamData.teamId).set(teamDoc);
  console.log(`   💾 Saved team: ${teamData.name}`);
}

async function savePlayerToFirestore(playerData) {
  if (options.skipDb) return;
  if (options.dryRun) {
    console.log(`      [DRY RUN] Would save player: ${playerData.name}`);
    return;
  }

  // Parse name
  const nameParts = playerData.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const playerDoc = {
    playerId: playerData.playerId,
    teamId: playerData.teamId,
    sport: 'hockey',

    name: {
      first: firstName,
      last: lastName,
      full: playerData.name,
      display: `${firstName.charAt(0)}. ${lastName}`,
    },

    images: playerData.images,

    // FlareLab metadata
    flarelab: {
      isHighlighted: false,
      performanceScore: 0,
      socialSentiment: 0,
      recommendationWeight: 1.0,
      tags: [],
    },

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    dataVersion: 2,
  };

  await db.collection('players_v2').doc(playerData.playerId).set(playerDoc, { merge: true });
}

async function saveSportMetadata() {
  if (options.skipDb || options.dryRun) return;

  const sportDoc = {
    sportId: 'hockey',
    name: 'Hockey',
    icon: 'hockey-puck',
    league: 'NHL',
    season: '2024-2025',
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),

    config: {
      positions: ['C', 'LW', 'RW', 'D', 'G'],
      positionLabels: {
        'C': 'Center',
        'LW': 'Left Wing',
        'RW': 'Right Wing',
        'D': 'Defense',
        'G': 'Goalie',
      },
      conferences: ['Eastern', 'Western'],
      divisions: {
        'Eastern': ['Atlantic', 'Metropolitan'],
        'Western': ['Central', 'Pacific'],
      },
    },
  };

  await db.collection('sports_v2').doc('hockey').set(sportDoc);
  console.log('✅ Saved sport metadata');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🏒 Starting FlareLab V2 Data Seeding');
    console.log('='.repeat(60) + '\n');

    // Parse CSV
    const teams = await parseTeamsCSV();

    // Save sport metadata
    await saveSportMetadata();

    // Process each team
    let processedCount = 0;
    let skippedCount = 0;

    for (const team of teams) {
      // Filter by team if specified
      if (options.team && team.teamId !== options.team) {
        skippedCount++;
        continue;
      }

      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📍 Processing: ${team.name} (${team.abbreviation})`);
      console.log(`${'─'.repeat(50)}`);

      // Determine assets folder
      // For Colorado, it's in the "Colorado" folder
      // For other teams, we'd need their folders too
      let assetsFolder = null;

      if (team.teamId === 'colorado-avalanche') {
        assetsFolder = path.join(TEAM_ASSETS_BASE, 'Colorado');
      }

      // Process team assets if available
      let assets = { logos: {}, jerseys: { home: {}, away: {}, alternate: {} }, socks: {} };
      let players = [];

      if (assetsFolder) {
        const result = await processTeamAssets(team.teamId, team.abbreviation, assetsFolder);
        assets = result.assets;
        players = result.players;
      }

      // Save team to Firestore
      await saveTeamToFirestore(team, assets);

      // Save players to Firestore
      if (players.length > 0) {
        console.log(`\n   👥 Saving ${players.length} players...`);
        for (const player of players) {
          await savePlayerToFirestore(player);
        }
        console.log(`   ✅ Saved ${players.length} players`);
      }

      processedCount++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`   Teams processed: ${processedCount}`);
    console.log(`   Teams skipped: ${skippedCount}`);
    console.log(`   Dry run: ${options.dryRun}`);
    console.log('');

    if (!options.skipDb && !options.dryRun) {
      console.log('📁 New Firestore collections created:');
      console.log('   - sports_v2');
      console.log('   - teams_v2');
      console.log('   - players_v2');
      console.log('');
      console.log('☁️  GCS assets uploaded to:');
      console.log(`   gs://${bucketName}/${GCS_BASE_PATH}/`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
