# Multi-Product Backend Architecture

## Overview

The Pixology backend supports multiple products (StoryLab and FlairLab) from a single Node.js server while maintaining complete data isolation through separate Firestore databases.

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
- Routes are prefixed by product: `/api/storylab/*` and `/api/flairlab/*`
- Product context middleware automatically connects to the correct database
- Backward compatibility for legacy StoryLab routes

---

## Database Configuration

### Environment Variables

**Required for multi-product support:**

```bash
# StoryLab Database (existing)
STORYLAB_DATABASE_ID=pixology-v2

# FlairLab Database (new)
FLAIRLAB_DATABASE_ID=pixology-flairlab
```

### Database Mapping

| Product   | Environment Variable    | Database ID          | Purpose                          |
|-----------|------------------------|----------------------|----------------------------------|
| StoryLab  | `STORYLAB_DATABASE_ID` | `pixology-v2`        | Existing StoryLab projects/data  |
| FlairLab  | `FLAIRLAB_DATABASE_ID` | `pixology-flairlab`  | FlairLab projects/data           |

### Firestore Manager

The `FirestoreManager` class handles multi-database connections:

```javascript
// api/core/config/firestore.js
import { firestoreManager } from './core/config/firestore.js';

// Get StoryLab database
const storylabDb = firestoreManager.getDatabase('storylab');

// Get FlairLab database
const flairlabDb = firestoreManager.getDatabase('flairlab');
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
// Middleware flow for: POST /api/flairlab/generation/themes
productContext(req, res, next)
  ↓
req.productId = 'flairlab'
req.db = firestoreManager.getDatabase('flairlab')  // pixology-flairlab database
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
POST /api/flairlab/generation/themes
GET  /api/flairlab/projects/:projectId
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
  │   └── flairlab/
  │       ├── routes/
  │       │   ├── projects.js
  │       │   ├── generation.js
  │       │   └── index.js
  │       ├── services/
  │       │   ├── ThemeGenerationService.js
  │       │   ├── PlayerSelectionService.js
  │       │   └── ...
  │       ├── models/
  │       │   └── FlairLabProject.js
  │       └── prompts/
  │           └── seedData.js
  │
  └── server.js                       # Main Express app
```

---

## Usage Examples

### In Route Handlers

```javascript
// api/products/flairlab/routes/generation.js
import express from 'express';
import { verifyToken } from '../../../core/middleware/auth.js';

const router = express.Router();

router.post('/themes', verifyToken, async (req, res) => {
  try {
    // req.db is automatically set by productContext middleware
    // It points to the FlairLab database (pixology-flairlab)
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
// api/products/flairlab/services/ThemeGenerationService.js
export class ThemeGenerationService {
  static async generateThemes(projectId, input, db, resolver) {
    // db parameter is passed from route handler (req.db)
    // It's the FlairLab database

    // Get prompt template from FlairLab database
    const prompt = await PromptManager.getPromptByCapability(
      'stage2_themes',
      'textGeneration',
      projectId,
      db  // Uses FlairLab database
    );

    // Resolve AI adaptor configuration
    const adaptor = await resolver.resolveAdaptor(
      projectId,
      'stage2_themes',
      'textGeneration',
      db,  // Uses FlairLab database
      prompt.modelConfig
    );

    // ... AI generation

    // Save to FlairLab database
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
import flairlabRoutes from './products/flairlab/routes/index.js';

const app = express();

// Initialize AI adaptors (shared across products)
initializeAdaptors();

// Product-scoped routes
app.use('/api/storylab', productContext, storylabRoutes);
app.use('/api/flairlab', productContext, flairlabRoutes);

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

**FlairLab:**
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

| Collection           | StoryLab DB (pixology-v2) | FlairLab DB (pixology-flairlab) |
|---------------------|---------------------------|--------------------------------|
| `projects`          | StoryLab projects         | FlairLab projects              |
| `users`             | Shared (replicated)       | Shared (replicated)            |
| `prompt_templates`  | StoryLab prompts          | FlairLab prompts               |
| `project_ai_config` | StoryLab AI config        | FlairLab AI config             |

---

## Environment Setup

### Required Variables

```bash
# Firebase
FIREBASE_PROJECT_ID=core-silicon-476114-i0
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Firestore Databases (REQUIRED)
STORYLAB_DATABASE_ID=pixology-v2
FLAIRLAB_DATABASE_ID=pixology-flairlab

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
  - FlairLab database: pixology-flairlab
```

If any database ID is missing:

```
❌ Missing database configuration for products: flairlab
   Please set the following environment variables:
   - FLAIRLAB_DATABASE_ID
```

---

## Migration Guide

### Phase 1: Add Environment Variables

1. Add to `.env`:
   ```bash
   STORYLAB_DATABASE_ID=pixology-v2
   FLAIRLAB_DATABASE_ID=pixology-flairlab
   ```

2. Create FlairLab database in Firestore Console

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

// Create project in FlairLab
POST /api/flairlab/projects → writes to pixology-flairlab

// Verify isolation
GET /api/storylab/projects → only StoryLab projects
GET /api/flairlab/projects → only FlairLab projects
```

---

## Troubleshooting

### Error: "Missing database configuration"

**Cause:** Database ID environment variable not set

**Solution:** Add to `.env`:
```bash
STORYLAB_DATABASE_ID=pixology-v2
FLAIRLAB_DATABASE_ID=pixology-flairlab
```

### Error: "Invalid product identifier"

**Cause:** Request path doesn't include valid product ID

**Solution:** Use correct path format:
```
✅ /api/storylab/projects
✅ /api/flairlab/generation/themes
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
- StoryLab and FlairLab data never mix
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
     flairlab: process.env.FLAIRLAB_DATABASE_ID,
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

All database names are configured through environment variables (`STORYLAB_DATABASE_ID` and `FLAIRLAB_DATABASE_ID`), with no hardcoded values in the codebase.
