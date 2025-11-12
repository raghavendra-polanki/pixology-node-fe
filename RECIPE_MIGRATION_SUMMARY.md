# Recipe-Based Prompt Migration - Executive Summary

**Date**: November 12, 2025
**Objective**: Migrate ~2000+ lines of prompts from embedded recipe nodes to independent `prompt_templates` collection
**Status**: Analysis Complete - Ready for Implementation

---

## Key Findings

### Current State
- **5 seed recipes** defined in `/api/services/RecipeSeedData.js`
- **~2000+ lines** of prompts embedded directly in recipe node definitions
- Prompts stored in `recipes/` Firestore collection with recipe metadata
- Variable substitution handled by `RecipeOrchestrator` during execution
- All projects use **identical prompts** across all stages
- **No independent prompt versioning** (prompts change with recipe version)

### Problem
| Issue | Impact | Example |
|-------|--------|---------|
| Embedded Prompts | Hard to maintain, can't version independently | Updating 1 line requires new recipe version |
| Monolithic Design | Prompts coupled to recipe structure | Can't reuse prompt across recipes |
| No Customization | All projects get same prompts | Can't tailor to specific client needs |
| Manual Changes | Changes require code deployment | Need full release cycle |
| No Audit Trail | No history of prompt changes | Can't track who changed what |

### Solution
**Separate prompt storage** from recipe structure:
- Recipes reference templates instead of embedding prompts
- Templates stored in new `prompt_templates` collection
- Independent versioning: v1, v2, v3 for prompts
- Per-project customization via overrides
- Change history and audit trail

---

## Architecture Overview

### Before Migration
```
recipes/{recipeId}
├─ nodes[0]
│  ├─ prompt: "..." [500 lines] ⚠️
│  ├─ inputMapping: {...}
│  └─ aiModel: {...}
└─ nodes[1]
   ├─ prompt: "..." [200 lines] ⚠️
   ├─ inputMapping: {...}
   └─ aiModel: {...}
```

### After Migration
```
recipes/{recipeId}
├─ nodes[0]
│  ├─ promptTemplateId: "pt_stage2_personas_v1" ✅
│  ├─ inputMapping: {...}
│  └─ aiModel: {...}
└─ nodes[1]
   ├─ promptTemplateId: "pt_stage2_personas_v1" ✅
   ├─ inputMapping: {...}
   └─ aiModel: {...}

prompt_templates/pt_stage2_personas_v1
├─ prompts.textGeneration [500 lines]
├─ prompts.imageGeneration [200 lines]
└─ version: 1
```

---

## Scope of Work

### Recipes to Migrate (5 total)

| # | Recipe | Stages | Nodes | Prompts | Lines | File Location |
|---|--------|--------|-------|---------|-------|----------------|
| 1 | Persona Generation | 2 | 3 | 2 | ~500 | RecipeSeedData:6-276 |
| 2 | Narrative Generation | 3 | 1 | 1 | ~200 | RecipeSeedData:278-396 |
| 3 | Storyboard Generation | 4 | 3 | 2 | ~400 | RecipeSeedData:398-649 |
| 4 | Screenplay Generation | 5 | 1 | 1 | ~300 | RecipeSeedData:655-798 |
| 5 | Video Generation | 6 | 1 | 1 | ~200 | RecipeSeedData:800-944 |
| | **TOTAL** | | **9** | **7** | **~1600** | |

### Variables to Extract (per stage)

**Stage 2 (Personas)**
- productDescription, targetAudience, productImageUrl, numberOfPersonas

**Stage 3 (Narratives)**
- productDescription, targetAudience, numberOfNarratives, selectedPersonas

**Stage 4 (Storyboard)**
- productDescription, targetAudience, selectedPersonaName, selectedPersonaDescription, selectedPersonaImage, narrativeTheme, narrativeStructure, numberOfScenes, videoDuration

**Stage 5 (Screenplay)**
- storyboardScenes, videoDuration, selectedPersonaName

