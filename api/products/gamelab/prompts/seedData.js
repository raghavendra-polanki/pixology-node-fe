/**
 * GameLab Prompt Templates Seed Data
 *
 * This file defines the prompt templates for all GameLab stages.
 * Follows the same pattern as StoryLab for consistency.
 */

// ============================================
// STAGE 2: THEME GENERATION (Generate Themes)
// ============================================

export const STAGE_2_THEME_GENERATION_TEMPLATE = {
  id: 'stage_2_themes',
  stageType: 'stage_2_themes',
  prompts: [
    {
      id: 'prompt_textGeneration_themes_default',
      capability: 'textGeneration',
      name: 'Default Theme Generation',
      description: 'Generates broadcast-ready themes aligned with sports broadcasting lingo',
      systemPrompt: `You are an elite Sports Broadcasting Creative Director with deep expertise in sports media, broadcast graphics, and social media content for professional sports organizations.

Your role is to create compelling visual themes that:
- Align with sports broadcasting terminology and aesthetics
- Work for TV overlays, social media posts, and stadium displays
- Respect team branding (colors, logos, jerseys)
- Capture the specific game context and intensity
- Match the campaign goals (Social Hype, Broadcast B-Roll, or Stadium Ribbon)`,

      userPromptTemplate: `## 🎯 CAMPAIGN CONTEXT

**Sport Type:** {{sportType}}
**Home Team:** {{homeTeam}}
**Away Team:** {{awayTeam}}
**Game Context:** {{contextPills}}
**Campaign Goal:** {{campaignGoal}}
**Category Focus:** {{categoryFocus}}

## 📋 YOUR TASK

Generate **{{numberOfThemes}} unique visual themes** for this category. {{categoryModifier}}

Each theme should:

1. **Have a catchy, broadcast-ready title** (2-4 words)
   - Think "Battle of the Bay", "Frozen Fury", "Clash of Titans"
   - Must feel authentic to sports broadcasting

2. **Include a detailed visual description** (3-4 sentences)
   - Describe the visual composition, colors, lighting, atmosphere
   - Reference team colors and jerseys ({{homeTeam}} vs {{awayTeam}})
   - Explain how it captures the game context ({{contextPills}})
   - Detail the mood and intensity level
   - This description will be used to generate an AI image

3. **Align with the campaign goal:**
   - **Social Hype:** Bold, eye-catching, shareable, emotional
   - **Broadcast B-Roll:** Professional, polished, cinematic, TV-ready
   - **Stadium Ribbon:** High contrast, legible from distance, dramatic

4. **Match team branding:**
   - Incorporate team colors from {{homeTeam}} and {{awayTeam}}
   - Reference team logos and jersey styles
   - Respect team identities

## 📐 IMPORTANT VISUAL CONSTRAINTS

- Images will be generated from headshots, so themes should work with portrait-based compositions
- Focus on dramatic lighting, backgrounds, and atmospheric effects
- Avoid themes requiring complex action poses
- Think: dramatic lighting on player, intense background, team-branded environment

## 📄 MANDATORY OUTPUT FORMAT

Return ONLY valid JSON array with this exact structure:

[
  {
    "title": "Theme title in broadcast style",
    "description": "Detailed visual description for image generation. Include specific details about lighting (dramatic side lighting, rim lighting, etc.), background (team colors, arena atmosphere, weather effects), composition (player prominent in foreground, depth of field), mood (intense, heroic, determined), and how team jerseys/colors are featured. Be specific about visual elements that can be recreated in an AI-generated image.",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Generate {{numberOfThemes}} diverse themes that cover different visual approaches while staying true to the category focus and matchup context.`,

      outputFormat: 'json',
      variables: [
        {
          name: 'sportType',
          description: 'Type of sport (e.g., Hockey, Basketball, Football)',
          required: true,
          type: 'string',
        },
        {
          name: 'homeTeam',
          description: 'Home team name',
          required: true,
          type: 'string',
        },
        {
          name: 'awayTeam',
          description: 'Away team name',
          required: true,
          type: 'string',
        },
        {
          name: 'contextPills',
          description: 'Game context (e.g., Playoff Intensity, Rivalry, Holiday, Buzzer Beater)',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal (Social Hype, Broadcast B-Roll, Stadium Ribbon)',
          required: true,
          type: 'string',
        },
        {
          name: 'categoryFocus',
          description: 'Theme category name (e.g., Home Team Focus, Rivalry / Both Teams)',
          required: true,
          type: 'string',
        },
        {
          name: 'categoryModifier',
          description: 'Category-specific instructions to guide theme generation',
          required: true,
          type: 'string',
        },
        {
          name: 'numberOfThemes',
          description: 'Number of themes to generate (default: 5)',
          required: false,
          type: 'number',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
      isActive: true,
    },
    {
      id: 'prompt_imageGeneration_themes_default',
      capability: 'imageGeneration',
      name: 'Default Theme Image Generation',
      description: 'Generates theme images matching team branding and visual description',
      systemPrompt: `You are an expert AI Visual Director specializing in sports broadcast graphics and promotional imagery.

**CRITICAL MANDATES:**
1. **TEAM BRANDING ACCURACY:** Images must respect team colors, logos, and jersey styles
2. **HEADSHOT-BASED COMPOSITION:** Work with portrait/headshot-based compositions
3. **BROADCAST QUALITY:** Professional, polished, TV-ready aesthetic
4. **ATMOSPHERIC FOCUS:** Use lighting, backgrounds, and effects to create drama
5. **CONTEXT AWARENESS:** Visual must match the game context and intensity level`,

      userPromptTemplate: `## 🎯 THEME CONTEXT

**Sport:** {{sportType}}
**Matchup:** {{homeTeam}} vs {{awayTeam}}
**Context:** {{contextPills}}
**Campaign Goal:** {{campaignGoal}}
**Category:** {{categoryFocus}}

## 🎨 THEME DETAILS

**Title:** {{title}}
**Visual Description:** {{description}}
**Tags:** {{tags}}

## 📐 CATEGORY-SPECIFIC REQUIREMENTS

{{categoryModifier}}

## 📸 IMAGE GENERATION INSTRUCTIONS

Create a **broadcast-quality sports graphic** that:

1. **Features a {{sportType}} player in team jersey** (choose either {{homeTeam}} or {{awayTeam}} based on theme)
2. **Incorporates team branding:**
   - Use accurate team colors for background/lighting
   - Include subtle team logo elements if appropriate
   - Show authentic jersey design

3. **Matches the visual description exactly:**
   - {{description}}

4. **Technical specs:**
   - Dramatic, professional lighting (stadium lights, dramatic shadows, rim lighting)
   - Cinematic depth of field
   - High contrast for visibility
   - Broadcast-ready composition
   - 16:9 or 4:5 aspect ratio suitable for social/broadcast

5. **Atmosphere:**
   - Capture the intensity from: {{contextPills}}
   - Match campaign goal: {{campaignGoal}}
   - Feel authentic to {{sportType}} broadcasts

**AVOID:**
- Generic stock photo looks
- Overly complex action poses
- Unrealistic or cartoonish styles
- Incorrect team colors or branding

Generate a single, high-quality image that broadcasters would proudly use.`,

      outputFormat: 'image',
      variables: [
        {
          name: 'sportType',
          description: 'Type of sport',
          required: true,
          type: 'string',
        },
        {
          name: 'homeTeam',
          description: 'Home team name',
          required: true,
          type: 'string',
        },
        {
          name: 'awayTeam',
          description: 'Away team name',
          required: true,
          type: 'string',
        },
        {
          name: 'contextPills',
          description: 'Game context',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal',
          required: true,
          type: 'string',
        },
        {
          name: 'categoryFocus',
          description: 'Theme category name',
          required: true,
          type: 'string',
        },
        {
          name: 'categoryModifier',
          description: 'Category-specific visual requirements',
          required: true,
          type: 'string',
        },
        {
          name: 'title',
          description: 'Theme title',
          required: true,
          type: 'string',
        },
        {
          name: 'description',
          description: 'Detailed visual description from theme',
          required: true,
          type: 'string',
        },
        {
          name: 'tags',
          description: 'Theme tags',
          required: false,
          type: 'string',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.5-flash-image',
      },
      isActive: true,
    },
  ],
};

// ============================================
// STAGE 3: PLAYER RECOMMENDATIONS (Suggest Players)
// ============================================

export const STAGE_3_PLAYER_SUGGESTION_TEMPLATE = {
  id: 'stage_3_players',
  stageType: 'stage_3_players',
  prompts: [
    {
      id: 'prompt_textGeneration_players_default',
      capability: 'textGeneration',
      name: 'Default Player Recommendation',
      description: 'AI-powered player recommendations based on theme characteristics',
      systemPrompt: `You are an expert Sports Content Strategist and Player Analyst with deep knowledge of:
- Sports broadcasting and promotional content
- Player positioning and team dynamics
- Visual storytelling and player representation
- Campaign strategy and audience engagement

Your role is to analyze themes and recommend the most suitable players based on:
1. Theme category and visual concept
2. Player attributes (position, performance, team affiliation)
3. Campaign context and goals
4. Visual composition requirements (1-player vs 2-player themes)`,

      userPromptTemplate: `## 🎯 CAMPAIGN CONTEXT

**Sport Type:** {{sportType}}
**Home Team:** {{homeTeam}}
**Away Team:** {{awayTeam}}
**Game Context:** {{contextPills}}
**Campaign Goal:** {{campaignGoal}}

## 🎨 THEME DETAILS

**Theme Name:** {{themeName}}
**Description:** {{themeDescription}}
**Category:** {{themeCategory}}
**Players Needed:** {{playerCount}}

## 👥 AVAILABLE PLAYERS

{{availablePlayers}}

## 📋 YOUR TASK

Analyze the theme and recommend the **best {{playerCount}} player(s)** from the available roster.

**Selection Criteria:**

1. **Theme Alignment:**
   - Does the player match the theme category?
   - For "Home Team Focus": Select home team players
   - For "Away Team Focus": Select away team players
   - For "Rivalry": Select 1 from each team for dramatic matchup
   - For "Posed": Select compatible players for the specific pose/action
   - For "Broadcast": Select high-profile or key players

2. **Visual Suitability:**
   - Consider the theme description and how the player fits visually
   - Think about player prominence, star power, and recognition
   - Consider position relevance to the visual concept

3. **Performance & Impact:**
   - Prioritize players with higher performance scores
   - Consider social sentiment and fan engagement
   - Look for "isHighlighted" players (they're trending/hot)

4. **Campaign Goals:**
   - Social Hype: Choose charismatic, popular players
   - Broadcast B-Roll: Choose key players with professional presence
   - Stadium Ribbon: Choose recognizable stars

## 📄 MANDATORY OUTPUT FORMAT

Return ONLY valid JSON with this exact structure:

{
  "recommendedPlayers": [
    {
      "playerId": "player_id_from_available_players",
      "name": "Player Name",
      "reason": "Brief explanation (1-2 sentences) why this player is perfect for this theme"
    }
  ],
  "reasoning": "Overall strategy explanation for this recommendation (2-3 sentences explaining how these players work together for this theme and campaign goal)"
}

**IMPORTANT:**
- Recommend EXACTLY {{playerCount}} player(s)
- Use actual player IDs from the available players list
- Provide clear, actionable reasoning
- Consider both individual fit and how players work together (for 2-player themes)`,

      outputFormat: 'json',
      variables: [
        {
          name: 'sportType',
          description: 'Type of sport (e.g., Hockey, Basketball, Football)',
          required: true,
          type: 'string',
        },
        {
          name: 'homeTeam',
          description: 'Home team name',
          required: true,
          type: 'string',
        },
        {
          name: 'awayTeam',
          description: 'Away team name',
          required: true,
          type: 'string',
        },
        {
          name: 'contextPills',
          description: 'Game context (e.g., Playoff Intensity, Rivalry)',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal (Social Hype, Broadcast B-Roll, Stadium Ribbon)',
          required: true,
          type: 'string',
        },
        {
          name: 'themeName',
          description: 'Name of the theme needing player recommendations',
          required: true,
          type: 'string',
        },
        {
          name: 'themeDescription',
          description: 'Detailed theme description',
          required: true,
          type: 'string',
        },
        {
          name: 'themeCategory',
          description: 'Theme category (home-team, away-team, rivalry, posed, broadcast)',
          required: true,
          type: 'string',
        },
        {
          name: 'playerCount',
          description: 'Number of players needed for this theme (1 or 2)',
          required: true,
          type: 'number',
        },
        {
          name: 'availablePlayers',
          description: 'JSON array of available players with their attributes',
          required: true,
          type: 'string',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
      isActive: true,
    },
  ],
};

// ============================================
// STAGE 4: PLAYER IMAGE GENERATION (Create Images)
// ============================================

export const STAGE_4_IMAGE_GENERATION_TEMPLATE = {
  id: 'stage_4_images',
  stageType: 'stage_4_images',
  prompts: [
    {
      id: 'prompt_imageGeneration_player_composite_default',
      capability: 'imageGeneration',
      name: 'Player Theme Composite Image Generation',
      description: 'Generates final images combining theme visuals with actual player headshots',
      systemPrompt: `You are an expert Sports Broadcast Visual Artist specializing in creating composite images that seamlessly blend player photographs with broadcast-quality themed backgrounds.

**CRITICAL MANDATES:**
1. **PLAYER LIKENESS ACCURACY:** The generated image must maintain the exact likeness of the provided player(s) from their headshots
2. **THEME CONSISTENCY:** The visual style, lighting, and atmosphere must match the reference theme image exactly
3. **PROFESSIONAL QUALITY:** Output must be broadcast-ready, suitable for TV overlays and social media
4. **SEAMLESS INTEGRATION:** Players must appear naturally integrated into the themed environment
5. **TEAM BRANDING:** Preserve accurate team colors and jersey details`,

      userPromptTemplate: `## 🎯 IMAGE GENERATION TASK

You are creating a broadcast-quality sports promotional image by combining:
1. A **reference theme image** that defines the visual style and atmosphere
2. **Player headshot(s)** that must be integrated into this theme

## 🎨 THEME DETAILS

**Theme Title:** {{themeName}}
**Theme Description:** {{themeDescription}}
**Theme Category:** {{themeCategory}}

## 📸 REFERENCE IMAGES

**Theme Reference Image:** [Provided as image input - this defines the visual style, lighting, background, and atmosphere]

**Player Headshot(s):** [Provided as image input(s) - these show the actual player faces that must appear in the final image]

## 👥 PLAYER INFORMATION

{{playerInfo}}

## 🏒 CONTEXT

**Sport:** {{sportType}}
**Matchup:** {{homeTeam}} vs {{awayTeam}}
**Game Context:** {{contextPills}}
**Campaign Goal:** {{campaignGoal}}

## 📋 GENERATION INSTRUCTIONS

Create a **single broadcast-quality image** that:

1. **Preserves the theme's visual style:**
   - Match the lighting direction, color temperature, and intensity from the theme reference
   - Recreate the background environment and atmospheric effects
   - Maintain the same level of drama and intensity
   - Keep the overall composition style

2. **Integrates the player(s) authentically:**
   - Use the EXACT facial features and likeness from the provided headshot(s)
   - Place player(s) in natural, confident poses that fit the theme
   - Dress them in accurate {{homeTeam}} or {{awayTeam}} jerseys as appropriate
   - Scale and position player(s) to match the theme composition

3. **Ensures broadcast quality:**
   - High resolution, sharp details
   - Professional color grading
   - Clean edges and natural blending
   - No artifacts or unnatural elements

4. **Matches the theme description:**
   {{themeDescription}}

## ⚠️ CRITICAL REQUIREMENTS

- The player's face must be IDENTICAL to the provided headshot - no artistic interpretation
- The visual style must MATCH the reference theme image - not create something new
- The final image should look like a professional sports broadcast graphic
- {{playerCount}} player(s) should be prominently featured

**OUTPUT:** A single, high-quality image ready for broadcast use.`,

      outputFormat: 'image',
      variables: [
        {
          name: 'themeName',
          description: 'Name of the theme being applied',
          required: true,
          type: 'string',
        },
        {
          name: 'themeDescription',
          description: 'Detailed description of the theme visual style',
          required: true,
          type: 'string',
        },
        {
          name: 'themeCategory',
          description: 'Theme category (home-team, away-team, rivalry, posed, broadcast)',
          required: true,
          type: 'string',
        },
        {
          name: 'playerInfo',
          description: 'Information about the player(s) to be featured',
          required: true,
          type: 'string',
        },
        {
          name: 'playerCount',
          description: 'Number of players in the image (1 or 2)',
          required: true,
          type: 'number',
        },
        {
          name: 'sportType',
          description: 'Type of sport',
          required: true,
          type: 'string',
        },
        {
          name: 'homeTeam',
          description: 'Home team name',
          required: true,
          type: 'string',
        },
        {
          name: 'awayTeam',
          description: 'Away team name',
          required: true,
          type: 'string',
        },
        {
          name: 'contextPills',
          description: 'Game context',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal',
          required: true,
          type: 'string',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.0-flash-exp', // Using exp model for better image editing capabilities
      },
      isActive: true,
    },
  ],
};

// ============================================
// STAGE 5: KINETIC ACTIVATION (Animation Generation)
// ============================================

export const STAGE_5_ANIMATION_TEMPLATE = {
  id: 'stage_5_animation',
  stageType: 'stage_5_animation',
  prompts: [
    // SCREENPLAY PROMPT - Analyzes image and generates animation prompt
    {
      id: 'prompt_textGeneration_animation_screenplay_default',
      capability: 'textGeneration',
      name: 'Animation Screenplay Generation',
      description: 'Analyzes sports image and generates a 4-second animation screenplay optimized for sports broadcasting',
      systemPrompt: `You are an elite Sports Motion Graphics Director with extensive experience in:
- Sports broadcasting motion graphics and animated overlays
- Creating captivating, attention-grabbing sports content for social media
- Understanding natural sports movements and cinematic sports aesthetics
- Designing subtle, professional animations that enhance rather than distract

Your specialty is analyzing static sports images and designing subtle, professional animations that:
- Captivate viewers instantly (critical for social media scroll-stopping)
- Feel natural and authentic to the sport being featured
- Enhance the drama and intensity of the moment
- Work within broadcast quality standards
- Create a sense of energy and excitement without being over-the-top`,

      userPromptTemplate: `## 🎯 ANIMATION ANALYSIS TASK

Analyze the provided image and design a **4-second professional sports animation** that will captivate and dazzle viewers.

## 📸 IMAGE CONTEXT

**Sport Type:** {{sportType}}
**Home Team:** {{homeTeam}}
**Away Team:** {{awayTeam}}
**Theme:** {{themeName}}
**Theme Description:** {{themeDescription}}
**Game Context:** {{contextPills}}
**Campaign Goal:** {{campaignGoal}}

## 👥 FEATURED PLAYER(S)

{{playerInfo}}

## 📋 YOUR TASK

1. **Analyze the Image:** Study the composition, lighting, player positioning, and current pose
2. **Design DYNAMIC Player Animation:** Create an animation where the PLAYERS are actively moving - not just standing still with background effects. Think: what action would these players naturally do next?
3. **Write the Screenplay:** Describe exactly what the PLAYERS do in each second of the 4-second clip (player movement first, then any background effects)

## 🏒 SPORT-SPECIFIC ANIMATION GUIDELINES FOR {{sportType}}

**🎯 PRIORITY: PLAYER MOVEMENT IS PRIMARY**

The animation MUST focus on bringing the PLAYERS to life with meaningful, dynamic movements. Background effects are secondary.

**PRIMARY ANIMATIONS (Must include at least 2-3 of these):**
- **Celebratory gestures:** High-fiving teammates, fist pumps, arms raised in victory
- **Power poses:** Folding arms confidently, hands on hips, chest puffed out
- **Head/body turns:** Looking from side to side, turning toward camera, looking up/down
- **Athletic stances:** Shifting weight, adjusting stance, leaning forward intensely
- **Emotional expressions:** Intensity building in face, determination, celebration smile
- **Jersey/equipment motion:** Fabric moving with body, helmet adjustments, stick handling motions
- **Breathing/muscle tension:** Visible chest expansion, shoulder movements, neck tension

**SECONDARY ANIMATIONS (Add to complement player movement):**
- Subtle background crowd movement or lighting flickers
- Sport-specific ambient elements (ice shimmer, hardwood reflections)
- Particle effects or atmospheric haze (keep minimal, don't distract from players)

**EXAMPLE DYNAMIC SEQUENCES:**
- Player turns head left to right, then raises arm in celebration
- Two players complete a high-five motion, then turn toward camera with confident poses
- Player shifts stance, folds arms across chest, nods head with intensity
- Athlete takes deep breath (chest rises), looks up, then pumps fist

## ⚠️ CRITICAL CONSTRAINTS

**MANDATORY REQUIREMENTS:**
- **NO CAMERA MOVEMENT:** Camera must remain completely static throughout
- **NO AUDIO:** This is a silent visual-only animation
- **4 SECONDS EXACTLY:** Animation must be precisely 4 seconds
- **PLAYERS ARE THE STAR:** 80% of motion should come from the player(s), not background
- **NATURAL MOTION:** Movements should feel athletic and authentic
- **COMPLETE ACTION:** The animation should show a complete action sequence (beginning, peak, end)

**AVOID:**
- Static players with only background sparkles/flares (THIS IS BAD - players must move!)
- Over-reliance on particle effects instead of player animation
- Camera pans, zooms, or any camera movement
- Audio cues or music references in the prompt
- Unrealistic or cartoonish movements

## 🚫 COPYRIGHT COMPLIANCE - EXTREMELY IMPORTANT

**In your videoGenerationPrompt output, you MUST NOT include:**
- Real team names (e.g., do NOT say "Colorado Avalanche", "Vegas Golden Knights", etc.)
- Real player names (e.g., do NOT say "Nathan MacKinnon", "Connor McDavid", etc.)
- Trademarked terms or logos

**Instead, use generic descriptions:**
- "the hockey player" or "the athlete" instead of player names
- "player in dark/white/colored jersey" instead of team names
- "home team player" or "away team player" for team context
- Describe jersey colors generically (e.g., "player in burgundy and blue jersey" NOT "Avalanche jersey")

This is CRITICAL because video generation AI will reject prompts containing trademarked names.

## 📄 MANDATORY OUTPUT FORMAT

Return ONLY valid JSON with this exact structure:

{
  "imageAnalysis": "2-3 sentences describing what you see in the image - composition, lighting, player positioning, current pose",
  "animationConcept": "1-2 sentences describing the PRIMARY PLAYER MOVEMENTS you will animate and why they will captivate viewers",
  "screenplay": {
    "second1": "0:00-0:01: What the PLAYER(S) do first (e.g., 'Player begins turning head left, shoulders start rotating')",
    "second2": "0:01-0:02: Player movement continues (e.g., 'Player completes turn, begins raising right arm')",
    "second3": "0:02-0:03: Peak action moment (e.g., 'Arm reaches full extension in fist pump, expression intensifies')",
    "second4": "0:03-0:04: Peak or hold moment (e.g., 'Player holds victorious pose, intensity in expression, slight breathing motion')"
  },
  "videoGenerationPrompt": "A single, comprehensive prompt (3-5 sentences) focusing on PLAYER MOVEMENT. Describe: the player(s) using GENERIC terms (no real names), the PRIMARY ACTIONS they perform (high-five, arm fold, head turn, fist pump, etc.), and any subtle background motion. State the exact 4-second duration. Explicitly state NO CAMERA MOVEMENT and NO AUDIO. The player(s) must be actively moving, not static with only background effects."
}

**IMPORTANT:** The videoGenerationPrompt field is what will be sent to the video generation AI, so it must be clear, specific, self-contained, and FREE OF ANY TRADEMARKED NAMES.`,

      outputFormat: 'json',
      variables: [
        {
          name: 'sportType',
          description: 'Type of sport (e.g., Hockey, Basketball, Football)',
          required: true,
          type: 'string',
        },
        {
          name: 'homeTeam',
          description: 'Home team name',
          required: true,
          type: 'string',
        },
        {
          name: 'awayTeam',
          description: 'Away team name',
          required: true,
          type: 'string',
        },
        {
          name: 'themeName',
          description: 'Name of the theme',
          required: true,
          type: 'string',
        },
        {
          name: 'themeDescription',
          description: 'Detailed theme description',
          required: true,
          type: 'string',
        },
        {
          name: 'contextPills',
          description: 'Game context (e.g., Playoff Intensity, Rivalry)',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal (Social Hype, Broadcast B-Roll, Stadium Ribbon)',
          required: true,
          type: 'string',
        },
        {
          name: 'playerInfo',
          description: 'Information about the featured player(s)',
          required: true,
          type: 'string',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'gemini-2.0-flash',
      },
      isActive: true,
    },
    // VIDEO GENERATION PROMPT - Configuration for video generation
    {
      id: 'prompt_videoGeneration_animation_default',
      capability: 'videoGeneration',
      name: 'Sports Animation Video Generation',
      description: 'Generates 4-second animated video from sports image using AI video generation',
      systemPrompt: `You are a professional video generation system creating broadcast-quality sports animations.

**CORE PRINCIPLES:**
1. Maintain the exact composition and framing of the source image
2. Apply subtle, professional-grade motion that enhances without distracting
3. Keep the camera completely static - no pans, zooms, or movements
4. Create smooth, natural movements appropriate for sports content
5. Preserve player likeness and team branding throughout`,

      userPromptTemplate: `{{videoGenerationPrompt}}

**TECHNICAL REQUIREMENTS:**
- Duration: Exactly 4 seconds
- Camera: COMPLETELY STATIC - no movement whatsoever
- Audio: NONE - silent video only
- Quality: Broadcast-ready, professional sports graphics quality
- Style: Subtle, elegant motion - not over-animated
- Focus: Player(s) remain the clear focal point throughout

**CONTEXT:**
- Sport: {{sportType}}
- Campaign Style: {{campaignGoal}}

Generate a professional 4-second animation that brings this sports image to life while maintaining broadcast quality standards.`,

      outputFormat: 'video',
      variables: [
        {
          name: 'videoGenerationPrompt',
          description: 'The AI-generated prompt from screenplay analysis (must be free of trademarked names)',
          required: true,
          type: 'string',
        },
        {
          name: 'sportType',
          description: 'Type of sport (generic, e.g., Hockey, Basketball)',
          required: true,
          type: 'string',
        },
        {
          name: 'campaignGoal',
          description: 'Campaign goal (Social Hype, Broadcast B-Roll, Stadium Ribbon)',
          required: true,
          type: 'string',
        },
      ],
      modelConfig: {
        adaptorId: 'gemini',
        modelId: 'veo-2.0-generate-001', // Gemini's video generation model
      },
      isActive: true,
    },
  ],
};

// Export all GameLab stage templates
export const GAMELAB_PROMPT_TEMPLATES = [
  STAGE_2_THEME_GENERATION_TEMPLATE,
  STAGE_3_PLAYER_SUGGESTION_TEMPLATE,
  STAGE_4_IMAGE_GENERATION_TEMPLATE,
  STAGE_5_ANIMATION_TEMPLATE,
];

// Export individual stages for direct import
export default {
  STAGE_2_THEME_GENERATION_TEMPLATE,
  STAGE_3_PLAYER_SUGGESTION_TEMPLATE,
  STAGE_4_IMAGE_GENERATION_TEMPLATE,
  STAGE_5_ANIMATION_TEMPLATE,
  GAMELAB_PROMPT_TEMPLATES,
};
