# AgentService Implementation Guide

## ✅ COMPLETED PHASES

### Phase 1: Foundation (Backend) - COMPLETE
- ✅ `api/services/DAGValidator.js` - Validates DAG structure
- ✅ `api/services/RecipeManager.js` - Recipe CRUD operations
- ✅ `api/services/RecipeSeedData.js` - Pre-built recipe templates

### Phase 2: Execution Engine (Backend) - COMPLETE
- ✅ `api/services/ActionExecutor.js` - Executes individual action nodes
- ✅ `api/services/RecipeOrchestrator.js` - Orchestrates DAG execution
- ✅ `api/services/ActionResultTracker.js` - Tracks execution results

### Phase 3: Service Facade (Backend) - COMPLETE
- ✅ `api/services/AgentService.js` - Main orchestrator facade

### Phase 4: API Endpoints (Backend) - COMPLETE
- ✅ `api/recipes.js` - REST API routes
- ✅ Updated `server.js` - Integrated routes
- ✅ Installed `reactflow` and `zustand` packages

### Phase 5: React Flow UI Components - PARTIAL
- ✅ `src/features/storylab/components/recipe/ActionNode.tsx` - Custom node component
- ✅ `src/features/storylab/components/recipe/RecipeEditor.tsx` - Recipe editor canvas
- ✅ `src/features/storylab/components/recipe/RecipeNodePanel.tsx` - Node properties panel
- ✅ `src/features/storylab/components/recipe/RecipeEditor.css` - Styling

---

## 🔄 REMAINING WORK

### Step 1: Add RecipeEditorModal Wrapper

Create `src/features/storylab/components/recipe/RecipeEditorModal.tsx`:

```typescript
import { Dialog, DialogContent } from '../ui/dialog';
import { ReactFlowProvider } from 'reactflow';
import RecipeEditor from './RecipeEditor';

interface RecipeEditorModalProps {
  recipe?: any;
  onSave: (recipe: any) => Promise<void>;
  onClose: () => void;
}

export function RecipeEditorModal({ recipe, onSave, onClose }: RecipeEditorModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-[#0a0a0a] border-gray-800">
        <ReactFlowProvider>
          <RecipeEditor recipe={recipe} onSave={onSave} onClose={onClose} />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}

export default RecipeEditorModal;
```

### Step 2: Integrate with Stage 2 Personas

Modify `src/features/storylab/components/stages/Stage2Personas.tsx`:

```typescript
// Add imports
import { Edit3 } from 'lucide-react';
import RecipeEditorModal from '../recipe/RecipeEditorModal';

// Add state in component
const [showRecipeEditor, setShowRecipeEditor] = useState(false);
const [currentRecipe, setCurrentRecipe] = useState(null);

// Add this function to fetch and save recipe
const handleEditRecipe = async () => {
  try {
    const response = await fetch(`/api/recipes?stageType=stage_2_personas`);
    const data = await response.json();
    if (data.recipes.length > 0) {
      setCurrentRecipe(data.recipes[0]);
      setShowRecipeEditor(true);
    }
  } catch (error) {
    console.error('Error fetching recipe:', error);
  }
};

const handleRecipeSaved = async (recipe: any) => {
  try {
    const token = sessionStorage.getItem('authToken');
    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(recipe),
    });

    if (!response.ok) {
      throw new Error('Failed to save recipe');
    }

    console.log('Recipe saved successfully');
    setShowRecipeEditor(false);
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

// Add Edit Recipe button next to Generate button
<div className="mb-8 flex gap-4">
  <Button
    onClick={handleGenerate}
    disabled={isGenerating}
    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
    size="lg"
  >
    {isGenerating ? (
      <>
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
        Generating Personas...
      </>
    ) : (
      <>
        <Sparkles className="w-5 h-5 mr-2" />
        Generate Personas
      </>
    )}
  </Button>

  {/* NEW: Edit Recipe Button */}
  <Button
    onClick={handleEditRecipe}
    variant="outline"
    className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl"
    size="lg"
  >
    <Edit3 className="w-5 h-5 mr-2" />
    Edit Recipe
  </Button>
</div>

{/* Recipe Editor Modal */}
{showRecipeEditor && (
  <RecipeEditorModal
    recipe={currentRecipe}
    onSave={handleRecipeSaved}
    onClose={() => setShowRecipeEditor(false)}
  />
)}
```

