/**
 * NHL Data Scraper
 *
 * Fetches team and player data from official NHL API:
 * - Team rosters and player info
 * - Player headshots from assets.nhle.com
 * - Team logos from official sources
 *
 * Usage:
 *   node scripts/scrapeNHLData.js
 *
 * Options:
 *   --team=COL              Process only specific team (by abbreviation)
 *   --skip-images           Skip image downloads
 *   --skip-db               Skip database updates
 *   --dry-run               Preview without making changes
 *   --download-only         Only download to local folder, don't upload
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  team: args.find(a => a.startsWith('--team='))?.split('=')[1]?.toUpperCase() || null,
  skipImages: args.includes('--skip-images'),
  skipDb: args.includes('--skip-db'),
  dryRun: args.includes('--dry-run'),
  downloadOnly: args.includes('--download-only'),
};

console.log('🏒 NHL Data Scraper');
console.log('   Options:', JSON.stringify(options, null, 2));
console.log('');

// ============================================
// FIREBASE INITIALIZATION
// ============================================

if (!options.skipDb && !options.downloadOnly) {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
      await fs.readFile('./serviceAccountKeyGoogle.json', 'utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const FLARELAB_DB_ID = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
let db = null;

if (!options.skipDb && !options.downloadOnly) {
  db = admin.firestore();
  db.settings({ databaseId: FLARELAB_DB_ID });
  console.log('📦 Database:', FLARELAB_DB_ID);
}

// ============================================
// GCS INITIALIZATION
// ============================================

let storage = null;
const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';
const GCS_BASE_PATH = 'sports-v2';

if (!options.downloadOnly) {
  storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
  });
  console.log('☁️  GCS Bucket:', bucketName);
}

// Local download folder
const LOCAL_DOWNLOAD_PATH = './data/nhl-assets';

// ============================================
// NHL API CONFIGURATION
// ============================================

const NHL_API_BASE = 'https://api-web.nhle.com/v1';
const NHL_ASSETS_BASE = 'https://assets.nhle.com';

// All 32 NHL teams with their info
const NHL_TEAMS = [
  { abbr: 'ANA', name: 'Anaheim Ducks', city: 'Anaheim', state: 'CA', conference: 'Western', division: 'Pacific' },
  { abbr: 'BOS', name: 'Boston Bruins', city: 'Boston', state: 'MA', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'BUF', name: 'Buffalo Sabres', city: 'Buffalo', state: 'NY', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'CGY', name: 'Calgary Flames', city: 'Calgary', state: 'AB', conference: 'Western', division: 'Pacific' },
  { abbr: 'CAR', name: 'Carolina Hurricanes', city: 'Raleigh', state: 'NC', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'CHI', name: 'Chicago Blackhawks', city: 'Chicago', state: 'IL', conference: 'Western', division: 'Central' },
  { abbr: 'COL', name: 'Colorado Avalanche', city: 'Denver', state: 'CO', conference: 'Western', division: 'Central' },
  { abbr: 'CBJ', name: 'Columbus Blue Jackets', city: 'Columbus', state: 'OH', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'DAL', name: 'Dallas Stars', city: 'Dallas', state: 'TX', conference: 'Western', division: 'Central' },
  { abbr: 'DET', name: 'Detroit Red Wings', city: 'Detroit', state: 'MI', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'EDM', name: 'Edmonton Oilers', city: 'Edmonton', state: 'AB', conference: 'Western', division: 'Pacific' },
  { abbr: 'FLA', name: 'Florida Panthers', city: 'Sunrise', state: 'FL', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'LAK', name: 'Los Angeles Kings', city: 'Los Angeles', state: 'CA', conference: 'Western', division: 'Pacific' },
  { abbr: 'MIN', name: 'Minnesota Wild', city: 'St. Paul', state: 'MN', conference: 'Western', division: 'Central' },
  { abbr: 'MTL', name: 'Montreal Canadiens', city: 'Montreal', state: 'QC', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'NSH', name: 'Nashville Predators', city: 'Nashville', state: 'TN', conference: 'Western', division: 'Central' },
  { abbr: 'NJD', name: 'New Jersey Devils', city: 'Newark', state: 'NJ', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'NYI', name: 'New York Islanders', city: 'Elmont', state: 'NY', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'NYR', name: 'New York Rangers', city: 'New York', state: 'NY', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'OTT', name: 'Ottawa Senators', city: 'Ottawa', state: 'ON', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'PHI', name: 'Philadelphia Flyers', city: 'Philadelphia', state: 'PA', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'PIT', name: 'Pittsburgh Penguins', city: 'Pittsburgh', state: 'PA', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'SJS', name: 'San Jose Sharks', city: 'San Jose', state: 'CA', conference: 'Western', division: 'Pacific' },
  { abbr: 'SEA', name: 'Seattle Kraken', city: 'Seattle', state: 'WA', conference: 'Western', division: 'Pacific' },
  { abbr: 'STL', name: 'St. Louis Blues', city: 'St. Louis', state: 'MO', conference: 'Western', division: 'Central' },
  { abbr: 'TBL', name: 'Tampa Bay Lightning', city: 'Tampa', state: 'FL', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'TOR', name: 'Toronto Maple Leafs', city: 'Toronto', state: 'ON', conference: 'Eastern', division: 'Atlantic' },
  { abbr: 'UTA', name: 'Utah Hockey Club', city: 'Salt Lake City', state: 'UT', conference: 'Western', division: 'Central' },
  { abbr: 'VAN', name: 'Vancouver Canucks', city: 'Vancouver', state: 'BC', conference: 'Western', division: 'Pacific' },
  { abbr: 'VGK', name: 'Vegas Golden Knights', city: 'Las Vegas', state: 'NV', conference: 'Western', division: 'Pacific' },
  { abbr: 'WSH', name: 'Washington Capitals', city: 'Washington', state: 'DC', conference: 'Eastern', division: 'Metropolitan' },
  { abbr: 'WPG', name: 'Winnipeg Jets', city: 'Winnipeg', state: 'MB', conference: 'Western', division: 'Central' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function teamNameToId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function playerNameToId(firstName, lastName) {
  return `${lastName}-${firstName}`.toLowerCase().replace(/[^a-z-]/g, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    }, (response) => {
      // Handle all redirect status codes
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          fetchJSON(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function downloadImage(url, localPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, async (response) => {
      // Handle all redirect status codes
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, localPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(localPath, buffer);
        resolve(buffer);
      });
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function uploadToGCS(buffer, gcsPath, contentType) {
  if (options.dryRun || options.downloadOnly) {
    console.log(`      [SKIP] Would upload to: ${gcsPath}`);
    return gcsPath;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsPath);

    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=86400',
      },
    });

    return gcsPath;
  } catch (error) {
    console.error(`      ❌ Upload failed: ${error.message}`);
    return null;
  }
}

// ============================================
// NHL API FUNCTIONS
// ============================================

async function fetchTeamRoster(teamAbbr) {
  try {
    const url = `${NHL_API_BASE}/roster/${teamAbbr}/current`;
    const data = await fetchJSON(url);
    return data;
  } catch (error) {
    console.error(`   ❌ Failed to fetch roster for ${teamAbbr}:`, error.message);
    return null;
  }
}

async function fetchTeamInfo(teamAbbr) {
  try {
    // Try to get team info from standings or schedule
    const url = `${NHL_API_BASE}/standings/now`;
    const data = await fetchJSON(url);

    // Find team in standings
    for (const standing of data.standings || []) {
      if (standing.teamAbbrev?.default === teamAbbr) {
        return {
          teamId: standing.teamId,
          teamName: standing.teamName?.default,
          teamLogo: standing.teamLogo,
          conference: standing.conferenceName,
          division: standing.divisionName,
          gamesPlayed: standing.gamesPlayed,
          wins: standing.wins,
          losses: standing.losses,
          otLosses: standing.otLosses,
          points: standing.points,
          goalsFor: standing.goalFor,
          goalsAgainst: standing.goalAgainst,
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Failed to fetch team info:`, error.message);
    return null;
  }
}

function getPlayerHeadshotUrl(playerId, teamAbbr, season = '20242025') {
  // NHL official headshot URL format
  return `${NHL_ASSETS_BASE}/mugs/nhl/${season}/${teamAbbr}/${playerId}.png`;
}

function getTeamLogoUrl(teamAbbr, variant = 'light') {
  // NHL official team logo URL
  // Options: light (white background), dark (dark background)
  return `https://assets.nhle.com/logos/nhl/svg/${teamAbbr}_${variant}.svg`;
}

// ============================================
// MAIN PROCESSING
// ============================================

async function processTeam(teamConfig, csvData) {
  const { abbr, name, city, state, conference, division } = teamConfig;
  const teamId = teamNameToId(name);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📍 ${name} (${abbr})`);
  console.log(`${'─'.repeat(60)}`);

  // Merge with CSV data if available
  const csvTeam = csvData?.find(t => t.abbreviation === abbr);

  // Fetch roster from NHL API
  console.log('   📡 Fetching roster from NHL API...');
  const roster = await fetchTeamRoster(abbr);

  if (!roster) {
    console.log('   ⚠️  Could not fetch roster, skipping team');
    return null;
  }

  // Fetch team standings info
  const teamInfo = await fetchTeamInfo(abbr);

  // Collect all players
  const allPlayers = [];
  const playerGroups = [
    { key: 'forwards', label: 'Forwards' },
    { key: 'defensemen', label: 'Defensemen' },
    { key: 'goalies', label: 'Goalies' },
  ];

  for (const group of playerGroups) {
    const players = roster[group.key] || [];
    console.log(`   ${group.label}: ${players.length}`);

    for (const player of players) {
      allPlayers.push({
        nhlId: player.id,
        firstName: player.firstName?.default || '',
        lastName: player.lastName?.default || '',
        jerseyNumber: player.sweaterNumber?.toString() || '',
        position: player.positionCode || '',
        shootsCatches: player.shootsCatches || '',
        heightInches: player.heightInInches || null,
        weightLbs: player.weightInPounds || null,
        birthCity: player.birthCity?.default || '',
        birthCountry: player.birthCountry || '',
        birthDate: player.birthDate || null,
        headshotUrl: player.headshot || getPlayerHeadshotUrl(player.id, abbr),
      });
    }
  }

  console.log(`   📊 Total players: ${allPlayers.length}`);

  // Process player images
  const players = [];
  const localTeamPath = path.join(LOCAL_DOWNLOAD_PATH, teamId);

  if (!options.skipImages) {
    console.log('   📸 Downloading player headshots...');

    for (const player of allPlayers) {
      const playerId = playerNameToId(player.firstName, player.lastName);
      const playerName = `${player.firstName} ${player.lastName}`;

      try {
        // Download headshot
        const localPath = path.join(localTeamPath, 'players', playerId, 'headshot.png');
        const gcsPath = `${GCS_BASE_PATH}/hockey/${teamId}/players/${playerId}/headshot.png`;

        if (options.dryRun) {
          console.log(`      [DRY] ${playerName}`);
        } else {
          const buffer = await downloadImage(player.headshotUrl, localPath);

          if (!options.downloadOnly) {
            await uploadToGCS(buffer, gcsPath, 'image/png');
          }

          console.log(`      ✅ ${playerName}`);
        }

        // Add player data
        players.push({
          playerId,
          nhlId: player.nhlId,
          teamId,
          sport: 'hockey',
          name: {
            first: player.firstName,
            last: player.lastName,
            full: playerName,
            display: `${player.firstName.charAt(0)}. ${player.lastName}`,
          },
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          positionFull: {
            'C': 'Center', 'L': 'Left Wing', 'R': 'Right Wing',
            'D': 'Defense', 'G': 'Goalie',
          }[player.position] || player.position,
          shootsCatches: player.shootsCatches,
          height: player.heightInches ? {
            inches: player.heightInches,
            imperial: `${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`,
            cm: Math.round(player.heightInches * 2.54),
          } : null,
          weight: player.weightLbs ? {
            lbs: player.weightLbs,
            kg: Math.round(player.weightLbs * 0.453592),
          } : null,
          birthDate: player.birthDate,
          birthplace: {
            city: player.birthCity,
            country: player.birthCountry,
            full: [player.birthCity, player.birthCountry].filter(Boolean).join(', '),
          },
          images: {
            headshots: {
              primary: `${GCS_BASE_PATH}/hockey/${teamId}/players/${playerId}/headshot.png`,
            },
          },
          flarelab: {
            isHighlighted: false,
            performanceScore: 0,
            socialSentiment: 0,
            recommendationWeight: 1.0,
            tags: [],
          },
        });

        // Small delay to be nice to NHL servers
        await sleep(100);

      } catch (error) {
        console.log(`      ⚠️  ${playerName}: ${error.message}`);
      }
    }
  }

  // Download team logo
  let logoPath = null;
  if (!options.skipImages) {
    console.log('   🏷️  Downloading team logo...');
    try {
      const logoUrl = teamInfo?.teamLogo || getTeamLogoUrl(abbr, 'light');
      const ext = logoUrl.endsWith('.svg') ? 'svg' : 'png';
      const localLogoPath = path.join(localTeamPath, 'logos', `primary.${ext}`);
      const gcsLogoPath = `${GCS_BASE_PATH}/hockey/${teamId}/logos/primary.${ext}`;

      if (!options.dryRun) {
        const buffer = await downloadImage(logoUrl, localLogoPath);
        if (!options.downloadOnly) {
          await uploadToGCS(buffer, gcsLogoPath, ext === 'svg' ? 'image/svg+xml' : 'image/png');
        }
        logoPath = gcsLogoPath;
        console.log(`      ✅ Logo downloaded`);
      }
    } catch (error) {
      console.log(`      ⚠️  Logo failed: ${error.message}`);
    }
  }

  // Build team document
  const teamDoc = {
    teamId,
    sport: 'hockey',
    league: 'NHL',
    name,
    fullName: name,
    city,
    state,
    abbreviation: abbr,
    conference: teamInfo?.conference || conference,
    division: teamInfo?.division || division,

    // From CSV if available
    foundingYear: csvTeam?.foundingYear || null,
    franchiseValue: csvTeam?.franchiseValue || null,

    stadium: csvTeam?.stadium || {
      name: '',
      averageAttendance: 0,
      location: `${city}, ${state}`,
    },

    staff: csvTeam?.staff || {
      headCoach: '',
    },

    assets: {
      logos: {
        primary: logoPath,
      },
      jerseys: { home: {}, away: {}, alternate: {} },
      socks: {},
    },

    seasonStats: {
      season: '2024-2025',
      gamesPlayed: teamInfo?.gamesPlayed || csvTeam?.seasonStats?.gamesPlayed || 0,
      wins: teamInfo?.wins || csvTeam?.seasonStats?.wins || 0,
      losses: teamInfo?.losses || csvTeam?.seasonStats?.losses || 0,
      overtimeLosses: teamInfo?.otLosses || csvTeam?.seasonStats?.overtimeLosses || 0,
      points: teamInfo?.points || csvTeam?.seasonStats?.points || 0,
      goalsFor: teamInfo?.goalsFor || csvTeam?.seasonStats?.goalsFor || 0,
      goalsAgainst: teamInfo?.goalsAgainst || csvTeam?.seasonStats?.goalsAgainst || 0,
    },

    rosterSize: players.length,
    dataVersion: 2,
  };

  return { teamDoc, players };
}

async function loadCSVData() {
  try {
    const csvPath = '/Users/raghav/Desktop/team-data.csv';
    const content = await fs.readFile(csvPath, 'utf8');
    const { parse } = await import('csv-parse/sync');

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map(row => ({
      abbreviation: row['Abbreviation'],
      foundingYear: parseInt(row['Founding Year']) || null,
      franchiseValue: parseFloat(row['Franchise Value ($ in Billions)']?.trim()) || null,
      stadium: {
        name: row['Stadium'],
        averageAttendance: parseInt(row['Average Attendance']?.replace(/,/g, '')) || 0,
        location: row['City'],
      },
      staff: {
        headCoach: row['Coach'],
      },
      seasonStats: {
        gamesPlayed: parseInt(row['GP']) || 0,
        wins: parseInt(row['W']) || 0,
        losses: parseInt(row['L']) || 0,
        overtimeLosses: parseInt(row['OTL']) || 0,
        shootoutLosses: parseInt(row['SOL']) || 0,
        points: parseInt(row['Pts']) || 0,
        goalsFor: parseInt(row['GF']) || 0,
        goalsAgainst: parseInt(row['GA']) || 0,
      },
    }));
  } catch (error) {
    console.log('⚠️  Could not load CSV data:', error.message);
    return null;
  }
}

async function saveToFirestore(teamDoc, players) {
  if (options.skipDb || options.downloadOnly || options.dryRun) {
    console.log(`   [SKIP DB] Team: ${teamDoc.name}, Players: ${players.length}`);
    return;
  }

  // Save team
  await db.collection('teams_v2').doc(teamDoc.teamId).set({
    ...teamDoc,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Save players
  const batch = db.batch();
  for (const player of players) {
    const ref = db.collection('players_v2').doc(player.playerId);
    batch.set(ref, {
      ...player,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();

  console.log(`   💾 Saved to Firestore`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏒 NHL Data Scraper - Starting');
  console.log('='.repeat(60) + '\n');

  // Load CSV data for additional info
  const csvData = await loadCSVData();
  if (csvData) {
    console.log(`📄 Loaded CSV data for ${csvData.length} teams\n`);
  }

  // Filter teams if specific team requested
  const teamsToProcess = options.team
    ? NHL_TEAMS.filter(t => t.abbr === options.team)
    : NHL_TEAMS;

  if (teamsToProcess.length === 0) {
    console.error(`❌ Team not found: ${options.team}`);
    process.exit(1);
  }

  console.log(`📋 Teams to process: ${teamsToProcess.length}`);

  // Create download directory
  await fs.mkdir(LOCAL_DOWNLOAD_PATH, { recursive: true });

  // Stats
  const stats = {
    teamsProcessed: 0,
    teamsFailed: 0,
    playersProcessed: 0,
    imagesDownloaded: 0,
  };

  // Process each team
  for (const teamConfig of teamsToProcess) {
    try {
      const result = await processTeam(teamConfig, csvData);

      if (result) {
        await saveToFirestore(result.teamDoc, result.players);
        stats.teamsProcessed++;
        stats.playersProcessed += result.players.length;
      } else {
        stats.teamsFailed++;
      }

      // Delay between teams to be nice to NHL API
      await sleep(500);

    } catch (error) {
      console.error(`   ❌ Error processing ${teamConfig.name}:`, error.message);
      stats.teamsFailed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ SCRAPING COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Teams processed: ${stats.teamsProcessed}`);
  console.log(`   Teams failed: ${stats.teamsFailed}`);
  console.log(`   Players processed: ${stats.playersProcessed}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log(`   Download only: ${options.downloadOnly}`);

  if (options.downloadOnly) {
    console.log(`\n📁 Assets downloaded to: ${LOCAL_DOWNLOAD_PATH}`);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
