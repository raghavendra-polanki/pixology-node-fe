/**
 * RecipeSeedData - Contains seed recipes for different stages
 * These are pre-built recipes ready to be inserted into Firestore
 */

export const PERSONA_GENERATION_RECIPE = {
  id: 'recipe_persona_generation_v1',
  name: 'Persona Generation Pipeline',
  description: 'Generate persona details and images for Stage 2',
  stageType: 'stage_2_personas',
  version: 1,

  nodes: [
    {
      id: 'generate_persona_details',
      name: 'Generate Persona Details',
      type: 'text_generation',
      order: 1,

      inputMapping: {
        productDescription: 'external_input.productDescription',
        targetAudience: 'external_input.targetAudience',
        numberOfPersonas: 'external_input.numberOfPersonas',
      },
      outputKey: 'personaDetails',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 2000,
      },

      prompt: `
You are an expert Casting Director and Consumer Psychologist. Your task is to create detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators who would authentically recommend this product.

**PRODUCT CONTEXT:**
Product Description: {productDescription}
Target Audience: {targetAudience}

**YOUR TASK:**
Create {numberOfPersonas} UNIQUE personas with DIVERSE characteristics who would genuinely recommend this product. Each person should feel real, relatable, and authentic with distinct demographics, personalities, and backgrounds. Avoid stereotypes and ensure variety across:
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
  }
]

**IMPORTANT GUIDELINES:**
- Create UNIQUE personas, NOT stereotypes
- Make each person feel like they could exist in real life
- Each persona should have a genuine connection to the product (not forced)
- Avoid clichés or generic descriptions
- ENSURE DIVERSITY across personas, still overlaying in the target audience
- Make physical appearance detailed enough for image generation
- Include specifics about clothing style, hair, and notable features

**CRITICAL:** Return ONLY the JSON array, no additional text before or after.
      `.trim(),

      promptTemplate: 'Generate {numberOfPersonas} personas for {productDescription} targeting {targetAudience}',

      parameters: {
        numberOfPersonas: 3,
        diversityFocus: true,
        jsonFormat: true,
      },

      dependencies: [],
      errorHandling: {
        onError: 'fail',
        retryCount: 2,
        timeout: 30000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates diverse persona descriptions using Gemini',
      },
    },

    {
      id: 'generate_persona_images',
      name: 'Generate Persona Images',
      type: 'image_generation',
      order: 2,

      inputMapping: {
        personaData: 'personaDetails',
      },
      outputKey: 'personaImages',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash-image',
        temperature: 0.8,
      },

      prompt: `
Create a professional UGC-style portrait photo of a person with these characteristics:

**Demographics:**
- Name: {name}
- Age: {age}
- Gender: {gender}
- Location: {location}

**Physical Appearance:**
- {general}
- Hair: {hair}
- Build: {build}
- Style: {clothingAesthetic}
- Notable features: {signatureDetails}

**Personality Vibe:**
- Demeanor: {demeanor}
- Energy: {energyLevel}

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
      `.trim(),

      parameters: {
        imageFormat: 'jpg',
        resolution: '1024x1024',
      },

      dependencies: ['generate_persona_details'],
      errorHandling: {
        onError: 'skip',
        defaultOutput: null,
        timeout: 60000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates persona portrait images',
      },
    },

    {
      id: 'combine_and_upload',
      name: 'Combine Data and Upload',
      type: 'data_processing',
      order: 3,

      inputMapping: {
        personaDetails: 'personaDetails',
        personaImages: 'personaImages',
      },
      outputKey: 'finalPersonas',

      parameters: {
        uploadService: 'gcs',
        combinationLogic: 'merge_details_with_images',
      },

      dependencies: ['generate_persona_images'],
      errorHandling: {
        onError: 'fail',
        timeout: 30000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Combines persona details with images and uploads to GCS',
      },
    },
  ],

  edges: [
    {
      from: 'generate_persona_details',
      to: 'generate_persona_images',
    },
    {
      from: 'generate_persona_images',
      to: 'combine_and_upload',
    },
  ],

  executionConfig: {
    timeout: 120000,
    retryPolicy: {
      maxRetries: 1,
      backoffMs: 1000,
    },
    parallelExecution: false,
    continueOnError: false,
  },

  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
    tags: ['persona', 'generation', 'stage2'],
  },
};

/**
 * Get all seed recipes
 */
export function getAllSeedRecipes() {
  return [PERSONA_GENERATION_RECIPE];
}

/**
 * Get seed recipe by name
 */
export function getSeedRecipe(name) {
  const recipes = {
    'persona_generation': PERSONA_GENERATION_RECIPE,
  };

  return recipes[name];
}

export default {
  PERSONA_GENERATION_RECIPE,
  getAllSeedRecipes,
  getSeedRecipe,
};
