# Recipe & Prompt Documentation - Complete Index

Generated: November 12, 2025

This folder contains comprehensive documentation about how recipes and prompts are structured, stored, and used in the Pixology system.

---

## Document Overview

### 1. RECIPE_MIGRATION_SUMMARY.md
**Type**: Executive Summary  
**Length**: 4 KB  
**Audience**: Managers, architects, team leads  
**Best for**: Quick understanding of scope and timeline

**Contains**:
- Key findings and problems identified
- Solution overview
- Scope of work with table
- 6 implementation phases with timeline
- Risk assessment matrix
- Success criteria

**Start here if you**: Want a high-level understanding of what needs to be done and why

---

### 2. RECIPE_STRUCTURE_ANALYSIS.md
**Type**: Technical Deep Dive  
**Length**: 22 KB  
**Audience**: Developers, architects  
**Best for**: Understanding the complete system

**Contains**:
- Current recipe architecture overview
- 5 seed recipes detailed breakdown
- How prompts are stored today (2 fields)
- Prompt variable resolution explanation
- Real examples from codebase
- 5 current pain points
- New prompt_templates collection design
- Step-by-step migration strategy
- Database schema changes
- File structure and modifications needed
- Implementation notes for complex scenarios

**Start here if you**: Are implementing the migration or need detailed technical understanding

---

### 3. RECIPE_PROMPTS_QUICK_REFERENCE.md
**Type**: Quick Lookup Guide  
**Length**: 9.8 KB  
**Audience**: Developers, QA engineers  
**Best for**: Finding specific information quickly

**Contains**:
- Key locations of all files
- All 5 seed recipes with line numbers
- Exact line ranges for each prompt
- Variable reference by stage
- Execution flow pseudocode
- Node field reference
- Input mapping patterns
- Migration checklist
- Terminology glossary

**Start here if you**: Need to find something specific or are doing manual work

---

### 4. RECIPE_DATA_FLOW_DIAGRAMS.md
**Type**: Visual Reference  
**Length**: 15+ KB  
**Audience**: All technical staff  
**Best for**: Understanding data flow and transformations

**Contains**:
- ASCII diagrams of current execution flow
- Firestore data structure visualization
- Variable resolution flow diagram
- Multi-node execution with output passing
- Before/after architecture comparison
- New execution flow with template resolution
- Comparison table of old vs new system

**Start here if you**: Are visual learner or need to understand data flow

---

## File Locations Quick Map

```
Documentation Files (in repo root):
├─ RECIPE_MIGRATION_SUMMARY.md         (This index's main summary)
├─ RECIPE_STRUCTURE_ANALYSIS.md        (Complete technical reference)
├─ RECIPE_PROMPTS_QUICK_REFERENCE.md   (Lookup guide)
├─ RECIPE_DATA_FLOW_DIAGRAMS.md        (Visual diagrams)
├─ RECIPE_DOCUMENTATION_INDEX.md       (This file)
├─ MIGRATION_PLAN.md                   (Overall system migration plan)
├─ RECIPE_SEEDING_GUIDE.md             (How to seed recipes initially)
└─ RECIPE_SEEDED.md                    (Record of seeded recipes)

Source Code Files:
api/services/
├─ RecipeSeedData.js            (Contains all 5 seed recipes - 975 lines)
├─ RecipeManager.js             (Recipe CRUD operations)
├─ RecipeOrchestrator.js        (Recipe execution orchestration)
├─ ActionExecutor.js            (Individual action execution)
├─ ActionResultTracker.js       (Result tracking)
├─ DAGValidator.js              (DAG validation)
├─ PromptTemplateService.js     (NEW - Will be created)
└─ [Other services...]

api/
├─ recipes.js                   (Recipe API endpoints)
└─ prompts.js                   (NEW - Will be created)

scripts/
├─ seedRecipes.js               (Existing seed script)
├─ migrate-to-templates.js      (NEW - To be created)
└─ [Other scripts...]
```

---

## How to Use This Documentation

### For Project Managers / Architects
1. **Read**: RECIPE_MIGRATION_SUMMARY.md (5 min)
2. **Understand**: Scope, timeline, risks
3. **Reference**: Success criteria, implementation phases

### For Implementation Team
1. **Read**: RECIPE_STRUCTURE_ANALYSIS.md (20 min)
2. **Reference**: RECIPE_PROMPTS_QUICK_REFERENCE.md (as needed)
3. **Visualize**: RECIPE_DATA_FLOW_DIAGRAMS.md (10 min)
4. **Implement**: Use code examples from analysis

