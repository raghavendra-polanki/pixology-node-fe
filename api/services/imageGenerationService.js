import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate persona image using Gemini 2.5 Flash Image model
 * Creates a professional UGC-style portrait image
 */
export async function generatePersonaImage(imagePrompt) {
  try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" }); // Specify Nano Banana model
      const result = await model.generateContent(imagePrompt);
      const response = result.response;


    const generatedImagePart = response.candidates[0].content.parts.find(
      part => part.inlineData
    );

    if (generatedImagePart && generatedImagePart.inlineData) {
      const imageBuffer = Buffer.from(generatedImagePart.inlineData.data, 'base64');
      return imageBuffer;
    } else {
      console.error('No image data found in the response.');
      return null;
    }
  } catch (error) {
    console.error('Error generating persona image:', error);
    throw new Error(`Failed to generate persona image: ${error.message}`);
  }
}

/**
 * Generate multiple persona images sequentially with rate limiting
 */
export async function generateMultiplePersonaImages(prompts) {
  const images = [];

  for (let i = 0; i < prompts.length; i++) {
    try {
      const imageBuffer = await generatePersonaImage(prompts[i]);
      images.push(imageBuffer);

      // Add delay between API calls to avoid rate limiting
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to generate image for prompt ${i + 1}:`, error);
      throw error;
    }
  }

  return images;
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageFromUrl(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error(`Error fetching image from URL: ${error.message}`);
    return null;
  }
}

/**
 * Helper function to convert base64 string, Buffer, or URL to base64 string
 */
async function ensureBase64String(imageData) {
  if (!imageData) return null;

  if (Buffer.isBuffer(imageData)) {
    return imageData.toString('base64');
  }

  if (typeof imageData === 'string') {
    // Check if it's a URL (starts with http)
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return await fetchImageFromUrl(imageData);
    }
    // Assume it's already base64
    return imageData;
  }

  return null;
}

/**
 * Generate a scene image using Gemini 2.5 Flash Image model
 * Creates a visual representation of a storyboard scene with consistent persona
 *
 * @param {string} sceneDescription - The scene description/instructions
 * @param {string} personaName - Name of the persona/character
 * @param {Buffer|string} personaImageBuffer - Persona profile image as buffer or base64
 * @param {Buffer|string} previousSceneImageBuffer - Previous scene image for continuity (optional)
 */
export async function generateSceneImage(sceneDescription, personaName, personaImageBuffer, previousSceneImageBuffer = null) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // Convert image data to base64 if needed
    const personaImageBase64 = await ensureBase64String(personaImageBuffer);
    const previousSceneBase64 = await ensureBase64String(previousSceneImageBuffer);

    // Build content array for the API request
    const contentParts = [];

    // Add the main scene prompt
    let scenePrompt = `Create a cinematic UGC (User-Generated Content) advertising scene following this description:

${sceneDescription}

**CRITICAL - CHARACTER CONSISTENCY:**
The character "${personaName}" appears in the reference images. MUST maintain identical appearance in this scene:
- Same facial features, bone structure, and expression
- Same clothing style and colors
- Same hair style, length, and color
- Same body build and posture
- Same skin tone
- Look exactly like the person in the reference image`;

    if (previousSceneBase64) {
      scenePrompt += `

**VISUAL REFERENCE:**
You have been provided with the character's profile image and the previous scene. Use these as references to ensure the character looks exactly the same in this new scene.`;
    }

    scenePrompt += `

**Style Requirements:**
- Professional cinematic quality, 4K resolution
- UGC advertising style (authentic, relatable, engaging)
- Natural lighting and composition
- Suitable for social media advertising

Create the scene exactly as described while keeping the character's appearance consistent.`;

    // Add text content
    contentParts.push({ text: scenePrompt });

    // Add persona image if available
    if (personaImageBase64) {
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: personaImageBase64,
        },
      });
    }

    // Add previous scene image if available (this provides context for consistency)
    if (previousSceneBase64) {
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: previousSceneBase64,
        },
      });
    }

    console.log(`Generating scene image for: ${sceneDescription.substring(0, 50)}...`);
    console.log(`  - With persona reference: ${!!personaImageBase64}`);
    console.log(`  - With previous scene context: ${!!previousSceneBase64}`);

    const result = await model.generateContent({
      contents: [{ parts: contentParts }],
    });

    const response = result.response;

    const generatedImagePart = response.candidates[0].content.parts.find(
      part => part.inlineData
    );

    if (generatedImagePart && generatedImagePart.inlineData) {
      const imageBuffer = Buffer.from(generatedImagePart.inlineData.data, 'base64');
      return imageBuffer;
    } else {
      console.error('No image data found in scene generation response.');
      return null;
    }
  } catch (error) {
    console.error('Error generating scene image:', error);
    throw new Error(`Failed to generate scene image: ${error.message}`);
  }
}

/**
 * Generate multiple scene images sequentially with visual consistency
 * Each scene uses the persona image and previous scene image for context
 *
 * @param {array} scenes - Array of scene objects with description and context
 * @param {string} personaName - Name of the main character/persona
 * @param {Buffer|string} personaImageBuffer - Persona profile image buffer
 */
export async function generateMultipleSceneImages(scenes, personaName, personaImageBuffer) {
  const images = [];
  let previousSceneImageBuffer = null;

  for (let i = 0; i < scenes.length; i++) {
    try {
      const scene = scenes[i];
      const sceneDescription = scene.description || scene.title || `Scene ${i + 1}`;

      console.log(`\n=== Generating image for scene ${i + 1}/${scenes.length} ===`);
      console.log(`Title: "${scene.title}"`);
      console.log(`Description: ${sceneDescription.substring(0, 100)}...`);

      // Generate image with persona reference and previous scene for context
      const imageBuffer = await generateSceneImage(
        sceneDescription,
        personaName,
        personaImageBuffer,  // Always include persona image for consistency
        previousSceneImageBuffer   // Include previous scene for visual continuity
      );

      if (imageBuffer) {
        images.push({
          sceneId: scene.sceneNumber || i + 1,
          sceneTitle: scene.title || `Scene ${i + 1}`,
          buffer: imageBuffer,
          generatedAt: Date.now(),
        });

        // Store this image as the previous scene for the next iteration
        previousSceneImageBuffer = imageBuffer;
        console.log(`✓ Scene ${i + 1} image generated successfully`);
      } else {
        throw new Error('Image generation returned null buffer');
      }

      // Add delay between API calls to avoid rate limiting
      if (i < scenes.length - 1) {
        console.log(`Waiting 1 second before next scene...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`✗ Failed to generate image for scene ${i + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`\n=== Successfully generated ${images.length}/${scenes.length} scene images ===\n`);
  return images;
}
