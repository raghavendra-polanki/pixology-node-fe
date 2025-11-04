import {
  generateMultiplePersonasInSingleCall,
  generateNarrativesInSingleCall,
  generateStoryScenesInSingleCall,
  generateScreenplayFromStoryboard,
} from './geminiService.js';
import { generatePersonaImage, generateMultipleSceneImages } from './imageGenerationService.js';
import { uploadImageToGCS } from './gcsService.js';
import { generateVideoWithVeo, uploadVideoToGCSStorage } from './videoGenerationService.js';

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
   * Handles persona, narrative, and storyboard scene generation based on node type
   * Supports custom prompts from recipe nodes
   */
  static async executeTextGeneration(node, input) {
    try {
      // Extract custom prompt from recipe node if available
      const customPrompt = node.prompt || null;
      if (customPrompt) {
        console.log(`Using custom prompt from recipe node: ${node.id}`);
      }

      // Check node type to determine generation path
      const isScreenplayGeneration = node.id && node.id.includes('screenplay');
      const isNarrativeGeneration = node.id && node.id.includes('narrative');
      const isStoryGeneration = node.id && node.id.includes('story');

      // Extract inputs (some are optional depending on the generation path)
      const {
        productDescription,
        targetAudience,
        numberOfPersonas,
        numberOfNarratives,
        selectedPersonas,
        selectedPersonaName,
        selectedPersonaDescription,
        narrativeTheme,
        narrativeStructure,
        numberOfScenes,
        videoDuration,
        storyboardScenes,
      } = input;

      if (isScreenplayGeneration) {
        // Screenplay generation path
        const duration = videoDuration || '30s';

        console.log(`Generating screenplay for ${storyboardScenes?.length || 0} storyboard scenes...`);

        if (!storyboardScenes || !Array.isArray(storyboardScenes) || storyboardScenes.length === 0) {
          throw new Error('Missing required input for screenplay: storyboardScenes must be a non-empty array');
        }

        if (!selectedPersonaName) {
          throw new Error('Missing required input for screenplay: selectedPersonaName');
        }

        const screenplay = await generateScreenplayFromStoryboard(
          storyboardScenes,
          duration,
          selectedPersonaName,
          customPrompt  // Pass custom prompt if available
        );

        return screenplay;
      }

      // Validate common inputs for other generation types
      if (!productDescription || !targetAudience) {
        throw new Error('Missing required input: productDescription, targetAudience');
      }

      if (isStoryGeneration) {
        // Story/Storyboard scene generation path
        const sceneCount = numberOfScenes || node.parameters?.numberOfScenes || 6;
        const duration = videoDuration || '30s';

        console.log(`Generating ${sceneCount} story scenes for "${narrativeTheme}"...`);

        if (!selectedPersonaName || !narrativeTheme || !narrativeStructure) {
          throw new Error(
            'Missing required input for storyboard: selectedPersonaName, narrativeTheme, narrativeStructure'
          );
        }

        const scenes = await generateStoryScenesInSingleCall(
          productDescription,
          targetAudience,
          selectedPersonaName,
          selectedPersonaDescription || 'Selected persona',
          narrativeTheme,
          narrativeStructure,
          sceneCount,
          duration,
          customPrompt  // Pass custom prompt if available
        );

        return scenes;
      } else if (isNarrativeGeneration) {
        // Narrative generation path
        const narrativeCount = numberOfNarratives || node.parameters?.numberOfNarratives || 6;
        console.log(`Generating ${narrativeCount} narrative themes...`);

        const narratives = await generateNarrativesInSingleCall(
          productDescription,
          targetAudience,
          narrativeCount,
          selectedPersonas || 'Unknown personas',
          customPrompt  // Pass custom prompt if available
        );

        return narratives;
      } else {
        // Persona generation path (default)
        const personaCount = numberOfPersonas || node.parameters?.numberOfPersonas || 3;
        console.log(`Generating ${personaCount} personas...`);

        const personas = await generateMultiplePersonasInSingleCall(
          productDescription,
          targetAudience,
          personaCount,
          customPrompt  // Pass custom prompt if available
        );

        return personas;
      }
    } catch (error) {
      console.error('Error in text generation:', error);
      throw error;
    }
  }

  /**
   * Execute image generation action
   * Handles both persona images and scene images based on input
   */
  static async executeImageGeneration(node, input) {
    try {
      const { personaData, sceneData } = input;

      // Check if this is scene image generation (Node 2 for storyboard)
      const isSceneImageGeneration = node.id && node.id.includes('generate_scene_images');

      if (isSceneImageGeneration) {
        // Scene image generation path
        if (!sceneData || !Array.isArray(sceneData)) {
          throw new Error('Missing or invalid input: sceneData must be an array');
        }

        const { selectedPersonaName, selectedPersonaImage } = input;

        console.log(`Generating images for ${sceneData.length} storyboard scenes...`);

        // Generate actual images using Gemini API with persona consistency
        const sceneImages = await generateMultipleSceneImages(
          sceneData,
          selectedPersonaName || 'Character',
          selectedPersonaImage || null
        );

        console.log(`Generated ${sceneImages.length} scene images using Gemini API`);
        return sceneImages;
      } else if (personaData && Array.isArray(personaData)) {
        // Persona image generation path
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
      } else {
        throw new Error('Missing or invalid input: sceneData or personaData required');
      }
    } catch (error) {
      console.error('Error in image generation:', error);
      throw error;
    }
  }

  /**
   * Execute video generation action
   * Generates videos from storyboard images and screenplay data using Veo 3.1
   */
  static async executeVideoGeneration(node, input) {
    try {
      const { sceneImage, sceneData, screenplayEntry, projectId, sceneIndex = 0 } = input;

      // Validate required inputs
      if (!sceneImage) {
        throw new Error('Missing required input: sceneImage (base64 encoded image from storyboard)');
      }

      if (!sceneData) {
        throw new Error('Missing required input: sceneData (scene information from storyboard)');
      }

      if (!screenplayEntry) {
        throw new Error('Missing required input: screenplayEntry (scene details from screenplay)');
      }

      if (!projectId) {
        throw new Error('Missing required input: projectId');
      }

      console.log(`Generating video for scene ${sceneIndex + 1}...`);

      // Combine scene and screenplay data for video generation
      const combinedSceneData = {
        title: sceneData.title || screenplayEntry.title || `Scene ${sceneIndex + 1}`,
        visual: sceneData.description || screenplayEntry.description || 'Professional video scene',
        cameraFlow: screenplayEntry.cameraFlow || screenplayEntry.cameraWork || 'Smooth camera movement',
        script: screenplayEntry.script || screenplayEntry.dialogue || 'Scene dialogue or narration',
        backgroundMusic: screenplayEntry.backgroundMusic || 'Background music playing',
        description: screenplayEntry.description || sceneData.description || 'Scene description',
        timeEnd: screenplayEntry.duration || sceneData.duration || '8s',
      };

      // Generate video using Veo 3.1 with storyboard image
      const videoData = await generateVideoWithVeo(sceneImage, combinedSceneData, sceneIndex);

      console.log(`Video generated for scene ${sceneIndex + 1}`);

      // Upload video to GCS
      let videoUrl = null;
      try {
        if (videoData.videoBuffer && videoData.videoBuffer.length > 0) {
          videoUrl = await uploadVideoToGCSStorage(
            videoData.videoBuffer,
            projectId,
            sceneIndex + 1
          );

          console.log(`Video uploaded to GCS: ${videoUrl}`);
        }
      } catch (uploadError) {
        console.warn(`Failed to upload video to GCS: ${uploadError.message}`);
        // Continue without upload if it fails - video generation was still successful
      }

      // Return combined video data with upload URL
      // Return as array - executeAction will wrap it in { output: ... }
      const videoArray = [
        {
          sceneNumber: sceneIndex + 1,
          sceneTitle: combinedSceneData.title,
          videoBuffer: videoData.videoBuffer,
          videoUrl: videoUrl,
          videoFormat: videoData.videoFormat || 'mp4',
          duration: combinedSceneData.timeEnd,
          generatedAt: videoData.generatedAt,
          metadata: {
            ...videoData.metadata,
            uploadedToGCS: !!videoUrl,
          },
        }
      ];

      console.log(`[ActionExecutor] Video generation result structure:`, {
        isArray: Array.isArray(videoArray),
        length: videoArray.length,
        firstVideoKeys: videoArray[0] ? Object.keys(videoArray[0]) : [],
        firstVideoSceneNumber: videoArray[0]?.sceneNumber,
        firstVideoUrl: videoArray[0]?.videoUrl,
      });

      return videoArray;
    } catch (error) {
      console.error('Error in video generation:', error);
      throw error;
    }
  }

  /**
   * Execute data processing action
   * Handles both persona uploads and storyboard uploads
   */
  static async executeDataProcessing(node, input) {
    try {
      const { personaDetails, personaImages, sceneDetails, sceneImages } = input;

      // Check if this is storyboard processing (node.id contains 'upload_and_save')
      const isStoryboardUpload = node.id && node.id.includes('upload_and_save');

      if (isStoryboardUpload) {
        // Storyboard scene upload path
        if (!sceneDetails || !Array.isArray(sceneDetails)) {
          throw new Error('Missing or invalid input: sceneDetails must be an array');
        }

        console.log(`Processing and uploading ${sceneDetails.length} storyboard scenes...`);

        const finalStoryboard = [];

        for (let i = 0; i < sceneDetails.length; i++) {
          try {
            const sceneDetail = sceneDetails[i];
            const sceneImage = sceneImages?.[i];

            console.log(`Processing scene ${i + 1}/${sceneDetails.length}: "${sceneDetail.title}"`);

            let imageUrl = null;

            // Upload image to GCS if actual image buffer is available
            if (sceneImage?.buffer) {
              const sceneName = sceneDetail.title || `scene_${i + 1}`;

              imageUrl = await uploadImageToGCS(
                sceneImage.buffer,
                `storyboards_${Date.now()}`, // Use timestamp as storyboard project identifier
                sceneName
              );

              console.log(`Uploaded image for scene ${i + 1}: ${imageUrl}`);
            } else if (sceneImage?.mockUrl) {
              // Use placeholder/mock image URL if provided (from Node 2)
              imageUrl = sceneImage.mockUrl;
              console.log(`Using placeholder image for scene ${i + 1}: ${imageUrl}`);
            }

            // Combine scene data with image URL
            const combinedScene = {
              sceneNumber: sceneDetail.sceneNumber,
              title: sceneDetail.title,
              duration: sceneDetail.duration,
              description: sceneDetail.description,
              location: sceneDetail.location,
              persona: sceneDetail.persona,
              product: sceneDetail.product,
              visualElements: sceneDetail.visualElements,
              dialogue: sceneDetail.dialogue,
              cameraWork: sceneDetail.cameraWork,
              keyFrameDescription: sceneDetail.keyFrameDescription,
              image: {
                url: imageUrl,
                uploadedAt: imageUrl ? new Date() : null,
              },
            };

            finalStoryboard.push(combinedScene);
          } catch (processingError) {
            console.error(`Error processing scene ${i + 1}:`, processingError);
            if (node.errorHandling?.onError === 'skip') {
              finalStoryboard.push({
                ...sceneDetails[i],
                image: null,
                processingError: processingError.message,
              });
              continue;
            }
            throw processingError;
          }
        }

        return finalStoryboard;
      } else {
        // Persona upload path (original logic)
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
      }
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
