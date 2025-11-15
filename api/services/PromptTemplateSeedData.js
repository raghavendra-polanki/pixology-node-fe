/**
 * Prompt Template Seed Data
 * Default prompts for all stages - synced from database
 * Last synced: 2025-11-15T04:11:38.975Z
 */

export const STAGE_2_PERSONAS_TEMPLATE = {
  id: 'stage_2_personas',
  stageType: 'stage_2_personas',
  prompts: [
    {
      id: 'prompt_textGeneration_persona_default',
      capability: 'textGeneration',
      name: 'Default Persona Generation',
      description: 'Generates detailed, diverse personas for UGC video creators',
      systemPrompt: 'You are an expert Casting Director and Consumer Psychologist.',
      userPromptTemplate: `"Your task is to create detailed, DIVERSE, believable personas for Athlete-Generated Content (AGC) creators who would authentically recommend this product. These personas must span a range of athletic tiers, from elite professionals to highly dedicated amateur competitors, but all must generate content in an authentic, native UGC-style."

## 🎯 STAGE CONTEXT & PRODUCT INFORMATION
Product Description: {{productDescription}}
Target Audience: {{targetAudience}}
Product Image URL: {{productImageUrl}}

## 🖼️ VISUAL INSIGHT & AUTHENTICITY MANDATE
If a Product Image URL is provided, you **MUST** execute a forensic visual analysis. The personas must not just *use* the product, but be **stylistically aligned** with it. Analyze the following:
* **Aesthetic & Vibe:** The core visual mood, color story, material quality, and overall "vibe" (e.g., rugged, minimalist, performance-driven, retro).
* **Market Positioning:** Is the product premium, budget-friendly, mass-market, or niche?
* **Design-to-Demographic Link:** How does the product's design (e.g., sleek lines, bright colors, subtle branding) specifically attract or repel certain demographics or subcultures?
**Use these insights to ground the personas' lifestyle and aesthetic choices.**

## 👤 CORE TASK: GENERATE HIGHLY RELAVENT PERSONAS to the product description and target audience.
Create {{numberOfPersonas}} **EXTREMELY UNIQUE** personas.

## 🎥 ACTIONABLE VIDEO FOCUS
For the "whyAndCredibility" section, ensure the details provide a clear hook for a video script. The "influenceStyle" should inform the tone of voice for the AI-generated video.

## 📄 MANDATORY OUTPUT FORMAT
**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array). DO NOT include any explanatory text before or after the JSON array:**
[{
  "coreIdentity": {"name": "", "age": 0, "demographic": "", "motivation": "", "bio": ""},
  "physicalAppearance": {"general": "", "hair": "", "build": "", "clothingAesthetic": "", "signatureDetails": ""},
  "personalityAndCommunication": {"demeanor": "", "energyLevel": "", "speechPatterns": "", "values": []},
  "lifestyleAndWorldview": {"profession": "", "hobbies": [], "lifestyleChoices": "", "socialMediaHabits": ""},
  "whyAndCredibility": {"whyTheyUseProduct": "", "credibility": "", "influenceStyle": ""}
}]`,
      outputFormat: 'json',
      variables: [
        { name: 'productDescription', description: 'Description of the product', placeholder: 'E.g., A sustainable water bottle' },
        { name: 'targetAudience', description: 'Target audience for the product', placeholder: 'E.g., Environmentally conscious millennials' },
        { name: 'numberOfPersonas', description: 'Number of personas to generate', placeholder: '3' },
        { name: 'productImageUrl', description: 'URL of the product image', placeholder: 'https://...' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prompt_imageGeneration_persona_default',
      capability: 'imageGeneration',
      name: 'Default Persona Image Generation',
      description: 'Generates realistic UGC-style portrait photographs for personas',
      systemPrompt: '',
      userPromptTemplate: `**You are a master portrait photographer and visual storyteller for high-conversion marketing. Your goal is to render a hyperrealistic, authentic, and emotionally resonant portrait of the following persona, specifically designed to drive engagement for Athlete-Generated Content (AGC).**

**📸 IMAGE GENERATION MANDATE:**
Create a **cinematic, hyperrealistic portrait photograph** with an undeniable human presence. The image should look like a meticulously captured still from a high-end documentary or an authentic, highly aesthetic social media post. Focus on conveying the subject's inner world and athletic context.

**👤 PERSONA ATTRIBUTES:**
* **Name:** {{name}}
* **Age:** {{age}}
* **Gender:** {{sex}} (
* **Contextual Location:** {{location}} (Integrate naturally into background if lifestyle is chosen)

**✨ PHYSICAL & AESTHETIC DEPICTION:**
* **Overall Visual Impression:** {{general}}
* **Hair Details:** {{hair}} (Focus on texture, style, and natural fall)
* **Body Type & Posture:** {{build}} (Reflect athletic build and natural stance)
* **Wardrobe & Styling:** {{clothingAesthetic}} (Ensure authenticity to persona's sport/lifestyle, subtle branding if applicable, realistic fabrics)
* **Signature Details:** {{signatureDetails}} (Emphasize unique features, scars, tattoos, accessories, or subtle props that define them)

**💡 PERSONALITY & EXPRESSION EMBODIMENT:**
* **Core Demeanor:** {{demeanor}} (Translate into subtle facial expressions, eye contact, and body language)
* **Energy Signature:** {{energyLevel}} (Show through dynamic vs. calm posture, intensity in eyes, or subtle motion blur if active)
* **Emotional Nuance:** Convey a genuine, relatable emotion (e.g., focused determination, quiet confidence, relaxed joy, thoughtful reflection, approachable intensity). Avoid generic smiles.

**🖼️ ARTISTIC & TECHNICAL DIRECTIVES:**
* **Photography Style:** Ultra-realistic digital photography, shallow depth of field, natural and dynamic composition, golden hour or soft diffused lighting.
* **Lighting:** Masterful use of natural light (e.g., dappled sunlight, soft window light, stadium glow, morning mist). Avoid harsh flash.
* **Setting:**
    * **Option 1 (Default):** An authentic, relevant lifestyle setting (e.g., locker room, trackside, gym, urban training ground, mountain trail, beside a specific piece of equipment) that subtly tells part of their story.
    * **Option 2 (Alternative):** A clean, modern, slightly desaturated studio background if a neutral, impactful headshot is required.
* **Expression & Authenticity:** The subject should have an authentic, unposed, and captivating expression. Eyes should be engaging and convey depth. Skin texture, pores, and minor imperfections should be visible for ultimate realism.
* **Composition:** Medium close-up or upper body shot, rule of thirds, dynamic angles to enhance athletic feel.
* **Atmosphere:** Create a sense of immersion. Consider subtle atmospheric elements like dust motes, sweat sheen, or environmental textures.

**Deliver an image that feels like you know this person, an athlete whose story is etched on their face.** http://googleusercontent.com/image_generation_content/0`,
      outputFormat: 'text',
      variables: [
        { name: 'name', description: 'Persona name', placeholder: 'John Doe' },
        { name: 'age', description: 'Persona age', placeholder: '28' },
        { name: 'sex', description: 'Persona sex', placeholder: 'Male' },
        { name: 'location', description: 'Persona location', placeholder: 'Urban setting' },
        { name: 'general', description: 'General appearance', placeholder: 'Athletic build' },
        { name: 'hair', description: 'Hair description', placeholder: 'Short brown hair' },
        { name: 'build', description: 'Body build', placeholder: 'Athletic' },
        { name: 'clothingAesthetic', description: 'Clothing style', placeholder: 'Casual professional' },
        { name: 'signatureDetails', description: 'Distinctive features', placeholder: 'Warm smile' },
        { name: 'demeanor', description: 'Demeanor', placeholder: 'Confident and friendly' },
        { name: 'energyLevel', description: 'Energy level', placeholder: 'High' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const STAGE_3_NARRATIVES_TEMPLATE = {
  id: 'stage_3_narratives',
  stageType: 'stage_3_narratives',
  prompts: [
    {
      id: 'prompt_textGeneration_narrative_default',
      capability: 'textGeneration',
      name: 'Default Narrative Generation',
      description: 'Creates compelling narrative themes and story arcs for marketing videos',
      systemPrompt: 'You are a creative storyteller and marketing narrative expert for video content.',
      userPromptTemplate: `You are a **Viral Marketing Content Strategist** and a **Hollywood Story Doctor** specializing in high-conversion, short-form video for the sports sector. Your mandate is to engineer compelling story arcs that leverage the authenticity of Athlete-Generated Content (AGC) and are primed for maximum social sharing and engagement.

## 🎯 STAGE CONTEXT & INPUTS
The narratives must be custom-tailored to the emotional drives and performance needs suggested by the input data.
* **Product:** {{productDescription}} (Focus on the *problem* it solves and the *transformation* it provides.)
* **Target Audience:** {{targetAudience}} (Anchor the story in their pain points and aspirations.)
* **Selected Personas:** {{selectedPersonas}} (Leverage the personas' specific athletic credibility and lifestyle details to ground the story.)

## 📝 CORE TASK: ENGINEER VIRAL NARRATIVES
Generate {{numberOfNarratives}} completely **unique** and **high-impact** narrative themes. Each narrative must:
1.  **Be Short-Form Optimized:** Designed for rapid pacing (under 60 seconds implied).
2.  **Feature a Strong Transformation:** Move the protagonist (the persona) from a state of struggle/problem to a state of success/solution enabled *only* by the product.
3.  **Incorporate Conflict:** Identify a specific athletic or lifestyle obstacle overcome by using the product.
4.  **Fit the AGC Style:** Feel like an authentic, personal story rather than a polished commercial.

## 🎥 NARRATIVE STRUCTURE AND VISUAL CUES DEFINITION
* **\`description\`**: A concise, 2-3 sentence summary of the story's core conflict, action, and resolution.
* **\`structure\`**: Outline the video flow using the classic UGC format (Hook -> Problem -> Solution -> Proof -> CTA). 
* **\`gradient\`, \`patternColor\`, \`ringColor\`**: These represent key visual/branding elements. Define them using compelling, evocative descriptions (e.g., "Neon Electric Blue to Deep Midnight Black," "Carbon Fiber Texture," "Sharp, High-Contrast Red Ring") that evoke the mood and energy of the narrative.

## 📄 MANDATORY OUTPUT FORMAT
**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array). DO NOT include any explanatory text before or after the JSON array:**
[{
  "id": "",
  "title": "",
  "description": "",
  "structure": "",
  "gradient": "",
  "patternColor": "",
  "ringColor": ""
}]`,
      outputFormat: 'json',
      variables: [
        { name: 'productDescription', description: 'Description of the product', placeholder: 'E.g., A sustainable water bottle' },
        { name: 'targetAudience', description: 'Target audience for the product', placeholder: 'E.g., Environmentally conscious millennials' },
        { name: 'selectedPersonas', description: 'Selected personas for the narrative', placeholder: 'Persona names or descriptions' },
        { name: 'numberOfNarratives', description: 'Number of narratives to generate', placeholder: '6' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const STAGE_4_STORYBOARD_TEMPLATE = {
  id: 'stage_4_storyboard',
  stageType: 'stage_4_storyboard',
  prompts: [
    {
      id: 'prompt_textGeneration_storyboard_default',
      capability: 'textGeneration',
      name: 'Default Storyboard Generation',
      description: 'Creates detailed storyboard scenes for video advertisements',
      systemPrompt: 'You are an expert storyboard designer for video marketing.',
      userPromptTemplate: `You are an elite **Commercial Cinematographer** and **Storyboard Director** specializing in high-conversion, short-form Athlete-Generated Content (AGC). Your task is to break down the provided narrative into a series of highly visual, dynamic scenes that maximize engagement and clearly tell the story for a <30 second video.

## 🎯 STAGE CONTEXT & INPUTS
The scenes must visually manifest the transformation and conflict described in the narrative.
* **Product:** {{productDescription}} (The hero item that enables the transformation)
* **Target Audience:** {{targetAudience}} (Ensure the visual style resonates with them)
* **Video Duration:** {{videoDuration}} (Use this to dictate pacing and shot length)
* **Number of Scenes:** {{numberOfScenes}} (Strictly adhere to this count)

* **PERSONA:** {{selectedPersonaName}} (Use the persona's aesthetic and energy to inform the visuals)
    * Description: {{selectedPersonaDescription}}
* **NARRATIVE:** {{narrativeTheme}} (The emotional core and goal of the video)
    * Structure: {{narrativeStructure}} (Must map scenes to this structure: Hook, Problem, Solution, Proof, CTA)

## 🎥 CORE TASK: CREATE ACTIONABLE STORYBOARD SCENES
Create {{numberOfScenes}} detailed storyboard scenes. Ensure the sequence visually follows the mandated \`{{narrativeStructure}}\` and delivers a strong emotional arc.

## 🖼️ SCENE VISUAL & TECHNICAL DEFINITIONS
* **\`description\`**: A concise, action-focused description of *what* happens in the scene and the *mood* (e.g., "Frustration builds as the athlete fails the lift; dramatic sweat sheen on forehead").
* **\`persona\`**: Specify the persona's action, emotion, and key focus in the scene.
* **\`product\`**: Specify if the product is visible, being used, or introduced (e.g., "Product visible in gym bag," "Product used mid-workout," "Close-up on product's texture").
* **\`visualElements\`**: Details on lighting, color palette, props, and setting details (e.g., "Early morning blue/gray light, messy gear, tight focus on hands," "Golden hour lighting, high energy, dynamic motion").
* **\`cameraWork\`**: Specific, professional camera instructions (e.g., "Whip pan," "Dutch angle," "Slow motion push-in," "Handheld POV," "Tight close-up (MCU)").
* **\`keyFrameDescription\`**: The exact, descriptive **Image Prompt** for generating the primary visual for the scene. This must be a single, highly detailed sentence describing the action, emotion, lighting, and composition (e.g., "Hyperrealistic still of a determined female ultra-marathoner in dusty sunset light, mid-stride, slight motion blur, low angle shot.").

## 📄 MANDATORY OUTPUT FORMAT
**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array). DO NOT include any explanatory text before or after the JSON array:**
[{
  "sceneNumber": 1,
  "title": "",
  "description": "",
  "location": "",
  "persona": "",
  "product": "",
  "visualElements": "",
  "cameraWork": "",
  "keyFrameDescription": ""
}]`,
      outputFormat: 'json',
      variables: [
        { name: 'productDescription', description: 'Description of the product', placeholder: 'E.g., A sustainable water bottle' },
        { name: 'targetAudience', description: 'Target audience for the product', placeholder: 'E.g., Environmentally conscious millennials' },
        { name: 'videoDuration', description: 'Duration of the video', placeholder: '30s' },
        { name: 'numberOfScenes', description: 'Number of scenes to generate', placeholder: '6' },
        { name: 'selectedPersonaName', description: 'Name of the selected persona', placeholder: 'Jane Smith' },
        { name: 'selectedPersonaDescription', description: 'Description of the selected persona', placeholder: 'A 28-year-old environmental activist' },
        { name: 'narrativeTheme', description: 'Theme of the narrative', placeholder: 'Sustainability journey' },
        { name: 'narrativeStructure', description: 'Structure of the narrative', placeholder: 'Hero\'s journey' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prompt_imageGeneration_storyboard_default',
      capability: 'imageGeneration',
      name: 'Default Storyboard Scene Image Generation',
      description: 'Generates professional UGC-style scene images for marketing videos',
      systemPrompt: '',
      userPromptTemplate: `**You are an expert AI Visual Director and Hyperrealism Artist. Your sole task is to render a single, stunningly realistic and consistent **keyframe image** for a high-conversion Athlete-Generated Content (AGC) marketing video scene, strictly adhering to all provided visual and character specifications.**

## 🎯 **CRITICAL VISUAL CONSISTENCY MANDATES:**
1.  **PERSONA IDENTICALITY:** The primary character/persona in this scene **MUST be an absolute 1:1 match** to the provided persona reference image. Pay forensic attention to facial features, hair color and style, body build, skin tone, clothing aesthetic, and any distinguishing marks (scars, tattoos). The goal is *seamless, absolute continuity* across all generated scenes.
2.  **PRODUCT FIDELITY:** Wherever the product appears, it **MUST be rendered identically** to the provided product reference image. No alterations to its shape, color, branding, texture, or design are permitted. It must be recognizably the exact same product.

## 📄 **SCENE DATA FOR RENDERING:**

* **Scene Title:** {{title}}
* **Scene Description:** {{description}}
* **Location/Setting:** {{location}}
* **Visual Elements (Lighting, Color, Mood, Props):** {{visualElements}}
* **Camera Work (Angle, Framing, Motion):** {{cameraWork}}

* **Character/Persona Focus:** {{selectedPersonaName}} - {{selectedPersonaDescription}}
    * **Reference Image:** Persona/Character reference image provided.

* **Product Focus:** {{product}}
    * **Reference Image:** Product reference image provided.

## 🎨 **ULTIMATE VISUALIZATION INSTRUCTION:**
**Based on the "{{keyFrameDescription}}" which is the primary image prompt, render the scene.**

* **Style:** **Hyperrealistic digital photography**, indistinguishable from a professionally shot live-action still. Aim for a gritty, authentic, yet aesthetically pleasing "documentary-meets-social-media-viral" quality.
* **Lighting:** Masterful, naturalistic lighting that enhances mood and realism. Utilize the \`{{visualElements}}\` for specific lighting cues (e.g., golden hour, dappled light, high contrast, soft diffused).
* **Composition & Framing:** Execute the \`{{cameraWork}}\` precisely. Use dynamic angles, deep focus where required, or shallow depth of field to draw attention to the subject/product.
* **Emotion & Authenticity:** The persona's expression and body language must be genuine, unposed, and reflective of the scene's emotional tone and \`{{selectedPersonaDescription}}\`. Capture candid moments.
* **Atmosphere:** Include subtle environmental details (e.g., dust motes, sweat, breath in cold air, texture of surfaces) to heighten immersion.

**Deliver a visually striking, professional-grade keyframe that perfectly encapsulates the scene and maintains absolute consistency with the provided references.**`,
      outputFormat: 'text',
      variables: [
        { name: 'selectedPersonaName', description: 'Name of the selected persona', placeholder: 'Jane Smith' },
        { name: 'selectedPersonaDescription', description: 'Description of the selected persona', placeholder: 'A 28-year-old environmental activist' },
        { name: 'title', description: 'Scene title', placeholder: 'Morning routine' },
        { name: 'description', description: 'Scene description', placeholder: 'Opening shot of persona starting their day' },
        { name: 'location', description: 'Scene location', placeholder: 'Modern apartment kitchen' },
        { name: 'visualElements', description: 'Visual elements in the scene', placeholder: 'Natural sunlight, minimalist decor' },
        { name: 'cameraWork', description: 'Camera work description', placeholder: 'Medium shot, handheld' },
        { name: 'product', description: 'Product in the scene', placeholder: 'Sustainable water bottle on counter' },
        { name: 'keyFrameDescription', description: 'Detailed visual description', placeholder: 'Warm morning light, focus on product' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prompt_imageEditing_storyboard_default',
      capability: 'imageEditing',
      name: 'Default Storyboard Scene Image Editing',
      description: 'Edits existing storyboard scene images with AI modifications',
      systemPrompt: '',
      userPromptTemplate: `Generate a professional UGC-style scene image for a marketing video with the following modifications:

**Reference Images:**
- Original Scene Reference: The current scene image is provided for visual context and consistency
- Product Reference Image: The actual product image is provided - maintain exact product appearance

**Original Scene Details:**
Title: {{title}}
Description: {{description}}
Location/Setting: {{location}}
Visual Elements: {{visualElements}}
Camera Work: {{cameraWork}}
Key Frame Description: {{keyFrameDescription}}

**Requested Changes:**
{{editPrompt}}

**Instructions:**
Using the provided reference images as visual guides, apply the requested changes while maintaining the overall style, composition, and quality of the original scene. The edited image should:
- Keep the same visual style and cinematography as the original scene reference
- Maintain consistent lighting, color grading, and composition
- Use the exact product from the product reference image - do not alter its appearance
- Apply ONLY the specific changes requested in the edit prompt
- Preserve all other elements that are not mentioned in the edit request
- Remain high-quality, cinematic, and professional
- Continue to be authentic and suitable for UGC marketing

IMPORTANT: If the product appears in the scene, ensure it looks identical to the product reference image provided. Do not alter the product's colors, design, or features.

Generate the edited scene image that seamlessly incorporates only the requested changes while keeping everything else consistent with the reference images.`,
      outputFormat: 'text',
      variables: [
        { name: 'title', description: 'Original scene title', placeholder: 'Morning routine' },
        { name: 'description', description: 'Original scene description', placeholder: 'Opening shot of persona starting their day' },
        { name: 'location', description: 'Original scene location', placeholder: 'Modern apartment kitchen' },
        { name: 'visualElements', description: 'Original visual elements', placeholder: 'Natural sunlight, minimalist decor' },
        { name: 'cameraWork', description: 'Original camera work', placeholder: 'Medium shot, handheld' },
        { name: 'keyFrameDescription', description: 'Original key frame description', placeholder: 'Warm morning light, focus on product' },
        { name: 'editPrompt', description: 'User requested changes', placeholder: 'Make the lighting warmer and add a coffee mug' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const STAGE_5_SCREENPLAY_TEMPLATE = {
  id: 'stage_5_screenplay',
  stageType: 'stage_5_screenplay',
  prompts: [
    {
      id: 'prompt_textGeneration_screenplay_default',
      capability: 'textGeneration',
      name: 'Default Screenplay Generation',
      description: 'Converts storyboard scenes into detailed screenplay format with timings',
      systemPrompt: 'You are a professional screenwriter and video production specialist.',
      userPromptTemplate: `You are an elite **Short-Form Video Editor** and a **Dialogue/Action Screenwriter** specializing in high-impact, high-conversion Athlete-Generated Content (AGC). Your task is to convert the provided storyboard scenes into a precisely timed, cohesive, and production-ready screenplay, ensuring maximum engagement within the tight **{{videoDuration}}** limit.

## 🎯 STAGE CONTEXT & FLOW MANDATES
The screenplay must deliver a smooth narrative flow, ensuring seamless transitions between scenes and clear direction for action and dialogue.
* **Persona:** {{selectedPersonaName}} (Dialogue and action must be authentic to their voice and athletic context.)
* **Video Duration:** {{videoDuration}} (Pacing must be aggressive; scene lengths must be short and impactful.)
* **Storyboard Input:** {{storyboardScenes}} (Use the \`description\`, \`cameraWork\`, and \`visualElements\` from each storyboard scene to inform the screenplay details.)

## 📝 CORE TASK: BUILD THE TIMED SCREENPLAY
Create a detailed screenplay that translates the visual scenes into timed beats with production notes and authentic, concise dialogue. **Ensure the sum of all \`timeEnd\` durations equals the \`{{videoDuration}}\`.**

## 🎬 SCREENPLAY FIELD DEFINITIONS (SECOND-BY-SECOND DETAILING MANDATE)

* **\`visual\`**: Detailed description of the scene's appearance and all actions. **This field MUST contain a sub-list of visual actions broken down by second/timecode within the scene duration (e.g., 0:00-0:01: Tight shot of hands gripping product, sweat visible; 0:01-0:03: Wider shot of athlete struggling during a set).**
* **\`cameraFlow\`**: The sequence of camera actions, combining the storyboard's \`cameraWork\` with the flow of the action. **This field MUST contain a sub-list of camera moves broken down by second/timecode, corresponding directly to the visual actions (e.g., 0:00-0:01: Jittery handheld MCU; 0:01-0:03: Dolly track-out to MS).**
* **\`script\`**: The precise, concise dialogue, voice-over (VO), sound effects (SFX), or on-screen text. **This field MUST contain the exact script line or sound notation, matched to the specific second it is delivered/appears on screen (e.g., SFX 0:00-0:01: Heavy clang. VO 0:02-0:03: 'I hit a wall.'; Text 0:04-0:05: 'THE SOLUTION.'). Keep dialogue extremely brief.**
* **\`backgroundMusic\`**: Suggest the type of music/sound design and its energy (e.g., "Uplifting, driving synth-pop," "Muted ambient electronica," "Aggressive, bass-heavy trap beat").
* **\`transition\`**: The specific method used to move to the next scene (e.g., "Hard cut," "Fast cross-dissolve," "Match cut on action," "Quick fade to black"). Crucial for smooth flow.

## 📄 MANDATORY OUTPUT FORMAT
**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array). DO NOT include any explanatory text before or after the JSON array:**
[{
  "sceneNumber": 1,
  "timeStart": "0:00",
  "timeEnd": "0:05",
  "visual": "",
  "cameraFlow": "",
  "script": "",
  "backgroundMusic": "",
  "transition": ""
}]`,
      outputFormat: 'json',
      variables: [
        { name: 'storyboardScenes', description: 'Storyboard scenes description', placeholder: 'Scene 1: ...' },
        { name: 'selectedPersonaName', description: 'Name of the selected persona', placeholder: 'Jane Smith' },
        { name: 'videoDuration', description: 'Duration of the video', placeholder: '30s' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const STAGE_6_VIDEO_TEMPLATE = {
  id: 'stage_6_video',
  stageType: 'stage_6_video',
  prompts: [
    {
      id: 'prompt_textGeneration_video_default',
      capability: 'textGeneration',
      name: 'Default Video Production Specification',
      description: 'Generates detailed video production specifications from screenplay',
      systemPrompt: 'You are a professional video production director.',
      userPromptTemplate: `You are an **Elite Cinematic Director** providing the single, descriptive brief for a **Hyperrealistic, Athlete-Generated Content (AGC)** video generation model (e.g., Veo, Sora). Your goal is to generate a short, high-impact video segment based on the following precise, time-coded specifications.

## 🎯 SCENE CONTEXT & INPUTS
* **SCENE NUMBER:** {{sceneNumber}}
* **DURATION:** {{duration}}
* **VISUAL (Timecode-based Action):** {{visual}} 
* **CAMERA FLOW (Timecode-based Moves):** {{cameraFlow}}
* **SCRIPT (Timecode-based Audio/Text):** {{script}}
* **BACKGROUND MUSIC VIBE:** {{backgroundMusic}}

## 🎬 MASTER VIDEO GENERATION PROMPT
**Generate a hyperrealistic, high-definition (HD) video clip exactly {{duration}} seconds in length.** The clip must feature the following continuous, dynamic action:

**1. AESTHETIC & MOOD:**
Render the scene using a **{{videoSpecs.lightingStyle}}** lighting style and a **{{videoSpecs.colorGrade}}** color grade. The overall feel should be **authentic, raw, and high-stakes**, matching the style of a modern sports documentary or UGC video. Include **{{technicalNotes}}** (e.g., visible sweat, subtle lens flare, film grain).

**2. ACTION & TIMING (The Visual Flow):**
**From [Start Time] to [End Time],** execute the following camera movement and visual action, seamlessly merging the **VISUAL** and **CAMERA FLOW** inputs:
* [0:00-0:01]: **[Extract Visual Action from VISUAL]** filmed with a **[Extract Camera Move from CAMERA FLOW]**.
* [0:01-0:02]: **[Extract Visual Action from VISUAL]** filmed with a **[Extract Camera Move from CAMERA FLOW]**.
* [0:02-0:03]: **[Extract Visual Action from VISUAL]** filmed with a **[Extract Camera Move from CAMERA FLOW]**.
* ... (Continue for the full duration, or until the end of the scene flow)

**3. CHARACTER & PRODUCT FOCUS:**
Ensure the primary subject looks consistent with the provided persona references. The product **{{productPlacement.focusStyle}}** will be the focus during the time window **{{productPlacement.productVisibilityTimecode}}**.

**4. AUDIO CUES (For Synchronization):**
The background score should be **{{BACKGROUND MUSIC VIBE}}**. Key audio synchronization points are:
* **Dialogue/VO:** **{{SCRIPT (Specific lines and timecodes)}}**
* **Sound Effects:** **[Extract key SFX from SCRIPT]** should be prioritized.

**Target Output:** A highly dynamic, emotionally charged, and technically precise short-form AGC video clip with smooth, realistic motion.`,
      outputFormat: 'json',
      variables: [
        { name: 'sceneNumber', description: 'Scene number', placeholder: '1' },
        { name: 'visual', description: 'Visual description', placeholder: 'Wide shot of persona in kitchen' },
        { name: 'cameraFlow', description: 'Camera flow description', placeholder: 'Pan left to right' },
        { name: 'script', description: 'Script/dialogue', placeholder: 'Good morning! Let me show you...' },
        { name: 'backgroundMusic', description: 'Background music description', placeholder: 'Upbeat acoustic' },
        { name: 'duration', description: 'Scene duration', placeholder: '5s' }
      ],
      isDefault: true,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Export all templates as an array
export const ALL_PROMPT_TEMPLATES = [
  STAGE_2_PERSONAS_TEMPLATE,
  STAGE_3_NARRATIVES_TEMPLATE,
  STAGE_4_STORYBOARD_TEMPLATE,
  STAGE_5_SCREENPLAY_TEMPLATE,
  STAGE_6_VIDEO_TEMPLATE,
];
