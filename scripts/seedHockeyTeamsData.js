/**
 * Seed Hockey Teams Data to FlareLab Database
 *
 * Structure: sports_teams -> hockey -> {team_id}
 *
 * Data sources:
 * - Hockey-Reference: https://www.hockey-reference.com
 * - NHL.com: https://www.nhl.com
 * - Elite Prospects: https://www.eliteprospects.com
 *
 * Run: node scripts/seedHockeyTeamsData.js
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    await import('fs').then(fs =>
      fs.promises.readFile('./serviceAccountKeyGoogle.json', 'utf8')
    )
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Use FlareLab database
const FLARELAB_DB_ID = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
console.log('📦 Using FlareLab database:', FLARELAB_DB_ID);

const flarelabDb = admin.firestore();
flarelabDb.settings({ databaseId: FLARELAB_DB_ID });

// ============================================
// GCS SETUP
// ============================================

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';

/**
 * Download image from URL and return buffer
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`   ⚠️  Failed to download image from ${url}:`, error.message);
    return null;
  }
}

/**
 * Upload image buffer to GCS with specified path
 * Returns the public URL
 */
async function uploadToGCS(imageBuffer, gcsPath, contentType = 'image/png') {
  try {
    if (!imageBuffer) {
      throw new Error('No image buffer provided');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsPath);

    await file.save(imageBuffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=86400',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
    return publicUrl;
  } catch (error) {
    console.error(`   ⚠️  Failed to upload to GCS (${gcsPath}):`, error.message);
    throw error;
  }
}

/**
 * Download and upload image to GCS, return GCS URL
 * Returns { success: boolean, url: string, source: 'gcs' | 'original' }
 */
async function processImage(sourceUrl, gcsPath, contentType = 'image/png') {
  try {
    console.log(`      Downloading: ${sourceUrl.substring(0, 60)}...`);
    const imageBuffer = await downloadImage(sourceUrl);

    if (!imageBuffer) {
      console.log(`      ⚠️  Download failed - will NOT use fallback URL`);
      return { success: false, url: null, source: 'failed', originalUrl: sourceUrl };
    }

    console.log(`      Uploading to: ${gcsPath}`);
    const gcsUrl = await uploadToGCS(imageBuffer, gcsPath, contentType);
    console.log(`      ✅ Uploaded successfully to GCS`);

    return { success: true, url: gcsUrl, source: 'gcs' };
  } catch (error) {
    console.error(`      ❌ Error processing image:`, error.message);
    return { success: false, url: null, source: 'failed', originalUrl: sourceUrl, error: error.message };
  }
}

// ============================================
// NHL API INTEGRATION
// ============================================

/**
 * Fetch roster data from NHL API
 */
async function fetchNHLRoster(teamAbbreviation) {
  try {
    const response = await axios.get(`https://api-web.nhle.com/v1/roster/${teamAbbreviation}/current`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error(`   ⚠️  Failed to fetch roster for ${teamAbbreviation}:`, error.message);
    return null;
  }
}

/**
 * Transform NHL API player data to our format
 */
function transformNHLPlayer(player, teamAbbreviation, teamId) {
  const playerId = `${player.firstName.default.toLowerCase()}-${player.lastName.default.toLowerCase()}`.replace(/[^a-z-]/g, '');

  return {
    playerId,
    name: `${player.firstName.default} ${player.lastName.default}`,
    jerseyNumber: player.sweaterNumber?.toString() || '',
    position: player.positionCode || '',
    shoots: player.shootsCatches || '',
    age: null, // API doesn't provide age directly
    height: player.heightInInches ? `${Math.floor(player.heightInInches / 12)}'${player.heightInInches % 12}"` : '',
    weight: player.weightInPounds || 0,
    birthplace: `${player.birthCity?.default || ''}, ${player.birthCountry || ''}`.trim(),
    drafted: '', // Not provided in roster API
    stats: {},
    images: {
      headshot: `https://assets.nhle.com/mugs/nhl/20252026/${teamAbbreviation}/${player.id}.png`,
      action: `https://assets.nhle.com/mugs/nhl/20252026/${teamAbbreviation}/${player.id}.png`,
    },
    isHighlighted: false,
    performanceScore: 0,
    socialSentiment: 0,
  };
}

// ============================================
// NHL TEAMS DATA
// ============================================

const NHL_TEAMS = {
  'colorado-avalanche': {
    teamId: 'colorado-avalanche',
    name: 'Colorado Avalanche',
    city: 'Denver',
    state: 'Colorado',
    abbreviation: 'COL',
    conference: 'Western',
    division: 'Central',
    founded: 1995,
    colors: {
      primary: '#6F263D', // Burgundy
      secondary: '#236192', // Blue
      accent: '#A2AAAD', // Silver
    },
    stadium: {
      name: 'Ball Arena',
      capacity: 18007,
      location: 'Denver, Colorado',
    },
    logo: {
      primary: 'https://content.sportslogos.net/logos/1/8/full/64.png',
      alternate: 'https://content.sportslogos.net/logos/1/8/full/9723_colorado_avalanche-alternate-2016.png',
    },
    jersey: {
      home: 'https://www.coolhockey.com/cdn/shop/files/1296-5050-av-f.jpg?v=1730304732',
      away: 'https://www.coolhockey.com/cdn/shop/files/1296-5051-av-f.jpg?v=1730304889',
    },
    socialMedia: {
      twitter: '@Avalanche',
      instagram: '@coloradoavalanche',
      facebook: 'ColoradoAvalanche',
    },
    players: [
      {
        playerId: 'mackinnon-nathan',
        name: 'Nathan MacKinnon',
        jerseyNumber: '29',
        position: 'Center',
        shoots: 'Right',
        age: 29,
        height: '6\'0"',
        weight: 200,
        birthplace: 'Halifax, Nova Scotia, Canada',
        drafted: '2013 - Round 1, Pick 1 (COL)',
        stats: {
          gamesPlayed: 65,
          goals: 51,
          assists: 89,
          points: 140,
          plusMinus: 35,
          pim: 36,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8477492.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8477492.png',
        },
        isHighlighted: true,
        performanceScore: 95,
        socialSentiment: 92,
      },
      {
        playerId: 'makar-cale',
        name: 'Cale Makar',
        jerseyNumber: '8',
        position: 'Defense',
        shoots: 'Right',
        age: 26,
        height: '5\'11"',
        weight: 187,
        birthplace: 'Calgary, Alberta, Canada',
        drafted: '2017 - Round 1, Pick 4 (COL)',
        stats: {
          gamesPlayed: 77,
          goals: 29,
          assists: 61,
          points: 90,
          plusMinus: 42,
          pim: 26,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8480069.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8480069.png',
        },
        isHighlighted: true,
        performanceScore: 94,
        socialSentiment: 88,
      },
      {
        playerId: 'rantanen-mikko',
        name: 'Mikko Rantanen',
        jerseyNumber: '96',
        position: 'Right Wing',
        shoots: 'Left',
        age: 28,
        height: '6\'4"',
        weight: 215,
        birthplace: 'Nousiainen, Finland',
        drafted: '2015 - Round 1, Pick 10 (COL)',
        stats: {
          gamesPlayed: 80,
          goals: 42,
          assists: 62,
          points: 104,
          plusMinus: 28,
          pim: 32,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478420.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478420.png',
        },
        isHighlighted: true,
        performanceScore: 91,
        socialSentiment: 85,
      },
      {
        playerId: 'landeskog-gabriel',
        name: 'Gabriel Landeskog',
        jerseyNumber: '92',
        position: 'Left Wing',
        shoots: 'Left',
        age: 32,
        height: '6\'1"',
        weight: 215,
        birthplace: 'Stockholm, Sweden',
        drafted: '2011 - Round 1, Pick 2 (COL)',
        stats: {
          gamesPlayed: 0, // Injured
          goals: 0,
          assists: 0,
          points: 0,
          plusMinus: 0,
          pim: 0,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8476455.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8476455.png',
        },
        isHighlighted: false,
        performanceScore: 0, // Injured
        socialSentiment: 82,
      },
      {
        playerId: 'toews-devon',
        name: 'Devon Toews',
        jerseyNumber: '7',
        position: 'Defense',
        shoots: 'Left',
        age: 30,
        height: '6\'1"',
        weight: 191,
        birthplace: 'Abbotsford, British Columbia, Canada',
        drafted: '2014 - Round 4, Pick 108 (NYI)',
        stats: {
          gamesPlayed: 75,
          goals: 12,
          assists: 44,
          points: 56,
          plusMinus: 24,
          pim: 18,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478038.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478038.png',
        },
        isHighlighted: false,
        performanceScore: 87,
        socialSentiment: 78,
      },
      {
        playerId: 'georgiev-alexandar',
        name: 'Alexandar Georgiev',
        jerseyNumber: '40',
        position: 'Goalie',
        catches: 'Left',
        age: 29,
        height: '6\'1"',
        weight: 178,
        birthplace: 'Ruse, Bulgaria',
        drafted: 'Undrafted',
        stats: {
          gamesPlayed: 63,
          wins: 38,
          losses: 18,
          otl: 5,
          gaa: 2.78,
          savePercentage: 0.897,
          shutouts: 3,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478406.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/COL/8478406.png',
        },
        isHighlighted: false,
        performanceScore: 82,
        socialSentiment: 74,
      },
    ],
  },

  'toronto-maple-leafs': {
    teamId: 'toronto-maple-leafs',
    name: 'Toronto Maple Leafs',
    city: 'Toronto',
    state: 'Ontario',
    abbreviation: 'TOR',
    conference: 'Eastern',
    division: 'Atlantic',
    founded: 1917,
    colors: {
      primary: '#003E7E', // Blue
      secondary: '#FFFFFF', // White
      accent: '#A2AAAD', // Silver
    },
    stadium: {
      name: 'Scotiabank Arena',
      capacity: 18819,
      location: 'Toronto, Ontario',
    },
    logo: {
      primary: 'https://content.sportslogos.net/logos/1/31/full/819.png',
      alternate: 'https://content.sportslogos.net/logos/1/31/full/y71myf8mlwlk8lbgagh2dvh2q.png',
    },
    jersey: {
      home: 'https://www.coolhockey.com/cdn/shop/files/1296-5060-tml-f.jpg?v=1730303821',
      away: 'https://www.coolhockey.com/cdn/shop/files/1296-5061-tml-f.jpg?v=1730303926',
    },
    socialMedia: {
      twitter: '@MapleLeafs',
      instagram: '@mapleleafs',
      facebook: 'torontomapleleafs',
    },
    players: [
      {
        playerId: 'matthews-auston',
        name: 'Auston Matthews',
        jerseyNumber: '34',
        position: 'Center',
        shoots: 'Left',
        age: 27,
        height: '6\'3"',
        weight: 205,
        birthplace: 'San Ramon, California, USA',
        drafted: '2016 - Round 1, Pick 1 (TOR)',
        stats: {
          gamesPlayed: 74,
          goals: 69,
          assists: 38,
          points: 107,
          plusMinus: 22,
          pim: 36,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8479318.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8479318.png',
        },
        isHighlighted: true,
        performanceScore: 96,
        socialSentiment: 91,
      },
      {
        playerId: 'marner-mitch',
        name: 'Mitch Marner',
        jerseyNumber: '16',
        position: 'Right Wing',
        shoots: 'Right',
        age: 27,
        height: '6\'0"',
        weight: 175,
        birthplace: 'Markham, Ontario, Canada',
        drafted: '2015 - Round 1, Pick 4 (TOR)',
        stats: {
          gamesPlayed: 69,
          goals: 26,
          assists: 59,
          points: 85,
          plusMinus: 20,
          pim: 22,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8478483.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8478483.png',
        },
        isHighlighted: true,
        performanceScore: 90,
        socialSentiment: 87,
      },
      {
        playerId: 'nylander-william',
        name: 'William Nylander',
        jerseyNumber: '88',
        position: 'Right Wing',
        shoots: 'Right',
        age: 28,
        height: '6\'1"',
        weight: 192,
        birthplace: 'Calgary, Alberta, Canada',
        drafted: '2014 - Round 1, Pick 8 (TOR)',
        stats: {
          gamesPlayed: 82,
          goals: 40,
          assists: 58,
          points: 98,
          plusMinus: 14,
          pim: 20,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8477939.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8477939.png',
        },
        isHighlighted: true,
        performanceScore: 89,
        socialSentiment: 84,
      },
      {
        playerId: 'tavares-john',
        name: 'John Tavares',
        jerseyNumber: '91',
        position: 'Center',
        shoots: 'Left',
        age: 34,
        height: '6\'1"',
        weight: 215,
        birthplace: 'Mississauga, Ontario, Canada',
        drafted: '2009 - Round 1, Pick 1 (NYI)',
        stats: {
          gamesPlayed: 80,
          goals: 29,
          assists: 36,
          points: 65,
          plusMinus: 2,
          pim: 30,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8475166.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8475166.png',
        },
        isHighlighted: false,
        performanceScore: 82,
        socialSentiment: 79,
      },
      {
        playerId: 'rielly-morgan',
        name: 'Morgan Rielly',
        jerseyNumber: '44',
        position: 'Defense',
        shoots: 'Left',
        age: 30,
        height: '6\'1"',
        weight: 218,
        birthplace: 'Vancouver, British Columbia, Canada',
        drafted: '2012 - Round 1, Pick 5 (TOR)',
        stats: {
          gamesPlayed: 72,
          goals: 7,
          assists: 50,
          points: 57,
          plusMinus: 8,
          pim: 26,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8476853.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8476853.png',
        },
        isHighlighted: false,
        performanceScore: 84,
        socialSentiment: 76,
      },
      {
        playerId: 'woll-joseph',
        name: 'Joseph Woll',
        jerseyNumber: '60',
        position: 'Goalie',
        catches: 'Left',
        age: 26,
        height: '6\'4"',
        weight: 211,
        birthplace: 'St. Louis, Missouri, USA',
        drafted: '2016 - Round 3, Pick 62 (TOR)',
        stats: {
          gamesPlayed: 25,
          wins: 12,
          losses: 11,
          otl: 1,
          gaa: 2.94,
          savePercentage: 0.907,
          shutouts: 1,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8479361.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/TOR/8479361.png',
        },
        isHighlighted: false,
        performanceScore: 80,
        socialSentiment: 72,
      },
    ],
  },

  'edmonton-oilers': {
    teamId: 'edmonton-oilers',
    name: 'Edmonton Oilers',
    city: 'Edmonton',
    state: 'Alberta',
    abbreviation: 'EDM',
    conference: 'Western',
    division: 'Pacific',
    founded: 1979,
    colors: {
      primary: '#041E42', // Navy Blue
      secondary: '#FF4C00', // Orange
      accent: '#FFFFFF', // White
    },
    stadium: {
      name: 'Rogers Place',
      capacity: 18347,
      location: 'Edmonton, Alberta',
    },
    logo: {
      primary: 'https://content.sportslogos.net/logos/1/12/full/1559_edmonton_oilers-primary-2018.png',
      alternate: 'https://content.sportslogos.net/logos/1/12/full/9728_edmonton_oilers-alternate-2018.png',
    },
    jersey: {
      home: 'https://www.coolhockey.com/cdn/shop/files/1296-5040-eo-f.jpg?v=1730303459',
      away: 'https://www.coolhockey.com/cdn/shop/files/1296-5041-eo-f.jpg?v=1730303587',
    },
    socialMedia: {
      twitter: '@EdmontonOilers',
      instagram: '@edmontonoilers',
      facebook: 'EdmontonOilers',
    },
    players: [
      {
        playerId: 'mcdavid-connor',
        name: 'Connor McDavid',
        jerseyNumber: '97',
        position: 'Center',
        shoots: 'Left',
        age: 28,
        height: '6\'1"',
        weight: 193,
        birthplace: 'Richmond Hill, Ontario, Canada',
        drafted: '2015 - Round 1, Pick 1 (EDM)',
        stats: {
          gamesPlayed: 76,
          goals: 32,
          assists: 100,
          points: 132,
          plusMinus: 21,
          pim: 20,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8478402.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8478402.png',
        },
        isHighlighted: true,
        performanceScore: 98,
        socialSentiment: 95,
      },
      {
        playerId: 'draisaitl-leon',
        name: 'Leon Draisaitl',
        jerseyNumber: '29',
        position: 'Center',
        shoots: 'Left',
        age: 29,
        height: '6\'2"',
        weight: 208,
        birthplace: 'Cologne, Germany',
        drafted: '2014 - Round 1, Pick 3 (EDM)',
        stats: {
          gamesPlayed: 81,
          goals: 41,
          assists: 65,
          points: 106,
          plusMinus: 10,
          pim: 50,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8477934.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8477934.png',
        },
        isHighlighted: true,
        performanceScore: 93,
        socialSentiment: 89,
      },
      {
        playerId: 'bouchard-evan',
        name: 'Evan Bouchard',
        jerseyNumber: '2',
        position: 'Defense',
        shoots: 'Right',
        age: 25,
        height: '6\'3"',
        weight: 198,
        birthplace: 'Oakville, Ontario, Canada',
        drafted: '2018 - Round 1, Pick 10 (EDM)',
        stats: {
          gamesPlayed: 81,
          goals: 18,
          assists: 64,
          points: 82,
          plusMinus: 28,
          pim: 48,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8480803.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8480803.png',
        },
        isHighlighted: true,
        performanceScore: 88,
        socialSentiment: 82,
      },
      {
        playerId: 'nugent-hopkins-ryan',
        name: 'Ryan Nugent-Hopkins',
        jerseyNumber: '93',
        position: 'Center',
        shoots: 'Left',
        age: 31,
        height: '6\'0"',
        weight: 184,
        birthplace: 'Burnaby, British Columbia, Canada',
        drafted: '2011 - Round 1, Pick 1 (EDM)',
        stats: {
          gamesPlayed: 80,
          goals: 18,
          assists: 49,
          points: 67,
          plusMinus: 6,
          pim: 12,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8476454.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8476454.png',
        },
        isHighlighted: false,
        performanceScore: 83,
        socialSentiment: 78,
      },
      {
        playerId: 'hyman-zach',
        name: 'Zach Hyman',
        jerseyNumber: '18',
        position: 'Left Wing',
        shoots: 'Right',
        age: 32,
        height: '6\'1"',
        weight: 209,
        birthplace: 'Toronto, Ontario, Canada',
        drafted: '2010 - Round 5, Pick 123 (FLA)',
        stats: {
          gamesPlayed: 80,
          goals: 54,
          assists: 23,
          points: 77,
          plusMinus: 25,
          pim: 42,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8475786.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8475786.png',
        },
        isHighlighted: false,
        performanceScore: 86,
        socialSentiment: 80,
      },
      {
        playerId: 'skinner-stuart',
        name: 'Stuart Skinner',
        jerseyNumber: '74',
        position: 'Goalie',
        catches: 'Left',
        age: 26,
        height: '6\'4"',
        weight: 206,
        birthplace: 'Edmonton, Alberta, Canada',
        drafted: '2017 - Round 3, Pick 78 (EDM)',
        stats: {
          gamesPlayed: 59,
          wins: 36,
          losses: 16,
          otl: 5,
          gaa: 2.62,
          savePercentage: 0.905,
          shutouts: 4,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8479973.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/EDM/8479973.png',
        },
        isHighlighted: false,
        performanceScore: 85,
        socialSentiment: 77,
      },
    ],
  },

  'vegas-golden-knights': {
    teamId: 'vegas-golden-knights',
    name: 'Vegas Golden Knights',
    city: 'Las Vegas',
    state: 'Nevada',
    abbreviation: 'VGK',
    conference: 'Western',
    division: 'Pacific',
    founded: 2017,
    colors: {
      primary: '#B4975A', // Gold
      secondary: '#333F42', // Steel Gray
      accent: '#C8102E', // Red
    },
    stadium: {
      name: 'T-Mobile Arena',
      capacity: 17500,
      location: 'Las Vegas, Nevada',
    },
    logo: {
      primary: 'https://content.sportslogos.net/logos/1/6114/full/2639_vegas_golden_knights-primary-2018.png',
      alternate: 'https://content.sportslogos.net/logos/1/6114/full/8630_vegas_golden_knights-alternate-2021.png',
    },
    jersey: {
      home: 'https://www.coolhockey.com/cdn/shop/files/1296-5080-vgk-f.jpg?v=1730304337',
      away: 'https://www.coolhockey.com/cdn/shop/files/1296-5081-vgk-f.jpg?v=1730304446',
    },
    socialMedia: {
      twitter: '@GoldenKnights',
      instagram: '@goldenknights',
      facebook: 'vegasgoldenknights',
    },
    players: [
      {
        playerId: 'eichel-jack',
        name: 'Jack Eichel',
        jerseyNumber: '9',
        position: 'Center',
        shoots: 'Right',
        age: 28,
        height: '6\'2"',
        weight: 213,
        birthplace: 'North Chelmsford, Massachusetts, USA',
        drafted: '2015 - Round 1, Pick 2 (BUF)',
        stats: {
          gamesPlayed: 67,
          goals: 31,
          assists: 37,
          points: 68,
          plusMinus: -5,
          pim: 14,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8478403.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8478403.png',
        },
        isHighlighted: true,
        performanceScore: 88,
        socialSentiment: 84,
      },
      {
        playerId: 'stone-mark',
        name: 'Mark Stone',
        jerseyNumber: '61',
        position: 'Right Wing',
        shoots: 'Right',
        age: 32,
        height: '6\'3"',
        weight: 219,
        birthplace: 'Winnipeg, Manitoba, Canada',
        drafted: '2010 - Round 6, Pick 178 (OTT)',
        stats: {
          gamesPlayed: 56,
          goals: 16,
          assists: 36,
          points: 52,
          plusMinus: 12,
          pim: 20,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8475913.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8475913.png',
        },
        isHighlighted: true,
        performanceScore: 85,
        socialSentiment: 81,
      },
      {
        playerId: 'hertl-tomas',
        name: 'Tomas Hertl',
        jerseyNumber: '48',
        position: 'Center',
        shoots: 'Left',
        age: 31,
        height: '6\'2"',
        weight: 215,
        birthplace: 'Prague, Czech Republic',
        drafted: '2012 - Round 1, Pick 17 (SJS)',
        stats: {
          gamesPlayed: 75,
          goals: 19,
          assists: 23,
          points: 42,
          plusMinus: -15,
          pim: 32,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8477455.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8477455.png',
        },
        isHighlighted: false,
        performanceScore: 78,
        socialSentiment: 74,
      },
      {
        playerId: 'pietrangelo-alex',
        name: 'Alex Pietrangelo',
        jerseyNumber: '7',
        position: 'Defense',
        shoots: 'Right',
        age: 35,
        height: '6\'3"',
        weight: 215,
        birthplace: 'King City, Ontario, Canada',
        drafted: '2008 - Round 1, Pick 4 (STL)',
        stats: {
          gamesPlayed: 71,
          goals: 11,
          assists: 32,
          points: 43,
          plusMinus: 2,
          pim: 34,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8474565.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8474565.png',
        },
        isHighlighted: false,
        performanceScore: 81,
        socialSentiment: 76,
      },
      {
        playerId: 'theodore-shea',
        name: 'Shea Theodore',
        jerseyNumber: '27',
        position: 'Defense',
        shoots: 'Left',
        age: 29,
        height: '6\'2"',
        weight: 192,
        birthplace: 'Langley, British Columbia, Canada',
        drafted: '2013 - Round 1, Pick 26 (ANA)',
        stats: {
          gamesPlayed: 78,
          goals: 13,
          assists: 39,
          points: 52,
          plusMinus: 15,
          pim: 30,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8477957.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8477957.png',
        },
        isHighlighted: false,
        performanceScore: 83,
        socialSentiment: 77,
      },
      {
        playerId: 'hill-adin',
        name: 'Adin Hill',
        jerseyNumber: '33',
        position: 'Goalie',
        catches: 'Left',
        age: 28,
        height: '6\'6"',
        weight: 209,
        birthplace: 'Comox, British Columbia, Canada',
        drafted: '2015 - Round 3, Pick 76 (ARI)',
        stats: {
          gamesPlayed: 39,
          wins: 19,
          losses: 14,
          otl: 3,
          gaa: 2.71,
          savePercentage: 0.913,
          shutouts: 2,
        },
        images: {
          headshot: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8478499.png',
          action: 'https://assets.nhle.com/mugs/nhl/20252026/VGK/8478499.png',
        },
        isHighlighted: false,
        performanceScore: 82,
        socialSentiment: 75,
      },
    ],
  },
};

// ============================================
// IMAGE PROCESSING
// ============================================

/**
 * Process all images for a team and return updated team data with GCS URLs
 * Tracks success/failure for each image
 */
async function processTeamImages(teamData) {
  console.log(`\n📸 Processing images for ${teamData.name}...`);

  const teamId = teamData.teamId;
  const updatedTeamData = { ...teamData };
  const imageStats = { success: 0, failed: 0, failedImages: [] };

  // Process team logos
  console.log(`   📌 Processing team logos...`);
  if (teamData.logo?.primary) {
    const gcsPath = `sports/hockey/${teamId}/assets/logo-primary.png`;
    const result = await processImage(teamData.logo.primary, gcsPath, 'image/png');
    if (result.success) {
      updatedTeamData.logo.primary = result.url;
      imageStats.success++;
    } else {
      imageStats.failed++;
      imageStats.failedImages.push({ type: 'logo-primary', url: result.originalUrl });
      // Keep original URL as fallback for logos (less critical)
      updatedTeamData.logo.primary = teamData.logo.primary;
    }
  }
  if (teamData.logo?.alternate) {
    const gcsPath = `sports/hockey/${teamId}/assets/logo-alternate.png`;
    const result = await processImage(teamData.logo.alternate, gcsPath, 'image/png');
    if (result.success) {
      updatedTeamData.logo.alternate = result.url;
      imageStats.success++;
    } else {
      imageStats.failed++;
      imageStats.failedImages.push({ type: 'logo-alternate', url: result.originalUrl });
      updatedTeamData.logo.alternate = teamData.logo.alternate;
    }
  }

  // Process jersey images
  console.log(`   👕 Processing jersey images...`);
  if (teamData.jersey?.home) {
    const gcsPath = `sports/hockey/${teamId}/assets/jersey-home.jpg`;
    const result = await processImage(teamData.jersey.home, gcsPath, 'image/jpeg');
    if (result.success) {
      updatedTeamData.jersey.home = result.url;
      imageStats.success++;
    } else {
      imageStats.failed++;
      imageStats.failedImages.push({ type: 'jersey-home', url: result.originalUrl });
      updatedTeamData.jersey.home = teamData.jersey.home;
    }
  }
  if (teamData.jersey?.away) {
    const gcsPath = `sports/hockey/${teamId}/assets/jersey-away.jpg`;
    const result = await processImage(teamData.jersey.away, gcsPath, 'image/jpeg');
    if (result.success) {
      updatedTeamData.jersey.away = result.url;
      imageStats.success++;
    } else {
      imageStats.failed++;
      imageStats.failedImages.push({ type: 'jersey-away', url: result.originalUrl });
      updatedTeamData.jersey.away = teamData.jersey.away;
    }
  }

  // Process player images - CRITICAL: These MUST be GCS URLs
  console.log(`   👥 Processing ${teamData.players.length} player images...`);
  updatedTeamData.players = await Promise.all(
    teamData.players.map(async (player) => {
      console.log(`      Player: ${player.name}`);
      const playerId = player.playerId;
      const updatedPlayer = { ...player, images: { ...player.images } };

      // Process headshot - MUST succeed for player images
      if (player.images?.headshot) {
        const gcsPath = `sports/hockey/${teamId}/players/${playerId}/headshot.png`;
        const result = await processImage(player.images.headshot, gcsPath, 'image/png');
        if (result.success) {
          updatedPlayer.images.headshot = result.url;
          imageStats.success++;
        } else {
          imageStats.failed++;
          imageStats.failedImages.push({ type: 'player-headshot', player: player.name, url: result.originalUrl });
          // Still save the GCS path we EXPECTED - so we know what's missing
          // But mark it as failed by keeping a special marker
          updatedPlayer.images.headshot = result.url; // null - will be filtered
          updatedPlayer.images._headshotFailed = true;
          updatedPlayer.images._headshotOriginal = result.originalUrl;
        }
      }

      // Process action shot
      if (player.images?.action && player.images.action !== player.images?.headshot) {
        const gcsPath = `sports/hockey/${teamId}/players/${playerId}/action.png`;
        const result = await processImage(player.images.action, gcsPath, 'image/png');
        if (result.success) {
          updatedPlayer.images.action = result.url;
          imageStats.success++;
        } else {
          imageStats.failed++;
          imageStats.failedImages.push({ type: 'player-action', player: player.name, url: result.originalUrl });
          updatedPlayer.images.action = null;
        }
      } else if (player.images?.action === player.images?.headshot) {
        // Action is same as headshot, use the same GCS URL
        updatedPlayer.images.action = updatedPlayer.images.headshot;
      }

      return updatedPlayer;
    })
  );

  console.log(`   ✅ Images processed for ${teamData.name}`);
  console.log(`   📊 Stats: ${imageStats.success} success, ${imageStats.failed} failed`);

  if (imageStats.failedImages.length > 0) {
    console.log(`   ⚠️  Failed images:`);
    imageStats.failedImages.forEach(f => {
      console.log(`      - ${f.type}${f.player ? ` (${f.player})` : ''}: ${f.url}`);
    });
  }

  return { updatedTeamData, imageStats };
}

// ============================================
// SEEDING FUNCTION
// ============================================

async function seedHockeyTeams() {
  try {
    console.log('\n🏒 Starting Hockey Teams Data Seeding...\n');
    console.log('📦 GCS Bucket:', bucketName);
    console.log('📁 Folder Structure: sports/hockey/{team-id}/...\n');

    const sportsTeamsRef = flarelabDb.collection('sports_teams');
    const hockeyRef = sportsTeamsRef.doc('hockey');

    // Track overall stats
    const overallStats = { totalSuccess: 0, totalFailed: 0, failedTeams: [] };

    // Seed each team
    for (const [, teamData] of Object.entries(NHL_TEAMS)) {
      console.log(`\n📍 Processing ${teamData.name}...`);

      // Fetch current roster from NHL API
      console.log(`   🔄 Fetching roster from NHL API...`);
      const rosterData = await fetchNHLRoster(teamData.abbreviation);

      if (rosterData) {
        // Transform all roster players
        const allPlayers = [];

        // Process forwards
        if (rosterData.forwards && rosterData.forwards.length > 0) {
          console.log(`   ⚡ ${rosterData.forwards.length} forwards`);
          rosterData.forwards.forEach(player => {
            allPlayers.push(transformNHLPlayer(player, teamData.abbreviation, teamData.teamId));
          });
        }

        // Process defensemen
        if (rosterData.defensemen && rosterData.defensemen.length > 0) {
          console.log(`   🛡️  ${rosterData.defensemen.length} defensemen`);
          rosterData.defensemen.forEach(player => {
            allPlayers.push(transformNHLPlayer(player, teamData.abbreviation, teamData.teamId));
          });
        }

        // Process goalies
        if (rosterData.goalies && rosterData.goalies.length > 0) {
          console.log(`   🥅 ${rosterData.goalies.length} goalies`);
          rosterData.goalies.forEach(player => {
            allPlayers.push(transformNHLPlayer(player, teamData.abbreviation, teamData.teamId));
          });
        }

        // Update team data with full roster
        teamData.players = allPlayers;
        console.log(`   ✅ Total roster: ${allPlayers.length} players`);
      } else {
        console.log(`   ⚠️  Failed to fetch roster, using existing data`);
      }

      // Process all images and get updated team data with GCS URLs
      const { updatedTeamData: processedTeamData, imageStats } = await processTeamImages(teamData);

      // Track stats
      overallStats.totalSuccess += imageStats.success;
      overallStats.totalFailed += imageStats.failed;
      if (imageStats.failed > 0) {
        overallStats.failedTeams.push({
          team: teamData.name,
          failed: imageStats.failed,
          failedImages: imageStats.failedImages,
        });
      }

      // Create team document with GCS URLs
      console.log(`   💾 Saving to database...`);
      await hockeyRef.collection('teams').doc(processedTeamData.teamId).set({
        ...processedTeamData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`   ✅ Team data saved`);
      console.log(`   👥 ${processedTeamData.players.length} players included`);
      console.log(`   🏟️  Stadium: ${processedTeamData.stadium.name}`);
      console.log(`   📊 Founded: ${processedTeamData.founded}`);
    }

    // Create index document for easy querying
    await hockeyRef.set({
      sport: 'hockey',
      league: 'NHL',
      season: '2024-2025',
      teamsCount: Object.keys(NHL_TEAMS).length,
      teams: Object.keys(NHL_TEAMS).map(key => ({
        teamId: NHL_TEAMS[key].teamId,
        name: NHL_TEAMS[key].name,
        abbreviation: NHL_TEAMS[key].abbreviation,
      })),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('\n✨ Hockey teams data seeded successfully!\n');

    // Show overall image stats
    console.log('📊 IMAGE UPLOAD SUMMARY:');
    console.log(`   ✅ Successfully uploaded: ${overallStats.totalSuccess}`);
    console.log(`   ❌ Failed uploads: ${overallStats.totalFailed}`);

    if (overallStats.failedTeams.length > 0) {
      console.log('\n⚠️  TEAMS WITH FAILED IMAGES:');
      overallStats.failedTeams.forEach(team => {
        console.log(`\n   ${team.team}: ${team.failed} failed`);
        team.failedImages.forEach(img => {
          console.log(`      - ${img.type}${img.player ? ` (${img.player})` : ''}`);
          console.log(`        Source: ${img.url}`);
        });
      });
      console.log('\n   💡 Tip: Re-run the script to retry failed uploads');
    }

    console.log('\n📁 Collection structure:');
    console.log('   sports_teams/');
    console.log('   └── hockey/');
    console.log('       ├── [metadata]');
    console.log('       └── teams/');
    Object.keys(NHL_TEAMS).forEach(key => {
      console.log(`           ├── ${NHL_TEAMS[key].teamId}/`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding hockey teams:', error);
    process.exit(1);
  }
}

// Run the seeding
seedHockeyTeams();