**Stage 6 (Video)**
- sceneImage, sceneData, screenplayEntry, projectId

---

## Implementation Phases

### Phase 1: Create Infrastructure (2-3 days)
- [ ] Create `prompt_templates` collection in Firestore
- [ ] Implement `PromptTemplateService` with CRUD operations
- [ ] Create template schema and validation
- [ ] Set up database indexes

### Phase 2: Extract & Migrate Prompts (2-3 days)
- [ ] Extract 7 prompts from RecipeSeedData.js
- [ ] Create 5 template documents (pt_stage*_v1)
- [ ] Document all variables and their types
- [ ] Validate template structure

### Phase 3: Update Code (2-3 days)
- [ ] Modify recipe nodes to use `promptTemplateId`
- [ ] Update `ActionExecutor` to load prompts from templates
- [ ] Add fallback logic for backward compatibility
- [ ] Update `RecipeOrchestrator` for template resolution

### Phase 4: Testing & Validation (2-3 days)
- [ ] Test variable substitution with templates
- [ ] Verify execution flow unchanged
- [ ] Test backward compatibility
- [ ] Create migration script and test it

### Phase 5: Frontend Updates (1-2 days)
- [ ] Display which template is being used
- [ ] Add prompt template viewer
- [ ] Create template settings page (for future)

### Phase 6: Deployment (1 day)
- [ ] Create migration script
- [ ] Validate data integrity
- [ ] Deploy to production
- [ ] Monitor execution

**Total Estimated Time**: 10-15 days (2-3 weeks with team capacity)

---

## Files Impacted

### Files to Create
```
/api/services/PromptTemplateService.js    - Template CRUD (NEW)
/api/prompts.js                           - Template API endpoints (NEW)
/scripts/migrate-to-templates.js          - Migration script (NEW)
/scripts/validate-templates.js            - Validation script (NEW)
```

### Files to Modify
```
/api/services/RecipeSeedData.js           - Extract prompts (modify)
/api/services/ActionExecutor.js           - Load from templates (modify)
/api/services/RecipeOrchestrator.js       - Template resolution (modify)
/api/recipes.js                           - Link templates to recipes (minor)
```

### Files to Read Only
```
/api/services/RecipeManager.js            - No changes needed
/api/services/DAGValidator.js             - No changes needed
Frontend stage components                  - Minor updates only
```

---

## Database Collections

### New Collection: `prompt_templates`
```javascript
{
  id: "pt_stage2_personas_v1",
  stageType: "stage_2_personas",
  version: 1,
  name: "Default Persona Generator",
  description: "...",
  
  prompts: {
    textGeneration: {
      systemPrompt: "...",
      userPromptTemplate: "...",
      outputFormat: "json"
    },
    imageGeneration: {
      systemPrompt: "...",
      userPromptTemplate: "...",
      outputFormat: "image"
    }
  },
  
  variables: [
    { name: "productDescription", type: "string", required: true },
    ...
  ],
  
  isDefault: true,
  isActive: true,
  createdBy: "system",
  createdAt: timestamp,
  updatedAt: timestamp,
  
  metadata: {
    tags: ["stage2", "persona"],
    changelog: [...]
  }
}
```

### Modified Collection: `recipes`
**Before**:
```javascript
nodes[0]: {
  id: "generate_persona_details",
  prompt: "You are an expert..." // 500 lines
}
```

**After**:
```javascript
nodes[0]: {
  id: "generate_persona_details",
  promptTemplateId: "pt_stage2_personas_v1",
  promptTemplateCapability: "textGeneration"
}
```

---

## Key Decisions Made

### 1. Separate systemPrompt and userPromptTemplate
**Rationale**: 
- Allows independent customization
- System role stays consistent, user prompt varies
- Matches AI API best practices

### 2. Keep Variable Substitution Logic Unchanged
**Rationale**:
- Existing logic works well
- Lower risk migration
- No breaking changes to recipes

### 3. Store Variables in Template
**Rationale**:
- Self-documenting
- Type validation possible
- Required/optional flag helpful

