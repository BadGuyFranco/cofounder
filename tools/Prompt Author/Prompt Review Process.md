# Prompt Review Process

**When to load:** Reviewing or auditing existing prompts. Skip for new prompt writing.

**Prerequisite:** AGENTS.md must be loaded. This process references its criteria.

## Workflow

```
1. Triage      →  Salvage or rewrite?
2. Audit       →  Check against AGENTS.md criteria
3. Diagnose    →  Locate problems, determine fixes
4. Present     →  One observation at a time, get user choice
5. Verify      →  Did changes improve the prompt?
```

## Step 1: Triage

**Salvageable:** Has identifiable objective, core structure exists, issues are localized.

**Requires rewrite:** No clear objective, fundamental incoherence, or missing XML boundaries for significant user content.

If rewrite needed: Stop. Rebuild using AGENTS.md Writing Process.

## Step 2: Audit

Check the prompt against AGENTS.md:

1. **Elegance Principle** - Check all criteria in AGENTS.md (threshold test, communication insight, structural clarity)
2. **Objective** - Is it evaluable? Can you determine success/failure from output?
3. **XML Boundaries** - Is all user content wrapped?
4. **Failure Modes** - Scan AGENTS.md table. Mark which are present.

**Priority order:** Objective → Boundaries → Failure modes → Elegance

## Step 3: Diagnose

For each issue found:

| Question | Answer |
|----------|--------|
| Where? | Line/section where problem occurs |
| What? | Specific cause |
| Fix? | Minimal change that resolves it |

## Step 4: Present

### Format

State total: "I've identified [X] observations."

For each:

```
**Observation [N] of [X]: [Title]**

Issue: [What's wrong]

Options:
- A: No change
- B: Minimal fix - [description]
- C: Moderate fix - [description]

Recommendation: [Choice] because [reasoning]

Which option?
```

Implement chosen option. Move to next.

### Gates

After 5 changes: "Continue, re-assess, or stop?"

## Step 5: Verify

After all observations:

- Did changes fix problems without creating new ones?
- Is prompt the right length? (shorter if bloated, longer if incomplete)
- Does it pass AGENTS.md Quality Checks?

If issues found: Present as new observations, fix, re-verify.

**Final offer:** "Run review again with fresh eyes?"

---

# Library-Level Review

For reviewing multiple coordinated prompts as a system.

## When to Use

Only if prompts coordinate (handoffs, shared workflows) and inconsistencies would cause problems.

## Process

1. **Individual first** - Complete standard review for each prompt.

2. **Cross-prompt checks:**
   - Terms consistent across prompts?
   - Handoffs clear?
   - Output formats compatible with downstream inputs?
   - Gaps or overlaps?
   - XML conventions consistent?

3. **Present** - Use standard format. Prioritize by system coherence impact.
