# Multi-Product Backend Architecture

## Overview

The Pixology backend supports multiple products (StoryLab and GameLab) from a single Node.js server while maintaining complete data isolation through separate Firestore databases.

## Architecture Principles

### 1. **Database Isolation**
- Each product has its own Firestore database
- Database IDs are **100% configurable via environment variables**
- No hardcoded database names in code

### 2. **Shared Infrastructure**
- AI adaptor system (Gemini, OpenAI, Anthropic)
- Prompt management and template resolution
- Google Cloud Storage service
- Authentication middleware

### 3. **Product-Scoped Routing**
- Routes are prefixed by product: `/api/storylab/*` and `/api/gamelab/*`
- Product context middleware automatically connects to the correct database
- Backward compatibility for legacy StoryLab routes

---

## Database Configuration

### Environment Variables

**Required for multi-product support:**

```bash
# StoryLab Database (existing)
STORYLAB_DATABASE_ID=pixology-v2

# GameLab Database (new)
GAMELAB_DATABASE_ID=pixology-gamelab
```

### Database Mapping

| Product   | Environment Variable    | Database ID          | Purpose                          |
|-----------|------------------------|----------------------|----------------------------------|
| StoryLab  | `STORYLAB_DATABASE_ID` | `pixology-v2`        | Existing StoryLab projects/data  |
| GameLab  | `GAMELAB_DATABASE_ID` | `pixology-gamelab`  | GameLab projects/data           |

### Firestore Manager

The `FirestoreManager` class handles multi-database connections:

```javascript
// api/core/config/firestore.js
import { firestoreManager } from './core/config/firestore.js';

// Get StoryLab database
const storylabDb = firestoreManager.getDatabase('storylab');

// Get GameLab database
const gamelabDb = firestoreManager.getDatabase('gamelab');
```

**Features:**
- ✅ Validates all database IDs are configured on startup
- ✅ Caches database connections (singleton pattern)
- ✅ Throws clear errors if database ID is missing
- ✅ Logs connection status for debugging

---

## Product Context Middleware

### How It Works

The `productContext` middleware extracts the product ID from the request path and attaches the correct database to `req.db`.

```javascript
// Middleware flow for: POST /api/gamelab/generation/themes
productContext(req, res, next)
  ↓
req.productId = 'gamelab'
req.db = firestoreManager.getDatabase('gamelab')  // pixology-gamelab database
  ↓
next() → route handler
```

### Route Path Format

**Product-Scoped Routes:**
```
/api/{productId}/{resource}/{action}
```

**Examples:**
```
POST /api/storylab/projects
GET  /api/storylab/generation/personas
POST /api/gamelab/generation/themes
GET  /api/gamelab/projects/:projectId
```

### Legacy Support

For backward compatibility with existing StoryLab clients:

```javascript
// These routes still work (mapped to StoryLab)
POST /api/projects
POST /api/generation/personas
POST /api/generation/narratives
```

The `legacyStoryLabContext` middleware automatically sets `req.productId = 'storylab'`.

---

## Folder Structure

```
/api
  ├── core/                           # Shared infrastructure (product-agnostic)
  │   ├── config/
  │   │   ├── firestore.js           # Multi-database manager
  │   │   └── availableModels.cjs    # AI model registry
  │   ├── middleware/
  │   │   ├── productContext.js      # Product identification & DB routing
  │   │   └── auth.js                # Authentication
  │   ├── services/
  │   │   ├── PromptManager.js       # Generic prompt resolution
  │   │   ├── PromptTemplateService.js
  │   │   ├── AIAdaptorResolver.js   # Model resolution logic
  │   │   └── GCSService.js          # File storage
  │   ├── adaptors/                  # AI provider abstraction
  │   │   ├── BaseAIAdaptor.js
  │   │   ├── GeminiAdaptor.js
  │   │   ├── OpenAIAdaptor.js
  │   │   ├── AnthropicAdaptor.js
  │   │   └── AdaptorRegistry.js
  │   └── utils/
  │       └── firestoreUtils.js      # Generic DB operations
  │
  ├── products/                       # Product-specific implementations
  │   ├── storylab/
  │   │   ├── routes/
  │   │   │   ├── projects.js
  │   │   │   ├── generation.js
  │   │   │   ├── storyboard.js
  │   │   │   └── index.js
  │   │   ├── services/
  │   │   │   ├── PersonaGenerationService.js
  │   │   │   ├── NarrativeGenerationService.js
  │   │   │   └── ...
  │   │   ├── models/
  │   │   │   └── StoryLabProject.js
  │   │   └── prompts/
  │   │       └── seedData.js
  │   │
  │   └── gamelab/
  │       ├── routes/
  │       │   ├── projects.js
  │       │   ├── generation.js
  │       │   └── index.js
  │       ├── services/
  │       │   ├── ThemeGenerationService.js
  │       │   ├── PlayerSelectionService.js
  │       │   └── ...
  │       ├── models/
  │       │   └── GameLabProject.js
  │       └── prompts/
  │           └── seedData.js
  │
  └── server.js                       # Main Express app
```

