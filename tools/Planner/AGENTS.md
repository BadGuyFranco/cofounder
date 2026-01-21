# Planner

Create persistent execution plans using the W-I-S-E-R framework for user+AI collaborative work.

## Activation

Only activate when the user explicitly requests a plan:
- "Create a plan for..."
- "Make a plan to..."
- "Plan out..."
- "I need a plan for..."

When invoked, follow the methodology below.

## The WISER Framework for Planning

Every plan follows the W-I-S-E-R structure, making the planning methodology visible to the user:

| Canon | Purpose | Plan Output |
|-------|---------|-------------|
| **Witness** | Ground ourselves in what exists and what we're building | Objective, Scope, Current State, Deliverable |
| **Interrogate** | Surface unknowns and challenge assumptions | Research needed, assumptions to validate |
| **Solve** | Build the riskiest piece first to prove feasibility | Highest-risk task, validation criteria |
| **Expand** | Build out the full task to meet the objective | Remaining tasks organized by dependency |
| **Refine** | User stress-tests; AI iterates | Feedback loop, iteration tasks |

**Preconditions** come before W-I-S-E-R. These are prerequisites that must be true before the work begins. Examples: archive before refactoring, ensure API access before integration, backup before migration.

## Plan Storage

**Choose a logical location based on context:**
- If the plan is for a specific project, store it in that project's directory (e.g., `/project/plans/` or `/project/docs/`)
- If the plan is for workspace-level work, store it in the relevant workspace
- If no logical location exists, default to `/memory/plans/`

**Confirm with an assumptive suggestion:**
> "I'll save this plan to `[logical-location]`. Want a different location?"

**Naming convention:** `YYYY-MM-DD-[descriptive-slug].plan.md`

## Mode Selection

**For technical projects:** Investigate the codebase before generating a plan.

If the user's request is vague, ask clarifying questions. Don't plan from incomplete information.

**Select mode after completing Witness.** Once objective, scope, and current state are established, use these questions:

### Decision Questions

**Question 1: Are there unknowns to surface or risks to prove?**
- **No** → Sprint (task is well-understood, just execute)
- **Yes** → Continue to Question 2

**Question 2: Will this finish in one chat session?**
- **Yes** → Session (full WISER, checkpoints between Canons)
- **No** → Campaign (full WISER + resume capability)

### Signals to Look For

**Sprint signals:**
- User can describe all steps upfront
- No research or exploration needed
- No architectural decisions to make

**Session signals:**
- Approach isn't certain
- Need to investigate before committing
- Has decision points requiring user input

**Campaign signals:**
- User mentions "over time" or "multiple sessions"
- Large scope (multiple features/systems)
- Work has been interrupted before and lost context

**Default:** Session (most common case)

## Live Progress Tracking

**During execution, use `todo_write` to show progress in Cursor's UI.**

**For Sprint mode:**
- Create todos for major task groups
- Keep it simple; Sprint is lightweight

**For Session and Campaign modes:**
- Create one todo per Canon as you enter it
- Mark `in_progress` when working on a Canon
- Mark `completed` when moving to the next

Example:
```
Witness: Establish objective and scope     [completed]
Interrogate: Surface unknowns              [completed]
Solve: Build riskiest piece                [in_progress]
Expand: Build remaining tasks              [pending]
Refine: User testing and iteration         [pending]
```

## Quality Checks

Before delivering a plan:
- [ ] Preconditions identified (or explicitly "None")
- [ ] Witness section complete (objective, scope, current state)
- [ ] Mode matches task complexity
- [ ] Every task is actionable (starts with a verb)
- [ ] Solve section identifies the riskiest piece
- [ ] Success criteria are evaluable
- [ ] File saved with proper naming convention
- [ ] For Campaign mode: resume instructions included

## Sprint Mode

For tasks you trust to execute fully after one review. Uses compressed WISER.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Mode:** Sprint
**Status:** Draft | Approved | Complete

## Preconditions

[Prerequisites that must be met, or "None"]

## Witness

**Objective:** [One sentence: what does done look like?]

