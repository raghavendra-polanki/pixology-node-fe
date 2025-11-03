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

export const NARRATIVE_GENERATION_RECIPE = {
  id: 'recipe_narrative_generation_v1',
  name: 'Narrative Generation Pipeline',
  description: 'Generate narrative themes for Stage 3',
  stageType: 'stage_3_narratives',
  version: 1,

  nodes: [
    {
      id: 'generate_narrative_themes',
      name: 'Generate Narrative Themes',
      type: 'text_generation',
      order: 1,

      inputMapping: {
        productDescription: 'external_input.productDescription',
        targetAudience: 'external_input.targetAudience',
        numberOfNarratives: 'external_input.numberOfNarratives',
        selectedPersonas: 'external_input.selectedPersonas',
      },
      outputKey: 'narrativeThemes',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 3000,
      },

      prompt: `
You are an expert Video Narrative Strategist and Storyteller. Your task is to create compelling, diverse narrative themes that would work perfectly for User-Generated Content (UGC) video marketing.

**PRODUCT CONTEXT:**
Product Description: {productDescription}
Target Audience: {targetAudience}
Selected Personas to Feature: {selectedPersonas}

**YOUR TASK:**
Create {numberOfNarratives} UNIQUE narrative themes that would resonate with the target audience and effectively showcase the product using the selected personas. Each theme should:
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
      `.trim(),

      promptTemplate: 'Generate {numberOfNarratives} narrative themes for {productDescription} targeting {targetAudience} using personas {selectedPersonas}',

      parameters: {
        numberOfNarratives: 6,
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
        description: 'Generates narrative theme suggestions using Gemini Flash 2.5',
      },
    },
  ],

  edges: [],

  executionConfig: {
    timeout: 60000,
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
    tags: ['narrative', 'generation', 'stage3'],
  },
};

