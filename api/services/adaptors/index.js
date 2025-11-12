/**
 * Adaptor Module Entry Point
 *
 * Initializes and registers all available adaptors
 */

const AdaptorRegistry = require('./AdaptorRegistry');
const GeminiAdaptor = require('./GeminiAdaptor');
const OpenAIAdaptor = require('./OpenAIAdaptor');
const AnthropicAdaptor = require('./AnthropicAdaptor');

/**
 * Initialize all adaptors
 * Called once at application startup
 */
function initializeAdaptors() {
  try {
    AdaptorRegistry.register('gemini', GeminiAdaptor);
    AdaptorRegistry.register('openai', OpenAIAdaptor);
    AdaptorRegistry.register('anthropic', AnthropicAdaptor);

    console.log('[Adaptors] All adaptors initialized successfully');
  } catch (error) {
    console.error('[Adaptors] Failed to initialize adaptors:', error.message);
    throw error;
  }
}

module.exports = {
  AdaptorRegistry,
  GeminiAdaptor,
  OpenAIAdaptor,
  AnthropicAdaptor,
  initializeAdaptors,
};
