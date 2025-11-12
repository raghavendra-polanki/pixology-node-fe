# Recipe & Prompt Data Flow Diagrams

## 1. Current Architecture: Recipe Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INITIATES STAGE EXECUTION                   │
│                      (e.g., Stage 2 - Personas)                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Frontend Stage Component      │
        │  (Stage2Personas.tsx)          │
        │  User provides inputs:         │
        │  - productDescription          │
        │  - targetAudience              │
        │  - numberOfPersonas            │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────────┐
        │  POST /api/recipes/{recipeId}/execute  │
        │  {                                     │
        │    input: {                            │
        │      productDescription: "...",        │
        │      targetAudience: "...",            │
        │      numberOfPersonas: 3               │
        │    }                                   │
        │  }                                     │
        └────────────┬─────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────┐
        │  Backend: /api/recipes.js                │
        │  router.post('/:recipeId/execute')      │
        │  - Verifies token                       │
        │  - Calls AgentService.executeRecipe()   │
        └────────────┬────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────┐
        │  RecipeOrchestrator.executeRecipe()      │
        │  1. Load recipe from Firestore           │
        │     recipes/{recipeId}                   │
        │  2. Validate DAG structure               │
        │  3. Get topological sort of nodes        │
        └────────────┬────────────────────────────┘
                     │
                     ▼
   ┌─────────────────────────────────────────────────┐
   │  For each node in execution order:              │
   │  1. resolveInputs(inputMapping, ...)            │
   │  2. ActionExecutor.executeAction(node, input)   │
   │  3. Store output in nodeOutputs[outputKey]      │
   └─────────────────────────────────────────────────┘
                     │
         ┌───────────┴──────────────┬──────────────┐
         │                          │              │
         ▼                          ▼              ▼
    ┌─────────────┐         ┌─────────────┐  ┌──────────────┐
    │ Node 1:     │         │ Node 2:     │  │ Node 3:      │
    │ text_gen    │         │ image_gen   │  │ data_process │
    │             │         │             │  │              │
    │ Resolves    │         │ Resolves    │  │ Combines     │
    │ inputs:     │         │ inputs:     │  │ & uploads    │
    │ - product   │         │ - personas  │  │              │
    │ - audience  │         │ - product   │  │              │
    │ - count     │         │   image     │  │              │
    │             │         │             │  │              │
    │ Loads recipe│         │ Loads recipe│  │              │
    │ node.prompt │         │ node.prompt │  │              │
    │             │         │             │  │              │
    │ Substitutes │         │ Substitutes │  │              │
    │ variables:  │         │ variables:  │  │              │
    │ {product}   │         │ {persona}   │  │              │
    │ {audience}  │         │ {image}     │  │              │
    │ {count}     │         │             │  │              │
    │             │         │             │  │              │
    │ Calls AI:   │         │ Calls AI:   │  │              │
    │ Gemini      │         │ Gemini      │  │              │
    │             │         │             │  │              │
    │ Returns:    │         │ Returns:    │  │              │
    │ persona     │         │ persona     │  │              │
    │ data (JSON) │         │ images      │  │              │
    │             │         │ (buffer)    │  │              │
    └──────┬──────┘         └──────┬──────┘  └────────┬─────┘
           │                       │                  │
           └───────────────────────┼──────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Store all results in:         │
                    │ - projects/{projectId}       │
                    │ - aiGeneratedPersonas        │
                    │ - stage execution tracking   │
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Return to Frontend:          │
                    │ {                            │
                    │   personas: [...],           │
                    │   images: [...],             │
                    │   status: "completed"        │
                    │ }                            │
                    └──────────────────────────────┘
