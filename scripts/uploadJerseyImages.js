/**
 * Upload Jersey Images from CSV
 *
 * Reads jersey URLs from CSV and uploads them to GCS,
 * then updates Firestore team documents with the paths.
 *
 * Usage:
 *   node scripts/uploadJerseyImages.js
 *
 * Options:
 *   --dry-run    Preview without uploading
 *   --team=COL   Process only specific team
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import https from 'https';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  team: args.find(a => a.startsWith('--team='))?.split('=')[1]?.toUpperCase() || null,
};

console.log('🏒 Jersey Image Uploader');
console.log('   Options:', JSON.stringify(options, null, 2));
console.log('');

// Firebase init
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    await fs.readFile('./serviceAccountKeyGoogle.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const FLARELAB_DB_ID = process.env.FLARELAB_DATABASE_ID || 'pixology-flarelab';
const db = admin.firestore();
db.settings({ databaseId: FLARELAB_DB_ID });

// GCS init
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';
const GCS_BASE_PATH = 'sports-v2';

// Team abbreviation to ID mapping
const TEAM_IDS = {
  ANA: 'anaheim-ducks',
  BOS: 'boston-bruins',
  BUF: 'buffalo-sabres',
  CGY: 'calgary-flames',
  CAR: 'carolina-hurricanes',
  CHI: 'chicago-blackhawks',
  COL: 'colorado-avalanche',
  CBJ: 'columbus-blue-jackets',
  DAL: 'dallas-stars',
  DET: 'detroit-red-wings',
  EDM: 'edmonton-oilers',
  FLA: 'florida-panthers',
  LAK: 'los-angeles-kings',
  MIN: 'minnesota-wild',
  MTL: 'montreal-canadiens',
  NSH: 'nashville-predators',
  NJD: 'new-jersey-devils',
  NYI: 'new-york-islanders',
  NYR: 'new-york-rangers',
  OTT: 'ottawa-senators',
  PHI: 'philadelphia-flyers',
  PIT: 'pittsburgh-penguins',
  SJS: 'san-jose-sharks',
  SEA: 'seattle-kraken',
  STL: 'st-louis-blues',
  TBL: 'tampa-bay-lightning',
  TOR: 'toronto-maple-leafs',
  UTA: 'utah-hockey-club',
  VAN: 'vancouver-canucks',
  VGK: 'vegas-golden-knights',
  WSH: 'washington-capitals',
  WPG: 'winnipeg-jets',
};

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function uploadToGCS(buffer, gcsPath) {
  if (options.dryRun) {
    console.log(`      [DRY RUN] Would upload to: ${gcsPath}`);
    return gcsPath;
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(gcsPath);

  await file.save(buffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=86400',
    },
  });

  return gcsPath;
}

async function main() {
  console.log('📄 Reading CSV file...\n');

  const csvPath = './data/nhl-jersey-urls.csv';
  const content = await fs.readFile(csvPath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Group by team
  const teamJerseys = {};
  for (const row of records) {
    if (!row.image_url || row.image_url.trim() === '') continue;
    if (options.team && row.team_abbr !== options.team) continue;

    const abbr = row.team_abbr;
    if (!teamJerseys[abbr]) {
      teamJerseys[abbr] = {
        teamId: TEAM_IDS[abbr],
        teamName: row.team_name,
        jerseys: {},
      };
    }
    teamJerseys[abbr].jerseys[row.jersey_type] = row.image_url;
  }

  const teamsWithJerseys = Object.keys(teamJerseys).length;
  console.log(`📊 Found ${teamsWithJerseys} teams with jersey URLs\n`);

  if (teamsWithJerseys === 0) {
    console.log('⚠️  No jersey URLs found in CSV. Please fill in the URLs first.');
    process.exit(0);
  }

  // Process each team
  for (const [abbr, data] of Object.entries(teamJerseys)) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📍 ${data.teamName} (${abbr})`);
    console.log(`${'─'.repeat(50)}`);

    const jerseyPaths = { home: {}, away: {}, alternate: {} };

    for (const [type, url] of Object.entries(data.jerseys)) {
      console.log(`   📸 ${type} jersey...`);

      try {
        const buffer = await downloadImage(url);
        const gcsPath = `${GCS_BASE_PATH}/hockey/${data.teamId}/jerseys/${type}-front.jpg`;
        await uploadToGCS(buffer, gcsPath);
        jerseyPaths[type].front = gcsPath;
        console.log(`      ✅ Uploaded`);
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
      }
    }

    // Update Firestore
    if (!options.dryRun && Object.keys(jerseyPaths).some(k => jerseyPaths[k].front)) {
      try {
        const teamRef = db.collection('teams_v2').doc(data.teamId);
        const doc = await teamRef.get();

        if (doc.exists) {
          const existingAssets = doc.data().assets || {};
          const updatedJerseys = {
            ...existingAssets.jerseys,
            ...jerseyPaths,
          };

          await teamRef.update({
            'assets.jerseys': updatedJerseys,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`   💾 Updated Firestore`);
        } else {
          console.log(`   ⚠️  Team not found in Firestore`);
        }
      } catch (error) {
        console.log(`   ❌ Firestore error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ COMPLETE');
  console.log('='.repeat(50));

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
