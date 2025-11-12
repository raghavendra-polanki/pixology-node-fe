# Recipe-Based Prompt Storage: Complete Analysis

## Executive Summary

The Pixology codebase uses a **Recipe-based architecture** where AI generation tasks are orchestrated through DAG (Directed Acyclic Graph) structures. Each recipe contains multiple nodes, and **prompts are embedded directly within the recipe node definitions**. This document explains the current structure and provides guidance for migrating to the new `prompt_templates` collection.

---

## 1. Current Recipe Architecture

### 1.1 Recipe Structure Overview

Recipes are stored in the **`recipes`** Firestore collection with the following structure:

```javascript
{
  id: string,                    // Unique recipe ID (e.g., "recipe_persona_generation_v1")
  name: string,                  // Human-readable name
  description: string,           // What this recipe does
  stageType: string,            // Which stage it belongs to (stage_2_personas, stage_3_narratives, etc.)
  version: number,              // Recipe version
  
  nodes: [
    {
      id: string,               // Unique node ID within recipe
      name: string,             // Node name
      type: string,             // "text_generation", "image_generation", etc.
      order: number,            // Execution order
      
      inputMapping: {},         // Maps where inputs come from
      outputKey: string,        // Where to store output
      
      aiModel: {
        provider: string,       // "gemini", "openai", etc.
        modelName: string,      // Specific model (e.g., "gemini-2.5-flash")
        temperature: number,
        maxTokens: number,
      },
      
      // ===== PROMPT IS HERE =====
      prompt: string,           // The actual prompt (can be 500-2000+ lines)
      
      // ===== OPTIONAL METADATA =====
      promptTemplate?: string,  // Short template version (with variables)
      parameters?: {},          // Parameter defaults
      
      dependencies: [],         // Node IDs this depends on
      errorHandling: {},        // Error handling strategy
      metadata: {},             // Creation info, description, etc.
    },
    // More nodes...
  ],
  
  edges: [
    { from: string, to: string },  // Dependencies between nodes
    // More edges...
  ],
  
  executionConfig: {
    timeout: number,
    retryPolicy: { maxRetries, backoffMs },
    parallelExecution: boolean,
    continueOnError: boolean,
  },
  
  metadata: {
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: string,
    isActive: boolean,
    tags: string[],
  }
}
```

### 1.2 Five Seed Recipes Currently Defined

Located in **`api/services/RecipeSeedData.js`**:

1. **`PERSONA_GENERATION_RECIPE`** (Stage 2)
   - 2 nodes: Generate persona details, Generate persona images
   - ~500 lines of detailed prompts

2. **`NARRATIVE_GENERATION_RECIPE`** (Stage 3)
   - 1 node: Generate narrative themes
   - ~200 lines of prompt content

3. **`STORYBOARD_GENERATION_RECIPE`** (Stage 4)
   - 3 nodes: Generate story scenes, Generate scene images, Upload and save
   - ~400 lines of prompts with character consistency focus

4. **`SCREENPLAY_GENERATION_RECIPE`** (Stage 5)
   - 1 node: Generate screenplay with timings
   - ~400 lines of detailed screenplay prompt

5. **`VIDEO_GENERATION_RECIPE`** (Stage 6)
   - 1 node: Generate video using Veo 3.1
   - ~200 lines of video generation prompt

**Total: ~2000+ lines of prompts embedded in recipe nodes**

---

## 2. How Prompts Are Stored Today

### 2.1 Prompt Storage in Recipe Nodes

Each recipe node contains TWO prompt-related fields:

#### Field 1: `prompt` (Full, Detailed Prompt)
```javascript
{
  id: 'generate_persona_details',
  // ... other fields ...
  prompt: `
You are an expert Casting Director and Consumer Psychologist. Your task is to create detailed, DIVERSE, believable personas...

**PRODUCT CONTEXT:**
Product Description: {productDescription}
Target Audience: {targetAudience}
...

[500+ lines of detailed prompt]
  `.trim(),
}
```

**Characteristics**:
- Full prompt with all instructions
- Can be 500+ lines
- Contains variable placeholders like `{productDescription}`, `{numberOfPersonas}`
- Embedded directly in recipe definition
- Version controlled through recipe versioning

#### Field 2: `promptTemplate` (Short Summary - OPTIONAL)
```javascript
{
  id: 'generate_persona_details',
  // ... other fields ...
  promptTemplate: 'Generate {numberOfPersonas} personas for {productDescription} targeting {targetAudience}',
  
  parameters: {
    numberOfPersonas: 3,
    diversityFocus: true,
    jsonFormat: true,
  },
}
```