export const STORYBOARD_GENERATION_RECIPE = {
  id: 'recipe_storyboard_generation_v1',
  name: 'Storyboard Generation Pipeline',
  description: 'Generate storyboard scenes, images, and save to database for Stage 4',
  stageType: 'stage_4_storyboard',
  version: 1,

  nodes: [
    {
      id: 'generate_story_scenes',
      name: 'Generate Story Scenes',
      type: 'text_generation',
      order: 1,

      inputMapping: {
        productDescription: 'external_input.productDescription',
        targetAudience: 'external_input.targetAudience',
        selectedPersonaName: 'external_input.selectedPersonaName',
        selectedPersonaDescription: 'external_input.selectedPersonaDescription',
        selectedPersonaImage: 'external_input.selectedPersonaImage',
        narrativeTheme: 'external_input.narrativeTheme',
        narrativeStructure: 'external_input.narrativeStructure',
        numberOfScenes: 'external_input.numberOfScenes',
        videoDuration: 'external_input.videoDuration',
      },
      outputKey: 'storyScenes',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 4000,
      },

      prompt: `
You are an expert Film Director and Storyboard Artist. Your task is to create a detailed storyboard script that brings together the campaign product, selected persona, and narrative theme into a cohesive visual story.

**CRITICAL INPUTS TO MAINTAIN CONSISTENCY:**
Product Description: {productDescription}
Target Audience: {targetAudience}
Persona: {selectedPersonaName} - {selectedPersonaDescription}
Persona Image Reference: {selectedPersonaImage}
Narrative Theme: {narrativeTheme}
Narrative Structure: {narrativeStructure}
Video Duration: {videoDuration}
Number of Scenes: {numberOfScenes}

**YOUR TASK:**
Create exactly {numberOfScenes} detailed scenes that:
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

**CONSISTENCY GUIDELINES - CRITICAL FOR CHARACTER CONTINUITY:**
- **PERSONA CONSISTENCY:** Each scene must feature the SAME character ({selectedPersonaName}) with consistent appearance, voice, mannerisms, and values. Reference the persona image: {selectedPersonaImage}
- **CHARACTER APPEARANCE:** Describe how the persona looks in each scene (clothing, hairstyle, expressions) to match their generated image - this ensures visual continuity
- Product integration must feel natural to the persona and narrative, not forced
- Visual style, color palette, and tone must remain consistent across all scenes
- Dialogue must match the persona's communication style and values
- All scenes must logically flow according to the narrative structure provided
- No scene should deviate from the target audience or product benefits
- **Scene Descriptions** must be detailed enough for image generation to recreate the same character across all scenes

**EXAMPLE STRUCTURE:**
If narrative is "Problem → Solution → Transformation", then:
- Scenes 1-2: Establish the problem the persona faces
- Scenes 3-4: Introduce the product as the solution
- Scenes 5-6: Show the transformation/benefit with the persona using the product

**CRITICAL:** Return ONLY the JSON array with {numberOfScenes} objects, no additional text before or after.
      `.trim(),

      promptTemplate: 'Generate {numberOfScenes} storyboard scenes for {narrativeTheme} with {selectedPersonaName} for {videoDuration} video',

      parameters: {
        numberOfScenes: 6,
        coherenceFocus: true,
        jsonFormat: true,
      },

      dependencies: [],
      errorHandling: {
        onError: 'fail',
        retryCount: 2,
        timeout: 45000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates detailed storyboard scenes with consistency checks',
      },
    },

    {
      id: 'generate_scene_images',
      name: 'Generate Scene Images',
      type: 'image_generation',
      order: 2,

      inputMapping: {
        sceneData: 'storyScenes',
        selectedPersonaName: 'external_input.selectedPersonaName',
        selectedPersonaDescription: 'external_input.selectedPersonaDescription',
        selectedPersonaImage: 'external_input.selectedPersonaImage',
      },
      outputKey: 'sceneImages',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash-image',
        temperature: 0.8,
      },

      prompt: `
Create a professional storyboard visual for a UGC marketing video scene with these specifications:

**CRITICAL - CHARACTER CONSISTENCY:**
Persona Name: {selectedPersonaName}
Persona Description: {selectedPersonaDescription}
Reference Image: {selectedPersonaImage}

You MUST generate the same character ({selectedPersonaName}) across all scenes. Use the reference image provided to maintain consistent appearance, facial features, hair, and clothing style throughout the video.

**Scene Details:**
Title: {title}
Location: {location}
Description: {description}
Duration: {duration}s

**Visual Brief:**
{keyFrameDescription}

**Persona/Character (THIS SCENE):**
{persona}

**Product Context:**
{product}

**Camera Direction:**
{cameraWork}

**Style Requirements:**
- Professional UGC video quality
- Natural lighting
- Authentic and relatable setting
- Should feel like actual user-generated content
- Consistent with brand and persona aesthetic
- Suitable for social media (Instagram, TikTok, YouTube)
- **CRITICAL:** Character appearance must match the reference image - same facial features, hair, and general look as {selectedPersonaName}

Create a realistic, high-quality frame that captures this scene exactly as described, with {selectedPersonaName} appearing as shown in the reference image.
      `.trim(),

      parameters: {
        imageFormat: 'jpg',
        resolution: '1280x720',
        style: 'professional_ugc',
      },

      dependencies: ['generate_story_scenes'],
      errorHandling: {
        onError: 'skip',
        defaultOutput: null,
        timeout: 60000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Generates visual representations for each storyboard scene',
      },
    },

    {
      id: 'upload_and_save_scenes',
      name: 'Upload Scenes and Save to Database',
      type: 'data_processing',
      order: 3,

      inputMapping: {
        sceneDetails: 'storyScenes',
        sceneImages: 'sceneImages',
      },
      outputKey: 'finalStoryboard',

      parameters: {
        uploadService: 'gcs',
        databaseOperation: 'save_storyboard',
        combineLogic: 'merge_scenes_with_images',
      },

      dependencies: ['generate_scene_images'],
      errorHandling: {
        onError: 'fail',
        timeout: 45000,
      },

      metadata: {
        createdAt: new Date(),
        description: 'Uploads scene images to GCS and saves storyboard data to database',
      },
    },
  ],

  edges: [
    {
      from: 'generate_story_scenes',
      to: 'generate_scene_images',
    },
    {
      from: 'generate_scene_images',
      to: 'upload_and_save_scenes',
    },
  ],

  executionConfig: {
    timeout: 180000,
    retryPolicy: {
      maxRetries: 1,
      backoffMs: 2000,
    },
    parallelExecution: false,
    continueOnError: false,
  },

  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
    tags: ['storyboard', 'generation', 'stage4', 'video_production'],
  },
};

/**
 * Screenplay Generation Recipe - Stage 5
 * Generates detailed, timed screenplay entries from storyboard scenes
 */
