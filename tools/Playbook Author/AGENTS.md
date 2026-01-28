# Playbook Author

Create Playbooks using the WISER Method for agentic execution with human oversight.

**Key distinction:** Playbook Author creates Playbooks (living documents that evolve with the work). Play Author creates Plays (repeatable patterns for specific outcomes). If the user needs a task list without learning capture or decision tracking, they don't need Playbook Author.

## Activation

Only activate when the user explicitly requests a plan:
- "Create a plan for..."
- "Make a plan to..."
- "Plan out..."
- "I need a plan for..."
- "Create a playbook for..."
- "Make a playbook to..."

When invoked, follow the methodology below.

## The WISER Framework for Planning

Every Playbook follows the W-I-S-E-R structure:

| Canon | Purpose | Playbook Output |
|-------|---------|-----------------|
| **Witness** | Ground ourselves in what exists and what we're building | Objective, Scope, Current State, Deliverable |
| **Interrogate** | Surface unknowns and challenge assumptions | Research needed, assumptions to validate |
| **Solve** | Build the riskiest piece first to prove feasibility | Highest-risk task, validation criteria |
| **Expand** | Build out the full task to meet the objective | Remaining tasks organized by dependency |
| **Refine** | User stress-tests; AI iterates | Feedback loop, iteration tasks |

**Preconditions** come before W-I-S-E-R. These are prerequisites that must be true before the work begins. Examples: archive before refactoring, ensure API access before integration, backup before migration.

**Checkpoints** appear at the end of each Canon. A Checkpoint is not complete until the agent can answer: "What evidence do I have that this Canon is done?" If the answer is vague or missing, the Canon isn't done.