### Step 3: Update Generation to Use AgentService

Modify the `handleGenerate` function to use AgentService:

```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Get the recipe
    const recipeResponse = await fetch(`/api/recipes?stageType=stage_2_personas`);
    const recipeData = await recipeResponse.json();

    if (recipeData.recipes.length === 0) {
      throw new Error('No recipe found for persona generation');
    }

    const recipeId = recipeData.recipes[0].id;

    // Execute recipe
    const executionResponse = await fetch(
      `/api/recipes/${recipeId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: {
            productDescription: project.campaignDetails.productDescription,
            targetAudience: project.campaignDetails.targetAudience,
            numberOfPersonas: 3,
          },
          projectId: project.id,
          stageId: 'stage_2',
        }),
      }
    );

    if (!executionResponse.ok) {
      const errorData = await executionResponse.json();
      throw new Error(errorData.error || 'Failed to execute recipe');
    }

    const executionData = await executionResponse.json();
    const executionId = executionData.executionId;

    // Poll for execution results
    let execution = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5s polling

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(
        `/api/recipes/executions/${executionId}`
      );
      execution = await statusResponse.json();

      if (execution.execution.status === 'completed') {
        break;
      }

      if (execution.execution.status === 'failed') {
        throw new Error('Recipe execution failed');
      }

      attempts++;
    }

    if (!execution || execution.execution.status !== 'completed') {
      throw new Error('Recipe execution timed out');
    }

    const finalPersonas = execution.execution.finalOutput.personas;

    // Convert final personas to UI format
    const generatedPersonas = finalPersonas.map((p) => ({
      id: p.id,
      name: p.coreIdentity?.name || 'Unknown',
      age: String(p.coreIdentity?.age || ''),
      demographic: p.coreIdentity?.demographic || '',
      motivation: p.coreIdentity?.motivation || '',
      bio: p.coreIdentity?.bio || '',
      image: p.image?.url || '',
      selected: false,
    }));

    setPersonas(generatedPersonas);
    setHasGenerated(true);

    // Save to project
    await updateAIPersonas({
      personas: finalPersonas,
      generatedAt: new Date(),
      generationRecipeId: recipeId,
      generationExecutionId: executionId,
      model: 'multi-modal',
      temperature: 0.7,
      count: generatedPersonas.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate personas';
    console.error('Error generating personas:', errorMessage);
    alert(`Failed to generate personas: ${errorMessage}`);
  } finally {
    setIsGenerating(false);
  }
};
```

### Step 4: Create Recipe Manager Page (Optional)

Create `src/features/storylab/pages/RecipeManagementPage.tsx` for viewing/managing all recipes:

```typescript
import { useState, useEffect } from 'react';
import AgentService from '../api/services/AgentService';
import RecipeEditorModal from '../components/recipe/RecipeEditorModal';

