# AgentService Quick Start Guide

## 🚀 30-Second Overview

**AgentService** is a recipe management system for StoryLab that orchestrates multi-step AI workflows using DAGs.

### What is a Recipe?
A recipe is a DAG (Directed Acyclic Graph) of actions that process inputs through multiple AI models and services in sequence.

### Example: Persona Generation Recipe
```
Input: productDescription, targetAudience, numberOfPersonas
  ↓
Node 1: Generate Persona Details (Gemini) → personaDetails
  ↓
Node 2: Generate Persona Images (Image Service) → personaImages
  ↓
Node 3: Combine & Upload (GCS) → finalPersonas
  ↓
Output: finalPersonas with images
```

---

## ⚡ Quick Start (5 minutes)

### Step 1: Seed Initial Recipes
```bash
curl -X POST http://localhost:3000/api/recipes/seed/initial \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 2: List Available Recipes
```bash
curl http://localhost:3000/api/recipes?stageType=stage_2_personas
```

### Step 3: Execute a Recipe
```bash
RECIPE_ID="recipe_xxx"  # Get from Step 2
AUTH_TOKEN="your_token"

curl -X POST http://localhost:3000/api/recipes/$RECIPE_ID/execute \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "productDescription": "A cool product",
      "targetAudience": "Gen Z",
      "numberOfPersonas": 3
    },
    "projectId": "project_123",
    "stageId": "stage_2"
  }'
```

### Step 4: Check Status
```bash
# Response will have executionId
EXECUTION_ID="exec_xxx"

curl http://localhost:3000/api/recipes/executions/$EXECUTION_ID
```

### Step 5: Get Results
```bash
curl http://localhost:3000/api/recipes/executions/$EXECUTION_ID/summary
```

---

## 🗂️ File Structure

```
api/services/
├── DAGValidator.js          ← Validates DAG structure
├── RecipeManager.js         ← CRUD for recipes
├── ActionExecutor.js        ← Executes nodes
├── RecipeOrchestrator.js    ← Orchestrates DAG
├── ActionResultTracker.js   ← Tracks results
├── AgentService.js          ← Main facade
└── RecipeSeedData.js        ← Recipe templates

api/
└── recipes.js               ← REST API endpoints

src/features/storylab/components/recipe/
├── ActionNode.tsx           ← React Flow node
├── RecipeEditor.tsx         ← DAG editor
├── RecipeNodePanel.tsx      ← Properties panel
└── RecipeEditor.css         ← Styling
```

---

## 📡 API Quick Reference

### Recipes
```
GET    /api/recipes                  List recipes
POST   /api/recipes                  Create recipe
GET    /api/recipes/:id              Get recipe
PUT    /api/recipes/:id              Update recipe
DELETE /api/recipes/:id              Delete recipe
```

### Execution
```
POST   /api/recipes/:id/execute      Start execution
GET    /api/recipes/executions/:id   Get status
```

### Admin
```
POST   /api/recipes/seed/initial     Seed recipes
```

---

## 🎯 Key Concepts

| Term | Meaning |
|------|---------|
| **Recipe** | A DAG of actions that define a workflow |
| **Node/Action** | A single AI operation (text gen, image gen, etc.) |
| **Edge** | Connection between nodes (from → to) |
| **DAG** | Directed Acyclic Graph (no cycles) |
| **Input Mapping** | How a node's input comes from external data or previous nodes |
| **Output Key** | Name of this node's output for use by following nodes |
| **Execution** | One run of a recipe with specific inputs |

---

## 💻 Code Examples

### Execute a Recipe (Frontend)
```typescript
const executeRecipe = async () => {
  const response = await fetch(
    '/api/recipes/recipe_persona_generation_v1/execute',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        input: {
          productDescription: 'Cool product',
          targetAudience: 'Gen Z',
          numberOfPersonas: 3,
        },
        projectId: 'project_123',
        stageId: 'stage_2',
      }),
    }
  );

  const { executionId } = await response.json();

  // Poll for results
  const statusResponse = await fetch(
    `/api/recipes/executions/${executionId}`
  );
  const execution = await statusResponse.json();

  return execution.execution.finalOutput;
};
```

### Use AgentService (Backend)
```javascript
import AgentService from './services/AgentService.js';

// Execute recipe
const executionId = await AgentService.executeRecipe(
  'recipe_persona_generation_v1',
  {
    productDescription: '...',
    targetAudience: '...',
    numberOfPersonas: 3,
  },
  { userId, projectId, stageId }
);

// Get results
const execution = await AgentService.getExecutionStatus(executionId);
const summary = await AgentService.getExecutionSummary(executionId);
```

---

## 🔗 Integration with Stage 2

Add to `Stage2Personas.tsx`:

```typescript
// Import
import RecipeEditorModal from '../recipe/RecipeEditorModal';

// State
const [showRecipeEditor, setShowRecipeEditor] = useState(false);

// Add button
<Button onClick={() => setShowRecipeEditor(true)}>
  Edit Recipe
</Button>

// Add modal
{showRecipeEditor && (
  <RecipeEditorModal
    recipe={currentRecipe}
    onSave={handleRecipeSaved}
    onClose={() => setShowRecipeEditor(false)}
  />
)}
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "Recipe not found" | Run seed: `POST /api/recipes/seed/initial` |
| "Invalid DAG" | Check for cycles in node connections |
| "Execution failed" | Check Gemini API key in `.env` |
| "No output" | Check execution is status: `completed` |

---

## 📚 Documentation

- **Full Guide:** `AGENTSERVICE_IMPLEMENTATION_GUIDE.md`
- **Complete Summary:** `IMPLEMENTATION_SUMMARY.md`
- **This File:** `QUICK_START.md`

---

## ✅ Checklist: Integration

- [ ] 1. Seed recipes: `POST /api/recipes/seed/initial`
- [ ] 2. Create `RecipeEditorModal.tsx` (follow guide)
- [ ] 3. Add Edit Recipe button to Stage 2
- [ ] 4. Update `handleGenerate` to use AgentService
- [ ] 5. Test persona generation workflow
- [ ] 6. Test recipe editor modal
- [ ] 7. Verify execution tracking works
- [ ] 8. Deploy to production

---

## 🎓 Learning Path

1. **Start Here:** Read this Quick Start
2. **Understand:** Read IMPLEMENTATION_SUMMARY.md
3. **Integrate:** Follow AGENTSERVICE_IMPLEMENTATION_GUIDE.md
4. **Extend:** Modify recipes or add new action types

---

## 🚨 Important Notes

1. **Auth Required:** All POST/PUT/DELETE endpoints require Bearer token
2. **Async Execution:** Recipe execution is asynchronous, use polling
3. **Firestore:** Automatically creates needed collections
4. **AI Keys:** Ensure `.env` has GEMINI_API_KEY and GCS credentials
5. **DAG Validation:** All recipes validated before execution

---

## 💡 Tips & Tricks

- Use `/api/recipes?search=keyword` to find recipes
- Check token usage: `GET /api/recipes/executions/:id/summary`
- Retry failed executions: `POST /api/recipes/executions/:id/retry`
- Tag recipes for organization: `POST /api/recipes/:id/tags`

---

**Need Help?**
- Check logs: `tail -f server.log`
- Verify Firestore: Check `recipes` and `recipe_executions` collections
- Test API: Use curl commands above
- Read full guide: See AGENTSERVICE_IMPLEMENTATION_GUIDE.md

---

**Last Updated:** 2024-11-01
**Status:** ✅ Ready to integrate