**Characteristics**:
- Short, variable-based template
- Not always present
- Used for quick reference
- Currently underutilized

### 2.2 Prompt Variable Resolution

**During execution** (in `RecipeOrchestrator.js`):

1. Node's `inputMapping` specifies where variables come from:
```javascript
inputMapping: {
  productDescription: 'external_input.productDescription',
  targetAudience: 'external_input.targetAudience',
  numberOfPersonas: 'external_input.numberOfPersonas',
}
```

2. Variables are resolved by `resolveInputs()` method:
```javascript
// Takes node.inputMapping + nodeOutputs + externalInput
// Returns: { productDescription: "...", targetAudience: "...", ... }
const nodeInput = this.resolveInputs(node.inputMapping, nodeOutputs, input);
```

3. `ActionExecutor.js` substitutes variables into prompt:
```javascript
// Replaces {productDescription}, {targetAudience}, etc. in prompt
const resolvedPrompt = prompt.replace(/{(\w+)}/g, (match, key) => {
  return nodeInput[key] || match;
});
```

---

## 3. Existing Prompt Examples

### 3.1 Persona Generation Prompt

**File**: `/api/services/RecipeSeedData.js` (lines 35-111)

```javascript
prompt: `
You are an expert Casting Director and Consumer Psychologist. Your task is to create 
detailed, DIVERSE, believable personas for User-Generated Content (UGC) video creators...

**PRODUCT CONTEXT:**
Product Description: {productDescription}
Target Audience: {targetAudience}
Product Image URL: {productImageUrl}

**IMAGE ANALYSIS INSTRUCTION:**
If a Product Image URL is provided, analyze it carefully...

**YOUR TASK:**
Create {numberOfPersonas} UNIQUE personas...

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "coreIdentity": {
      "name": "...",
      "age": "...",
      ...
    },
    ...
  }
]

**IMPORTANT GUIDELINES:**
- Create UNIQUE personas, NOT stereotypes
- Make each person feel like they could exist in real life
...

**CRITICAL:** Return ONLY the JSON array, no additional text before or after.
`
```

**Key Characteristics**:
- Detailed system prompt embedded
- JSON output format specified
- Uses variables: `{productDescription}`, `{targetAudience}`, `{productImageUrl}`, `{numberOfPersonas}`
- ~500 lines long
- Focuses on diversity and authenticity

### 3.2 Storyboard Generation Prompt

**File**: `/api/services/RecipeSeedData.js` (lines 432-488)

```javascript
prompt: `
You are an expert Film Director and Storyboard Artist...

**CRITICAL INPUTS TO MAINTAIN CONSISTENCY:**
Product Description: {productDescription}
Target Audience: {targetAudience}
Persona: {selectedPersonaName} - {selectedPersonaDescription}
Persona Image Reference: {selectedPersonaImage}
Narrative Theme: {narrativeTheme}
Narrative Structure: {narrativeStructure}
Video Duration: {videoDuration}
Number of Scenes: {numberOfScenes}

**YOUR TASK:**
Create exactly {numberOfScenes} detailed scenes that:
1. STRICTLY FOLLOW the narrative structure provided
2. AUTHENTICALLY REPRESENT the selected persona...

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "sceneNumber": 1,
    "title": "...",
    "duration": "...",
    ...
  }
]

**CONSISTENCY GUIDELINES - CRITICAL FOR CHARACTER CONTINUITY:**
- **PERSONA CONSISTENCY:** Each scene must feature the SAME character ({selectedPersonaName})...
- **CHARACTER APPEARANCE:** Describe how the persona looks in each scene...
...

**CRITICAL:** Return ONLY the JSON array with {numberOfScenes} objects...
`
```

**Key Characteristics**:
- Very long (400+ lines)
- References multiple input variables
- Enforces consistency across outputs
- Specifies exact JSON format
- Has critical sections emphasized

### 3.3 Screenplay Generation Prompt

**File**: `/api/services/RecipeSeedData.js` (lines 710-768)

```javascript
prompt: `You are a professional screenwriter and video production specialist...

**STORYBOARD SCENES:**
{storyboardScenes}

**VIDEO DURATION:** {videoDuration}
**PERSONA:** {selectedPersonaName}

**YOUR TASK:**
Transform each scene into a detailed screenplay with exact timings...

**RESPOND IN THIS EXACT JSON FORMAT (as a JSON array):**
[
  {
    "sceneNumber": 1,
    "timeStart": "0:00",
    "timeEnd": "0:08",
    "visual": "Second-by-second visual breakdown...",
    "cameraFlow": "...",
    "script": {
      "type": "voiceover or dialogue",
      "speaker": "...",
      "text": "..."
    },
    "backgroundMusic": "...",
    "transition": "..."
  }
]

