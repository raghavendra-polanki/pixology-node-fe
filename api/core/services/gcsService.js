import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable automatically
  // when keyFilename is not explicitly provided
});

const bucketName = process.env.GCS_BUCKET_NAME || 'pixology-personas';

/**
 * Upload image buffer to Google Cloud Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadImageToGCS(imageBuffer, projectId, personaName) {
  try {
    // Validate inputs
    if (!imageBuffer || !projectId || !personaName) {
      throw new Error('Missing required parameters: imageBuffer, projectId, personaName');
    }

    const bucket = storage.bucket(bucketName);

    // Create unique filename with persona name and timestamp
    const sanitizedName = personaName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const filename = `personas/${projectId}/${sanitizedName}-${timestamp}-${uniqueId}.png`;

    // Create file object
    const file = bucket.file(filename);

    // Upload the image as publicly readable
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400', // Cache for 24 hours
      },

    });

    // Generate the public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    console.log(`Successfully uploaded image to GCS as public: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to GCS:', error);
    throw new Error(`Failed to upload image to GCS: ${error.message}`);
  }
}

/**
 * Delete image from GCS (for cleanup/removal)
 */
export async function deleteImageFromGCS(imageUrl) {
  try {
    // Extract filename from public URL
    // URL format: https://storage.googleapis.com/bucket-name/file/path/name.png
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p); // Remove empty parts
    // Skip the bucket name (first part) and get the rest
    const filename = pathParts.slice(1).join('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    // Delete the file
    await file.delete();

    console.log(`Successfully deleted image from GCS: ${imageUrl}`);
  } catch (error) {
    console.error('Error deleting image from GCS:', error);
    throw new Error(`Failed to delete image from GCS: ${error.message}`);
  }
}

/**
 * Upload multiple images to GCS
 */