### For QA / Testing
1. **Understand**: RECIPE_DATA_FLOW_DIAGRAMS.md (10 min)
2. **Check**: RECIPE_PROMPTS_QUICK_REFERENCE.md for recipes list
3. **Verify**: Each recipe still works identically
4. **Validate**: Variable substitution unchanged

### For Code Review
1. **Reference**: RECIPE_STRUCTURE_ANALYSIS.md (specific sections)
2. **Check**: File structure and database schema changes
3. **Verify**: Backward compatibility approach
4. **Test**: Migration script logic

---

## Key Information Locations

### Finding Information About a Specific Recipe

**Example: Persona Generation Recipe**

1. **Overview**: RECIPE_MIGRATION_SUMMARY.md → Scope of Work table
2. **Details**: RECIPE_STRUCTURE_ANALYSIS.md → Section 1.2
3. **Line Numbers**: RECIPE_PROMPTS_QUICK_REFERENCE.md → Stage 2 section
4. **Execution**: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 4
5. **Code**: `/api/services/RecipeSeedData.js` → Lines 6-276

### Finding Variable Information

**Example: What variables does Stage 4 use?**

1. Quick answer: RECIPE_PROMPTS_QUICK_REFERENCE.md → "Variables Used" section
2. Detailed: RECIPE_STRUCTURE_ANALYSIS.md → Section 7 (Shows exact list)
3. In context: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 3

### Understanding Execution Flow

1. **Current system**: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 1
2. **With multiple nodes**: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 4
3. **Variable substitution**: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 3
4. **After migration**: RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 6

### Implementation Guidance

1. **Migration approach**: RECIPE_STRUCTURE_ANALYSIS.md → Section 7
2. **Code examples**: RECIPE_STRUCTURE_ANALYSIS.md → Section 9
3. **Database schema**: RECIPE_STRUCTURE_ANALYSIS.md → Section 11
4. **File changes**: RECIPE_STRUCTURE_ANALYSIS.md → Section 11

---

## Key Numbers & Statistics

### Recipes
- **Total seed recipes**: 5
- **Total nodes**: 9
- **Total prompts to migrate**: 7
- **Total lines of prompts**: ~1600 lines

### Stages
- **Stage 2 (Personas)**: 2 prompts, ~500 lines
- **Stage 3 (Narratives)**: 1 prompt, ~200 lines
- **Stage 4 (Storyboard)**: 2 prompts, ~400 lines
- **Stage 5 (Screenplay)**: 1 prompt, ~300 lines
- **Stage 6 (Video)**: 1 prompt, ~200 lines

### Variables by Stage
- **Stage 2**: 4 variables
- **Stage 3**: 4 variables
- **Stage 4**: 9 variables
- **Stage 5**: 3 variables
- **Stage 6**: 4 variables

### Files to Modify
- **Create new**: 4 files
- **Modify existing**: 4 files
- **Read only**: 3 files

### Effort Estimate
- **Total effort**: 10-15 days
- **6 phases**: 2-3 days each
- **Team**: 1-2 developers
- **Testing**: 2-3 days
- **Deployment**: 1 day

---

## Related Documents in Repository

### Existing Documentation
- **MIGRATION_PLAN.md**: Overall system migration to AIAdaptor architecture
- **RECIPE_SEEDING_GUIDE.md**: How to seed recipes initially
- **RECIPE_SEEDED.md**: Record of which recipes are seeded

### Source Code Documentation
- **RecipeSeedData.js**: 975 lines of seed recipe definitions
- **RecipeOrchestrator.js**: Recipe execution logic
- **ActionExecutor.js**: Action/node execution logic

---

## Terminology Reference

| Term | Definition | Example |
|------|-----------|---------|
| **Recipe** | Complete workflow with nodes (DAG), edges, execution config | PERSONA_GENERATION_RECIPE |
| **Node** | Single task in recipe (text gen, image gen, etc.) | generate_persona_details |
| **Prompt** | Instructions sent to AI model | "You are an expert Casting Director..." |
| **Prompt Template** | Reusable prompt with variables, stored in DB | pt_stage2_personas_v1 |
| **Variable** | Named placeholder in prompt | {productDescription}, {numberOfPersonas} |
| **inputMapping** | Spec of where node's variables come from | { productDescription: "external_input.productDescription" } |
| **Edge** | Dependency link between nodes | { from: "node1", to: "node2" } |
| **DAG** | Directed Acyclic Graph - ensures no circular dependencies | Persona → Image → Upload |
| **Stage** | Phase of video production | Stage 2 = Personas, Stage 4 = Storyboard |
| **nodeOutputs** | Storage for outputs from completed nodes | { personaDetails: [...], personaImages: [...] } |