---

## Usage Examples

### In Route Handlers

```javascript
// api/products/gamelab/routes/generation.js
import express from 'express';
import { verifyToken } from '../../../core/middleware/auth.js';

const router = express.Router();

router.post('/themes', verifyToken, async (req, res) => {
  try {
    // req.db is automatically set by productContext middleware
    // It points to the GameLab database (pixology-gamelab)
    const { projectId } = req.body;

    // All database operations use the correct database
    const projectRef = req.db.collection('projects').doc(projectId);
    const project = await projectRef.get();

    // ... generation logic

    await projectRef.update({
      'data.conceptGallery': themes,
    });

    res.status(200).json({ themes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### In Services

```javascript
// api/products/gamelab/services/ThemeGenerationService.js
export class ThemeGenerationService {
  static async generateThemes(projectId, input, db, resolver) {
    // db parameter is passed from route handler (req.db)
    // It's the GameLab database

    // Get prompt template from GameLab database
    const prompt = await PromptManager.getPromptByCapability(
      'stage2_themes',
      'textGeneration',
      projectId,
      db  // Uses GameLab database
    );

    // Resolve AI adaptor configuration
    const adaptor = await resolver.resolveAdaptor(
      projectId,
      'stage2_themes',
      'textGeneration',
      db,  // Uses GameLab database
      prompt.modelConfig
    );

    // ... AI generation

    // Save to GameLab database
    await db.collection('projects').doc(projectId).update({
      'data.conceptGallery': themes,
    });

    return { themes };
  }
}
```

---

## Server Configuration

### server.js

```javascript
import express from 'express';
import { productContext, legacyStoryLabContext } from './core/middleware/productContext.js';
import { initializeAdaptors } from './core/adaptors/index.js';

// Import product routes
import storylabRoutes from './products/storylab/routes/index.js';
import gamelabRoutes from './products/gamelab/routes/index.js';

const app = express();

// Initialize AI adaptors (shared across products)
initializeAdaptors();

// Product-scoped routes
app.use('/api/storylab', productContext, storylabRoutes);
app.use('/api/gamelab', productContext, gamelabRoutes);

// Legacy routes (backward compatibility)
app.use('/api/projects', legacyStoryLabContext, storylabRoutes);
app.use('/api/generation', legacyStoryLabContext, storylabRoutes);

app.listen(3000);
```

---

## Shared Services

### Services That Are 100% Reusable

These services work with **any product** because they accept `db` as a parameter:

- ✅ **AI Adaptor System** - All adaptors (Gemini, OpenAI, Anthropic)
- ✅ **PromptManager** - Prompt template resolution
- ✅ **AIAdaptorResolver** - Model resolution logic
- ✅ **PromptTemplateService** - Prompt CRUD operations
- ✅ **GCSService** - File storage (with product-based paths)

### Product-Specific Services

Each product has its own generation services:

**StoryLab:**
- PersonaGenerationService
- NarrativeGenerationService
- StoryboardGenerationService
- ScreenplayGenerationService
- VideoGenerationService

**GameLab:**
- ThemeGenerationService
- PlayerSelectionService
- ImageGenerationService
- VideoAnimationService
- ExportService

---

## Database Collections

Both products use the same collection structure (in their respective databases):

### Common Collections

```
/{database}/
  ├── projects/               # Product-specific projects
  ├── users/                  # User data (replicated)
  ├── prompt_templates/       # Product-specific prompts
  ├── project_ai_config/      # AI configuration per project
  └── generation_executions/  # Execution tracking
```

### Collection Isolation

| Collection           | StoryLab DB (pixology-v2) | GameLab DB (pixology-gamelab) |
|---------------------|---------------------------|--------------------------------|
| `projects`          | StoryLab projects         | GameLab projects              |
| `users`             | Shared (replicated)       | Shared (replicated)            |
| `prompt_templates`  | StoryLab prompts          | GameLab prompts               |
| `project_ai_config` | StoryLab AI config        | GameLab AI config             |

---

## Environment Setup

### Required Variables

```bash
# Firebase
FIREBASE_PROJECT_ID=core-silicon-476114-i0
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Firestore Databases (REQUIRED)
STORYLAB_DATABASE_ID=pixology-v2
GAMELAB_DATABASE_ID=pixology-gamelab

