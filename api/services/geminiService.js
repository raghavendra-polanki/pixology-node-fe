import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generic text generation using Gemini API
 * @param {string} prompt - The prompt to send to Gemini
 * @param {object} options - Configuration options (temperature, maxTokens, etc.)
 * @returns {Promise<string>} The generated text response
 */
export async function generateTextFromGemini(prompt, options = {}) {
  try {
    const { temperature = 0.7, maxTokens = 2000 } = options;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText;
  } catch (error) {
    console.error('Error generating text from Gemini:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
}

/**
 * Generate persona description using Gemini 2.5 Flash
 * Creates a detailed persona based on product and target audience
 * @param {string} productDescription - Description of the product
 * @param {string} targetAudience - Target audience information
 * @param {number} personaNumber - Persona number for context
 * @param {string} customPrompt - Optional custom prompt template (if not provided, uses default)
 */
export async function generatePersonaDescription(productDescription, targetAudience, personaNumber, customPrompt = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use custom prompt if provided, otherwise use default
    let prompt;
    if (customPrompt) {
      // Template the custom prompt with variables
      prompt = customPrompt
        .replace(/{productDescription}/g, productDescription)
        .replace(/{targetAudience}/g, targetAudience)
        .replace(/{personaNumber}/g, personaNumber);
    } else {
      // Default prompt
      prompt = `
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
    }

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
 * @param {string} productDescription - Description of the product
 * @param {string} targetAudience - Target audience information
 * @param {number} numberOfPersonas - Number of personas to generate
 * @param {string} customPrompt - Optional custom prompt template (if not provided, uses default)
 */
export async function generateMultiplePersonasInSingleCall(productDescription, targetAudience, numberOfPersonas = 3, customPrompt = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt;
    if (customPrompt) {
      // Template the custom prompt with variables
      prompt = customPrompt
        .replace(/{productDescription}/g, productDescription)
        .replace(/{targetAudience}/g, targetAudience)
        .replace(/{numberOfPersonas}/g, numberOfPersonas);
    } else {
      // Default prompt
      prompt = `
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
    }

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

/**
 * Generate multiple narrative themes in a single API call
 * Generates diverse narrative themes for UGC video storytelling
 * @param {string} productDescription - Description of the product
 * @param {string} targetAudience - Target audience information
 * @param {number} numberOfNarratives - Number of narrative themes to generate
 * @param {string} selectedPersonas - Selected personas information
 * @param {string} customPrompt - Optional custom prompt template (if not provided, uses default)
 */
export async function generateNarrativesInSingleCall(productDescription, targetAudience, numberOfNarratives = 6, selectedPersonas = 'Unknown personas', customPrompt = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt;
    if (customPrompt) {
      // Template the custom prompt with variables
      prompt = customPrompt
        .replace(/{productDescription}/g, productDescription)
        .replace(/{targetAudience}/g, targetAudience)
        .replace(/{numberOfNarratives}/g, numberOfNarratives)
        .replace(/{selectedPersonas}/g, selectedPersonas);
    } else {
      // Default prompt
      prompt = `
You are an expert Video Narrative Strategist and Storyteller. Your task is to create compelling, diverse narrative themes that would work perfectly for User-Generated Content (UGC) video marketing.

**PRODUCT CONTEXT:**
Product Description: ${productDescription}
Target Audience: ${targetAudience}
Selected Personas to Feature: ${selectedPersonas}

**YOUR TASK:**
Create ${numberOfNarratives} UNIQUE narrative themes that would resonate with the target audience and effectively showcase the product using the selected personas. Each theme should:
- Have a clear, compelling story structure
- Include specific story beats and emotional arcs
- Be suitable for UGC-style video content
- Be distinct from each other in approach and tone
- Include a gradient color scheme for visual branding

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "id": "unique-id-for-narrative",
    "title": "The narrative theme title (2-3 words)",
    "description": "A compelling 1-2 sentence description of what this narrative approach is about",
    "structure": "A 4-5 step narrative structure using arrows. Example: 'Hook: Problem → Build: Consequences → Solution: Your Product → Resolution: Better Life'",
    "gradient": "A Tailwind gradient string. Examples: 'from-red-600 via-red-500 to-orange-500', 'from-blue-600 via-blue-500 to-cyan-500'",
    "patternColor": "RGBA color string for decorative pattern. Examples: 'rgba(255, 255, 255, 0.1)'",
    "ringColor": "Tailwind color for selection ring. Examples: 'ring-red-500', 'ring-blue-500'",
    "detailedExplanation": "A detailed 3-4 sentence explanation of how this narrative theme works and why it's effective"
  }
]

**EXAMPLE NARRATIVE THEMES:**
1. Problem/Solution - Start with a relatable problem, introduce product as solution
2. Day in the Life - Follow character through their day with product integrated
3. Before/After Transformation - Show dramatic contrast and transformation
4. Customer Journey - Share authentic story of discovery and benefit
5. Competitive Edge - Highlight unique advantages
6. Expert Endorsement - Professional/expert recommends based on experience

**IMPORTANT GUIDELINES:**
- Create DIVERSE narrative approaches, not variations of the same theme
- Make each theme feel authentic and relatable to the target audience
- Ensure the story structure is clear and can be executed in a short video
- Include specific emotional beats that will resonate
- Make descriptions compelling and action-oriented
- Use vibrant, distinct color schemes for each theme
- Return ONLY the JSON array, no additional text before or after

**CRITICAL:** Return ONLY the JSON array with ${numberOfNarratives} objects, no additional text before or after. Each object must be complete and valid.
      `;
    }

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
    const narratives = JSON.parse(jsonString);

    // Validate it's an array
    if (!Array.isArray(narratives)) {
      throw new Error('Response is not an array of narratives');
    }

    // Validate each narrative has required structure
    narratives.forEach((narrative, index) => {
      if (!narrative.id || !narrative.title || !narrative.description || !narrative.structure || !narrative.gradient || !narrative.patternColor || !narrative.ringColor) {
        throw new Error(`Narrative ${index + 1} missing required fields`);
      }
    });

    return narratives;
  } catch (error) {
    console.error('Error generating narratives:', error);
    throw new Error(`Failed to generate narratives: ${error.message}`);
  }
}

/**
 * Generate storyboard scenes for a video production
 * Generates detailed scene descriptions that maintain consistency with persona, narrative, and product
 */
export async function generateStoryScenesInSingleCall(
  productDescription,
  targetAudience,
  selectedPersonaName,
  selectedPersonaDescription,
  narrativeTheme,
  narrativeStructure,
  numberOfScenes = 6,
  videoDuration = '30s',
  customPrompt = null
) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt;
    if (customPrompt) {
      // Template the custom prompt with variables
      prompt = customPrompt
        .replace(/{productDescription}/g, productDescription)
        .replace(/{targetAudience}/g, targetAudience)
        .replace(/{selectedPersonaName}/g, selectedPersonaName)
        .replace(/{selectedPersonaDescription}/g, selectedPersonaDescription)
        .replace(/{narrativeTheme}/g, narrativeTheme)
        .replace(/{narrativeStructure}/g, narrativeStructure)
        .replace(/{numberOfScenes}/g, numberOfScenes)
        .replace(/{videoDuration}/g, videoDuration);
    } else {
      // Default prompt
      prompt = `
You are an expert Film Director and Storyboard Artist. Your task is to create a detailed storyboard script that brings together the campaign product, selected persona, and narrative theme into a cohesive visual story.

**CRITICAL INPUTS TO MAINTAIN CONSISTENCY:**
Product Description: ${productDescription}
Target Audience: ${targetAudience}
Persona: ${selectedPersonaName} - ${selectedPersonaDescription}
Narrative Theme: ${narrativeTheme}
Narrative Structure: ${narrativeStructure}
Video Duration: ${videoDuration}
Number of Scenes: ${numberOfScenes}

**YOUR TASK:**
Create exactly ${numberOfScenes} detailed scenes that:
1. STRICTLY FOLLOW the narrative structure provided
2. AUTHENTICALLY REPRESENT the selected persona (their voice, actions, values)
3. CONSISTENTLY SHOWCASE the product in context with the persona's lifestyle
4. MAINTAIN VISUAL AND TONAL COHERENCE throughout the story
5. Are feasible to shoot in the specified video duration
6. Include specific visual and dialogue elements that reinforce the narrative

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "sceneNumber": 1,
    "title": "Scene title (2-3 words)",
    "duration": "Scene duration in seconds",
    "description": "What happens in this scene (2-3 sentences)",
    "location": "Where this scene takes place",
    "persona": "How the persona appears/acts in this scene",
    "product": "How the product is integrated into this scene",
    "visualElements": "Key visual details to include (colors, lighting, props, etc.)",
    "dialogue": "Dialogue or voiceover for this scene (if any)",
    "cameraWork": "Camera movement/angles (e.g., 'Pan right', 'Close-up on face', 'Wide shot')",
    "keyFrameDescription": "Detailed visual description for image generation (used for creating the scene visual)"
  }
]

**CONSISTENCY GUIDELINES:**
- Each scene must reinforce the selected persona's characteristics, not contradict them
- Product integration must feel natural to the persona and narrative, not forced
- Visual style, color palette, and tone must remain consistent across all scenes
- Dialogue must match the persona's communication style and values
- All scenes must logically flow according to the narrative structure provided
- No scene should deviate from the target audience or product benefits

**CRITICAL:** Return ONLY the JSON array with ${numberOfScenes} objects, no additional text before or after. Each object must be complete and valid.
      `;
    }

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
    const scenes = JSON.parse(jsonString);

    // Validate it's an array
    if (!Array.isArray(scenes)) {
      throw new Error('Response is not an array of scenes');
    }

    // Validate each scene has required structure
    scenes.forEach((scene, index) => {
      if (
        !scene.sceneNumber ||
        !scene.title ||
        !scene.description ||
        !scene.location ||
        !scene.persona ||
        !scene.product ||
        !scene.visualElements ||
        !scene.cameraWork ||
        !scene.keyFrameDescription
      ) {
        throw new Error(`Scene ${index + 1} missing required fields`);
      }
    });

    return scenes;
  } catch (error) {
    console.error('Error generating story scenes:', error);
    throw new Error(`Failed to generate story scenes: ${error.message}`);
  }
}