export const SCREENPLAY_GENERATION_RECIPE = {
  id: 'recipe_screenplay_generation_v1',
  name: 'Screenplay Generation Pipeline',
  description: 'Generate detailed screenplay with timings, camera flow, dialogue, and transitions from storyboard scenes',
  stageType: 'stage_5_screenplay',
  version: 1,

  nodes: [
    {
      id: 'generate_screenplay_timings',
      name: 'Generate Screenplay with Timings',
      type: 'text_generation',
      order: 1,

      inputMapping: {
        storyboardScenes: 'external_input.storyboardScenes',
        videoDuration: 'external_input.videoDuration',
        selectedPersonaName: 'external_input.selectedPersonaName',
      },
      outputKey: 'screenplayEntries',

      aiModel: {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 4000,
      },

      prompt: `You are a professional screenwriter and video production specialist. Your task is to convert detailed storyboard scenes into a precise, second-by-second screenplay format for a video advertisement.

**STORYBOARD SCENES:**
{storyboardScenes}

**VIDEO DURATION:** {videoDuration}
**PERSONA:** {selectedPersonaName}

**YOUR TASK:**
Transform each scene into a detailed screenplay with exact timings. Each scene must be limited to exactly 8 seconds maximum. For each scene, provide:

1. **TIMING**: Precise start and end timecodes (0:00-0:08, 0:08-0:16, etc.)
2. **VISUAL DESCRIPTION**: Second-by-second breakdown of what happens on screen (describe camera movements, character actions, product placement, transitions)
3. **CAMERA FLOW**: Recommended camera techniques (pan, zoom, cut, fade, slow-mo, etc.) with timing
4. **SCRIPT/DIALOGUE**: Either:
   - Background voiceover (VO) describing the scene/product
   - Character dialogue (what the persona says in the video)
   - Natural sounds/product sounds
   - Choose what fits best for authenticity
5. **BACKGROUND MUSIC**: Recommended music style, mood, and when it should play/change
6. **TRANSITION**: Recommended transition to next scene (cut, fade, dissolve, wipe, etc.)

**CONSTRAINTS:**
- Each scene: MAXIMUM 8 seconds
- All timings must be accurate and sequential
- Camera flow must be natural and professional
- Dialogue/script must sound authentic and conversational (not robotic)
- Music recommendations should match the scene mood and product
- Transitions should be smooth and professional

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "sceneNumber": 1,
    "timeStart": "0:00",
    "timeEnd": "0:08",
    "visual": "Second-by-second visual breakdown. 0:00-0:02: Close-up of product... 0:02-0:05: Character picks up product... 0:05-0:08: Product in use...",
    "cameraFlow": "Start with tight close-up on product. Pan up to reveal character's face at 0:02. Slow zoom out at 0:05 to show full body interaction.",
    "script": {
      "type": "voiceover or dialogue",
      "speaker": "VO (character name) or character name",
      "text": "The actual script text the character says or VO says"
    },
    "backgroundMusic": "Upbeat, modern pop instrumental. Starts at 0:00, peaks at 0:04-0:06, fades slightly at 0:07.",
    "transition": "Cut to next scene"
  }
]

**IMPORTANT GUIDELINES:**
- Be PRECISE with timings - they must be exact and sequential
- Make visuals DETAILED enough to guide video production
- Script must sound natural and authentic - like a real person speaking
- Camera movements should be smooth and professional
- Music should enhance the moment, not overpower dialogue
- Transitions should feel natural and professional
- Each scene MUST be 8 seconds or less

**CRITICAL:** Return ONLY the JSON array, no additional text before or after.
`.trim(),

      parameters: {
        maxTimePerScene: 8,
      },
      errorHandling: {
        onError: 'fail',
      },
    },
  ],

  edges: [],

  executionConfig: {
    timeout: 120000,
    retryPolicy: {
      maxRetries: 1,
      backoffMs: 2000,
    },
    parallelExecution: false,
    continueOnError: false,
  },

  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
    tags: ['screenplay', 'generation', 'stage5', 'video_production', 'timings'],
  },
};

/**
 * Get all seed recipes
 */
export function getAllSeedRecipes() {
  return [PERSONA_GENERATION_RECIPE, NARRATIVE_GENERATION_RECIPE, STORYBOARD_GENERATION_RECIPE, SCREENPLAY_GENERATION_RECIPE];
}

/**
 * Get seed recipe by name
 */
export function getSeedRecipe(name) {
  const recipes = {
    'persona_generation': PERSONA_GENERATION_RECIPE,
    'narrative_generation': NARRATIVE_GENERATION_RECIPE,
    'storyboard_generation': STORYBOARD_GENERATION_RECIPE,
    'screenplay_generation': SCREENPLAY_GENERATION_RECIPE,
  };

  return recipes[name];
}

export default {
  PERSONA_GENERATION_RECIPE,
  NARRATIVE_GENERATION_RECIPE,
  STORYBOARD_GENERATION_RECIPE,
  SCREENPLAY_GENERATION_RECIPE,
  getAllSeedRecipes,
  getSeedRecipe,
};