```

---

## 2. Current Data Structure: Recipe in Firestore

```
Collection: recipes
Document: recipe_persona_generation_v1
{
  id: "recipe_persona_generation_v1",
  name: "Persona Generation Pipeline",
  description: "Generate persona details and images for Stage 2",
  stageType: "stage_2_personas",
  version: 1,
  
  nodes: [
    {
      id: "generate_persona_details",
      name: "Generate Persona Details",
      type: "text_generation",
      order: 1,
      
      inputMapping: {
        productDescription: "external_input.productDescription",
        targetAudience: "external_input.targetAudience",
        productImageUrl: "external_input.productImageUrl",
        numberOfPersonas: "external_input.numberOfPersonas"
      },
      outputKey: "personaDetails",
      
      aiModel: {
        provider: "gemini",
        modelName: "gemini-2.5-flash",
        temperature: 0.7,
        maxTokens: 2000
      },
      
      ┌─────────────────────────────────────────────┐
      │  prompt: `                                  │
      │  You are an expert Casting Director...    │
      │                                            │
      │  **PRODUCT CONTEXT:**                      │
      │  Product Description: {productDescription} │
      │  Target Audience: {targetAudience}         │
      │  Product Image URL: {productImageUrl}      │
      │                                            │
      │  [500+ lines of detailed instructions]    │
      │                                            │
      │  **RESPOND IN THIS EXACT JSON FORMAT:**    │
      │  [                                         │
      │    {                                       │
      │      "coreIdentity": {...},               │
      │      "physicalAppearance": {...},         │
      │      ...                                   │
      │    }                                       │
      │  ]                                         │
      │  `                                         │
      └─────────────────────────────────────────────┘
      
      promptTemplate: "Generate {numberOfPersonas} personas for {productDescription} targeting {targetAudience}",
      
      parameters: {
        numberOfPersonas: 3,
        diversityFocus: true,
        jsonFormat: true
      },
      
      dependencies: [],
      errorHandling: {
        onError: "fail",
        retryCount: 2,
        timeout: 30000
      },
      
      metadata: {
        createdAt: <timestamp>,
        description: "Generates diverse persona descriptions using Gemini"
      }
    },
    
    {
      id: "generate_persona_images",
      name: "Generate Persona Images",
      type: "image_generation",
      order: 2,
      
      inputMapping: {
        personaData: "personaDetails",
        productImageUrl: "external_input.productImageUrl"
      },
      outputKey: "personaImages",
      
      aiModel: {
        provider: "gemini",
        modelName: "gemini-2.5-flash-image",
        temperature: 0.8
      },
      
      prompt: `
      Create a professional UGC-style portrait photo...
      [200+ lines of image generation instructions]
      `,
      
      parameters: {
        imageFormat: "jpg",
        resolution: "1024x1024"
      },
      
      dependencies: ["generate_persona_details"],
      ...
    },
    
    {
      id: "combine_and_upload",
      name: "Combine Data and Upload",
      type: "data_processing",
      order: 3,
      inputMapping: {
        personaDetails: "personaDetails",
        personaImages: "personaImages"
      },
      outputKey: "finalPersonas",
      parameters: {
        uploadService: "gcs",
        combinationLogic: "merge_details_with_images"
      },
      dependencies: ["generate_persona_images"],
      ...
    }
  ],
  
  edges: [
    { from: "generate_persona_details", to: "generate_persona_images" },
    { from: "generate_persona_images", to: "combine_and_upload" }
  ],
  
  executionConfig: {
    timeout: 120000,
    retryPolicy: { maxRetries: 1, backoffMs: 1000 },
    parallelExecution: false,
    continueOnError: false
  },
  
  metadata: {
    createdAt: <timestamp>,
    updatedAt: <timestamp>,
    createdBy: "system",
    isActive: true,
    tags: ["persona", "generation", "stage2"]
  }
}
```

---

## 3. Variable Resolution Flow

```
┌────────────────────────────────────────────────────────────┐
│  User Input (External)                                     │
│  {                                                         │
│    productDescription: "Sustainable water bottle",        │
│    targetAudience: "Eco-conscious millennials",          │
│    numberOfPersonas: 3                                    │
│  }                                                        │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────────────────────┐
│  Recipe Node InputMapping                                 │
│  {                                                        │
│    productDescription: "external_input.productDescription",
│    targetAudience: "external_input.targetAudience",      │
│    numberOfPersonas: "external_input.numberOfPersonas"   │
│  }                                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────────────────────┐
│  RecipeOrchestrator.resolveInputs()                       │
│  Replaces references with actual values                   │
│  {                                                        │
│    productDescription: "Sustainable water bottle",      │
│    targetAudience: "Eco-conscious millennials",         │
│    numberOfPersonas: 3                                   │
│  }                                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────────────────────┐
│  ActionExecutor receives:                                 │
│  - node.prompt with placeholders:                         │
│    "Create {numberOfPersonas} personas for               │
│     {productDescription} targeting {targetAudience}"     │
│  - resolved inputs (from above)                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────────────────────┐
│  Variable Substitution (regex replace)                    │
│  prompt.replace(/{(\w+)}/g, (match, key) =>             │
│    resolvedInputs[key] || match)                         │
│                                                           │
│  Result:                                                  │
│  "Create 3 personas for Sustainable water bottle       │
│   targeting Eco-conscious millennials"                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Send to AI Model  │
        │  (Gemini API)      │
        └────────────────────┘
