# Recipe Prompts - Quick Reference Guide

## Key Locations

| What | Where | Key Files |
|------|-------|-----------|
| Recipe Definitions | Firestore: `recipes/` collection | `/api/services/RecipeSeedData.js` |
| Recipe CRUD | API Layer | `/api/services/RecipeManager.js`, `/api/recipes.js` |
| Recipe Execution | Orchestration | `/api/services/RecipeOrchestrator.js` |
| Action Execution | Execution Logic | `/api/services/ActionExecutor.js` |
| Prompt Templates (New) | Firestore: `prompt_templates/` collection | `/api/services/PromptTemplateService.js` |

---

## 5 Seed Recipes & Their Prompts

### 1. Persona Generation (Stage 2)
- **File**: RecipeSeedData.js, lines 6-276
- **Nodes**: 
  - `generate_persona_details` (text, lines 14-132)
    - Prompt: Lines 35-111 (~500 lines)
    - Variables: productDescription, targetAudience, productImageUrl, numberOfPersonas
  - `generate_persona_images` (image, lines 134-216)
    - Prompt: Lines 152-198 (~200 lines)
  - `combine_and_upload` (data_processing, lines 218-245)

### 2. Narrative Generation (Stage 3)
- **File**: RecipeSeedData.js, lines 278-396
- **Nodes**:
  - `generate_narrative_themes` (text, lines 285-374)
    - Prompt: Lines 307-353 (~200 lines)
    - Variables: productDescription, targetAudience, numberOfNarratives, selectedPersonas

### 3. Storyboard Generation (Stage 4)
- **File**: RecipeSeedData.js, lines 398-649
- **Nodes**:
  - `generate_story_scenes` (text, lines 406-509)
    - Prompt: Lines 432-488 (~400 lines)
    - Variables: productDescription, targetAudience, selectedPersonaName, narrativeTheme, numberOfScenes, videoDuration
  - `generate_scene_images` (image, lines 511-588)
    - Prompt: Lines 531-569 (~200 lines)
  - `upload_and_save_scenes` (data_processing, lines 590-618)

### 4. Screenplay Generation (Stage 5)
- **File**: RecipeSeedData.js, lines 655-798
- **Nodes**:
  - `generate_screenplay_timings` (text, lines 663-776)
    - Prompt: Lines 710-768 (~300 lines)
    - Variables: storyboardScenes, videoDuration, selectedPersonaName

### 5. Video Generation (Stage 6)
- **File**: RecipeSeedData.js, lines 800-944
- **Nodes**:
  - `generate_scene_1_video` (video, lines 809-922)
    - Prompt: Lines 884-901 (~100 lines)
    - Variables: sceneImage, sceneData, screenplayEntry, projectId

---

## How Prompts Work Today

### Storage
```
recipes/{recipeId}
  ├─ nodes[0]
  │  ├─ id: "generate_persona_details"
  │  ├─ type: "text_generation"
  │  ├─ prompt: "You are an expert..." (500 lines)
  │  ├─ promptTemplate: "Generate {numberOfPersonas}..." (1 line)
  │  └─ inputMapping: { productDescription: "external_input.productDescription" }
  └─ nodes[1]
     ├─ id: "generate_persona_images"
     ├─ type: "image_generation"
     ├─ prompt: "Create a professional..." (200 lines)
     └─ inputMapping: { personaData: "personaDetails" }
```

### Execution Flow
```javascript
1. User executes recipe
2. RecipeOrchestrator.executeRecipe(recipeId, input)
   - Loads recipe from Firestore
   - Gets topological sort of nodes (DAG)
3. For each node in order:
   a. resolveInputs(inputMapping, nodeOutputs, externalInput)
      - Replaces source references with actual values
   b. ActionExecutor.executeAction(node, resolvedInputs)
      - Substitutes {variableName} in prompt with actual values
      - Calls AI service (Gemini, OpenAI, etc.)
      - Stores output in nodeOutputs[outputKey]
4. Return final results
```

### Variable Substitution Example
```javascript
// Recipe node
{
  inputMapping: {
    productDescription: "external_input.productDescription",
    targetAudience: "external_input.targetAudience"
  },
  prompt: `Generate personas for {productDescription} targeting {targetAudience}`
}

// External input
{
  productDescription: "A sustainable water bottle",
  targetAudience: "Eco-conscious millennials"
}

// After substitution
prompt becomes:
"Generate personas for A sustainable water bottle targeting Eco-conscious millennials"
```

---

## Recipe Node Field Reference

### Common Fields (All Nodes)
```javascript
{
  id: string,                          // Unique identifier
  name: string,                        // Display name
  type: 'text_generation' | 'image_generation' | 'video_generation' | 'data_processing',
  order: number,                       // Execution order (1, 2, 3...)
  inputMapping: { [key]: string },     // Source references for variables
  outputKey: string,                   // Where to store result
  dependencies: string[],              // Node IDs this depends on
  errorHandling: { onError, retryCount, timeout },
  metadata: { createdAt, description }
}
```

### AI Model Config (text/image/video nodes)
```javascript
{
  aiModel: {
    provider: 'gemini' | 'openai' | 'anthropic',
    modelName: 'gemini-2.5-flash' | 'gpt-4' | 'claude-3-opus',
    temperature: 0.0-1.0,           // 0.7 is default
    maxTokens: number               // Varies by model
  }
}
```