### 4. Maintain Backward Compatibility
**Rationale**:
- Gradual rollout possible
- No forced immediate changes
- Easy rollback if needed

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data loss during migration | Low | High | Full Firestore backup, validation script |
| Breaking existing recipes | Low | High | Dual-mode execution, comprehensive testing |
| Variable substitution breaks | Low | High | Unit tests, manual testing |
| Performance degradation | Very Low | Medium | Caching, indexes on prompt_templates |
| Credential/secret exposure | Very Low | High | No credentials in templates, encryption for overrides |

---

## Success Criteria

- [ ] All 7 prompts successfully migrated to templates
- [ ] All 5 recipes reference templates correctly
- [ ] Variable substitution works identically to before
- [ ] Backward compatibility test passes
- [ ] No data loss during migration
- [ ] Performance within acceptable range
- [ ] All 6 stages continue to work
- [ ] Migration script is reusable and documented

---

## Documentation Generated

This analysis includes 4 comprehensive documents:

1. **RECIPE_STRUCTURE_ANALYSIS.md** (22 KB)
   - Complete data model explanation
   - Current architecture deep-dive
   - Migration strategy with code examples
   - File structure and schema definitions

2. **RECIPE_PROMPTS_QUICK_REFERENCE.md** (9.8 KB)
   - Quick lookup for recipes and prompts
   - Line numbers for each prompt
   - Variable reference guide
   - Migration checklist

3. **RECIPE_DATA_FLOW_DIAGRAMS.md** (15+ KB)
   - ASCII diagrams of execution flow
   - Data structure visualizations
   - Before/after architecture
   - Variable resolution steps

4. **RECIPE_MIGRATION_SUMMARY.md** (this file)
   - Executive summary
   - Implementation phases
   - Risk assessment
   - Success criteria

---

## Next Steps

### Immediate (This Week)
1. Review this analysis with team
2. Confirm implementation approach
3. Schedule migration work
4. Set up development branch

### Short Term (Next 2-3 Weeks)
1. Implement PromptTemplateService
2. Create migration script
3. Execute migration
4. Test thoroughly
5. Deploy to production

### Post-Migration (Future)
1. Build UI for prompt customization
2. Add per-project prompt overrides
3. Implement A/B testing framework
4. Add prompt versioning UI
5. Create prompt monitoring dashboard

---

## Questions Answered by This Analysis

**Q: How are prompts currently stored?**
A: Embedded directly in recipe node definitions in `/api/services/RecipeSeedData.js`

**Q: Where are the 7 prompts to migrate?**
A: Listed by line number in quick reference guide and detailed in structure analysis

**Q: What variables does each prompt use?**
A: Documented in variables section of each recipe

**Q: How does variable substitution work?**
A: `{variableName}` replaced with actual value from inputMapping during execution

**Q: Will this break existing functionality?**
A: No - migration uses templates while keeping recipes and execution logic unchanged

**Q: How long will this take?**
A: 2-3 weeks with full-time developer (10-15 days of work)

**Q: Can we rollback if needed?**
A: Yes - dual-mode execution allows gradual rollout with easy rollback

---

## Document References

- **Main Analysis**: `/RECIPE_STRUCTURE_ANALYSIS.md`
- **Quick Reference**: `/RECIPE_PROMPTS_QUICK_REFERENCE.md`
- **Diagrams**: `/RECIPE_DATA_FLOW_DIAGRAMS.md`
- **Source Files**: `/api/services/RecipeSeedData.js` (lines 1-975)
- **Execution Logic**: `/api/services/RecipeOrchestrator.js`
- **Action Execution**: `/api/services/ActionExecutor.js`

---

## Contact & Questions

For detailed questions about specific recipes, prompts, or implementation details, refer to the comprehensive analysis documents. They contain:

- Full code examples
- Database schema specifications
- Variable substitution logic
- Multi-stage execution flows
- Risk mitigation strategies
- Migration script pseudocode