```

---

## 4. Multi-Node Execution with Output Passing

```
           ┌──────────────────────────────────────┐
           │  START: External Input Available     │
           │  {                                   │
           │    productDescription: "...",        │
           │    targetAudience: "...",            │
           │    productImageUrl: "...",           │
           │    numberOfPersonas: 3               │
           │  }                                   │
           └────────────┬─────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────────┐
        │  Node 1: generate_persona_details        │
        │  Type: text_generation                   │
        │  Input: external input + productImageUrl │
        │  Prompt: "You are an expert..."          │
        │  Variables: {productDescription}, etc    │
        │  Output → nodeOutputs["personaDetails"]  │
        │                                          │
        │  personaDetails = [                      │
        │    {                                     │
        │      "coreIdentity": {...},             │
        │      "physicalAppearance": {...},       │
        │      "personalityAndCommunication": {...}│
        │    },                                    │
        │    { ... },                              │
        │    { ... }                               │
        │  ]                                       │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
     ┌─────────────────────────────────────────────┐
     │  nodeOutputs = {                            │
     │    "personaDetails": [3 persona objects]   │
     │  }                                          │
     └──────────┬────────────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────────────┐
   │  Node 2: generate_persona_images               │
   │  Type: image_generation                        │
   │  Input Mapping:                                │
   │  {                                             │
   │    personaData: "personaDetails"   ←─ FROM NODE 1
   │                                    │            
   │    productImageUrl: "external_input.productImageUrl"
   │  }                                             │
   │                                                │
   │  Resolved Input:                               │
   │  {                                             │
   │    personaData: [3 persona objects] (from node 1)
   │    productImageUrl: "https://..."              │
   │  }                                             │
   │                                                │
   │  Prompt: "Create professional UGC portraits..."│
   │  Variables: {name}, {age}, {build}, etc        │
   │  (extracted from personaData)                  │
   │                                                │
   │  Output → nodeOutputs["personaImages"]         │
   │  personaImages = [                             │
   │    "data:image/jpeg;base64,...",              │
   │    "data:image/jpeg;base64,...",              │
   │    "data:image/jpeg;base64,..."               │
   │  ]                                             │
   └─────────────┬──────────────────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────────────┐
  │  nodeOutputs = {                             │
  │    "personaDetails": [...],                  │
  │    "personaImages": [...]                    │
  │  }                                           │
  └──────────┬────────────────────────────────────┘
             │
             ▼
 ┌───────────────────────────────────────────────────┐
 │  Node 3: combine_and_upload                       │
 │  Type: data_processing                            │
 │  Input Mapping:                                   │
 │  {                                                │
 │    personaDetails: "personaDetails"  ←─ FROM NODE 1
 │    personaImages: "personaImages"    ←─ FROM NODE 2
 │  }                                                │
 │                                                   │
 │  Resolved Input:                                  │
 │  {                                                │
 │    personaDetails: [3 objects with full data],  │
 │    personaImages: [3 base64 image strings]      │
 │  }                                                │
 │                                                   │
 │  Process: Merge details with images              │
 │  Output → nodeOutputs["finalPersonas"]           │
 │  finalPersonas = [                               │
 │    {                                              │
 │      ...personaDetails[0],                       │
 │      image: personaImages[0]                     │
 │    },                                             │
 │    { ... },                                       │
 │    { ... }                                        │
 │  ]                                                │
 │                                                   │
 │  Upload to GCS                                    │
 └─────────────┬──────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │  COMPLETE: Store results in  │
    │  projects/{projectId}        │
    │  - aiGeneratedPersonas       │
    │  - stage2 execution tracking  │
    └──────────────────────────────┘
```

---

## 5. New Architecture: After Migration to prompt_templates

```
Collection: recipes/{recipeId}
(WITHOUT inline prompts)
{
  nodes: [
    {
      id: "generate_persona_details",
      type: "text_generation",
      inputMapping: {...},
      outputKey: "personaDetails",
      aiModel: {...},
      
      ┌─────────────────────────────────────────┐
      │ promptTemplateId: "pt_stage2_personas_v1"│
      │ promptTemplateCapability: "textGeneration"
      │                                         │
      │ (NO LONGER STORING INLINE PROMPT HERE) │
      └─────────────────────────────────────────┘
      
      dependencies: [],
      errorHandling: {...}
    },
    {
      id: "generate_persona_images",
      type: "image_generation",
      inputMapping: {...},
      outputKey: "personaImages",
      aiModel: {...},
      
      promptTemplateId: "pt_stage2_personas_v1",
      promptTemplateCapability: "imageGeneration",
      
      dependencies: ["generate_persona_details"],
      errorHandling: {...}
    }
  ],
  edges: [...],
  executionConfig: {...},
  metadata: {...}
}

                    │
                    │ References
                    ▼