**IMPORTANT GUIDELINES:**
- Be PRECISE with timings...
- Make visuals DETAILED enough...
...

**CRITICAL:** Return ONLY the JSON array...
`
```

---

## 4. How Prompts Flow Through Execution

```
User Starts Stage (e.g., Stage 2 - Personas)
            ↓
Frontend calls: POST /api/recipes/{recipeId}/execute
            ↓
API extracts recipe from Firebase: recipes/{recipeId}
            ↓
RecipeOrchestrator loads recipe nodes
            ↓
For each node in DAG order:
    1. Get node.inputMapping
    2. Resolve variables using resolveInputs()
    3. Pass to ActionExecutor.executeAction(node, resolvedInput)
    4. ActionExecutor:
       - Resolves prompt from node.prompt
       - Substitutes variables: {productDescription} → actual value
       - Determines AI provider/model from node.aiModel
       - Calls appropriate AI service (GeminiService, ImageGenerationService, etc.)
       - Stores result in nodeOutputs[node.outputKey]
    5. Continue to next node
            ↓
All results combined and stored in project
```

---

## 5. Current Prompt Management Pain Points

### 5.1 Prompts Embedded in Code
- Recipes are versioned, but prompts within recipes can't be versioned independently
- To update a prompt, must version entire recipe (even if just one line changed)
- No way to A/B test different prompts

### 5.2 No Separation of Concerns
- Recipe = DAG structure + Prompt content + AI model config + execution config
- Can't reuse same recipe with different prompts
- Can't reuse same prompt across recipes

### 5.3 Difficult to Maintain
- 2000+ lines of prompts scattered across recipe definitions
- Hard to find all prompts used in system
- Difficult to implement prompt templates/inheritance

### 5.4 No Per-Project Customization
- All projects use identical prompts
- Can't customize prompts for specific client needs
- No audit trail of who changed what prompt

### 5.5 Version Control Issues
- Prompts change with every recipe version
- Can't rollback just the prompt
- No prompt change history

---

## 6. New Prompt Templates Collection (Target)

### 6.1 New Firestore Structure

```
Collection: prompt_templates
Document: pt_stage2_personas_v1

{
  id: "pt_stage2_personas_v1",
  stageType: "stage_2_personas",
  version: 1,
  name: "Default Persona Generator v1",
  description: "Generates diverse personas for UGC content",
  
  prompts: {
    "textGeneration": {
      systemPrompt: "You are an expert Casting Director...",
      userPromptTemplate: "Create {numberOfPersonas} personas for {productDescription}...",
      outputFormat: "json"
    },
    "imageGeneration": {
      systemPrompt: "Create professional UGC portrait photos...",
      userPromptTemplate: "Generate portrait for: {name}, Age: {age}...",
      outputFormat: "image"
    }
  },
  
  variables: [
    { name: "productDescription", type: "string", required: true },
    { name: "targetAudience", type: "string", required: true },
    { name: "productImageUrl", type: "string", required: false },
    { name: "numberOfPersonas", type: "number", required: true },
  ],
  
  isDefault: true,
  isActive: true,
  createdBy: "system",
  createdAt: "2025-11-12T00:00:00Z",
  updatedAt: "2025-11-12T00:00:00Z",
  baseTemplateId: null,  // For versioned templates
  
  metadata: {
    tags: ["persona", "stage2", "generation"],
    changelog: [
      { version: 1, date: "2025-11-12", change: "Initial version", author: "system" }
    ]
  }
}
```

### 6.2 New Collection Structure Benefits

✅ **Independent Versioning**: Prompts version separately from recipes
✅ **Reusability**: Same prompt template used across multiple recipes  
✅ **Per-Project Customization**: Projects can override prompts
✅ **Clear Documentation**: Variable names and types specified
✅ **Change History**: Track who changed what when
✅ **A/B Testing**: Create versions v1, v2, v3 for testing
✅ **Separation of Concerns**: Recipe = structure, Prompt = content

---

## 7. Migration Strategy

### 7.1 Step-by-Step Migration

**Phase 1: Create prompt_templates Collection**
1. Extract each unique prompt from RecipeSeedData.js
2. Create pt_stage2_personas_v1 document
3. Create pt_stage3_narratives_v1 document
4. Create pt_stage4_storyboard_v1 document
5. Create pt_stage5_screenplay_v1 document

