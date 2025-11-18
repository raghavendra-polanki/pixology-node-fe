/**
 * Real Persona Service
 * Manages real personas (photos and details of real humans)
 * Real personas are global and available across all projects
 */

import { v4 as uuidv4 } from 'uuid';
import { uploadImageToGCS, deleteImageFromGCS } from './gcsService.js';

/**
 * Get all real personas
 */
export async function getAllRealPersonas(db) {
  try {
    const realPersonasRef = db.collection('realPersonas');
    const snapshot = await realPersonasRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return [];
    }

    const personas = [];
    snapshot.forEach(doc => {
      personas.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return personas;
  } catch (error) {
    console.error('Error getting real personas:', error);
    throw new Error(`Failed to get real personas: ${error.message}`);
  }
}

/**
 * Get a specific real persona by ID
 */
export async function getRealPersonaById(personaId, db) {
  try {
    const personaRef = db.collection('realPersonas').doc(personaId);
    const doc = await personaRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error getting real persona:', error);
    throw new Error(`Failed to get real persona: ${error.message}`);
  }
}

/**
 * Create a new real persona
 */
export async function createRealPersona(personaData, db) {
  try {
    // Validate required fields
    if (!personaData.name) {
      throw new Error('Persona name is required');
    }

    if (!personaData.images || personaData.images.length === 0) {
      throw new Error('At least one image is required');
    }

    const personaId = uuidv4();
    const now = new Date();

    const realPersona = {
      name: personaData.name,
      age: personaData.age || null,
      demographic: personaData.demographic || '',
      motivation: personaData.motivation || '',
      bio: personaData.bio || '',
      images: personaData.images, // Array of { url, isPrimary }
      createdAt: now,
      updatedAt: now,
      createdBy: personaData.createdBy || 'system', // For future multi-user support
    };

    await db.collection('realPersonas').doc(personaId).set(realPersona);

    console.log(`Real persona created: ${personaId}`);

    return {
      id: personaId,
      ...realPersona,
    };
  } catch (error) {
    console.error('Error creating real persona:', error);
    throw new Error(`Failed to create real persona: ${error.message}`);
  }
}

/**
 * Update an existing real persona
 */
export async function updateRealPersona(personaId, updates, db) {
  try {
    const personaRef = db.collection('realPersonas').doc(personaId);
    const doc = await personaRef.get();

    if (!doc.exists) {
      throw new Error('Real persona not found');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date(),
    };

    await personaRef.update(updatedData);

    console.log(`Real persona updated: ${personaId}`);

    return {
      id: personaId,
      ...doc.data(),
      ...updatedData,
    };
  } catch (error) {
    console.error('Error updating real persona:', error);
    throw new Error(`Failed to update real persona: ${error.message}`);
  }
}

/**
 * Delete a real persona
 */
export async function deleteRealPersona(personaId, db) {
  try {
    const personaRef = db.collection('realPersonas').doc(personaId);
    const doc = await personaRef.get();

    if (!doc.exists) {
      throw new Error('Real persona not found');
    }

    const personaData = doc.data();

    // Delete associated images from GCS
    if (personaData.images && personaData.images.length > 0) {
      for (const image of personaData.images) {
        try {
          await deleteImageFromGCS(image.url);
        } catch (error) {
          console.warn(`Failed to delete image ${image.url}:`, error.message);
          // Continue even if image deletion fails
        }
      }
    }

    // Delete the persona document
    await personaRef.delete();

    console.log(`Real persona deleted: ${personaId}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting real persona:', error);
    throw new Error(`Failed to delete real persona: ${error.message}`);
  }
}

/**
 * Upload image for real persona and return GCS URL
 */
export async function uploadRealPersonaImage(imageBuffer, personaName) {
  try {
    // Use 'real-personas' as a special project ID for global personas
    const projectId = 'real-personas';
    const imageUrl = await uploadImageToGCS(imageBuffer, projectId, personaName);

    console.log(`Real persona image uploaded: ${imageUrl}`);

    return imageUrl;
  } catch (error) {
    console.error('Error uploading real persona image:', error);
    throw new Error(`Failed to upload real persona image: ${error.message}`);
  }
}

/**
 * Convert real persona to PersonaData format for use in projects
 * This ensures compatibility with Stage 3 and later stages
 */
export function convertRealPersonaToPersonaData(realPersona, selectedImageIndex = 0) {
  const selectedImage = realPersona.images[selectedImageIndex] || realPersona.images[0];

  return {
    id: realPersona.id,
    type: 'relatable', // Default type for real personas
    isRealPersona: true, // Flag to distinguish from AI personas
    coreIdentity: {
      name: realPersona.name,
      age: realPersona.age,
      demographic: realPersona.demographic,
      motivation: realPersona.motivation,
      bio: realPersona.bio,
    },
    physicalAppearance: {
      description: `Real person photo`, // Minimal since we have actual photos
    },
    personalityAndCommunication: {
      personality: '', // Not needed for real personas
      communicationStyle: '',
    },
    lifestyleAndWorldview: {
      lifestyle: '',
      worldview: '',
    },
    credibility: {
      expertise: '',
      credentials: '',
    },
    image: {
      url: selectedImage.url,
      altText: `Photo of ${realPersona.name}`,
    },
  };
}
