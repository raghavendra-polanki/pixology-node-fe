import { GoogleGenerativeAI } from '@google/generative-ai';

// Debug: Log the API key being loaded (first 10 chars + last 5 chars for security)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
} else {
  console.log(`✅ GEMINI_API_KEY loaded: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generate persona description using Gemini 2.5 Flash
 * Creates a detailed persona based on product and target audience
 */
export async function generatePersonaDescription(productDescription, targetAudience, personaNumber) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert Casting Director and Consumer Psychologist. Your task is to create a detailed, believable persona for a User-Generated Content (UGC) video creator who would authentically recommend this product.

**PRODUCT CONTEXT:**
Product Description: ${productDescription}
Target Audience: ${targetAudience}
Persona Number: ${personaNumber}

**YOUR TASK:**
Create persona #${personaNumber} - a unique individual with distinct characteristics who would genuinely recommend this product. This person should feel real, relatable, and authentic. Avoid generic descriptions. The person shoudl be one among the target audience.

**RESPOND IN THIS EXACT JSON FORMAT:**
{
  "coreIdentity": {
    "name": "A realistic first name",
    "age": "Age as number between 18-65",
    "demographic": "Brief demographic description (e.g., 'Young professional from urban area')",
    "motivation": "Why would this person use/recommend this product? (2-3 sentences)",
    "bio": "A 2-3 sentence biography that establishes who they are"
  },
  "physicalAppearance": {
    "general": "Overall appearance description (2 sentences)",
    "hair": "Hair color, style, and texture",
    "build": "Body type and build (e.g., 'Athletic build', 'Average/curvy')",
    "clothingAesthetic": "Their style of dress (e.g., 'Minimalist', 'Trendy casual', 'Athletic')",
    "signatureDetails": "Distinctive features or accessories they're known for"
  },
  "personalityAndCommunication": {
    "demeanor": "How they present themselves (e.g., 'Warm and approachable', 'Confident and assertive')",
    "energyLevel": "Their natural energy (e.g., 'High-energy and enthusiastic', 'Calm and measured')",
    "speechPatterns": "How they talk (e.g., 'Conversational and witty', 'Direct and practical')",
    "values": "Core values they care about (list 3-4)"
  },
  "lifestyleAndWorldview": {
    "profession": "What they do for work",
    "hobbies": "3-4 hobbies or interests",
    "lifestyleChoices": "How they spend their time and money (2-3 sentences)",
    "socialMediaHabits": "How they use social media and what they post about"
  },
  "whyAndCredibility": {
    "whyTheyUseProduct": "Their genuine reason for using this product (2-3 sentences)",
    "credibility": "Why their recommendation would be credible (What experience/expertise do they have?)",
    "influenceStyle": "How they influence others (e.g., 'Through personal examples', 'Through detailed explanations')"
  }
}

**IMPORTANT GUIDELINES:**
- Create a UNIQUE persona, not a stereotype
- Make the person feel like they could exist in real life
- The persona should have a genuine connection to the product (not forced)
- Avoid clichés or generic descriptions
- Make physical appearance detailed enough for image generation (specifics about clothing style, hair, notable features)

**CRITICAL:** Return ONLY the JSON object, no additional text before or after.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from markdown code blocks if present
    let jsonString = responseText;

    // Remove markdown code block wrapper (```json ... ```)
    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1].trim();
    } else {
      // If no markdown block, try to extract JSON object directly
      const objectMatch = responseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonString = objectMatch[0];
      }
    }

    // Parse the JSON response
    const personaData = JSON.parse(jsonString);

    return personaData;
  } catch (error) {
    console.error('Error generating persona description:', error);
    throw new Error(`Failed to generate persona description: ${error.message}`);
  }
}

/**
 * Generate multiple personas in a single API call (optimized version)
 * Generates 3 diverse personas in one prompt to reduce API calls and cost
 */
export async function generateMultiplePersonasInSingleCall(productDescription, targetAudience, numberOfPersonas = 3) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert Casting Director and Consumer Psychologist. Your task is to create ${numberOfPersonas} detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators who would authentically recommend this product.

**PRODUCT CONTEXT:**
Product Description: ${productDescription}
Target Audience: ${targetAudience}

**YOUR TASK:**
Create ${numberOfPersonas} UNIQUE personas with DIVERSE characteristics who would genuinely recommend this product. Each person should feel real, relatable, and authentic with distinct demographics, personalities, and backgrounds. Avoid stereotypes and ensure variety across:
- Age ranges
- Professional backgrounds
- Personality types and communication styles
- Lifestyles and values
- Geographic/cultural contexts

Each persona should have a genuine connection to the product (not forced).

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "coreIdentity": {
      "name": "A realistic first name",
      "age": "Age as number between 18-65",
      "demographic": "Brief demographic description (e.g., 'Young professional from urban area')",
      "motivation": "Why would this person use/recommend this product? (2-3 sentences)",
      "bio": "A 2-3 sentence biography that establishes who they are"
    },
    "physicalAppearance": {
      "general": "Overall appearance description (2 sentences)",
      "hair": "Hair color, style, and texture",
      "build": "Body type and build (e.g., 'Athletic build', 'Average/curvy')",
      "clothingAesthetic": "Their style of dress (e.g., 'Minimalist', 'Trendy casual', 'Athletic')",
      "signatureDetails": "Distinctive features or accessories they're known for"
    },
    "personalityAndCommunication": {
      "demeanor": "How they present themselves (e.g., 'Warm and approachable', 'Confident and assertive')",
      "energyLevel": "Their natural energy (e.g., 'High-energy and enthusiastic', 'Calm and measured')",
      "speechPatterns": "How they talk (e.g., 'Conversational and witty', 'Direct and practical')",
      "values": "Core values they care about (list 3-4)"
    },
    "lifestyleAndWorldview": {
      "profession": "What they do for work",
      "hobbies": "3-4 hobbies or interests",
      "lifestyleChoices": "How they spend their time and money (2-3 sentences)",
      "socialMediaHabits": "How they use social media and what they post about"
    },
    "whyAndCredibility": {
      "whyTheyUseProduct": "Their genuine reason for using this product (2-3 sentences)",
      "credibility": "Why their recommendation would be credible (What experience/expertise do they have?)",
      "influenceStyle": "How they influence others (e.g., 'Through personal examples', 'Through detailed explanations')"
    }
  },
  {
    "coreIdentity": { ... },
    "physicalAppearance": { ... },
    "personalityAndCommunication": { ... },
    "lifestyleAndWorldview": { ... },
    "whyAndCredibility": { ... }
  },
  {
    "coreIdentity": { ... },
    "physicalAppearance": { ... },
    "personalityAndCommunication": { ... },
    "lifestyleAndWorldview": { ... },
    "whyAndCredibility": { ... }
  }
]

**IMPORTANT GUIDELINES:**
- Create UNIQUE personas, NOT stereotypes
- Make each person feel like they could exist in real life
- Each persona should have a genuine connection to the product (not forced)
- Avoid clichés or generic descriptions
- ENSURE DIVERSITY across personas, but still overlaying in the target audience:
  * Different professions and backgrounds
  * Different personality types and communication styles
  * Different values and lifestyles
  * Different aesthetics and appearances
- Make physical appearance detailed enough for image generation
- Include specifics about clothing style, hair, and notable features

**CRITICAL:** Return ONLY the JSON array with ${numberOfPersonas} objects, no additional text before or after. Each object must be complete and valid.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from markdown code blocks if present
    let jsonString = responseText;

    // Remove markdown code block wrapper (```json ... ```)
    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1].trim();
    } else {
      // If no markdown block, try to extract JSON array directly
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonString = arrayMatch[0];
      }
    }

    // Parse the JSON response
    const personas = JSON.parse(jsonString);

    // Validate it's an array
    if (!Array.isArray(personas)) {
      throw new Error('Response is not an array of personas');
    }

    // Validate each persona has required structure
    personas.forEach((persona, index) => {
      if (!persona.coreIdentity || !persona.physicalAppearance || !persona.personalityAndCommunication || !persona.lifestyleAndWorldview || !persona.whyAndCredibility) {
        throw new Error(`Persona ${index + 1} missing required fields`);
      }
    });

    return personas;
  } catch (error) {
    console.error('Error generating multiple personas in single call:', error);
    throw new Error(`Failed to generate personas: ${error.message}`);
  }
}

/**
 * Generate multiple personas in parallel (with rate limiting)
 * @deprecated Use generateMultiplePersonasInSingleCall instead for better performance
 */
export async function generateMultiplePersonas(productDescription, targetAudience, numberOfPersonas = 3) {
  const personas = [];

  for (let i = 0; i < numberOfPersonas; i++) {
    try {
      const persona = await generatePersonaDescription(productDescription, targetAudience, i + 1);
      personas.push(persona);

      // Add small delay between API calls to avoid rate limiting
      if (i < numberOfPersonas - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate persona ${i + 1}:`, error);
      throw error;
    }
  }

  return personas;
}