**Scope:**
- In: [What's included]
- Out: [What's excluded]

**Current State:** [Brief snapshot of starting point]

**Deliverable:** [What this plan produces: markdown file, web page, tool, feature, etc.]

## Tasks

1. [ ] [Actionable task - highest risk first]
2. [ ] [Actionable task]
3. [ ] [Actionable task]

## Success Criteria

- [How to verify completion]
```

### Process

1. Complete Witness; identify highest-risk task
2. Present plan for review
3. On approval, execute all tasks and mark complete

## Session Mode

For work that fits one sitting but benefits from structured collaboration. Uses full W-I-S-E-R.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Mode:** Session
**Status:** Draft | In Progress (Canon) | Complete

## Preconditions

[Prerequisites that must be met, or "None"]

---

## Witness

*Ground ourselves in what exists and what we're trying to accomplish.*

**Objective:** [What we're accomplishing and why]

**Scope:**
- In: [What's included]
- Out: [What's explicitly excluded]

**Current State:** [What exists now; starting point]

**Deliverable:** [What this plan produces: markdown file, web page, tool, feature, etc.]

**Checkpoint:** Do we have shared understanding of what exists and what we're building?

---

## Interrogate

*Surface unknowns and challenge assumptions before committing.*

- [ ] [Question or research item]
- [ ] [Assumption to validate]
- [ ] [Unknown to surface]

**Checkpoint:** Have we surfaced the unknowns? Is riskiest piece identified?

---

## Solve

*Build the riskiest piece first. Prove it works before expanding.*

**Riskiest piece:** [What carries the most uncertainty or risk?]

- [ ] [Task to prove feasibility]
- [ ] [Validation step]

**Checkpoint:** Does the solution work? Confirmed before expanding.

---

## Expand

*Build out the full task to meet the objective.*

- [ ] [Remaining task]
- [ ] [Remaining task]
- [ ] [Remaining task]

**Checkpoint:** All tasks complete.

---

## Refine

*User stress-tests the solution. AI iterates based on feedback.*

- [ ] [User testing step]
- [ ] [Iteration based on feedback]

**Checkpoint:** Solution works well in practice.

---

## Success Criteria

- [ ] [How to verify completion]
```

### Process

1. Complete Witness; confirm shared understanding
2. Work through Interrogate → Solve → Expand → Refine, checkpointing between each
3. Mark complete

## Campaign Mode

For multi-day efforts spanning multiple chat sessions. Uses full W-I-S-E-R with resume support.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Mode:** Campaign
**Status:** Draft | Active (Canon) | Paused | Complete

## Context

[Why this work matters. Problem being solved. Background a new session needs.]

## Preconditions

[Prerequisites that must be met, or "None"]

---

## Witness

*Ground ourselves in what exists and what we're trying to accomplish.*

**Objective:** [End state we're working toward]

**Scope:**
- In: [What's included]
- Out: [What's explicitly excluded]
- Dependencies: [What must exist or happen first]

**Current State:** [Snapshot of starting point]

**Deliverable:** [What this plan produces: markdown file, web page, tool, feature, etc.]

**Checkpoint:** Shared understanding established.

---

## Interrogate

*Surface unknowns and challenge assumptions before committing.*

- [ ] [Question or research item]
- [ ] [Assumption to validate]

**Checkpoint:** Unknowns surfaced. Riskiest piece identified.

---

## Solve

*Build the riskiest piece first. Prove it works before expanding.*

**Riskiest piece:** [What carries the most uncertainty?]

- [ ] [Task to prove feasibility]
- [ ] [Validation step]

**Checkpoint:** Solution proven viable.

---

## Expand

*Build out the full task to meet the objective.*

### Milestone 1: [Name]
- [ ] [Task]
- [ ] [Task]

### Milestone 2: [Name]
- [ ] [Task]
- [ ] [Task]

**Checkpoint:** All milestones complete.

---

## Refine

*User stress-tests the solution. AI iterates based on feedback.*

- [ ] [User testing step]
- [ ] [Iteration task]

**Checkpoint:** Solution works well in practice.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| YYYY-MM-DD | [What was decided] | [Why] |

## Resume Instructions

When starting a new session:
1. Read Context and Current State
2. Check Decision Log for recent choices
3. Find current Canon (check Status)
4. Continue from first incomplete task in that Canon

## Progress

**Last worked:** YYYY-MM-DD
**Current Canon:** [Witness | Interrogate | Solve | Expand | Refine]
**Next action:** [Specific next step]

---

## Success Criteria

- [ ] [How to verify completion]
```

### Process

1. Complete Witness; confirm shared understanding
2. Work through Interrogate → Solve → Expand → Refine, checkpointing between each
3. **Before ending any session:** Update Progress section
4. **On resume:** Follow Resume Instructions
5. Mark complete when Success Criteria met

## Updating Plans

Plans are living documents.

**After work on any Canon:**
- Update task checkboxes
- Update Status to current Canon
- Update Progress section (Campaign)
- Add to Decision Log if choices were made (Campaign)
- Update Last Updated date (Campaign)

**If scope changes:**
- Note the change in Decision Log (Campaign) or as a comment
- Update Scope section
- Re-evaluate Solve: does riskiest piece change?

## Handoffs

**To execute a plan:** Load the plan file, follow the process for its mode.

**From other tools:**
- Problem Solver may recommend creating a Campaign plan for complex solutions
- Researcher may identify work requiring a plan
- Content Author may need a Session plan for large content projects

## Limitations

- Plans require user judgment; they don't replace thinking
- Campaign mode adds overhead; don't use for simple tasks
- Plans in `/memory/` persist but aren't version-controlled
- Stale Campaign plans need verification before resuming
