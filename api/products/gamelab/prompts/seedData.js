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

## 📋 YOUR TASK

Generate **6 unique visual themes** that broadcasters can use for this specific matchup. Each theme should:

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

Generate 6 diverse themes that cover different visual approaches while staying true to the matchup context.`,

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

## 🎨 THEME DETAILS

**Title:** {{title}}
**Visual Description:** {{description}}
**Tags:** {{tags}}

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

// Export all GameLab stage templates
export const GAMELAB_PROMPT_TEMPLATES = [
  STAGE_2_THEME_GENERATION_TEMPLATE,
  // Future stages will be added here
  // STAGE_3_PLAYER_SUGGESTION_TEMPLATE,
  // STAGE_4_IMAGE_GENERATION_TEMPLATE,
  // etc.
];

// Export individual stages for direct import
export default {
  STAGE_2_THEME_GENERATION_TEMPLATE,
  GAMELAB_PROMPT_TEMPLATES,
};