| Canon | Checkpoint Evidence |
|-------|---------------------|
| Witness | Objective is specific and measurable; scope boundaries are explicit; current state is documented |
| Interrogate | Key unknowns are listed; assumptions are stated; riskiest piece is identified; existing tools/Plays reviewed |
| Solve | Riskiest piece was built; it works (or we learned why it doesn't and pivoted) |
| Expand | All tasks complete; milestones verified |
| Refine | User has tested; feedback incorporated; success criteria met |

## Playbook Storage

**Choose a logical location based on context:**
- If the Playbook is for a specific project, store it in that project's directory (e.g., `/project/plans/` or `/project/docs/`)
- If the Playbook is for workspace-level work, store it in the relevant workspace
- If no logical location exists, default to `/memory/plans/`

**Confirm with an assumptive suggestion:**
> "I'll save this Playbook to `[logical-location]`. Want a different location?"

**Naming convention:** `YYYY-MM-DD-[descriptive-slug].plan.md`

## Collaboration Style

After completing Witness (objective, scope, current state established), ask the user:

> "Would you like this Playbook to collaborate WITH you through execution (pause at checkpoints for your input), or run autonomously (execute fully, you review at the end)?"

### Collaborative Mode

The agent works interactively with the human:
- Pauses at every Checkpoint for human confirmation before proceeding
- Discusses decisions as they arise
- Incorporates human feedback in real-time
- Best for: uncertain territory, learning together, high-stakes decisions

### Autonomous Mode

The agent executes the full Playbook independently:
- Runs through all Canons without pausing
- Logs all decisions with rationale and alternatives
- Records learnings as work progresses
- Human reviews the completed work and Decision Log at the end
- Best for: well-understood work, trusted patterns, time-sensitive execution

**Default:** Collaborative (safer; human stays in the loop)

### Mode Signals

**Collaborative signals:**
- User wants to learn or understand the process
- Approach isn't certain
- High-stakes or irreversible changes
- User says "work with me" or "let's figure this out"

**Autonomous signals:**
- User trusts the agent to execute
- Pattern is well-established
- User is busy and wants results
- User says "just do it" or "run this"

## Context Window Resilience

**All Playbooks may be executed across multiple context windows.** A new agent session might pick up the Playbook mid-execution with no memory of prior work. The Playbook must be self-contained: everything needed to resume is in the file.

**Required sections for every Playbook:**

- **Context:** Why this work matters. Problem being solved. Background a new context needs to understand the work.
- **Resume Instructions:** Explicit steps for a new context to get up to speed and continue.
- **Progress:** Last worked date, current Canon, next action.

**Before ending any session:**
1. Update all task checkboxes to reflect current state
2. Update Progress section with current Canon and specific next action
3. Update Decision Log if any decisions were made
4. Update Learnings if anything was validated/invalidated
5. Update Risk status if any risks changed

**When resuming in a new context:**
1. Read the entire Playbook first (it contains everything needed)
2. Follow Resume Instructions explicitly
3. Verify Progress section matches actual file state
4. Continue from the documented next action

## Live Progress Tracking

**During execution, use `todo_write` to show progress in Cursor's UI.**

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

## Task Decomposition

**Tasks must be atomic, verifiable, and properly scoped.** A common failure mode is writing vague, high-level tasks like "Build the feature" or "Fix the problem" instead of breaking work into executable steps.

**Every task must pass these tests:**

1. **Atomic:** One action, not multiple actions joined by "and" or "then"
   - Bad: "Create the endpoint and add validation"
   - Good: "Create POST /users endpoint" then "Add email format validation to POST /users"

2. **Verifiable:** Clear done state that can be checked
   - Bad: "Improve performance"
   - Good: "Reduce API response time to under 200ms"

3. **Right-sized:** Completable in a reasonable work unit (not days of work in one task)
   - Bad: "Implement user authentication system"
   - Good: Break into: "Add password hashing utility" → "Create login endpoint" → "Add session management" → "Create logout endpoint" → "Add auth middleware"

4. **Independent where possible:** Minimize dependencies between tasks within a milestone
   - If Task B requires Task A, they should be in sequence or Task A should be in an earlier milestone

**When decomposing complex work:**

1. Identify the major components or phases
2. For each component, list the concrete steps to complete it
3. For each step, verify it passes the four tests above
4. If a step fails a test, break it down further

**Warning signs:** Vague verbs ("Handle," "Address"), unclear done state, tasks over an hour, milestones with only 1-2 tasks.

## Quality Checks

Before delivering a Playbook:
- [ ] WISER Playbook acknowledgement present (Method field)
- [ ] Collaboration style confirmed with user
- [ ] Preconditions identified (or explicitly "None")
- [ ] Witness section complete (objective, scope, current state, deliverable)
- [ ] Risks section populated with initial risks
- [ ] Every task passes decomposition tests (atomic, verifiable, right-sized)
- [ ] No vague tasks like "implement the feature" or "fix the problem"
- [ ] Solve section identifies the riskiest piece
- [ ] Success criteria are evaluable
- [ ] File saved with proper naming convention
- [ ] Context, Resume Instructions, and Progress sections included (required for all Playbooks)
- [ ] Key files/artifacts listed so new context knows what to read

## Playbook Structure

```markdown
# [Playbook Title]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Collaboration:** Collaborative | Autonomous
**Status:** Draft | Active (Canon) | Paused | Complete
**Method:** WISER Playbook

## Context

[Why this work matters. Problem being solved. Background a new context window needs to understand the work.]

**Key files:** [List files a new context should read to get up to speed, e.g., source files being modified, reference docs, prior Playbooks]

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

**Deliverable:** [What this Playbook produces: markdown file, web page, tool, feature, etc.]

**Checkpoint:** Shared understanding established.

---

## Risks

*What could derail this work? Track risk status throughout execution.*

| Risk | Status | Mitigation | Notes |
|------|--------|------------|-------|
| [What could go wrong] | Active / Mitigated / Realized / Retired | [How we address it] | [Updates as work progresses] |

**Risk status definitions:**
- **Active:** Risk is present and being monitored
- **Mitigated:** Actions taken have reduced the risk
- **Realized:** Risk occurred; document impact and response
- **Retired:** Risk no longer applies (scope changed, work completed, etc.)

---

## Interrogate

*Surface unknowns and challenge assumptions before committing.*

[Generate questions specific to this Playbook's domain. Consider: What could we be wrong about? What do we not know yet? What assumptions are we making? What external factors could affect this?]

- [ ] [Question or research item]
- [ ] [Assumption to validate]

**Reuse check:** Can existing tools, connectors, or Plays handle parts of this work?
- [ ] Review `/cofounder/tools/` and `/cofounder/connectors/` for relevant capabilities
- [ ] Check `/memory/my tools/` and `/memory/my connectors/` for custom solutions
- [ ] Note which existing resources to leverage in the Expand phase

**Checkpoint:** Unknowns surfaced. Riskiest piece identified. Existing tools/Plays reviewed.

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

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|-------------------------|
| YYYY-MM-DD | [What was decided] | [Why] | [Other options evaluated] |

## Learnings

| Date | Learning | Impact |
|------|----------|--------|
| YYYY-MM-DD | [What we learned] | [Assumption validated/invalidated, approach changed] |

## Resume Instructions

When a new context window picks up this Playbook:
1. Read this entire Playbook (Context, Witness, Risks, Decision Log, Learnings, Progress)
2. Read the Key files listed in Context
3. Check Progress for current Canon and next action
4. Verify task checkboxes match actual state (correct if drifted)
5. Continue from the documented next action

## Progress

**Last worked:** YYYY-MM-DD
**Current Canon:** [Witness | Interrogate | Solve | Expand | Refine]
**Next action:** [Specific next step]

---

## Success Criteria

- [ ] [How to verify completion]
```

## Execution Behavior

Playbooks are living documents. The agent self-updates during execution.

**During execution, the agent must:**
- Update task checkboxes as work completes
- Update Status when transitioning between Canons
- Update Risk status as risks evolve (mitigated, realized, retired)
- Log decisions immediately with rationale and alternatives considered
- Record learnings when experiments conclude or assumptions are tested
- Update Progress section before any Checkpoint
- Update Last Updated date after any change

**In Collaborative mode:**
- Wait for human confirmation at Checkpoints before proceeding
- Discuss significant decisions before logging them
- Surface new risks as they're identified

**In Autonomous mode:**
- Proceed through Checkpoints without pausing
- Log all decisions for human review
- Complete the full Playbook, then present results

**Autonomous mode guardrails (stop and notify human if):**
- A risk realizes with significant impact
- A task fails twice
- Scope change is needed
- Solve proves the approach won't work
- New high-severity risk emerges
- Work would take significantly longer than expected

**If scope changes:**
- Log the change in Decision Log with rationale
- Update Scope section
- Update Risks section if new risks emerged or existing risks changed
- Re-evaluate Solve: does riskiest piece change?

**When things go wrong:**

*Task failure:*
1. Log the failure in Learnings (what happened, what we learned)
2. Attempt one recovery if a clear fix exists
3. If recovery fails: In Collaborative mode, stop and discuss. In Autonomous mode, document the blocker and stop.

*Risk realized:*
1. Update Risk status to "Realized"
2. Document impact in the Notes column
3. Log response in Decision Log
4. In Collaborative mode: stop and discuss next steps
5. In Autonomous mode: if impact is contained, continue with mitigation; if impact blocks progress, stop and notify

*Solve proves approach won't work:*
1. Log the finding in Learnings
2. Document what we tried and why it failed
3. Stop execution (both modes). This requires human decision on whether to pivot, descope, or abandon.

**Version tracking:**
- Before major direction changes, archive the current Playbook to `zArchive/`
- Naming: `YY-MM-DD V[N] - [playbook-name].plan.md`
- Old versions matter for after-action reviews

## Handoffs

**From other tools:** Problem Solver, Researcher, or Content Author may recommend creating a Playbook for complex work.

**To Play Author:** If a pattern emerges that should become repeatable, extract it as a Play. Plays are stable; Playbooks evolve.

## Limitations

- Playbooks require user judgment; they don't replace thinking
- Playbook overhead is justified for complex work; for simple tasks, just execute without a Playbook
- Playbooks in `/memory/` persist but aren't version-controlled
- Stale Playbooks need verification before resuming
- Autonomous mode requires trust; use Collaborative for uncertain territory
