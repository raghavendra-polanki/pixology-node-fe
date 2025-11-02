import { generateMultiplePersonasInSingleCall } from './geminiService.js';
import { generatePersonaImage } from './imageGenerationService.js';
import { uploadImageToGCS } from './gcsService.js';

/**
 * ActionExecutor - Executes individual recipe actions (nodes)
 */
export class ActionExecutor {
  /**
   * Execute a single action node
   * @param {object} node - Action node configuration
   * @param {object} input - Input data for the action
   * @returns {Promise<object>} Result with output, status, metadata
   */
  static async executeAction(node, input) {
    const result = {
      nodeId: node.id,
      status: 'processing',
      input,
      startedAt: Date.now(),
      error: null,
    };

    try {
      console.log(`Executing action: ${node.name} (${node.id})`);

      let output;

      // Route to appropriate executor based on type
      switch (node.type) {
        case 'text_generation':
          output = await this.executeTextGeneration(node, input);
          break;

        case 'image_generation':
          output = await this.executeImageGeneration(node, input);
          break;

        case 'video_generation':
          output = await this.executeVideoGeneration(node, input);
          break;

        case 'data_processing':
          output = await this.executeDataProcessing(node, input);
          break;

        default:
          throw new Error(`Unknown action type: ${node.type}`);
      }

      result.output = output;
      result.status = 'completed';
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      console.log(`Action ${node.id} completed in ${result.duration}ms`);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        stack: error.stack,
      };
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      console.error(`Action ${node.id} failed:`, error.message);

      // Handle error strategy
      if (node.errorHandling?.onError === 'fail') {
        throw error;
      } else if (node.errorHandling?.onError === 'skip') {
        result.status = 'skipped';
        result.output = node.errorHandling?.defaultOutput;
        return result;
      } else if (node.errorHandling?.onError === 'retry') {
        // Retry logic would be handled by caller
        throw error;
      }

      throw error;
    }
  }

  /**
   * Execute text generation action
   */
  static async executeTextGeneration(node, input) {
    try {
      const { productDescription, targetAudience, numberOfPersonas } = input;

      if (!productDescription || !targetAudience) {
        throw new Error('Missing required input: productDescription, targetAudience');
      }

      console.log(`Generating ${numberOfPersonas || 3} personas...`);

      const personas = await generateMultiplePersonasInSingleCall(
        productDescription,
        targetAudience,
        numberOfPersonas || node.parameters?.numberOfPersonas || 3
      );

      return personas;
    } catch (error) {
      console.error('Error in text generation:', error);
      throw error;
    }
  }

  /**
   * Execute image generation action
   */
  static async executeImageGeneration(node, input) {
    try {
      const { personaData } = input;

      if (!personaData || !Array.isArray(personaData)) {
        throw new Error('Missing or invalid input: personaData must be an array');
      }

      console.log(`Generating ${personaData.length} persona images...`);

      const images = [];

      for (let i = 0; i < personaData.length; i++) {
        try {
          const persona = personaData[i];
          const imagePrompt = this.generateImagePrompt(persona);

          console.log(`Generating image for persona ${i + 1}/${personaData.length}`);

          const imageBuffer = await generatePersonaImage(imagePrompt);

          images.push({
            personaId: persona.id || `persona_${i}`,
            personaName: persona.coreIdentity?.name || 'Unknown',
            buffer: imageBuffer,
            generatedAt: Date.now(),
          });

          // Add small delay between image generations to avoid rate limiting
          if (i < personaData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (personaError) {
          console.error(`Error generating image for persona ${i + 1}:`, personaError);
          // Continue with next persona if error handling is 'skip'
          if (node.errorHandling?.onError === 'skip') {
            images.push({
              personaId: personaData[i].id || `persona_${i}`,
              personaName: personaData[i].coreIdentity?.name || 'Unknown',
              buffer: null,
              error: personaError.message,
            });
            continue;
          }
          throw personaError;
        }
      }

      return images;
    } catch (error) {
      console.error('Error in image generation:', error);
      throw error;
    }
  }

  /**
   * Execute video generation action (placeholder for future implementation)
   */
  static async executeVideoGeneration(node, input) {
    throw new Error('Video generation not yet implemented');
  }

  /**
   * Execute data processing action
   */
  static async executeDataProcessing(node, input) {
    try {
      const { personaDetails, personaImages } = input;

      if (!personaDetails || !Array.isArray(personaDetails)) {
        throw new Error('Missing or invalid input: personaDetails must be an array');
      }

      console.log(`Processing and uploading ${personaDetails.length} personas...`);

      const finalPersonas = [];

      for (let i = 0; i < personaDetails.length; i++) {
        try {
          const personaDetail = personaDetails[i];
          const personaImage = personaImages?.[i];

          console.log(`Processing persona ${i + 1}/${personaDetails.length}`);

          let imageUrl = null;

          // Upload image to GCS if available
          if (personaImage?.buffer) {
            const personaName = personaDetail.coreIdentity?.name || `persona_${i}`;

            imageUrl = await uploadImageToGCS(
              personaImage.buffer,
              `personas_${Date.now()}`, // Use timestamp as project identifier
              personaName
            );

            console.log(`Uploaded image for ${personaName}: ${imageUrl}`);
          }

          // Combine persona data with image URL
          const combinedPersona = {
            id: personaDetail.id || personaImage?.personaId || `persona_${Date.now()}_${i}`,
            ...personaDetail,
            image: {
              url: imageUrl,
              uploadedAt: imageUrl ? Date.now() : null,
            },
          };

          finalPersonas.push(combinedPersona);
        } catch (processingError) {
          console.error(`Error processing persona ${i + 1}:`, processingError);
          if (node.errorHandling?.onError === 'skip') {
            finalPersonas.push({
              ...personaDetails[i],
              image: null,
              processingError: processingError.message,
            });
            continue;
          }
          throw processingError;
        }
      }

      return finalPersonas;
    } catch (error) {
      console.error('Error in data processing:', error);
      throw error;
    }
  }

  /**
   * Generate image prompt from persona description
   */
  static generateImagePrompt(personaData) {
    const identity = personaData.coreIdentity || {};
    const appearance = personaData.physicalAppearance || {};
    const communication = personaData.personalityAndCommunication || {};

    return `
Create a professional UGC-style portrait photo of a person with these characteristics:

**Demographics:**
- Name: ${identity.name || 'Unknown'}
- Age: ${identity.age || 'Not specified'}
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
}

export default ActionExecutor;