# AI Providers
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Defaults
DEFAULT_AI_ADAPTOR=gemini
DEFAULT_AI_MODEL=gemini-2.0-flash-exp
```

### Validation on Startup

The `FirestoreManager` validates all database IDs on initialization:

```
✓ Database configuration validated
  - StoryLab database: pixology-v2
  - GameLab database: pixology-gamelab
```

If any database ID is missing:

```
❌ Missing database configuration for products: gamelab
   Please set the following environment variables:
   - GAMELAB_DATABASE_ID
```

---

## Migration Guide

### Phase 1: Add Environment Variables

1. Add to `.env`:
   ```bash
   STORYLAB_DATABASE_ID=pixology-v2
   GAMELAB_DATABASE_ID=pixology-gamelab
   ```

2. Create GameLab database in Firestore Console

### Phase 2: Update Imports

Replace:
```javascript
import { db } from '../config/firestore.js';
```

With:
```javascript
// In route handlers, use req.db
router.post('/endpoint', async (req, res) => {
  const db = req.db;  // Automatically set by productContext middleware
});

// In services, accept db as parameter
async function myService(projectId, input, db) {
  await db.collection('projects').doc(projectId).update(...);
}
```

### Phase 3: Test Database Isolation

Verify that operations on one product don't affect the other:

```javascript
// Create project in StoryLab
POST /api/storylab/projects → writes to pixology-v2

// Create project in GameLab
POST /api/gamelab/projects → writes to pixology-gamelab

// Verify isolation
GET /api/storylab/projects → only StoryLab projects
GET /api/gamelab/projects → only GameLab projects
```

---

## Troubleshooting

### Error: "Missing database configuration"

**Cause:** Database ID environment variable not set

**Solution:** Add to `.env`:
```bash
STORYLAB_DATABASE_ID=pixology-v2
GAMELAB_DATABASE_ID=pixology-gamelab
```

### Error: "Invalid product identifier"

**Cause:** Request path doesn't include valid product ID

**Solution:** Use correct path format:
```
✅ /api/storylab/projects
✅ /api/gamelab/generation/themes
❌ /api/projects (use legacy routes or update to product-scoped)
```

### Error: "Database connection error"

**Cause:** Database doesn't exist in Firestore or permissions issue

**Solution:**
1. Create database in Firestore Console
2. Verify service account has access
3. Check database ID matches environment variable

---

## Benefits

### ✅ Complete Data Isolation
- StoryLab and GameLab data never mix
- Independent backups and scaling
- Product-specific security policies

### ✅ Shared Infrastructure
- Single AI adaptor system for both products
- Unified prompt management
- Common authentication

### ✅ Maintainability
- Clear product ownership
- Easy to add new products
- Centralized shared utilities

### ✅ Flexibility
- Each product can evolve independently
- Different deployment strategies
- Product-specific optimizations

### ✅ Configuration-Driven
- **Zero hardcoded database names**
- All configuration via environment variables
- Easy to change database IDs without code changes

---

## Future Additions

### Adding a New Product

1. Add database environment variable:
   ```bash
   NEWPRODUCT_DATABASE_ID=pixology-newproduct
   ```

2. Update `FirestoreManager`:
   ```javascript
   this.databaseConfig = {
     storylab: process.env.STORYLAB_DATABASE_ID,
     gamelab: process.env.GAMELAB_DATABASE_ID,
     newproduct: process.env.NEWPRODUCT_DATABASE_ID,
   };
   ```

3. Create product module:
   ```
   /api/products/newproduct/
     ├── routes/
     ├── services/
     ├── models/
     └── prompts/
   ```

4. Add routes to server.js:
   ```javascript
   app.use('/api/newproduct', productContext, newproductRoutes);
   ```

---

## Summary

The multi-product architecture provides:

1. **Database Isolation** - Separate Firestore databases per product
2. **Environment-Driven** - **100% configurable via environment variables**
3. **Shared Infrastructure** - Reusable AI adaptors and services
4. **Product Routing** - Automatic context based on URL path
5. **Backward Compatible** - Legacy routes still work

All database names are configured through environment variables (`STORYLAB_DATABASE_ID` and `GAMELAB_DATABASE_ID`), with no hardcoded values in the codebase.
