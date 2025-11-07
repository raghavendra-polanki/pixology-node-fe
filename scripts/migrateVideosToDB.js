#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Accept project ID from command line argument, otherwise use default
const PROJECT_ID = process.argv[2] || 'HIoCx9ZZb1YAwyg84n2t';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'pixology-personas';
const SCENES = [1, 2, 3, 4, 5, 6]; // Include scene 1
const VIDEO_FILE = 'sample_0.mp4';

// Require service account path from environment variable
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.error('   Required for Firestore and GCS authentication');
  process.exit(1);
}

console.log(`✓ Using service account: ${serviceAccountPath}`);
console.log(`✓ GCS Bucket: ${GCS_BUCKET_NAME}`);
console.log(`✓ Project ID: ${PROJECT_ID}`);
console.log(`✓ Scenes to migrate: ${SCENES.join(', ')}\n`);

// Initialize Firebase
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

// Initialize GCS
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || 'core-silicon-476114-i0',
});

const db = admin.firestore();

async function findVideoInScene(sceneNumber) {
  try {
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const prefix = `videos/${PROJECT_ID}/scene_${sceneNumber}/`;

    console.log(`\n🔍 Searching for videos in: ${prefix}`);

    // List all files in the scene directory
    const [files] = await bucket.getFiles({ prefix });

    if (files.length === 0) {
      console.log(`   ⚠️  No files found for scene ${sceneNumber}`);
      return null;
    }

    // Find the sample_4.mp4 file
    const videoFile = files.find(file => file.name.endsWith(VIDEO_FILE));

    if (!videoFile) {
      console.log(`   ⚠️  ${VIDEO_FILE} not found for scene ${sceneNumber}`);
      console.log(`   Found files: ${files.map(f => f.name.split('/').pop()).join(', ')}`);
      return null;
    }

    const filename = videoFile.name;
    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${filename}`;

    console.log(`   ✅ Found: ${filename}`);
    console.log(`   🌐 Public URL: ${publicUrl}`);

    return {
      sceneNumber,
      filename,
      publicUrl,
      gcsUri: `gs://${GCS_BUCKET_NAME}/${filename}`,
    };
  } catch (error) {
    console.error(`   ❌ Error searching for scene ${sceneNumber}:`, error.message);
    return null;
  }
}

async function getAllVideos() {
  const videos = [];

  for (const sceneNumber of SCENES) {
    const video = await findVideoInScene(sceneNumber);
    if (video) {
      videos.push(video);
    }
  }

  return videos;
}

async function updateProjectWithVideos(videos) {
  if (videos.length === 0) {
    console.error('\n❌ No videos found to migrate');
    return false;
  }

  try {
    console.log(`\n📋 Fetching project ${PROJECT_ID}...`);
    const projectDoc = await db.collection('projects').doc(PROJECT_ID).get();

    if (!projectDoc.exists) {
      console.error(`❌ Project ${PROJECT_ID} not found`);
      return false;
    }

    const project = projectDoc.data();
    console.log(`✅ Project found: ${project.title || 'Untitled'}`);

    // Get existing videos if any
    const existingVideos = project.aiGeneratedVideos?.videos || [];
    console.log(`\n📝 Current videos in project: ${existingVideos.length}`);

    // Create AIGeneratedVideo entries for each new video
    const updatedVideos = [];

    // First, keep existing videos (excluding the scenes we're updating)
    for (const existingVideo of existingVideos) {
      if (!SCENES.includes(existingVideo.sceneNumber)) {
        updatedVideos.push(existingVideo);
      }
    }

    // Add/replace with new videos
    const generatedAtString = new Date().toISOString();
    for (const video of videos) {
      const newVideoEntry = {
        videoId: `video_${video.sceneNumber}_${Date.now()}`,
        sceneNumber: video.sceneNumber,
        sceneTitle: `Scene ${video.sceneNumber}`,
        videoUrl: video.publicUrl,
        gcsUri: video.gcsUri,
        duration: '6s',
        resolution: '720p',
        format: 'mp4',
        status: 'complete',
        generatedAt: generatedAtString,
        model: 'veo-3.1-generate-preview',
      };
      updatedVideos.push(newVideoEntry);
    }

    // Create AIGeneratedVideos collection
    const aiGeneratedVideos = {
      videoCollectionId: PROJECT_ID,
      title: `Video Generation for ${project.title || 'Project'}`,
      videos: updatedVideos,
      completedCount: updatedVideos.filter(v => v.status === 'complete').length,
      failedCount: updatedVideos.filter(v => v.status === 'error').length,
      totalCount: updatedVideos.length,
      generatedAt: generatedAtString,
      model: 'veo-3.1-generate-preview',
    };

    console.log(`\n💾 Updating project with ${updatedVideos.length} total videos...`);
    console.log(`   - New videos added: ${videos.length}`);
    console.log(`   - Total after update: ${updatedVideos.length}`);

    // Update the project
    await db.collection('projects').doc(PROJECT_ID).update({
      aiGeneratedVideos,
      updatedAt: new Date(),
    });

    console.log(`\n✅ Project updated successfully!`);
    console.log(`\n📊 Migration Summary:`);
    for (const video of videos) {
      console.log(`   Scene ${video.sceneNumber}: ${video.publicUrl.substring(0, 80)}...`);
    }

    return true;
  } catch (error) {
    console.error(`\n❌ Error updating project:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('=' + '='.repeat(79));
    console.log('  VIDEO MIGRATION SCRIPT - GCS to Firestore');
    console.log('=' + '='.repeat(79));

    const videos = await getAllVideos();

    if (videos.length === 0) {
      console.error('\n❌ No videos found in GCS');
      process.exit(1);
    }

    console.log(`\n✅ Found ${videos.length} videos ready for migration`);

    const success = await updateProjectWithVideos(videos);

    if (success) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('   Videos will now persist when you refresh the browser.');
    } else {
      console.error('\n❌ Migration failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

main();