---

## Common Questions Answered

**Q: How much prompt content is being migrated?**
A: ~1600 lines of actual prompt text across 7 different prompts

**Q: Where is this all stored currently?**
A: `/api/services/RecipeSeedData.js` (lines 1-975)

**Q: How are variables substituted?**
A: `{variableName}` in prompt replaced with actual value from inputMapping

**Q: Will users notice any changes?**
A: No - migration is transparent, functionality identical

**Q: How long to implement?**
A: 2-3 weeks for complete implementation (10-15 days)

**Q: What's the rollback plan?**
A: Keep old `prompt` field, fallback if `promptTemplateId` missing

**Q: Can we do this gradually?**
A: Yes - dual-mode execution allows gradual rollout

---

## Document Statistics

| Document | Size | Sections | Code Examples | Diagrams |
|----------|------|----------|---------------|----------|
| RECIPE_MIGRATION_SUMMARY.md | 4 KB | 12 | 2 | 2 |
| RECIPE_STRUCTURE_ANALYSIS.md | 22 KB | 11 | 8+ | 0 |
| RECIPE_PROMPTS_QUICK_REFERENCE.md | 9.8 KB | 14 | 0 | 0 |
| RECIPE_DATA_FLOW_DIAGRAMS.md | 15+ KB | 7 | 0 | 7 |
| **TOTAL** | **~51 KB** | **~44** | **10+** | **9+** |

---

## How to Read These Documents

### Complete Understanding (2-3 hours)
1. RECIPE_MIGRATION_SUMMARY.md (20 min)
2. RECIPE_STRUCTURE_ANALYSIS.md (60 min)
3. RECIPE_DATA_FLOW_DIAGRAMS.md (30 min)
4. RECIPE_PROMPTS_QUICK_REFERENCE.md (20 min)

### Implementation Focus (1-2 hours)
1. RECIPE_STRUCTURE_ANALYSIS.md (60 min)
2. Section 7 (Migration Strategy)
3. Section 9 (Implementation Notes)
4. Section 11 (Database Schema)

### Quick Reference (15-30 min)
1. RECIPE_MIGRATION_SUMMARY.md (5 min)
2. RECIPE_PROMPTS_QUICK_REFERENCE.md (10 min)
3. Then jump to specific section as needed

---

## Feedback & Updates

As implementation progresses:
1. Update RECIPE_PROMPTS_QUICK_REFERENCE.md with actual line numbers
2. Add implementation notes to RECIPE_STRUCTURE_ANALYSIS.md
3. Document any deviations to RECIPE_MIGRATION_SUMMARY.md

---

## Document Index by Topic

### Understanding Recipes
- RECIPE_STRUCTURE_ANALYSIS.md → Section 1
- RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 1

### Understanding Prompts
- RECIPE_STRUCTURE_ANALYSIS.md → Section 2
- RECIPE_PROMPTS_QUICK_REFERENCE.md → All sections

### Variable Substitution
- RECIPE_STRUCTURE_ANALYSIS.md → Section 2.2
- RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 3

### Multi-Node Execution
- RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 4
- RECIPE_STRUCTURE_ANALYSIS.md → Section 4

### Migration Strategy
- RECIPE_STRUCTURE_ANALYSIS.md → Section 7
- RECIPE_MIGRATION_SUMMARY.md → Implementation Phases

### New Architecture
- RECIPE_DATA_FLOW_DIAGRAMS.md → Diagram 5 & 6
- RECIPE_STRUCTURE_ANALYSIS.md → Section 6

### Implementation Details
- RECIPE_STRUCTURE_ANALYSIS.md → Section 9
- RECIPE_STRUCTURE_ANALYSIS.md → Section 11

---

## Final Notes

This documentation was generated through comprehensive analysis of:
- 5 seed recipes (975 lines of code)
- Recipe execution logic (200+ lines)
- ActionExecutor logic (complex branching)
- All related services and endpoints

All information is current as of November 12, 2025.

For questions or clarifications, refer to the source code directly:
- `/api/services/RecipeSeedData.js` - Recipes
- `/api/services/RecipeOrchestrator.js` - Execution
- `/api/services/ActionExecutor.js` - Actions
- `/api/services/RecipeManager.js` - Management
- `/api/recipes.js` - Endpoints

