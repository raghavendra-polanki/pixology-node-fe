/**
 * PersonaGenerationServiceV2
 *
 * Refactored for adaptor-aware operations
 * Generates personas using configured AI adaptor with prompt templates
 */

const PromptManager = require('./PromptManager');
const GCSService = require('./gcsService');

class PersonaGenerationServiceV2 {
  /**
   * Generate personas for a project
   *
   * @param {string} projectId - Project ID
   * @param {object} input - { productDescription, targetAudience, numberOfPersonas, productImageUrl }
   * @param {object} db - Firestore database
   * @param {object} AIAdaptorResolver - The adaptor resolver instance
   * @returns {Promise<object>} { personas, adaptor, model, usage }
   */
  static async generatePersonas(projectId, input, db, AIAdaptorResolver) {
    try {
      const { productDescription, targetAudience, numberOfPersonas = 3, productImageUrl } = input;

      console.log(`[PersonaGen] Generating ${numberOfPersonas} personas for project ${projectId}`);

      // 1. Resolve text generation adaptor
      const textAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_personas',
        'textGeneration',
        db
      );

      console.log(`[PersonaGen] Text adaptor: ${textAdaptor.adaptorId}/${textAdaptor.modelId}`);

      // 2. Get prompt template
      const promptTemplate = await PromptManager.getPromptTemplate(
        'stage_2_personas',
        projectId,
        db
      );

      // 3. Build persona generation prompt
      const variables = {
        productDescription,
        targetAudience,
        numberOfPersonas,
        productImageUrl: productImageUrl || 'Not provided',
      };

      const resolvedPrompt = PromptManager.resolvePrompt(
        promptTemplate.prompts.textGeneration,
        variables
      );

      const fullPrompt = resolvedPrompt.systemPrompt
        ? `${resolvedPrompt.systemPrompt}\n\n${resolvedPrompt.userPrompt}`
        : resolvedPrompt.userPrompt;

      // 4. Generate personas using adaptor
      const generationResult = await textAdaptor.adaptor.generateText(fullPrompt, {
        temperature: 0.7,
        maxTokens: 4000,
      });

      // 5. Parse response
      let personas = this._parsePersonasFromResponse(generationResult.text);

      if (!Array.isArray(personas)) {
        personas = [personas];
      }

      // 6. Generate images for each persona
      const personasWithImages = await this._generatePersonaImages(
        projectId,
        personas,
        db
      );

      // 7. Store in Firestore
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          aiGeneratedPersonas: {
            personas: personasWithImages,
            adaptor: textAdaptor.adaptorId,
            textModel: textAdaptor.modelId,
            imageAdaptor: 'unset', // Will be set when images are generated
            generatedAt: new Date().toISOString(),
          },
        });

      return {
        personas: personasWithImages,
        textAdaptor: textAdaptor.adaptorId,
        textModel: textAdaptor.modelId,
        usage: generationResult.usage,
      };
    } catch (error) {
      console.error('[PersonaGen] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate images for personas
   *
   * @private
   */
  static async _generatePersonaImages(projectId, personas, db) {
    try {
      // Resolve image generation adaptor
      const imageAdaptor = await AIAdaptorResolver.resolveAdaptor(
        projectId,
        'stage_2_personas',
        'imageGeneration',
        db
      );

      console.log(`[PersonaGen] Image adaptor: ${imageAdaptor.adaptorId}/${imageAdaptor.modelId}`);

      const personasWithImages = [];

      for (let i = 0; i < personas.length; i++) {
        try {
          const persona = personas[i];
          const imagePrompt = this._buildImagePrompt(persona);

          console.log(`[PersonaGen] Generating image ${i + 1}/${personas.length}`);

          const imageResult = await imageAdaptor.adaptor.generateImage(imagePrompt, {
            size: '1024x1024',
            quality: 'standard',
          });

          // Upload to GCS
          const personaName = persona.coreIdentity?.name || `persona_${i}`;
          const imagePath = `personas/${projectId}/${personaName.replace(/\s+/g, '_')}.png`;

          // Note: imageResult.imageUrl is already a public URL from the adaptor
          // If we need to store it, we'd download and upload to GCS
          const imageUrl = imageResult.imageUrl;

          personasWithImages.push({
            ...persona,
            id: persona.id || `persona_${i}`,
            image: {
              url: imageUrl,
              adaptor: imageAdaptor.adaptorId,
              model: imageAdaptor.modelId,
              generatedAt: new Date().toISOString(),
            },
          });

          // Rate limiting between image generations
          if (i < personas.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (imageError) {
          console.error(`[PersonaGen] Image generation failed for persona ${i}: ${imageError.message}`);

          // Continue without image if error
          personasWithImages.push({
            ...personas[i],
            id: personas[i].id || `persona_${i}`,
            image: {
              error: imageError.message,
              generatedAt: new Date().toISOString(),
            },
          });
        }
      }

      return personasWithImages;
    } catch (error) {
      console.error('[PersonaGen] Image generation error:', error.message);
      // Return personas without images rather than failing
      return personas.map((p, i) => ({
        ...p,
        id: p.id || `persona_${i}`,
      }));
    }
  }

  /**
   * Parse personas from AI response
   *
   * @private
   */
  static _parsePersonasFromResponse(text) {
    try {
      // Try direct JSON parse
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // Try extracting from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (innerError) {
          console.warn('Failed to parse personas from markdown block');
        }
      }

      throw new Error('Failed to parse personas from response');
    }
  }

  /**
   * Build image generation prompt from persona
   *
   * @private
   */
  static _buildImagePrompt(persona) {
    const identity = persona.coreIdentity || {};
    const appearance = persona.physicalAppearance || {};
    const communication = persona.personalityAndCommunication || {};

    return `Generate a realistic, professional UGC-style portrait photograph of:

Name: ${identity.name}
Age: ${identity.age}
Sex: ${identity.sex}
Location: ${identity.location || 'Urban setting'}

Physical Appearance:
- General look: ${appearance.general}
- Hair: ${appearance.hair}
- Build: ${appearance.build}
- Clothing style: ${appearance.clothingAesthetic}
- Distinctive features: ${appearance.signatureDetails}

Personality impression:
- Demeanor: ${communication.demeanor}
- Energy: ${communication.energyLevel}

Create a high-quality, diverse, and relatable portrait. Use natural lighting, authentic expression, and either a neutral background or a lifestyle setting. The person should look approachable and genuine.`;
  }
}

module.exports = PersonaGenerationServiceV2;
