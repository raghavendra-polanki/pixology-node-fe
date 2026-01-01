/**
 * Seed All NHL Teams Data to FlareLab Database
 *
 * This script:
 * 1. Reads local images from data/nhl-assets/ (32 teams, 800+ player headshots)
 * 2. Fetches fresh roster data from NHL API
 * 3. Uploads images to GCS with the SAME structure as existing 4 teams
 * 4. Populates Firestore with team and player data
 *
 * Structure matches existing data:
 * - Firestore: sports_teams/hockey/teams/{teamId}
 * - GCS: sports/hockey/{team-id}/assets/, sports/hockey/{team-id}/players/{player-id}/
 *
 * Usage:
 *   node scripts/seedAllNHLTeams.js
 *
 * Options:
 *   --team=colorado-avalanche    Process only specific team
 *   --skip-images                Skip image upload (database only)
 *   --skip-existing              Skip teams that already exist in Firestore
 *   --dry-run                    Preview without making changes
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  team: args.find(a => a.startsWith('--team='))?.split('=')[1] || null,
  skipImages: args.includes('--skip-images'),
  skipExisting: args.includes('--skip-existing'),
  dryRun: args.includes('--dry-run'),
};

console.log('🏒 NHL Teams Seeder - All 32 Teams');
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

const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';
console.log('☁️  GCS Bucket:', bucketName);
console.log('');

// Local assets folder
const LOCAL_ASSETS_PATH = './data/nhl-assets';

// ============================================
// ALL 32 NHL TEAMS CONFIGURATION
// ============================================

const NHL_TEAMS = [
  { abbr: 'ANA', teamId: 'anaheim-ducks', name: 'Anaheim Ducks', city: 'Anaheim', state: 'California', conference: 'Western', division: 'Pacific', founded: 1993, colors: { primary: '#F47A38', secondary: '#B9975B', accent: '#C1C6C8' }, stadium: { name: 'Honda Center', capacity: 17174, location: 'Anaheim, California' } },
  { abbr: 'BOS', teamId: 'boston-bruins', name: 'Boston Bruins', city: 'Boston', state: 'Massachusetts', conference: 'Eastern', division: 'Atlantic', founded: 1924, colors: { primary: '#FFB81C', secondary: '#000000', accent: '#FFFFFF' }, stadium: { name: 'TD Garden', capacity: 17850, location: 'Boston, Massachusetts' } },
  { abbr: 'BUF', teamId: 'buffalo-sabres', name: 'Buffalo Sabres', city: 'Buffalo', state: 'New York', conference: 'Eastern', division: 'Atlantic', founded: 1970, colors: { primary: '#002654', secondary: '#FCB514', accent: '#ADAFAA' }, stadium: { name: 'KeyBank Center', capacity: 19070, location: 'Buffalo, New York' } },
  { abbr: 'CGY', teamId: 'calgary-flames', name: 'Calgary Flames', city: 'Calgary', state: 'Alberta', conference: 'Western', division: 'Pacific', founded: 1972, colors: { primary: '#D2001C', secondary: '#FAAF19', accent: '#111111' }, stadium: { name: 'Scotiabank Saddledome', capacity: 19289, location: 'Calgary, Alberta' } },
  { abbr: 'CAR', teamId: 'carolina-hurricanes', name: 'Carolina Hurricanes', city: 'Carolina', state: 'North Carolina', conference: 'Eastern', division: 'Metropolitan', founded: 1972, colors: { primary: '#CC0000', secondary: '#000000', accent: '#A2AAAD' }, stadium: { name: 'PNC Arena', capacity: 18680, location: 'Raleigh, North Carolina' } },
  { abbr: 'CHI', teamId: 'chicago-blackhawks', name: 'Chicago Blackhawks', city: 'Chicago', state: 'Illinois', conference: 'Western', division: 'Central', founded: 1926, colors: { primary: '#CF0A2C', secondary: '#000000', accent: '#FFD100' }, stadium: { name: 'United Center', capacity: 19717, location: 'Chicago, Illinois' } },
  { abbr: 'COL', teamId: 'colorado-avalanche', name: 'Colorado Avalanche', city: 'Colorado', state: 'Colorado', conference: 'Western', division: 'Central', founded: 1995, colors: { primary: '#6F263D', secondary: '#236192', accent: '#A2AAAD' }, stadium: { name: 'Ball Arena', capacity: 18007, location: 'Denver, Colorado' } },
  { abbr: 'CBJ', teamId: 'columbus-blue-jackets', name: 'Columbus Blue Jackets', city: 'Columbus', state: 'Ohio', conference: 'Eastern', division: 'Metropolitan', founded: 2000, colors: { primary: '#002654', secondary: '#CE1126', accent: '#A4A9AD' }, stadium: { name: 'Nationwide Arena', capacity: 18500, location: 'Columbus, Ohio' } },
  { abbr: 'DAL', teamId: 'dallas-stars', name: 'Dallas Stars', city: 'Dallas', state: 'Texas', conference: 'Western', division: 'Central', founded: 1967, colors: { primary: '#006847', secondary: '#8F8F8C', accent: '#111111' }, stadium: { name: 'American Airlines Center', capacity: 18532, location: 'Dallas, Texas' } },
  { abbr: 'DET', teamId: 'detroit-red-wings', name: 'Detroit Red Wings', city: 'Detroit', state: 'Michigan', conference: 'Eastern', division: 'Atlantic', founded: 1926, colors: { primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000' }, stadium: { name: 'Little Caesars Arena', capacity: 19515, location: 'Detroit, Michigan' } },
  { abbr: 'EDM', teamId: 'edmonton-oilers', name: 'Edmonton Oilers', city: 'Edmonton', state: 'Alberta', conference: 'Western', division: 'Pacific', founded: 1979, colors: { primary: '#041E42', secondary: '#FF4C00', accent: '#FFFFFF' }, stadium: { name: 'Rogers Place', capacity: 18347, location: 'Edmonton, Alberta' } },
  { abbr: 'FLA', teamId: 'florida-panthers', name: 'Florida Panthers', city: 'Florida', state: 'Florida', conference: 'Eastern', division: 'Atlantic', founded: 1993, colors: { primary: '#041E42', secondary: '#C8102E', accent: '#B9975B' }, stadium: { name: 'Amerant Bank Arena', capacity: 19250, location: 'Sunrise, Florida' } },
  { abbr: 'LAK', teamId: 'los-angeles-kings', name: 'Los Angeles Kings', city: 'Los Angeles', state: 'California', conference: 'Western', division: 'Pacific', founded: 1967, colors: { primary: '#111111', secondary: '#A2AAAD', accent: '#FFFFFF' }, stadium: { name: 'Crypto.com Arena', capacity: 18230, location: 'Los Angeles, California' } },
  { abbr: 'MIN', teamId: 'minnesota-wild', name: 'Minnesota Wild', city: 'Minnesota', state: 'Minnesota', conference: 'Western', division: 'Central', founded: 2000, colors: { primary: '#154734', secondary: '#A6192E', accent: '#DDCBA4' }, stadium: { name: 'Xcel Energy Center', capacity: 17954, location: 'St. Paul, Minnesota' } },
  { abbr: 'MTL', teamId: 'montreal-canadiens', name: 'Montreal Canadiens', city: 'Montreal', state: 'Quebec', conference: 'Eastern', division: 'Atlantic', founded: 1909, colors: { primary: '#AF1E2D', secondary: '#192168', accent: '#FFFFFF' }, stadium: { name: 'Bell Centre', capacity: 21302, location: 'Montreal, Quebec' } },
  { abbr: 'NSH', teamId: 'nashville-predators', name: 'Nashville Predators', city: 'Nashville', state: 'Tennessee', conference: 'Western', division: 'Central', founded: 1998, colors: { primary: '#FFB81C', secondary: '#041E42', accent: '#FFFFFF' }, stadium: { name: 'Bridgestone Arena', capacity: 17159, location: 'Nashville, Tennessee' } },
  { abbr: 'NJD', teamId: 'new-jersey-devils', name: 'New Jersey Devils', city: 'New Jersey', state: 'New Jersey', conference: 'Eastern', division: 'Metropolitan', founded: 1974, colors: { primary: '#CE1126', secondary: '#000000', accent: '#FFFFFF' }, stadium: { name: 'Prudential Center', capacity: 16514, location: 'Newark, New Jersey' } },
  { abbr: 'NYI', teamId: 'new-york-islanders', name: 'New York Islanders', city: 'New York', state: 'New York', conference: 'Eastern', division: 'Metropolitan', founded: 1972, colors: { primary: '#00539B', secondary: '#F47D30', accent: '#FFFFFF' }, stadium: { name: 'UBS Arena', capacity: 17255, location: 'Elmont, New York' } },
  { abbr: 'NYR', teamId: 'new-york-rangers', name: 'New York Rangers', city: 'New York', state: 'New York', conference: 'Eastern', division: 'Metropolitan', founded: 1926, colors: { primary: '#0038A8', secondary: '#CE1126', accent: '#FFFFFF' }, stadium: { name: 'Madison Square Garden', capacity: 18006, location: 'New York, New York' } },
  { abbr: 'OTT', teamId: 'ottawa-senators', name: 'Ottawa Senators', city: 'Ottawa', state: 'Ontario', conference: 'Eastern', division: 'Atlantic', founded: 1992, colors: { primary: '#C52032', secondary: '#C2912C', accent: '#000000' }, stadium: { name: 'Canadian Tire Centre', capacity: 18652, location: 'Ottawa, Ontario' } },
  { abbr: 'PHI', teamId: 'philadelphia-flyers', name: 'Philadelphia Flyers', city: 'Philadelphia', state: 'Pennsylvania', conference: 'Eastern', division: 'Metropolitan', founded: 1967, colors: { primary: '#F74902', secondary: '#000000', accent: '#FFFFFF' }, stadium: { name: 'Wells Fargo Center', capacity: 19500, location: 'Philadelphia, Pennsylvania' } },
  { abbr: 'PIT', teamId: 'pittsburgh-penguins', name: 'Pittsburgh Penguins', city: 'Pittsburgh', state: 'Pennsylvania', conference: 'Eastern', division: 'Metropolitan', founded: 1967, colors: { primary: '#FCB514', secondary: '#000000', accent: '#CFC493' }, stadium: { name: 'PPG Paints Arena', capacity: 18387, location: 'Pittsburgh, Pennsylvania' } },
  { abbr: 'SJS', teamId: 'san-jose-sharks', name: 'San Jose Sharks', city: 'San Jose', state: 'California', conference: 'Western', division: 'Pacific', founded: 1991, colors: { primary: '#006D75', secondary: '#EA7200', accent: '#000000' }, stadium: { name: 'SAP Center', capacity: 17562, location: 'San Jose, California' } },
  { abbr: 'SEA', teamId: 'seattle-kraken', name: 'Seattle Kraken', city: 'Seattle', state: 'Washington', conference: 'Western', division: 'Pacific', founded: 2021, colors: { primary: '#001628', secondary: '#99D9D9', accent: '#E9072B' }, stadium: { name: 'Climate Pledge Arena', capacity: 17151, location: 'Seattle, Washington' } },
  { abbr: 'STL', teamId: 'st-louis-blues', name: 'St. Louis Blues', city: 'St. Louis', state: 'Missouri', conference: 'Western', division: 'Central', founded: 1967, colors: { primary: '#002F87', secondary: '#FCB514', accent: '#041E42' }, stadium: { name: 'Enterprise Center', capacity: 18096, location: 'St. Louis, Missouri' } },
  { abbr: 'TBL', teamId: 'tampa-bay-lightning', name: 'Tampa Bay Lightning', city: 'Tampa Bay', state: 'Florida', conference: 'Eastern', division: 'Atlantic', founded: 1992, colors: { primary: '#002868', secondary: '#FFFFFF', accent: '#000000' }, stadium: { name: 'Amalie Arena', capacity: 19092, location: 'Tampa, Florida' } },
  { abbr: 'TOR', teamId: 'toronto-maple-leafs', name: 'Toronto Maple Leafs', city: 'Toronto', state: 'Ontario', conference: 'Eastern', division: 'Atlantic', founded: 1917, colors: { primary: '#003E7E', secondary: '#FFFFFF', accent: '#A2AAAD' }, stadium: { name: 'Scotiabank Arena', capacity: 18819, location: 'Toronto, Ontario' } },
  { abbr: 'UTA', teamId: 'utah-hockey-club', name: 'Utah Hockey Club', city: 'Salt Lake City', state: 'Utah', conference: 'Western', division: 'Central', founded: 2024, colors: { primary: '#6CACE4', secondary: '#010101', accent: '#FFFFFF' }, stadium: { name: 'Delta Center', capacity: 18206, location: 'Salt Lake City, Utah' } },
  { abbr: 'VAN', teamId: 'vancouver-canucks', name: 'Vancouver Canucks', city: 'Vancouver', state: 'British Columbia', conference: 'Western', division: 'Pacific', founded: 1970, colors: { primary: '#00205B', secondary: '#00843D', accent: '#041C2C' }, stadium: { name: 'Rogers Arena', capacity: 18910, location: 'Vancouver, British Columbia' } },
  { abbr: 'VGK', teamId: 'vegas-golden-knights', name: 'Vegas Golden Knights', city: 'Las Vegas', state: 'Nevada', conference: 'Western', division: 'Pacific', founded: 2017, colors: { primary: '#B4975A', secondary: '#333F42', accent: '#C8102E' }, stadium: { name: 'T-Mobile Arena', capacity: 17500, location: 'Las Vegas, Nevada' } },
  { abbr: 'WSH', teamId: 'washington-capitals', name: 'Washington Capitals', city: 'Washington', state: 'DC', conference: 'Eastern', division: 'Metropolitan', founded: 1974, colors: { primary: '#041E42', secondary: '#C8102E', accent: '#FFFFFF' }, stadium: { name: 'Capital One Arena', capacity: 18573, location: 'Washington, DC' } },
  { abbr: 'WPG', teamId: 'winnipeg-jets', name: 'Winnipeg Jets', city: 'Winnipeg', state: 'Manitoba', conference: 'Western', division: 'Central', founded: 2011, colors: { primary: '#041E42', secondary: '#004C97', accent: '#AC162C' }, stadium: { name: 'Canada Life Centre', capacity: 15321, location: 'Winnipeg, Manitoba' } },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    }, (response) => {
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

async function uploadToGCS(localPath, gcsPath, contentType = 'image/png') {
  if (options.dryRun) {
    console.log(`      [DRY] Would upload: ${gcsPath}`);
    return `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsPath);

    const content = await fs.readFile(localPath);

    await file.save(content, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=86400',
      },
    });

    return `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
  } catch (error) {
    console.error(`      ❌ Upload failed (${gcsPath}):`, error.message);
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// NHL API FUNCTIONS
// ============================================

async function fetchTeamRoster(teamAbbr) {
  try {
    const url = `https://api-web.nhle.com/v1/roster/${teamAbbr}/current`;
    return await fetchJSON(url);
  } catch (error) {
    console.error(`   ⚠️  Failed to fetch roster for ${teamAbbr}:`, error.message);
    return null;
  }
}

function playerNameToId(firstName, lastName) {
  return `${lastName}-${firstName}`.toLowerCase().replace(/[^a-z-]/g, '');
}

// ============================================
// MAIN PROCESSING
// ============================================

async function processTeam(teamConfig) {
  const { abbr, teamId, name, city, state, conference, division, founded, colors, stadium } = teamConfig;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📍 ${name} (${abbr})`);
  console.log(`${'─'.repeat(60)}`);

  // Check local assets folder
  const teamAssetsPath = path.join(LOCAL_ASSETS_PATH, teamId);
  if (!await fileExists(teamAssetsPath)) {
    console.log(`   ⚠️  No local assets found at: ${teamAssetsPath}`);
    return null;
  }

  // Fetch roster from NHL API
  console.log('   📡 Fetching roster from NHL API...');
  const roster = await fetchTeamRoster(abbr);

  if (!roster) {
    console.log('   ⚠️  Could not fetch roster');
    return null;
  }

  // Collect all players from API
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
      const playerId = playerNameToId(
        player.firstName?.default || '',
        player.lastName?.default || ''
      );

      allPlayers.push({
        playerId,
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
      });
    }
  }

  console.log(`   📊 Total roster: ${allPlayers.length} players`);

  // Upload logo
  let logoUrl = null;
  const logoPath = path.join(teamAssetsPath, 'logos', 'primary.png');

  if (!options.skipImages && await fileExists(logoPath)) {
    console.log('   🏷️  Uploading logo...');
    const gcsLogoPath = `sports/hockey/${teamId}/assets/logo-primary.png`;
    logoUrl = await uploadToGCS(logoPath, gcsLogoPath);
    if (logoUrl) {
      console.log(`      ✅ Logo uploaded`);
    }
  }

  // Process and upload player images
  const players = [];
  let uploadedCount = 0;
  let missingCount = 0;

  if (!options.skipImages) {
    console.log('   👥 Processing player images...');
  }

  for (const playerData of allPlayers) {
    const { playerId, firstName, lastName, jerseyNumber, position, shootsCatches, heightInches, weightLbs, birthCity, birthCountry, birthDate } = playerData;
    const playerName = `${firstName} ${lastName}`;

    // Check for local headshot
    const localHeadshotPath = path.join(teamAssetsPath, 'players', playerId, 'headshot.png');
    let headshotUrl = null;

    if (!options.skipImages && await fileExists(localHeadshotPath)) {
      const gcsHeadshotPath = `sports/hockey/${teamId}/players/${playerId}/headshot.png`;
      headshotUrl = await uploadToGCS(localHeadshotPath, gcsHeadshotPath);

      if (headshotUrl) {
        uploadedCount++;
        if (uploadedCount % 10 === 0) {
          console.log(`      ... ${uploadedCount} headshots uploaded`);
        }
      }
    } else if (!options.skipImages) {
      missingCount++;
    }

    // Build player object (matches existing structure)
    players.push({
      playerId,
      name: playerName,
      jerseyNumber,
      position: position === 'C' ? 'Center' :
                position === 'L' ? 'Left Wing' :
                position === 'R' ? 'Right Wing' :
                position === 'D' ? 'Defense' :
                position === 'G' ? 'Goalie' : position,
      shoots: shootsCatches,
      age: birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      height: heightInches ? `${Math.floor(heightInches / 12)}'${heightInches % 12}"` : '',
      weight: weightLbs || 0,
      birthplace: [birthCity, birthCountry].filter(Boolean).join(', '),
      drafted: '',
      stats: {},
      images: {
        headshot: headshotUrl,
        action: headshotUrl, // Use same as headshot for now
      },
      isHighlighted: false,
      performanceScore: 0,
      socialSentiment: 0,
    });
  }

  if (!options.skipImages) {
    console.log(`      ✅ Uploaded: ${uploadedCount}, Missing: ${missingCount}`);
  }

  // Build team document (matches existing structure exactly)
  const teamDoc = {
    teamId,
    name,
    city,
    state,
    abbreviation: abbr,
    conference,
    division,
    founded,
    colors,
    stadium,
    logo: {
      primary: logoUrl,
      alternate: logoUrl, // Use same for now
    },
    jersey: {
      home: null,
      away: null,
    },
    socialMedia: {
      twitter: `@${name.replace(/\s+/g, '')}`,
      instagram: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      facebook: name.replace(/\s+/g, ''),
    },
    players,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return teamDoc;
}

async function checkExistingTeam(teamId) {
  try {
    const doc = await db.collection('sports_teams').doc('hockey').collection('teams').doc(teamId).get();
    return doc.exists;
  } catch {
    return false;
  }
}

async function saveTeamToFirestore(teamDoc) {
  if (options.dryRun) {
    console.log(`   [DRY] Would save: ${teamDoc.name} with ${teamDoc.players.length} players`);
    return;
  }

  const teamRef = db.collection('sports_teams').doc('hockey').collection('teams').doc(teamDoc.teamId);
  await teamRef.set(teamDoc);
  console.log(`   💾 Saved to Firestore: ${teamDoc.name}`);
}

async function updateHockeyIndex(processedTeams) {
  if (options.dryRun) {
    console.log(`\n[DRY] Would update hockey index with ${processedTeams.length} teams`);
    return;
  }

  const hockeyRef = db.collection('sports_teams').doc('hockey');

  await hockeyRef.set({
    sport: 'hockey',
    league: 'NHL',
    season: '2024-2025',
    teamsCount: processedTeams.length,
    teams: processedTeams.map(t => ({
      teamId: t.teamId,
      name: t.name,
      abbreviation: t.abbreviation,
    })),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`\n📋 Updated hockey index with ${processedTeams.length} teams`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏒 NHL Teams Seeder - Starting');
  console.log('='.repeat(60) + '\n');

  // Filter teams if specific team requested
  let teamsToProcess = options.team
    ? NHL_TEAMS.filter(t => t.teamId === options.team)
    : NHL_TEAMS;

  if (teamsToProcess.length === 0) {
    console.error(`❌ Team not found: ${options.team}`);
    console.log('Available teams:');
    NHL_TEAMS.forEach(t => console.log(`   ${t.teamId} (${t.abbr})`));
    process.exit(1);
  }

  console.log(`📋 Teams to process: ${teamsToProcess.length}`);

  // Stats
  const stats = {
    processed: 0,
    skipped: 0,
    failed: 0,
    totalPlayers: 0,
  };

  const processedTeams = [];

  // Process each team
  for (const teamConfig of teamsToProcess) {
    try {
      // Check if team already exists
      if (options.skipExisting) {
        const exists = await checkExistingTeam(teamConfig.teamId);
        if (exists) {
          console.log(`\n⏭️  Skipping ${teamConfig.name} (already exists)`);
          stats.skipped++;
          continue;
        }
      }

      const teamDoc = await processTeam(teamConfig);

      if (teamDoc) {
        await saveTeamToFirestore(teamDoc);
        processedTeams.push(teamDoc);
        stats.processed++;
        stats.totalPlayers += teamDoc.players.length;
      } else {
        stats.failed++;
      }

      // Small delay between teams
      await sleep(300);

    } catch (error) {
      console.error(`   ❌ Error processing ${teamConfig.name}:`, error.message);
      stats.failed++;
    }
  }

  // Update the hockey index document
  if (processedTeams.length > 0) {
    // Get existing teams and merge with new ones
    try {
      const existingDoc = await db.collection('sports_teams').doc('hockey').get();
      const existingTeams = existingDoc.exists ? (existingDoc.data()?.teams || []) : [];

      // Merge: keep existing teams that weren't re-processed, add new ones
      const allTeams = [...existingTeams.filter(t => !processedTeams.find(p => p.teamId === t.teamId)), ...processedTeams];
      await updateHockeyIndex(allTeams);
    } catch (error) {
      console.error('⚠️  Failed to update index:', error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ SEEDING COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Teams processed: ${stats.processed}`);
  console.log(`   Teams skipped: ${stats.skipped}`);
  console.log(`   Teams failed: ${stats.failed}`);
  console.log(`   Total players: ${stats.totalPlayers}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log('');

  console.log('📁 Firestore structure:');
  console.log('   sports_teams/');
  console.log('   └── hockey/');
  console.log('       ├── [metadata]');
  console.log('       └── teams/');
  processedTeams.slice(0, 5).forEach(t => {
    console.log(`           ├── ${t.teamId}/ (${t.players.length} players)`);
  });
  if (processedTeams.length > 5) {
    console.log(`           └── ... and ${processedTeams.length - 5} more teams`);
  }
  console.log('');

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
