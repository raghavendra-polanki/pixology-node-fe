# Recipe Seeding Guide

## ✅ RECIPE SUCCESSFULLY CREATED!

The Persona Generation Pipeline recipe has been created and stored in Firestore.

**Recipe Details:**
- **ID:** `recipe_persona_generation_v1`
- **Name:** Persona Generation Pipeline
- **Stage Type:** `stage_2_personas`
- **Nodes:** 3 (Persona Details → Images → Combine & Upload)
- **Status:** ✅ Ready to use

---

## 🚀 NEXT STEPS

### Step 1: Refresh Your Browser
```
Press F5 or Ctrl+R to refresh
```

### Step 2: Navigate to Stage 2: Personas
1. Open StoryLab application
2. Go to Stage 2: Personas

### Step 3: Test the Edit Recipe Button
1. Click the **"Edit Recipe"** button
2. The recipe should now load in the visual editor
3. You should see the DAG with 3 nodes:
   - Generate Persona Details
   - Generate Persona Images
   - Combine Data and Upload

### Step 4: Test the Generate Button
1. Click **"Generate Personas"**
2. The system will:
   - Fetch the recipe from Firestore ✅
   - Execute the recipe via AgentService
   - Poll for execution status
   - Display generated personas

---

## 📋 WHAT WAS SEEDED

The script created a complete persona generation recipe with:

### Node 1: Generate Persona Details
- **Type:** Text Generation (Gemini)
- **Input:** productDescription, targetAudience, numberOfPersonas
- **Output:** Array of persona details
- **Prompt:** Detailed persona creation prompt

### Node 2: Generate Persona Images
- **Type:** Image Generation (DALL-E)
- **Input:** Persona details from Node 1
- **Output:** Array of persona images
- **Error Handling:** Skip on error (images are optional)

### Node 3: Combine & Upload
- **Type:** Data Processing
- **Input:** Persona details + images
- **Output:** Final personas with image URLs
- **Service:** Google Cloud Storage

---

## 🔄 HOW TO SEED MORE RECIPES

If you want to create more recipes, you have two options:

### Option 1: Use the Seeding Script
```bash
node scripts/seedRecipes.js
```

This script:
- Creates the persona generation recipe
- Checks if it already exists
- Verifies the creation

### Option 2: Use the Visual Editor
1. In Stage 2, click "Edit Recipe"
2. Click "Add Node" to add new nodes
3. Configure each node
4. Click "Save Recipe"
5. Recipe is automatically saved to Firestore

### Option 3: API Call (with Auth Token)
```bash
curl -X POST http://localhost:3000/api/recipes/seed/initial \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📚 FILE REFERENCE

**Seeding Script:**
- Location: `scripts/seedRecipes.js`
- Creates recipe in Firestore
- Verifies successful creation
- No authentication needed

**Recipe Data:**
- Defined in: `api/services/RecipeSeedData.js`
- Also used in: `scripts/seedRecipes.js`

**Recipe Management:**
- API Endpoints: `api/recipes.js`
- Services: `api/services/AgentService.js`

**Frontend Integration:**
- Stage 2: `src/features/storylab/components/stages/Stage2Personas.tsx`
- Editor: `src/features/storylab/components/recipe/RecipeEditor.tsx`

---

## ✨ WHAT YOU CAN NOW DO

✅ **Edit Recipe** - Modify prompts and parameters
✅ **Generate Personas** - Execute the recipe pipeline
✅ **View Results** - See generated personas with images
✅ **Track Execution** - See execution status and logs
✅ **Save Changes** - Changes are persisted in Firestore

---

## 🐛 TROUBLESHOOTING

**"Recipe still not loading"**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Check Firestore console to verify recipe exists

**"Generate Personas fails"**
- Check that Gemini API key is in `.env`
- Check image generation service credentials
- Check GCS credentials for upload
- View browser console for detailed error

**"Images not showing"**
- Check GCS bucket exists and is accessible
- Verify image URLs in Firestore are correct
- Check CORS settings if using different domain

---

## 📊 FIRESTORE VERIFICATION

To verify the recipe was created in Firestore:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Firestore Database
4. Look for `recipes` collection
5. You should see document: `recipe_persona_generation_v1`
6. Inside should be:
   - `name`: "Persona Generation Pipeline"
   - `stageType`: "stage_2_personas"
   - `nodes`: Array of 3 nodes
   - `edges`: Array of 2 edges

---

## 🎯 WORKFLOW

```
1. Edit Recipe Button
   ↓
   GET /api/recipes?stageType=stage_2_personas
   ↓
   Load recipe_persona_generation_v1
   ↓
   Open in Visual Editor
   ↓
   [User can edit nodes/prompts]
   ↓
   PUT /api/recipes/recipe_persona_generation_v1
   ↓
   Save changes to Firestore

2. Generate Personas Button
   ↓
   GET /api/recipes?stageType=stage_2_personas
   ↓
   POST /api/recipes/recipe_persona_generation_v1/execute
   ↓
   AgentService orchestrates DAG
   ↓
   Poll GET /api/recipes/executions/{executionId}
   ↓
   Display results
```

---

## 📞 SUPPORT

If you have issues:

1. **Check the browser console** for JavaScript errors
2. **Check the backend logs** for server errors
3. **Verify Firestore connection** in Firebase Console
4. **Verify API credentials** (.env file)
5. **Read QUICK_START.md** for more details

---

## 🎉 YOU'RE ALL SET!

The recipe is now in Firestore and ready to use.

**Next:**
1. Refresh your browser
2. Go to Stage 2: Personas
3. Click "Edit Recipe" - recipe should load!
4. Click "Generate Personas" - execution should work!

Happy generating! 🚀

---

**Created:** 2024-11-01
**Status:** ✅ Recipe Seeded Successfully
**Recipe ID:** `recipe_persona_generation_v1`
**Stage:** `stage_2_personas`
