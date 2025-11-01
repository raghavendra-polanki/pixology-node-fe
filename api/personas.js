import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { generateMultiplePersonasInSingleCall } from './services/geminiService.js';
import { generatePersonaImage } from './services/imageGenerationService.js';
import { uploadImageToGCS } from './services/gcsService.js';
import { updateProjectWithPersonas } from './utils/firestoreUtils.js';
import * as fs from 'fs';

const router = express.Router();
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

/**
 * Middleware to verify Google token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const ticket = await client.verifyIdToken({ idToken: token, audience: googleClientId });
    const payload = ticket.getPayload();
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * POST /api/personas/generate
 * Generate personas for a project based on campaign details
 *
 * Request body:
 * {
 *   projectId: string,
 *   campaignDetails: {
 *     campaignName: string,
 *     productDescription: string,
 *     targetAudience: string,
 *     videoLength: string,
 *     callToAction: string
 *   },
 *   numberOfPersonas: number (default: 3, max: 5)
 * }
 */
router.post('/generate', verifyToken, async (req, res) => {
  const { projectId, campaignDetails, numberOfPersonas = 3 } = req.body;

  // Validation
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  if (!campaignDetails || !campaignDetails.productDescription || !campaignDetails.targetAudience) {
    return res.status(400).json({ error: 'campaignDetails with productDescription and targetAudience are required' });
  }

  if (numberOfPersonas < 1 || numberOfPersonas > 5) {
    return res.status(400).json({ error: 'numberOfPersonas must be between 1 and 5' });
  }

  try {
    console.log(`Starting persona generation for project ${projectId}`);
    const personas = [];
    const timestamp = Date.now();

    // Step 1: Generate all personas in a single API call with diversity emphasis
    console.log(`Generating ${numberOfPersonas} diverse personas in single API call`);
    const personaDescriptions = await generateMultiplePersonasInSingleCall(
      campaignDetails.productDescription,
      campaignDetails.targetAudience,
      numberOfPersonas
    );

    console.log(`Successfully generated ${personaDescriptions.length} persona descriptions`);

    // Step 2: Process each persona (generate image, upload, and combine data)
    for (let i = 0; i < personaDescriptions.length; i++) {
      try {
        const personaDescription = personaDescriptions[i];
        console.log(`Processing persona ${i + 1}/${numberOfPersonas}: ${personaDescription.coreIdentity.name}`);

        // Generate persona image
        const imagePrompt = generateImagePrompt(personaDescription);
        const imageBuffer = await generatePersonaImage(imagePrompt);
        console.log(`Generated image for persona ${i + 1}`);

        // Upload image to GCS
        const imageUrl = await uploadImageToGCS(
          imageBuffer,
          projectId,
          personaDescription.coreIdentity.name
        );
        console.log(`Uploaded image to GCS for persona ${i + 1}: ${imageUrl}`);

        // Combine persona data with image URL
        const personaData = {
          id: `persona-${projectId}-${timestamp}-${i}`,
          type: 'mainstream',
          ...personaDescription,
          image: { url: imageUrl },
        };

        personas.push(personaData);

        // Add small delay between image generations to avoid rate limiting
        if (i < personaDescriptions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (personaError) {
        console.error(`Error processing persona ${i + 1}:`, personaError);
        return res.status(500).json({
          error: `Failed to process persona ${i + 1}: ${personaError.message}`,
        });
      }
    }

    // Step 3: Save personas to project in Firestore
    console.log(`Saving ${personas.length} personas to project`);
    const updatedProject = await updateProjectWithPersonas(
      projectId,
      personas,
      req.userId
    );

    console.log(`Successfully generated and saved ${personas.length} personas`);
    return res.status(200).json({
      success: true,
      message: `Generated ${personas.length} diverse personas successfully`,
      personas,
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error in persona generation:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate personas',
    });
  }
});

/**
 * Helper function to generate image prompt from persona description
 */
function generateImagePrompt(personaData) {
  const identity = personaData.coreIdentity;
  const appearance = personaData.physicalAppearance;
  const communication = personaData.personalityAndCommunication;

  return `
Create a professional UGC-style portrait photo of a person with these characteristics:

**Demographics:**
- Name: ${identity.name}
- Age: ${identity.age}
- Gender: ${identity.sex || identity.gender || 'Not specified'}
- Location: ${identity.location || 'Urban area'}

**Physical Appearance:**
- ${appearance.general || 'Professional appearance'}
- Hair: ${appearance.hair || 'Natural style'}
- Build: ${appearance.build || 'Average build'}
- Style: ${appearance.clothingAesthetic || 'Business casual'}
- Notable features: ${appearance.signatureDetails || 'None'}

**Personality Vibe:**
- Demeanor: ${communication.demeanor || 'Friendly and approachable'}
- Energy: ${communication.energyLevel || 'Balanced'}

**Context:**
This person should look trustworthy, authentic, and relatable. They should appear like someone who would genuinely recommend products they believe in. The image should be suitable for User-Generated Content (UGC) style advertising.

**Style Requirements:**
- Professional lighting
- Clean, neutral background (white, grey, or soft colors)
- Natural, friendly expression
- Direct eye contact with camera
- Professional yet relatable appearance
- High quality, 4K resolution
- Suitable for social media and advertising

Please create a realistic, detailed portrait that captures this persona.
  `.trim();
}

export default router;