Collection: prompt_templates
Document: pt_stage2_personas_v1
{
  id: "pt_stage2_personas_v1",
  stageType: "stage_2_personas",
  version: 1,
  name: "Default Persona Generator v1",
  
  prompts: {
    "textGeneration": {
      systemPrompt: "You are an expert Casting Director...",
      userPromptTemplate: `
        Create {numberOfPersonas} personas for {productDescription}...
        [500+ lines of detailed instructions]
      `,
      outputFormat: "json"
    },
    "imageGeneration": {
      systemPrompt: "Create professional UGC portrait photos...",
      userPromptTemplate: `
        Generate portrait for: {name}, Age: {age}...
        [200+ lines of image instructions]
      `,
      outputFormat: "image"
    }
  },
  
  variables: [
    { name: "productDescription", type: "string", required: true },
    { name: "targetAudience", type: "string", required: true },
    { name: "productImageUrl", type: "string", required: false },
    { name: "numberOfPersonas", type: "number", required: true }
  ],
  
  isDefault: true,
  isActive: true,
  createdBy: "system",
  createdAt: <timestamp>,
  updatedAt: <timestamp>,
  
  metadata: {
    tags: ["persona", "stage2", "generation"],
    changelog: [...]
  }
}
```

---

## 6. New Execution Flow with Template Resolution

```
┌──────────────────────────────────────────────────────┐
│  RecipeOrchestrator.executeRecipe(recipeId, input)   │
│  1. Load recipe from Firestore                       │
│  2. Get topological sort                             │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  For each node in execution order:                   │
│  1. Resolve inputs (same as before)                  │
│  2. ActionExecutor.executeAction(node, input)        │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  ActionExecutor.executeAction()                         │
│  NEW LOGIC:                                             │
│  if (node.promptTemplateId) {                           │
│    // Load template from Firestore                     │
│    const template = await getTemplate(               │
│      node.promptTemplateId                            │
│    );                                                  │
│                                                        │
│    // Get appropriate prompt for this capability      │
│    const promptSet = template.prompts[               │
│      node.promptTemplateCapability                    │
│    ];                                                  │
│                                                        │
│    // Use promptSet.userPromptTemplate                │
│    prompt = promptSet.userPromptTemplate;            │
│  } else {                                              │
│    // Fallback to inline prompt (for compat)         │
│    prompt = node.prompt;                             │
│  }                                                     │
│                                                        │
│  // Continue with variable substitution              │
│  // (same as before)                                  │
│  prompt = substitute(prompt, resolvedInputs);        │
│  result = callAI(prompt, node.aiModel);              │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Comparison: Current vs New

### Current System
```
Recipes Collection
├─ recipe_persona_generation_v1
│  ├─ nodes[0]
│  │  ├─ prompt: [500 lines embedded] ⚠️
│  │  └─ inputMapping: {...}
│  └─ nodes[1]
│     ├─ prompt: [200 lines embedded] ⚠️
│     └─ inputMapping: {...}
│
├─ recipe_storyboard_generation_v1
│  ├─ nodes[0]
│  │  ├─ prompt: [400 lines embedded] ⚠️
│  │  └─ inputMapping: {...}
│  └─ nodes[1]
│     ├─ prompt: [200 lines embedded] ⚠️
│     └─ inputMapping: {...}
│
└─ [More recipes with embedded prompts...]

Issues:
- Can't version prompts independently
- Hard to find all prompts in system
- Can't reuse prompts across recipes
- No per-project customization
```

### New System
```
Recipes Collection
├─ recipe_persona_generation_v1
│  ├─ nodes[0]
│  │  ├─ promptTemplateId: "pt_stage2_personas_v1" ✅
│  │  └─ inputMapping: {...}
│  └─ nodes[1]
│     ├─ promptTemplateId: "pt_stage2_personas_v1" ✅
│     └─ inputMapping: {...}
│
├─ recipe_storyboard_generation_v1
│  ├─ nodes[0]
│  │  ├─ promptTemplateId: "pt_stage4_storyboard_v1" ✅
│  │  └─ inputMapping: {...}
│  └─ nodes[1]
│     ├─ promptTemplateId: "pt_stage4_storyboard_v1" ✅
│     └─ inputMapping: {...}
│
└─ [More recipes with template references...]


Prompt Templates Collection
├─ pt_stage2_personas_v1
│  ├─ prompts.textGeneration [500 lines]
│  └─ prompts.imageGeneration [200 lines]
│
├─ pt_stage2_personas_v2  (improved version)
│  ├─ prompts.textGeneration [500 lines, updated]
│  └─ prompts.imageGeneration [200 lines, updated]
│
├─ pt_stage4_storyboard_v1
│  └─ prompts.textGeneration [400 lines]
│
└─ [More templates organized by stage]


Project Overrides Collection (optional)
└─ project_123
   └─ stage_2_personas
      ├─ promptTemplateId: "pt_stage2_personas_v2"
      └─ customPromptOverrides: {...}

Benefits:
✅ Independent versioning
✅ Easy to find all prompts
✅ Reuse across recipes
✅ Per-project customization
✅ Clear change history
```