/**
 * Generate screenplay with second-by-second timings, camera flow, dialogue, and transitions
 * Creates detailed screenplay for storyboard scenes with professional video production details
 * @param {array} storyboardScenes - Array of storyboard scene objects
 * @param {string} videoDuration - Total video duration (e.g., '30s', '60s')
 * @param {string} selectedPersonaName - Name of the main character/persona
 * @param {string} customPrompt - Optional custom prompt template (if not provided, uses default)
 */
export async function generateScreenplayFromStoryboard(
  storyboardScenes,
  videoDuration = '30s',
  selectedPersonaName = 'Character',
  customPrompt = null
) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format storyboard scenes for the prompt
    const scenesDescription = storyboardScenes
      .map((scene, index) => {
        return `Scene ${index + 1}: ${scene.title}
Description: ${scene.description}
Location: ${scene.location}
Persona: ${scene.persona}
Product: ${scene.product}
Camera Work: ${scene.cameraWork}`;
      })
      .join('\n\n');

    let prompt;
    if (customPrompt) {
      // Template the custom prompt with variables
      prompt = customPrompt
        .replace(/{storyboardScenes}/g, scenesDescription)
        .replace(/{videoDuration}/g, videoDuration)
        .replace(/{selectedPersonaName}/g, selectedPersonaName);
    } else {
      // Default prompt from SCREENPLAY_GENERATION_RECIPE
      prompt = `You are a professional screenwriter and video production specialist. Your task is to create a detailed screenplay with precise timings, camera flow, dialogue, and music recommendations for each storyboard scene.

**VIDEO PRODUCTION CONTEXT:**
Total Video Duration: ${videoDuration}
Main Character: ${selectedPersonaName}
Number of Scenes: ${storyboardScenes.length}

**STORYBOARD SCENES TO CONVERT TO SCREENPLAY:**
${scenesDescription}

**YOUR TASK:**
Create a detailed screenplay entry for EACH scene above with:

1. **TIMING** - Precise second-by-second breakdown
   - Start timecode (0:00, 0:05, etc.)
   - End timecode
   - Scene duration (MAXIMUM 8 seconds per scene)
   - Ensure total duration doesn't exceed ${videoDuration}

2. **VISUAL DESCRIPTION** - Second-by-second breakdown
   - Exactly what we see frame-by-frame (0:00-0:01, 0:01-0:02, etc.)
   - Character actions and expressions
   - Product placement and visibility
   - Background elements and environment
   - Camera movement during the seconds

3. **CAMERA FLOW** - Specific camera techniques with timing
   - Opening shot type (wide, medium, close-up, etc.)
   - Camera movements (pan, zoom, tilt, dolly, cut, etc.) with exact timing
   - Transitions (fade, cut, dissolve, wipe, etc.) with timing
   - Closing shot type
   - Example: "0:00-0:02 Medium shot of Alex. 0:02-0:04 Zoom in on face. 0:04-0:06 Cut to product close-up. 0:06-0:08 Fade to black"

4. **SCRIPT/DIALOGUE** - Either character dialogue or voiceover
   - Include timing for when speech starts/ends
   - Natural, authentic tone matching the persona
   - Focus on product benefits and use case
   - Keep it concise and conversational
   - Format: "0:01-0:04 [Character speaks] 'Your product is amazing...'"

5. **BACKGROUND MUSIC**
   - Music style/mood (upbeat, emotional, energetic, calm, etc.)
   - Tempo/BPM if applicable
   - When music should start and end
   - How volume should change (fade in, fade out, etc.)
   - Recommended music genre or style

6. **TRANSITIONS** - Recommended transition to next scene
   - Transition type (cut, fade, dissolve, wipe, zoom, etc.)
   - Duration of transition (0.5s, 1s, etc.)
   - Visual style of transition

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "sceneNumber": 1,
    "timeStart": "0:00",
    "timeEnd": "0:08",
    "visual": "0:00-0:02 [Description]. 0:02-0:04 [Description]. 0:04-0:06 [Description]. 0:06-0:08 [Description]",
    "cameraFlow": "0:00-0:02 Opening medium shot. 0:02-0:04 Zoom in. 0:04-0:06 Close-up. 0:06-0:08 Zoom out",
    "script": "0:01-0:04 [Character dialogue or VO]: '[Exactly what the character says]' 0:05-0:07 [Continue if needed]",
    "backgroundMusic": "Upbeat pop music, 120 BPM, starts at 0:00, fades out at 0:07",
    "transition": "Cut to Scene 2"
  }
]

**IMPORTANT CONSTRAINTS:**
- Each scene must be MAXIMUM 8 seconds
- Timings must be PRECISE and ACCURATE (use format 0:00, 0:05, 0:30, etc.)
- Visual description must be second-by-second breakdown (not just general description)
- Camera flow must specify timing for each movement/transition
- Script must sound natural and authentic for ${selectedPersonaName}
- Total screenplay duration must fit within ${videoDuration}
- Every second should be accounted for
- Background music should enhance the mood and support the narrative
- Transitions should be smooth and professional
- All timing references must use MM:SS format

**CRITICAL:** Return ONLY the JSON array, no additional text before or after. Each object must be complete and valid. Ensure all timecodes are accurate and consistent.`;
    }

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
    const screenplay = JSON.parse(jsonString);

    // Validate it's an array
    if (!Array.isArray(screenplay)) {
      throw new Error('Response is not an array of screenplay entries');
    }

    // Validate each screenplay entry has required structure
    screenplay.forEach((entry, index) => {
      if (
        !entry.sceneNumber ||
        !entry.timeStart ||
        !entry.timeEnd ||
        !entry.visual ||
        !entry.cameraFlow ||
        !entry.script ||
        !entry.backgroundMusic ||
        !entry.transition
      ) {
        throw new Error(
          `Screenplay entry ${index + 1} missing required fields. Found: ${Object.keys(entry).join(', ')}`
        );
      }
    });

    return screenplay;
  } catch (error) {
    console.error('Error generating screenplay:', error);
    throw new Error(`Failed to generate screenplay: ${error.message}`);
  }
}
