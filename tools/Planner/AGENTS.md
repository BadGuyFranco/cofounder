# Planner

Create persistent execution plans that survive context switches and guide work to completion.

## Activation

Only activate when the user explicitly requests a plan:
- "Create a plan for..."
- "Make a plan to..."
- "Plan out..."
- "I need a plan for..."

When invoked, follow the methodology below.

## Objective

Produce plans that are actionable, appropriately detailed for their scope, and resumable in new contexts. Every plan has clear success criteria and a path to completion.

## Impact Measurement

Planner outputs should:
- Be executable without additional clarification
- Match complexity to the work (not over-plan simple tasks)
- Enable resumption in new context windows without loss of direction
- Track progress visibly

## Live Progress Tracking

**During plan execution, use `todo_write` to show progress in Cursor's UI.**

When executing a plan:
1. Create todos for major steps (phases for Session, milestones for Campaign)
2. Mark todos `in_progress` as you work on them
3. Mark todos `completed` when done
4. Keep only one todo `in_progress` at a time

This gives the user a visible progress indicator without needing to check the plan file.

**Example for Session mode:**
```
Phase 1: Setup infrastructure     [completed]
Phase 2: Implement core logic     [in_progress]
Phase 3: Add tests and docs       [pending]
```

**Keep todos high-level.** Individual tasks within a phase don't need separate todos; the plan file tracks those.

## Quality Checks

Before delivering a plan:
- [ ] Mode matches task complexity
- [ ] Every step is actionable (starts with a verb)
- [ ] Success criteria are evaluable
- [ ] File saved with proper naming convention
- [ ] For Campaign mode: resume instructions included

## XML Boundaries

<task>
{What the user wants to accomplish}
</task>

<constraints>
{Timeline, resources, dependencies, blockers}
</constraints>

<current_state>
{What exists now; relevant for Campaign mode}
</current_state>

## Before Planning

Gather information before selecting a mode or generating a plan:

1. **Task:** What specifically needs to be accomplished? What does done look like?
2. **Constraints:** Timeline? Resources available? Dependencies or blockers?
3. **Current state:** What exists now? (Essential for Campaign; helpful for Session)

**For technical projects:** Investigate the codebase before generating a plan. Identify relevant files, dependencies, and existing patterns. Plans based on actual code structure are more actionable than plans based on descriptions alone.

If the user's request is vague, ask clarifying questions. Don't generate a plan from incomplete information.

## Plan Storage

**Default location:** `/memory/plans/`

**Before creating a plan, ask:**
> "I'll save this plan to `/memory/plans/`. Want a different location?"

**Naming convention:** `YYYY-MM-DD-[descriptive-slug].plan.md`

Examples:
- `2026-01-09-api-migration.plan.md`
- `2026-01-09-homepage-redesign.plan.md`

## Mode Selection

Three modes based on execution scope:

| Mode | Use When | Execution |
|------|----------|-----------|
| **Sprint** | Task completes in one go after review | User reviews, then full execution |
| **Session** | Work fits one sitting but needs collaboration | Execute in phases, checkpoint between |
| **Campaign** | Multi-day/multi-session effort | Comprehensive context for resumption |

**If unclear, ask:**
> "This could be a [Sprint/Session] depending on [factor]. Which fits better?"

**Default:** Session (most common case)

## Sprint Mode

For tasks you trust to execute fully after one review.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Mode:** Sprint
**Status:** Draft | Approved | Complete

## Objective
[One sentence: what does done look like?]

## Tasks
1. [ ] [Actionable step]
2. [ ] [Actionable step]
3. [ ] [Actionable step]

## Execution
Execute all tasks after user approves the plan.

## Success Criteria
- [How to verify completion]
```

### Process

1. Gather task requirements
2. Generate plan
3. Present for review
4. On approval, execute all tasks
5. Mark complete

## Session Mode

For work that fits one sitting but benefits from checkpoints.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Mode:** Session
**Status:** Draft | In Progress | Complete

## Objective
[What we're accomplishing and why]

## Scope
**In:** [What's included]
**Out:** [What's explicitly excluded]

## Phase 1: [Name]
- [ ] [Task]
- [ ] [Task]

**Checkpoint:** [What to verify before proceeding]

## Phase 2: [Name]
- [ ] [Task]
- [ ] [Task]

**Checkpoint:** [What to verify before proceeding]

## Phase 3: [Name]
- [ ] [Task]
- [ ] [Task]

## Execution
Execute phases sequentially. After each phase, summarize what was completed and confirm before proceeding.

## Success Criteria
- [How to verify completion]
```

### Process

1. Gather requirements; clarify scope
2. Generate phased plan
3. Present for review
4. Execute Phase 1
5. Checkpoint: confirm with user
6. Continue through phases
7. Mark complete

## Campaign Mode

For multi-day efforts spanning multiple context windows.

### Structure

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Mode:** Campaign
**Status:** Draft | Active | Paused | Complete

## Context
[Why this work matters. Problem being solved. Background a new session needs.]

## Current State
[What exists now. Snapshot of starting point.]

## Objective
[End state we're working toward]

## Scope
**In:** [What's included]
**Out:** [What's explicitly excluded]
**Dependencies:** [What must exist or happen first]

## Milestones

### Milestone 1: [Name]
**Target:** [Date or condition]
**Status:** Not Started | In Progress | Complete

Tasks:
- [ ] [Task]
- [ ] [Task]

**Done when:** [Specific completion criteria]

### Milestone 2: [Name]
...

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| YYYY-MM-DD | [What was decided] | [Why] |

## Resume Instructions
When starting a new session:
1. Read Context and Current State
2. Check Decision Log for recent choices
3. Find current milestone; verify status
4. Continue from first incomplete task

## Progress
**Last worked:** YYYY-MM-DD
**Current milestone:** [Name]
**Next action:** [Specific next step]
```

### Process

1. Gather comprehensive requirements
2. Map milestones and dependencies
3. Generate plan with full context
4. Present for review
5. Execute current milestone
6. Update Progress section before ending session
7. On resume: follow Resume Instructions
8. Repeat until complete

## Updating Plans

Plans are living documents.

**After each work session:**
- Update task checkboxes
- Update Progress section (Campaign)
- Add to Decision Log if choices were made (Campaign)
- Update Last Updated date (Campaign)

**If scope changes:**
- Note the change in Decision Log
- Update Scope section
- Adjust milestones/phases as needed

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

