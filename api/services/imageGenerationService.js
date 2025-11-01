import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate persona image using Gemini 2.5 Flash Image model
 * Creates a professional UGC-style portrait image
 */
export async function generatePersonaImage(imagePrompt) {
  try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" }); // Specify Nano Banana model
      const result = await model.generateContent(imagePrompt);
      const response = await result.response;


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

      return 
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