**Phase 2: Update Recipe Structure**
1. Remove inline `prompt` field from recipe nodes
2. Add `promptTemplateId` reference instead:
```javascript
{
  id: 'generate_persona_details',
  // OLD: prompt: "You are an expert..."
  // NEW: promptTemplateId: 'pt_stage2_personas_v1',
  promptTemplateCapability: 'textGeneration', // Which prompt in template to use
}
```

3. Keep `inputMapping` same (unchanged)
4. Keep `parameters` same (unchanged)

**Phase 3: Update ActionExecutor**
1. When executing node with `promptTemplateId`:
   - Load template from `prompt_templates/{promptTemplateId}`
   - Get appropriate prompt from template.prompts[capability]
   - Substitute variables (same logic)
   - Execute

**Phase 4: Update Frontend**
1. Create PromptTemplateEditor component
2. Add settings page for project-specific prompt overrides
3. UI for creating/versioning prompts

### 7.2 Backward Compatibility

**During Transition**:
- Keep old `prompt` field in recipes (dual mode)
- If `promptTemplateId` present → use template
- Else if `prompt` present → use inline prompt
- Eventually deprecate inline `prompt` field

**No Breaking Changes**:
- Existing recipes continue working
- Old API endpoints unchanged
- Gradual rollout possible

---

## 8. Current Files & Lines of Code

### 8.1 Where Prompts Currently Live

| File | Lines | Content | Recipes |
|------|-------|---------|---------|
| `/api/services/RecipeSeedData.js` | 1-975 | All 5 seed recipes with embedded prompts | PERSONA_GENERATION_RECIPE, NARRATIVE_GENERATION_RECIPE, STORYBOARD_GENERATION_RECIPE, SCREENPLAY_GENERATION_RECIPE, VIDEO_GENERATION_RECIPE |
| `/api/services/geminiService.js` | Various | Fallback prompts for text generation | N/A (old service) |
| `/api/services/RecipeManager.js` | 1-337 | Recipe CRUD (no prompts) | N/A |
| `/api/recipes.js` | 1-611 | Recipe endpoints (no prompts) | N/A |
| `/api/services/RecipeOrchestrator.js` | 1-200+ | Recipe execution logic (variable substitution) | N/A |

### 8.2 Files That Will Change

| File | Changes |
|------|---------|
| `/api/services/RecipeSeedData.js` | Extract prompts → Create new templates, keep recipe definitions |
| `/api/services/PromptTemplateService.js` | NEW - Manage prompt_templates collection |
| `/api/services/ActionExecutor.js` | Update to load prompts from templates instead of recipes |
| `/api/recipes.js` | Add endpoints to link recipes to templates |
| `/api/prompts.js` | NEW - Manage prompt templates API endpoints |
| Frontend components | Display which prompt template is being used |

---

## 9. Key Implementation Notes

### 9.1 Variable Substitution Logic

**Current** (in RecipeOrchestrator.resolveInputs):
```javascript
// Input mapping: { productDescription: "external_input.productDescription" }
// resolves to: { productDescription: "Amazing product..." }
const nodeInput = this.resolveInputs(node.inputMapping, nodeOutputs, input);
```

**Will Remain Unchanged** - Same logic applies to template variables

### 9.2 Node Types & Capability Mapping

```javascript
Node Type → Capability Name
"text_generation" → "textGeneration"
"image_generation" → "imageGeneration"
"video_generation" → "videoGeneration"
```

### 9.3 Multi-Capability Recipes

Some recipes have multiple nodes with different capabilities:

**Example: Persona Generation Recipe**
```javascript
Node 1: "text_generation" 
  → Uses promptTemplateCapability: "textGeneration"
  → Loads from template.prompts.textGeneration

Node 2: "image_generation"
  → Uses promptTemplateCapability: "imageGeneration"  
  → Loads from template.prompts.imageGeneration

Node 3: "data_processing"
  → No prompt needed
  → promptTemplateId: null
```

### 9.4 Data Migration Script Requirements

Script: `scripts/migrate-recipe-prompts-to-templates.js`

```javascript
// Pseudo-code
async function migrateRecipePromptsToTemplates() {
  // 1. Load all recipes from 'recipes' collection
  const recipes = await db.collection('recipes').get();
  
  // 2. For each recipe, extract prompts by stageType
  for (const recipe of recipes) {
    const stageType = recipe.stageType;  // e.g., "stage_2_personas"
    
    // 3. Create template document
    const template = {
      stageType,
      version: 1,
      name: `Default ${stageType} Template`,
      prompts: {
        textGeneration: { /* extract from text nodes */ },
        imageGeneration: { /* extract from image nodes */ }
      }
    };
    
    // 4. Save to prompt_templates
    await db.collection('prompt_templates').add(template);
    
    // 5. Update recipe nodes to reference template
    const updatedNodes = recipe.nodes.map(node => {
      if (node.prompt) {
        return {
          ...node,
          promptTemplateId: template.id,
          prompt: null  // Remove inline prompt
        };
      }
      return node;
    });
    
    // 6. Update recipe
    await db.collection('recipes').doc(recipe.id).update({
      nodes: updatedNodes
    });
  }
}
```

