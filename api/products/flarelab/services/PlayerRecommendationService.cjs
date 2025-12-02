/**
 * PlayerRecommendationService - AI-powered player recommendations for themes
 *
 * Analyzes themes and suggests the most suitable players based on:
 * - Theme category (home-team, away-team, rivalry, posed, broadcast)
 * - Theme description and visual concept
 * - Player attributes (position, performance, team affiliation)
 * - Campaign context from Stage 1
 */

const PromptManager = require('../../../core/services/PromptManager.cjs');

class PlayerRecommendationService {
  /**
   * Get AI-recommended players for a specific theme
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Object>} Recommended players with reasoning
   */
  static async recommendPlayersForTheme(projectId, input, db, AIAdaptorResolver) {
    const {
      theme, // Theme object with id, title, description, category
      availablePlayers = [], // All available players
      contextBrief = {}, // Campaign context from Stage 1
      playerCount = 1, // How many players needed (1 or 2)
    } = input;

    try {
      console.log('[PlayerRecommendationService] Recommending players for theme:', theme.title);

      // Get prompt template for player recommendations
      const promptTemplate = await PromptManager.getPromptByCapability(
        'stage_3_players',
        'textGeneration',
        projectId,
        db
      );

      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_3_players',
        'textGeneration',
        db,
        promptTemplate.modelConfig
      );

      // Build player data summary for AI
      const playerSummary = availablePlayers.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        position: p.position,
        team: p.teamId === 'home' ? contextBrief.homeTeam : contextBrief.awayTeam,
        teamId: p.teamId,
        performanceScore: p.performanceScore || 0,
        socialSentiment: p.socialSentiment || 0,
        isHighlighted: p.isHighlighted || false,
      }));

      // Build variables for prompt
      const variables = {
        themeName: theme.title || theme.name || '',
        themeDescription: theme.description || '',
        themeCategory: theme.category || '',
        playerCount: playerCount.toString(),
        sportType: contextBrief.sportType || 'Hockey',
        homeTeam: contextBrief.homeTeam || 'Home Team',
        awayTeam: contextBrief.awayTeam || 'Away Team',
        contextPills: Array.isArray(contextBrief.contextPills)
          ? contextBrief.contextPills.join(', ')
          : contextBrief.contextPills || '',
        campaignGoal: contextBrief.campaignGoal || '',
        availablePlayers: JSON.stringify(playerSummary, null, 2),
      };

      const resolvedPrompt = PromptManager.resolvePrompt(promptTemplate, variables);
      const fullPrompt = promptTemplate.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      console.log('[PlayerRecommendationService] Generating recommendations with AI...');

      // Generate recommendations
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      console.log('[PlayerRecommendationService] AI response received, parsing...');

      // Parse JSON response
      let recommendations;
      try {
        // Extract JSON from response (may have markdown formatting)
        const jsonMatch = generationResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        } else {
          recommendations = JSON.parse(generationResult.text);
        }
      } catch (parseError) {
        console.error('[PlayerRecommendationService] Failed to parse JSON:', parseError);
        throw new Error('Failed to parse player recommendations from AI');
      }

      // Validate response structure
      if (!recommendations.recommendedPlayers || !Array.isArray(recommendations.recommendedPlayers)) {
        throw new Error('Invalid recommendation response structure');
      }

      console.log('[PlayerRecommendationService] Recommendations:', {
        themeId: theme.id,
        recommended: recommendations.recommendedPlayers.length,
        reasoning: recommendations.reasoning?.substring(0, 100),
      });

      return {
        themeId: theme.id,
        themeName: theme.title || theme.name,
        playerCount,
        recommendedPlayers: recommendations.recommendedPlayers,
        reasoning: recommendations.reasoning,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('[PlayerRecommendationService] Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Get recommendations for multiple themes at once
   *
   * @param {string} projectId - Project ID
   * @param {Object} input - Input parameters
   * @param {Object} db - Firestore database instance
   * @param {Object} AIAdaptorResolver - AI adaptor resolver
   * @returns {Promise<Array>} Array of recommendations per theme
   */
  static async recommendPlayersForMultipleThemes(projectId, input, db, AIAdaptorResolver) {
    const {
      themes = [], // Array of theme objects
      availablePlayers = [],
      contextBrief = {},
    } = input;

    console.log('[PlayerRecommendationService] Generating recommendations for', themes.length, 'themes');

    const recommendations = [];

    for (const theme of themes) {
      try {
        // Determine player count based on category
        const playerCount = this._getPlayerCountForCategory(theme.category);

        const recommendation = await this.recommendPlayersForTheme(
          projectId,
          {
            theme,
            availablePlayers,
            contextBrief,
            playerCount,
          },
          db,
          AIAdaptorResolver
        );

        recommendations.push(recommendation);
      } catch (error) {
        console.error(`[PlayerRecommendationService] Failed for theme ${theme.id}:`, error);
        // Add fallback recommendation
        recommendations.push({
          themeId: theme.id,
          themeName: theme.title || theme.name,
          playerCount: this._getPlayerCountForCategory(theme.category),
          recommendedPlayers: [], // Empty if failed
          reasoning: 'Failed to generate recommendations',
          error: error.message,
          generatedAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Determine player count based on theme category
   */
  static _getPlayerCountForCategory(category) {
    if (category === 'rivalry' || category === 'posed') {
      return 2;
    }
    return 1;
  }
}

module.exports = PlayerRecommendationService;
