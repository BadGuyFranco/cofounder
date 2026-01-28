# Play Review Process

**When to load:** Reviewing or auditing existing Plays. Skip for new Play writing.

**Prerequisite:** AGENTS.md must be loaded. This process references its criteria.

## Workflow

```
1. Triage      →  Salvage or rewrite?
2. Stress Test →  Run realistic scenario, find where it breaks
3. Audit       →  Check against AGENTS.md criteria
4. Diagnose    →  Locate problems, describe failure scenarios
5. Present     →  One observation at a time, get user choice
6. Verify      →  Did changes improve the Play?
```

## Step 1: Triage

**First:** Identify artifact type (standalone prompt, AGENTS.md, or library component). Review criteria differ.

**Salvageable:** Has identifiable objective, core structure exists, issues are localized.

**Requires rewrite:** No clear objective, fundamental incoherence, or missing XML boundaries for significant user content.

If rewrite needed: Stop. Rebuild using AGENTS.md Writing Process.

## Step 2: Stress Test

Before auditing, run one realistic request through the Play end-to-end. Trace exactly what happens:
- What gets loaded?
- What guidance does the Play provide?
- Where is guidance unclear, conflicting, or missing?
- What could go wrong?

**Required output:** Describe at least one scenario where the current Play could produce wrong or inconsistent output.

If you can't identify any failure points, either the Play is excellent or you haven't tried hard enough. Try a harder scenario.

**This step prevents lazy reviewing.** Cosmetic issues (whitespace, minor redundancy) are easy to spot. Effectiveness issues require tracing through actual usage.

## Step 3: Audit

Check the Play against AGENTS.md:

1. **Elegance Principle** - Threshold test, communication insight, structural clarity, durability
2. **Position Principle** - Critical instructions at start? Format/success at end? (Skip for short Plays)
3. **Objective** - Is it evaluable? Can you determine success/failure from output?
4. **XML Boundaries** - Is all user content wrapped?
5. **Failure Modes** - Scan AGENTS.md table. Mark which are present.

**Priority order:** Objective → Boundaries → Failure modes → Position → Elegance

## Step 4: Diagnose

For each issue found:

| Question | Answer |
|----------|--------|
| Where? | Line/section where problem occurs |
| What? | Specific cause |
| Failure scenario | Realistic situation where this causes wrong output |
| Fix? | Minimal change that resolves it |

**Critical:** If you cannot describe a failure scenario, the issue is cosmetic. Deprioritize it or drop it entirely. Formatting issues without behavioral impact are low priority.

## Step 5: Present

### Format

State total: "I've identified [X] observations."

For each:

```
**Observation [N] of [X]: [Title]**

Failure scenario: [Realistic situation where this causes wrong output]

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

## Step 6: Verify

After all observations:

- Did changes fix problems without creating new ones?
- Is the Play the right length? (shorter if bloated, longer if incomplete)
- Does it pass AGENTS.md Quality Checks?
- Re-run stress test: Does the failure scenario now produce correct output?

If issues found: Present as new observations, fix, re-verify.

**Final offer:** "Run review again with fresh eyes?"

---

# Library-Level Review

For reviewing multiple coordinated Plays as a system.

## When to Use

Only if Plays coordinate (handoffs, shared workflows) and inconsistencies would cause problems.

## Process

1. **Stress test the system** - Run a realistic multi-step request through the full Play chain. Trace handoffs. Note where guidance is unclear or missing.

2. **Individual review** - Complete standard review for each Play, informed by stress test findings.

3. **Cross-Play checks:**
   - Terms consistent across Plays?
   - Handoffs clear?
   - Output formats compatible with downstream inputs?
   - Gaps or overlaps?
   - XML conventions consistent?

4. **Present** - Use standard format. Prioritize by system coherence impact.