---

## 10. Summary: Recipe Data Model

### 10.1 Recipe Node Structure (Current)
```javascript
node: {
  id: string,
  name: string,
  type: 'text_generation' | 'image_generation' | 'video_generation' | 'data_processing',
  order: number,
  
  // Input/Output
  inputMapping: { [key]: 'source' },  // Where to get variables
  outputKey: string,                   // Where to store result
  
  // AI Configuration
  aiModel: {
    provider: 'gemini' | 'openai' | 'anthropic',
    modelName: string,
    temperature: number,
    maxTokens: number
  },
  
  // Prompt (CURRENT APPROACH)
  prompt: string,                      // Full prompt (500+ lines)
  promptTemplate?: string,             // Short template (optional)
  parameters?: {}                      // Parameter values
  
  // Execution
  dependencies: string[],              // Node IDs this depends on
  errorHandling: {},
  metadata: {}
}
```

### 10.2 Recipe Node Structure (After Migration)
```javascript
node: {
  id: string,
  name: string,
  type: 'text_generation' | 'image_generation' | 'video_generation' | 'data_processing',
  order: number,
  
  // Input/Output (UNCHANGED)
  inputMapping: { [key]: 'source' },
  outputKey: string,
  
  // AI Configuration (UNCHANGED)
  aiModel: {
    provider: 'gemini' | 'openai' | 'anthropic',
    modelName: string,
    temperature: number,
    maxTokens: number
  },
  
  // Prompt (NEW APPROACH)
  promptTemplateId: 'pt_stage2_personas_v1',  // Reference to template
  promptTemplateCapability: 'textGeneration', // Which prompt in template
  // prompt: null  // No inline prompt
  
  // Execution (UNCHANGED)
  dependencies: string[],
  errorHandling: {},
  metadata: {}
}
```

### 10.3 New Prompt Template Structure
```javascript
template: {
  id: 'pt_stage2_personas_v1',
  stageType: 'stage_2_personas',
  version: 1,
  name: 'Default Persona Generator',
  description: 'Generates diverse personas...',
  
  prompts: {
    'textGeneration': {
      systemPrompt: string,
      userPromptTemplate: string,
      outputFormat: 'json' | 'text' | 'image'
    },
    'imageGeneration': {
      systemPrompt: string,
      userPromptTemplate: string,
      outputFormat: 'image'
    }
  },
  
  variables: [
    { name, type, required, description }
  ],
  
  isDefault: boolean,
  isActive: boolean,
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  
  metadata: {
    tags: string[],
    changelog: []
  }
}
```

---

## 11. Files to Create/Modify

### 11.1 New Files
- `/api/services/PromptTemplateService.js` - Template CRUD
- `/api/prompts.js` - Template API endpoints
- `scripts/migrate-recipe-prompts-to-templates.js` - Migration script
- `scripts/validate-prompt-migration.js` - Validation script
- `src/components/PromptTemplateEditor.tsx` - UI component
- `src/pages/PromptSettingsPage.tsx` - Settings page

### 11.2 Modified Files
- `/api/services/RecipeSeedData.js` - Extract prompts
- `/api/services/ActionExecutor.js` - Load from templates
- `/api/services/RecipeOrchestrator.js` - Template resolution
- `/api/recipes.js` - Add template linking endpoints
- Frontend stage components - Show template info

### 11.3 Database Collections
- `prompt_templates` (NEW) - All prompt templates
- `recipes` (MODIFIED) - Add promptTemplateId to nodes
- `project_prompt_overrides` (NEW) - Per-project custom prompts
- `prompt_versions` (NEW) - Version history

---

## Conclusion

The current recipe-based system embeds ~2000+ lines of prompts directly within recipe node definitions. The migration to `prompt_templates` collection will:

1. **Extract prompts** from RecipeSeedData.js
2. **Create independent template versions** in Firestore
3. **Reference templates** from recipe nodes
4. **Enable reuse and customization** across projects
5. **Provide version control** for prompts separately from recipes

The variable substitution logic remains unchanged, making the migration straightforward and low-risk.