export function RecipeManagementPage() {
  const [recipes, setRecipes] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      const data = await response.json();
      setRecipes(data.recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  // Implementation details...
  return (
    <div className="p-8 text-white">
      {/* Recipe list and editor modal */}
    </div>
  );
}
```

---

## 🚀 SETUP & DEPLOYMENT

### Local Development

```bash
# 1. Install dependencies (if not done)
npm install reactflow zustand

# 2. Start development server
npm run dev:server

# 3. Test APIs
curl http://localhost:3000/api/recipes

# 4. Seed initial recipes
curl -X POST http://localhost:3000/api/recipes/seed/initial \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -H "Content-Type: application/json"
```

### Database Setup

The following Firestore collections will be automatically created:

```
firestore/
├── recipes/
│   └── {recipeId}
│       ├── name: String
│       ├── nodes: Array
│       ├── edges: Array
│       ├── executionConfig: Object
│       └── metadata: Object
│
├── recipe_executions/
│   └── {executionId}
│       ├── recipeId: String
│       ├── input: Object
│       ├── status: String (pending, running, completed, failed)
│       ├── actionResults: Array
│       ├── finalOutput: Object
│       └── executionContext: Object
```

---

## 📋 API ENDPOINTS REFERENCE

### Recipe Management

```
GET    /api/recipes                    - List all recipes
POST   /api/recipes                    - Create recipe
GET    /api/recipes/:recipeId          - Get recipe
PUT    /api/recipes/:recipeId          - Update recipe
DELETE /api/recipes/:recipeId          - Delete recipe
GET    /api/recipes/stage/:stageType   - Get recipes by stage
```

### Recipe Execution

```
POST   /api/recipes/:recipeId/execute           - Execute recipe
GET    /api/recipes/executions/:executionId    - Get execution status
GET    /api/recipes/executions/:executionId/summary - Get summary
GET    /api/recipes/:recipeId/executions       - List executions
GET    /api/recipes/:recipeId/history          - Get history
```

### Administration

```
POST   /api/recipes/seed/initial      - Seed initial recipes
POST   /api/recipes/executions/:executionId/cancel  - Cancel execution
POST   /api/recipes/executions/:executionId/retry   - Retry execution
```

---

## 🔗 Data Flow: Stage 2 Persona Generation

```
┌─ User clicks "Generate Personas"
│
├─ Frontend fetches recipe: GET /api/recipes?stageType=stage_2_personas
│
├─ Frontend executes recipe: POST /api/recipes/{recipeId}/execute
│   Input: { productDescription, targetAudience, numberOfPersonas }
│
├─ Backend orchestrates DAG execution:
│   1. Action 1: generatePersonaDetails (Gemini)
│   2. Action 2: generatePersonaImages (DALL-E)
│   3. Action 3: combineAndUpload (GCS)
│
├─ Frontend polls: GET /api/recipes/executions/{executionId}
│
├─ When status === 'completed', retrieve finalOutput
│
└─ Display personas to user
```

---

## 🛠️ TROUBLESHOOTING

### Recipe Not Executing

1. Check Firestore has `recipes` collection
2. Verify DAG structure is valid (no cycles)
3. Check API endpoint logs: `tail -f server.log`

### Personas Not Generating

1. Verify geminiService.js is working
2. Check imageGenerationService.js has proper API key
3. Verify GCS credentials in `.env`

### React Flow Canvas Not Appearing

1. Ensure `reactflow` package is installed: `npm list reactflow`
2. Check that `RecipeEditor.css` is imported in `RecipeEditor.tsx`
3. Verify ReactFlowProvider is wrapping the component

---

## 📚 FUTURE ENHANCEMENTS

1. **Webhook Support** - Get notified when recipes complete
2. **Recipe Versioning** - Store multiple versions of recipes
3. **Parallel Execution** - Execute independent DAG branches in parallel
4. **Recipe Templates** - Share and import recipe templates
5. **Cost Analytics** - Track AI token usage and costs
6. **Retry Strategies** - Exponential backoff and custom retry logic
7. **WebSocket Updates** - Real-time execution status updates
8. **Recipe Validation UI** - Visual feedback on DAG validation errors

---

## 🎯 KEY FILES SUMMARY

| File | Purpose | Status |
|------|---------|--------|
| `api/services/DAGValidator.js` | Validates DAG structure | ✅ |
| `api/services/RecipeManager.js` | Recipe CRUD | ✅ |
| `api/services/ActionExecutor.js` | Action execution | ✅ |
| `api/services/RecipeOrchestrator.js` | DAG orchestration | ✅ |
| `api/services/ActionResultTracker.js` | Result tracking | ✅ |
| `api/services/AgentService.js` | Main facade | ✅ |
| `api/recipes.js` | REST API routes | ✅ |
| `src/.../recipe/ActionNode.tsx` | React Flow node | ✅ |
| `src/.../recipe/RecipeEditor.tsx` | Editor canvas | ✅ |
| `src/.../recipe/RecipeNodePanel.tsx` | Node properties | ✅ |
| `src/.../recipe/RecipeEditor.css` | Styling | ✅ |
| `src/.../recipe/RecipeEditorModal.tsx` | Modal wrapper | 📝 |
| `Stage2Personas.tsx` (integration) | Integration point | 📝 |

Legend: ✅ = Done, 📝 = Needs Implementation

---

## 📞 SUPPORT

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint logs
3. Verify Firestore collections exist
4. Check environment variables in `.env`
