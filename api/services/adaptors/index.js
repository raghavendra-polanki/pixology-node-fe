/**
 * Adaptor Module Entry Point
 *
 * Initializes and registers all available adaptors
 */

import AdaptorRegistry from './AdaptorRegistry.js';
import GeminiAdaptor from './GeminiAdaptor.js';
import OpenAIAdaptor from './OpenAIAdaptor.js';
import AnthropicAdaptor from './AnthropicAdaptor.js';

/**
 * Initialize all adaptors
 * Called once at application startup
 */
export function initializeAdaptors() {
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

export {
  AdaptorRegistry,
  GeminiAdaptor,
  OpenAIAdaptor,
  AnthropicAdaptor,
};
