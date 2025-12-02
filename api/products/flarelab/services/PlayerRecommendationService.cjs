/**
 * PlayerRecommendationService - AI-powered player recommendations for themes
 *
 * OPTIMIZED: Single AI call that both analyzes theme images AND recommends players
 *
 * The AI will:
 * 1. Analyze the theme image to detect player count and team requirements
 * 2. Recommend the best fitting players based on the analysis
 *
 * All in ONE API call for efficiency.
 */

const PromptManager = require('../../../core/services/PromptManager.cjs');

class PlayerRecommendationService {
  /**
   * Get AI-recommended players for a specific theme
   * Uses a SINGLE AI call that analyzes the image AND recommends players
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Object>} Image analysis + recommended players
   */
  static async recommendPlayersForTheme(projectId, input, db, AIAdaptorResolver) {
    const {
      theme, // Theme object with id, title, description, category, imageUrl
      availablePlayers = [], // All available players
      contextBrief = {}, // Campaign context from Stage 1
    } = input;

    try {
      console.log('[PlayerRecommendationService] Processing theme:', theme.title);
      console.log('[PlayerRecommendationService] Image URL:', theme.imageUrl || 'No image');

      // Get the combined prompt template
      const promptTemplate = await PromptManager.getPromptByCapability(
        'stage_3_players',
        'imageAnalysisAndRecommendation',
        projectId,
        db
      );

      const adaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_3_players',
        'imageAnalysisAndRecommendation',
        db,
        promptTemplate.modelConfig
      );

      // Build player data summary for AI
      const playerSummary = availablePlayers.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        position: p.position,
        team: p.teamId === 'home' ? 'home' : 'away',
        teamName: p.teamId === 'home'
          ? (contextBrief.homeTeam?.name || contextBrief.homeTeam || 'Home Team')
          : (contextBrief.awayTeam?.name || contextBrief.awayTeam || 'Away Team'),
        performanceScore: p.performanceScore || 0,
        socialSentiment: p.socialSentiment || 0,
        isHighlighted: p.isHighlighted || false,
      }));

      // Build variables for prompt
      const variables = {
        sportType: contextBrief.sportType || 'Hockey',
        homeTeam: contextBrief.homeTeam?.name || contextBrief.homeTeam || 'Home Team',
        awayTeam: contextBrief.awayTeam?.name || contextBrief.awayTeam || 'Away Team',
        contextPills: Array.isArray(contextBrief.contextPills)
          ? contextBrief.contextPills.join(', ')
          : contextBrief.contextPills || '',
        campaignGoal: contextBrief.campaignGoal || 'Social Hype',
        themeName: theme.title || theme.name || '',
        themeDescription: theme.description || '',
        themeCategory: theme.category || '',
        availablePlayers: JSON.stringify(playerSummary, null, 2),
      };

      const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
      const fullPrompt = promptTemplate.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      console.log('[PlayerRecommendationService] Sending combined request (image analysis + recommendation)...');

      // SINGLE AI CALL - analyze image AND recommend players
      const result = await adaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.5,
        maxTokens: 2500,
        referenceImageUrl: theme.imageUrl || undefined,
        responseFormat: 'json',
      });

      console.log('[PlayerRecommendationService] AI response received, parsing...');

      // Parse JSON response
      let response;
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          response = JSON.parse(jsonMatch[0]);
        } else {
          response = JSON.parse(result.text);
        }
      } catch (parseError) {
        console.error('[PlayerRecommendationService] Failed to parse JSON:', parseError);
        console.error('[PlayerRecommendationService] Raw response:', result.text?.substring(0, 500));
        throw new Error('Failed to parse AI response');
      }

      // Validate response structure
      if (!response.recommendedPlayers || !Array.isArray(response.recommendedPlayers)) {
        console.error('[PlayerRecommendationService] Invalid response structure:', response);
        throw new Error('Invalid recommendation response structure');
      }

      const playerCount = response.imageAnalysis?.playerCount || response.recommendedPlayers.length;

      console.log('[PlayerRecommendationService] Result:', {
        themeId: theme.id,
        playerCount,
        recommendedCount: response.recommendedPlayers.length,
        teamRequirements: response.imageAnalysis?.teamRequirements,
      });

      return {
        themeId: theme.id,
        themeName: theme.title || theme.name,
        playerCount,
        imageAnalysis: response.imageAnalysis || null,
        recommendedPlayers: response.recommendedPlayers,
        reasoning: response.overallReasoning || response.reasoning,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('[PlayerRecommendationService] Error:', error);
      throw error;
    }
  }

  /**
   * Get recommendations for multiple themes at once
   * Each theme gets a SINGLE AI call (image analysis + recommendation combined)
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Array>} Array of recommendations per theme
   */
  static async recommendPlayersForMultipleThemes(projectId, input, db, AIAdaptorResolver) {
    const {
      themes = [], // Array of theme objects with imageUrl
      availablePlayers = [],
      contextBrief = {},
    } = input;

    console.log('[PlayerRecommendationService] Processing', themes.length, 'themes (single call per theme)');

    const recommendations = [];

    for (const theme of themes) {
      try {
        console.log(`[PlayerRecommendationService] Processing theme: ${theme.title}`);

        const recommendation = await this.recommendPlayersForTheme(
          projectId,
          {
            theme,
            availablePlayers,
            contextBrief,
          },
          db,
          AIAdaptorResolver
        );

        recommendations.push(recommendation);
      } catch (error) {
        console.error(`[PlayerRecommendationService] Failed for theme ${theme.id}:`, error);

        // Add fallback recommendation
        const fallbackPlayerCount = this._getPlayerCountForCategory(theme.category);
        recommendations.push({
          themeId: theme.id,
          themeName: theme.title || theme.name,
          playerCount: fallbackPlayerCount,
          imageAnalysis: null,
          recommendedPlayers: [],
          reasoning: 'Failed to generate recommendations: ' + error.message,
          error: error.message,
          generatedAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Fallback: Determine player count based on theme category
   */
  static _getPlayerCountForCategory(category) {
    if (category === 'rivalry' || category === 'posed') {
      return 2;
    }
    return 1;
  }
}

module.exports = PlayerRecommendationService;