export async function uploadMultipleImagesToGCS(imageBuffers, projectId, personaNames) {
  try {
    if (imageBuffers.length !== personaNames.length) {
      throw new Error('Number of images must match number of persona names');
    }

    const uploadedUrls = [];

    for (let i = 0; i < imageBuffers.length; i++) {
      const url = await uploadImageToGCS(imageBuffers[i], projectId, personaNames[i]);
      uploadedUrls.push(url);

      // Small delay between uploads to avoid overwhelming the service
      if (i < imageBuffers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading multiple images to GCS:', error);
    throw new Error(`Failed to upload multiple images: ${error.message}`);
  }
}

/**
 * Get file metadata from GCS
 */
export async function getImageMetadata(imageUrl) {
  try {
    // Extract filename from public URL
    // URL format: https://storage.googleapis.com/bucket-name/file/path/name.png
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p); // Remove empty parts
    // Skip the bucket name (first part) and get the rest
    const filename = pathParts.slice(1).join('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    const [metadata] = await file.getMetadata();

    return metadata;
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
}

/**
 * Check if image exists in GCS
 */
export async function imageExistsInGCS(imageUrl) {
  try {
    // Extract filename from public URL
    // URL format: https://storage.googleapis.com/bucket-name/file/path/name.png
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p); // Remove empty parts
    // Skip the bucket name (first part) and get the rest
    const filename = pathParts.slice(1).join('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    const [exists] = await file.exists();

    return exists;
  } catch (error) {
    console.error('Error checking if image exists:', error);
    return false;
  }
}

/**
 * Upload video stream directly to GCS from a readable stream
 * Useful for streaming large files without buffering in memory
 */
export async function uploadVideoStreamToGCS(readableStream, projectId, sceneName) {
  const videoBucketName = bucketName;

  try {
    // Validate inputs
    if (!readableStream || !projectId || !sceneName) {
      throw new Error('Missing required parameters: readableStream, projectId, sceneName');
    }

    const bucket = storage.bucket(videoBucketName);

    // Create unique filename with scene name and timestamp
    const sanitizedName = sceneName.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const filename = `videos/${projectId}/${sanitizedName}-${timestamp}-${uniqueId}.mp4`;

    // Create file object
    const file = bucket.file(filename);

    // Create write stream and pipe the readable stream to it
    const writeStream = file.createWriteStream({
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=604800', // Cache for 7 days
      },
    });

    return new Promise((resolve, reject) => {
      readableStream.pipe(writeStream);

      writeStream.on('finish', () => {
        // Generate the public URL
        const publicUrl = `https://storage.googleapis.com/${videoBucketName}/${filename}`;
        console.log(`Successfully uploaded video stream to GCS: ${publicUrl}`);
        resolve(publicUrl);
      });

      writeStream.on('error', (error) => {
        console.error('Error uploading video stream to GCS:', error);
        reject(new Error(`Failed to upload video stream to GCS: ${error.message}`));
      });

      readableStream.on('error', (error) => {
        console.error('Error reading video stream:', error);
        reject(new Error(`Error reading video stream: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('Error in uploadVideoStreamToGCS:', error.message || error);
    throw new Error(`Failed to upload video stream to GCS: ${error.message}`);
  }
}

/**
 * Upload video buffer to Google Cloud Storage
 * Returns the public URL of the uploaded video
 */
export async function uploadVideoToGCS(videoBuffer, projectId, sceneName) {
  // Use same bucket as images (GCS_BUCKET_NAME)
  const videoBucketName = bucketName;

  try {
    // Validate inputs
    if (!videoBuffer || !projectId || !sceneName) {
      throw new Error('Missing required parameters: videoBuffer, projectId, sceneName');
    }

    const bucket = storage.bucket(videoBucketName);

    // Create unique filename with scene name and timestamp
    const sanitizedName = sceneName.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const filename = `videos/${projectId}/${sanitizedName}-${timestamp}-${uniqueId}.mp4`;

    // Create file object
    const file = bucket.file(filename);

    // Upload the video as publicly readable
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=604800', // Cache for 7 days
      },
    });

    // Generate the public URL
    const publicUrl = `https://storage.googleapis.com/${videoBucketName}/${filename}`;

    console.log(`Successfully uploaded video to GCS as public: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    // In development, if bucket doesn't exist, return a mock URL
    if ((error.status === 404 || error.code === 404) &&
        (error.message?.includes('bucket does not exist') || error.message?.includes('The specified bucket'))) {
      console.warn(`GCS bucket not found (${videoBucketName}). Using mock URL for development.`);
      const mockUrl = `https://mock-gcs.local/videos/${projectId}/${sceneName}-${Date.now()}.mp4`;
      console.log(`Mock video URL: ${mockUrl}`);
      return mockUrl;
    }

    console.error('Error uploading video to GCS:', error.message || error);
    throw new Error(`Failed to upload video to GCS: ${error.message}`);
  }
}

/**
 * Upload team/player asset (logo, headshot, etc.) to GCS
 * Supports overwriting by using consistent filenames
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {string} assetType - Type of asset: 'team-logo', 'player-headshot'
 * @param {string} entityId - Team ID or Player ID
 * @param {string} fileExtension - File extension (e.g., 'png', 'jpg')
 * @param {string} oldImageUrl - Optional: URL of old image to delete
 * @returns {string} Public URL of the uploaded image
 */
export async function uploadTeamPlayerAsset(imageBuffer, assetType, entityId, fileExtension = 'png', oldImageUrl = null) {
  try {
    // Validate inputs
    if (!imageBuffer || !assetType || !entityId) {
      throw new Error('Missing required parameters: imageBuffer, assetType, entityId');
    }

    const bucket = storage.bucket(bucketName);

    // Create unique filename to avoid needing delete/overwrite permissions
    // Format: gamelab/teams/{teamId}/logo-{timestamp}.png
    const folder = assetType.startsWith('team') ? 'teams' : 'players';
    const assetName = assetType.split('-')[1]; // Extract 'logo' or 'headshot'
    const timestamp = Date.now();
    const filename = `gamelab/${folder}/${entityId}/${assetName}-${timestamp}.${fileExtension}`;

    // Try to delete old image (optional - won't fail if no permission)
    if (oldImageUrl && oldImageUrl.includes(bucketName)) {
      try {
        await deleteImageFromGCS(oldImageUrl);
        console.log('Deleted old image:', oldImageUrl);
      } catch (error) {
        // Log warning but continue - we'll just have orphaned files
        console.warn('Could not delete old image (will be orphaned):', error.message);
      }
    }

    // Create file object
    const file = bucket.file(filename);

    // Determine content type based on extension
    const contentTypeMap = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const contentType = contentTypeMap[fileExtension.toLowerCase()] || 'image/png';

    // Upload the image
    // Note: Bucket uses uniform bucket-level access, so public access is configured at bucket level
    await file.save(imageBuffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=86400', // Cache for 24 hours
      },
    });

    // Generate the public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    console.log(`Successfully uploaded ${assetType} to GCS: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${assetType} to GCS:`, error);
    throw new Error(`Failed to upload ${assetType} to GCS: ${error.message}`);
  }
}
