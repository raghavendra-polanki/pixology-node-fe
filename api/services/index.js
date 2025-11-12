/**
 * Services Index - ES Module Wrappers for CommonJS Services
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import CommonJS modules
export { default as AIAdaptorResolver } from './AIAdaptorResolver.js';
export { default as PromptManager } from './PromptManager.cjs';
export { default as PromptTemplateService } from './PromptTemplateService.js';