### Prompt Fields (text/image/video nodes)
```javascript
{
  // Full detailed prompt (required)
  prompt: string,                  // Can be 100-500+ lines
  
  // Short template (optional)
  promptTemplate: string,          // e.g., "Generate {count} items for {topic}"
  
  // Parameters (optional)
  parameters: {
    [key]: any                     // Default values for variables
  }
}
```

---

## Input Mapping Reference

### Source Types
```javascript
// External input (from user/project)
"external_input.productDescription"
"external_input.targetAudience"
"external_input.numberOfPersonas"

// Output from previous node
"personaDetails"                   // Stored in nodeOutputs["personaDetails"]
"storyScenes"                      // From generate_story_scenes node

// Literal values
"value:true"                       // Boolean literal
"value:123"                        // Number literal
"value:some string"                // String literal
```

### Common Patterns
```javascript
// Text generation input
inputMapping: {
  productDescription: "external_input.productDescription",
  targetAudience: "external_input.targetAudience"
}

// Subsequent node using previous output
inputMapping: {
  personaData: "personaDetails",              // From node 1
  productImageUrl: "external_input.productImageUrl"  // External
}

// Multi-node with cascading inputs
Node 1 outputs: personaDetails
Node 2 inputMapping: { personaData: "personaDetails", ... }
Node 2 outputs: personaImages
Node 3 inputMapping: { personaDetails: "personaDetails", personaImages: "personaImages" }
```

---

## Variables Used in Current Prompts

### Stage 2 (Personas)
- `{productDescription}` - What the product is
- `{targetAudience}` - Who should use it
- `{productImageUrl}` - Optional image of product
- `{numberOfPersonas}` - How many personas to create (usually 3-5)

### Stage 3 (Narratives)
- `{productDescription}` - What the product is
- `{targetAudience}` - Target demographic
- `{numberOfNarratives}` - How many narrative themes (usually 6)
- `{selectedPersonas}` - JSON of chosen personas from stage 2

### Stage 4 (Storyboard)
- `{productDescription}` - What the product is
- `{targetAudience}` - Target demographic
- `{selectedPersonaName}` - Who the video features
- `{selectedPersonaDescription}` - Their profile/background
- `{selectedPersonaImage}` - URL to persona's image
- `{narrativeTheme}` - Which narrative theme was chosen
- `{narrativeStructure}` - Story beat structure (e.g., "Hook → Problem → Solution → Resolution")
- `{numberOfScenes}` - How many scenes to create (usually 6-8)
- `{videoDuration}` - Total video length (e.g., "30s", "60s")

### Stage 5 (Screenplay)
- `{storyboardScenes}` - JSON array of scene details from stage 4
- `{videoDuration}` - Total video length
- `{selectedPersonaName}` - Featured persona

### Stage 6 (Video)
- `{sceneImage}` - Base64 encoded image from stage 4
- `{sceneData}` - Scene metadata
- `{screenplayEntry}` - Screenplay directions for this scene
- `{projectId}` - Project identifier

---

## Migration Checklist

- [ ] Identify all prompts to migrate (5 recipes)
- [ ] Extract prompts from RecipeSeedData.js
- [ ] Create `prompt_templates` collection structure
- [ ] Create pt_stage2_personas_v1 template
- [ ] Create pt_stage3_narratives_v1 template
- [ ] Create pt_stage4_storyboard_v1 template
- [ ] Create pt_stage5_screenplay_v1 template
- [ ] Create pt_stage6_video_v1 template (if needed)
- [ ] Update recipe nodes to reference templates
- [ ] Modify ActionExecutor to load from templates
- [ ] Test variable substitution still works
- [ ] Create migration script
- [ ] Test rollback procedure
- [ ] Update documentation

---

## Files to Reference

### Primary Source Files
1. `/api/services/RecipeSeedData.js` - All 5 recipes with embedded prompts
2. `/api/services/RecipeOrchestrator.js` - How recipes are executed
3. `/api/services/ActionExecutor.js` - How prompts are processed

### Related Files
4. `/api/services/RecipeManager.js` - Recipe CRUD operations
5. `/api/recipes.js` - Recipe API endpoints
6. `/api/services/PromptTemplateService.js` - Template management (NEW)

### Database Schema
7. Firestore: `recipes/` - Current recipe storage
8. Firestore: `prompt_templates/` - New template storage (TO BE CREATED)

---

## Terminology

| Term | Definition |
|------|-----------|
| **Recipe** | Complete workflow with nodes (DAG), edges, and execution config |
| **Node** | Individual task in recipe (text gen, image gen, etc.) |
| **Edge** | Dependency link between nodes |
| **Prompt** | Instructions sent to AI model |
| **Prompt Template** | Reusable prompt with variables that get substituted |
| **inputMapping** | Specification of where node's input variables come from |
| **Variable Substitution** | Replacing {variableName} with actual value in prompt |
| **nodeOutputs** | Storage for outputs from completed nodes |
| **DAG** | Directed Acyclic Graph - ensures no circular dependencies |
| **Stage** | Phase of video production (Stage 2 = Personas, etc.) |

