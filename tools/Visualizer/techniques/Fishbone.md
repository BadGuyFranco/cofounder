# Fishbone Diagram

Visualizes causes contributing to an effect, organizing factors by category to support systematic root cause analysis.

## Cognitive Purpose

Activates systematic causal reasoning. Viewers understand that problems have multiple contributing causes organized by category, preventing single-cause thinking and supporting comprehensive analysis.

## When to Use

**Structure signals:**
- A problem or effect needs explanation
- Multiple factors contribute
- Causes can be categorized
- Root cause analysis is the goal

**Best for:**
- Quality improvement analysis
- Troubleshooting complex failures
- Identifying contributing factors to problems
- Team brainstorming of causes
- Systematic problem decomposition

**Not for:**
- Solutions or actions (this shows causes, not fixes)
- Sequential processes (use Flow)
- Relationships without a central effect (use Concept Map)
- Hierarchical classification (use Hierarchy)

## Layout Principles

**The fishbone structure:**
- **Head (right):** The effect/problem being analyzed
- **Spine:** Horizontal line pointing to the head
- **Major bones:** Diagonal lines for cause categories (typically 4-6)
- **Minor bones:** Specific causes branching from major bones
- **Sub-causes:** Even smaller branches for root causes

**Standard cause categories (6 Ms):**
1. **Man/People:** Human factors, training, skills
2. **Machine:** Equipment, technology, tools
3. **Method:** Processes, procedures, policies
4. **Material:** Raw materials, inputs, resources
5. **Measurement:** Data, metrics, monitoring
6. **Environment:** Physical conditions, culture, external factors

**Alternative categories (adapt to context):**
- For services: Policies, Procedures, People, Place
- For marketing: Product, Price, Place, Promotion
- Custom categories based on domain

**Visual layout:**
- Bones alternate above and below spine
- Equal angle for major bones
- Clear separation between categories
- Head is prominent and distinct

## Required Labels

**Head:** Clear statement of the effect/problem

**Major bones:** Category names

**Minor bones:** Specific causes within each category

**All labels should be:**
- Concise and specific
- Causes, not symptoms
- Actionable to investigate

## Complexity Management

**Threshold:** 4-6 major categories, 3-5 causes per category

**Above threshold:**
- Group related causes
- Use progressive disclosure (expand/collapse minor bones)
- Consider splitting into focused sub-diagrams

**Depth:**
- Major bones (categories)
- Minor bones (specific causes)
- Sub-bones (root causes) — expand on click

## Interactivity (HTML)

**Required:**
- Hover on cause: Show details, evidence, or investigation notes
- Click category: Expand/collapse minor causes
- Head always visible and prominent

**Recommended:**
- Color-code by category
- Mark investigated vs. uninvestigated causes
- Link causes to evidence or data
- Allow adding/editing causes (for live analysis)

## Common Mistakes

**Listing symptoms, not causes:** "Sales are down" is a symptom. "Inadequate sales training" is a cause.

**Single major category:** If all causes fall under one category, either the categories are wrong or the problem is simpler than assumed.

**No root cause depth:** Stopping at surface causes. Use "5 Whys" to dig deeper on each cause.

**Causes without evidence:** Every cause should be verifiable. Mark which are confirmed vs. hypothesized.

**Using for solutions:** Fishbone shows WHY a problem exists, not how to fix it. Solutions come after analysis.

## Example Structure

```
                                    ┌───────────────┐
    Method              Machine     │               │
       \                   \        │   PROBLEM/    │
        \                   \       │   EFFECT      │
─────────●───────────────────●──────│               │
        /                   /       │               │
       /                   /        └───────────────┘
    People              Material    
                                    
    Method:
    ├── Inadequate process
    ├── No standard procedure
    └── Skipped steps
    
    Machine:
    ├── Equipment outdated
    └── Poor maintenance
    
    People:
    ├── Insufficient training
    ├── High turnover
    └── Communication gaps
    
    Material:
    ├── Low quality inputs
    └── Supply inconsistency
```

Visual encoding:
- Head: Prominent, contains problem statement
- Major bones: Angled, labeled with category
- Minor bones: Horizontal, specific causes
- Color: By category for quick scanning
- Interactivity: Expand for details, collapse for overview

