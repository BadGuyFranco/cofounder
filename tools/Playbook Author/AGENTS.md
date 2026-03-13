# Playbook Author

Create Playbooks using the WISER Method for agentic execution with human oversight.

**Key distinction:** Playbook Author creates Playbooks (living documents that evolve with the work). Play Author creates Plays (repeatable patterns for specific outcomes). If the user needs a task list without learning capture or decision tracking, they don't need Playbook Author.

## Critical Directives

1. **Token budget:** Target 2000-2500 words total. Dense > verbose. Context: 2-3 sentences. Each task: one line with a verifiable action. No filler phrases, no restating section headers. Risks deserve full detail; don't cut corners there.
2. **Risk-first:** Identify execution risks in Interrogate BEFORE designing the plan. Risks drive the Solve choice. Each risk needs a concrete, specific mitigation, not vague hedging. Skimpy risk work is the #1 failure mode.
3. **Questions with defaults:** Only ask what genuinely cannot be inferred or researched. Frame questions with proposed options (e.g., "Personal profile or company page? Recommend personal."). Never ask open-ended questions that stall execution.
4. **Measurable completion:** Every task needs an unambiguous done-state. Every Checkpoint needs explicit pass/fail thresholds. An agent should never stall wondering "am I done?"
5. **Cognitive ordering:** Authority/constraints first, then objective, then risks/unknowns, then plan, then tracking. This is the order an LLM needs to process instructions.

## Activation

Only activate when the user explicitly requests a plan:
- "Create a plan for..."
- "Make a plan to..."
- "Plan out..."
- "I need a plan for..."
- "Create a playbook for..."
- "Make a playbook to..."

When invoked, ask:

> "Is this a **one-time** plan (execute once, archive when done) or a **template** (a repeatable process you'll run multiple times)?"

- **One-time:** Create a standard Playbook. It executes, completes, and archives.
- **Template:** Create a Playbook marked with `**Type:** Template`. It stays clean as a master copy. Each time it's run, copy it to a new instance (`YYYY-MM-DD-[slug].plan.md`), reset all checkboxes and Progress, then execute the instance. The template itself is never executed directly.

Then follow the methodology below.

## The WISER Framework

Every Playbook follows the W-I-S-E-R structure. Each step is called a **Canon** (a phase of the planning and execution cycle):

| Canon | Purpose |
|-------|---------|
| **Witness** | Verify current state; ground in what exists and what we're building |
| **Interrogate** | Surface unknowns, risks, and assumptions |
| **Solve** | Build the riskiest piece first to prove feasibility |
| **Expand** | Build out the full task to meet the objective |
| **Refine** | User stress-tests; AI iterates |

**Preconditions** come before W-I-S-E-R. Prerequisites that must be true before the work begins (e.g., archive before refactoring, ensure API access before integration, backup before migration).

**Checkpoints** end each Canon. Not done until you can cite evidence:

| Canon | Checkpoint Evidence |
|-------|---------------------|
| Witness | Key files/code/docs verified against reality; divergences documented; objective is specific and measurable; scope boundaries explicit; current state grounded in evidence |
| Interrogate | Unknowns listed; assumptions stated; execution risks identified with mitigations; riskiest piece identified; existing tools/Plays reviewed |
| Solve | Riskiest piece built; it works (or we learned why it doesn't and pivoted) |
| Expand | All tasks complete; milestones verified; documentation impact addressed |
| Refine | User has tested; feedback incorporated; success criteria met |

## Playbook Storage

**Choose a logical location based on context:**
- Project-specific work: store in that project's directory (e.g., `/project/plans/`)
- Workspace-level work: store in the relevant workspace
- No logical location: default to `/memory/plans/`

**Confirm with an assumptive suggestion:**
> "I'll save this Playbook to `[logical-location]`. Want a different location?"

**Naming convention:** `YYYY-MM-DD-[descriptive-slug].plan.md`

## Collaboration Style

After completing Witness, ask the user:

> "Would you like this Playbook to collaborate WITH you through execution (pause at checkpoints for your input), or run autonomously (execute fully, you review at the end)?"

**Collaborative:** Pauses at every Checkpoint for human confirmation. Discusses decisions as they arise. Best for: uncertain territory, high-stakes decisions, learning together.

**Autonomous:** Runs through all Canons without pausing. Logs all decisions with rationale and alternatives. Human reviews completed work and Decision Log at the end. Best for: well-understood work, trusted patterns, time-sensitive execution.

**Default:** Collaborative (safer; human stays in the loop).

**Mode signals.** Collaborative: "work with me," "let's figure this out," uncertain approach, irreversible changes. Autonomous: "just do it," "run this," established pattern, user is busy.

## Context Window Resilience

All Playbooks may be executed across multiple context windows. A new agent session might pick up the Playbook mid-execution with no memory of prior work. The Playbook must be self-contained.

**Required sections:** Context (why this matters), Resume Instructions (how to get up to speed), Progress (current Canon, next action, summary table).

**When resuming:** Follow the Resume Instructions section in the Playbook.

## Live Progress Tracking

During execution, use `todo_write` to show progress in Cursor's UI.

- Create one todo per Canon as you enter it
- Mark `in_progress` when working on a Canon
- Mark `completed` when moving to the next

## Task Decomposition

Tasks must be atomic, verifiable, and properly scoped. Every task must pass these tests:

1. **Atomic:** One action, not multiple actions joined by "and" or "then"
2. **Verifiable:** Clear done state that can be checked (measurable where possible)
3. **Right-sized:** Completable in a reasonable work unit
4. **Independent where possible:** Minimize dependencies between tasks within a milestone

**Warning signs:** Vague verbs ("Handle," "Address"), unclear done state, tasks that would take hours, milestones with only 1-2 tasks.

## Quality Checks

Before delivering a Playbook:
- [ ] WISER Playbook acknowledgement present (Method field)
- [ ] Witness includes audit; current state verified, not assumed
- [ ] Collaboration style confirmed with user
- [ ] Preconditions identified (or explicitly "None")
- [ ] Authority boundaries defined
- [ ] Execution risks populated with specific mitigations in Interrogate
- [ ] Every task passes decomposition tests (atomic, verifiable, right-sized)
- [ ] Solve identifies the riskiest piece (driven by Interrogate risks)
- [ ] Success criteria are measurable
- [ ] Documentation impact assessed
- [ ] File saved with proper naming convention
- [ ] Context, Resume Instructions, and Progress sections included
- [ ] Key files/artifacts listed for new context

## Playbook Structure

```markdown
# [Playbook Title]

**Created:** YYYY-MM-DD | **Updated:** YYYY-MM-DD
**Type:** One-time | Template
**Collaboration:** Collaborative | Autonomous
**Status:** Draft | Active (Canon) | Final Check | Paused | Complete | Template
**Method:** WISER Playbook

## Context

[Why this work matters. Problem being solved. Background a new context window needs.]

**Key files:** [Files a new context should read]

## Preconditions

[Prerequisites that must be met, or "None"]

## Authority

**Autonomous:** [What the agent can execute freely]
**Needs human input:** [What requires confirmation]

---

## Witness

*Verify before planning; plans built on stale assumptions fail.*

**Audit:** Read key files, code, and docs relevant to this work. Note where reality differs from what was assumed or documented.

**Findings:**
- [Key findings from the audit]
- [Divergences between documentation/assumptions and actual state]
- [Dependencies or blockers discovered]

**Objective:** [End state we're working toward]

**Scope:** [What's in] | **Not in scope:** [What's out] | **Depends on:** [Prerequisites]

**Current State:** [Verified starting point, drawn from audit findings]

**Deliverable:** [What this Playbook produces]

**Checkpoint:** Current state verified. Shared understanding established.

---

## Interrogate

*Surface unknowns and challenge assumptions before committing.*

**Questions for user** (each with a recommended default):
- [ ] [Question — "Option A or B? Recommend A because..."]

**Execution risks:**
| Risk | Status | Mitigation | Notes |
|------|--------|------------|-------|
| [What could go wrong] | Active / Mitigated / Realized / Retired | [Specific countermeasure] | [Updates as work progresses] |

**Status definitions:** Active (monitoring), Mitigated (reduced), Realized (occurred; document impact), Retired (no longer applies).

**Reuse check:**
- [ ] [Existing tools, patterns, or prior work to leverage]

**Checkpoint:** Unknowns surfaced. Riskiest piece identified. Existing tools/Plays reviewed.

---

## Solve

*Build the riskiest piece first. Prove it works before expanding.*

**Riskiest piece:** [Highest-severity risk from Interrogate]

- [ ] [Task to prove feasibility]
- [ ] [Validation step with pass/fail threshold]

**Checkpoint:** Solution proven viable.

---

## Expand

*Build out the full task. Each milestone: 3-5 tasks max.*

### Milestone 1: [Name]
- [ ] [Task]
- [ ] [Task]

### Milestone 2: [Name]
- [ ] [Task]
- [ ] [Task]

### Documentation Updates
- [ ] [Doc/reference to update, or "None; no documentation affected"]

**Checkpoint:** All milestones complete. Documentation impact addressed.

---

## Refine

*User stress-tests the solution. AI iterates based on feedback.*

- [ ] [User testing step]
- [ ] [Iteration task]

**Checkpoint:** Solution works well in practice.

---

## Final Check

*Refine confirmed the solution works; Final Check confirms nothing was left inconsistent.*

- [ ] Documentation Updates from Expand are done (spot-check)
- [ ] No stale references in docs or code
- [ ] Tests pass for touched components (if applicable)
- [ ] All checkboxes reflect actual state
- [ ] Decision Log and Learnings are current

---

## Decision Log

| Date | Decision | Rationale | Alternatives |
|------|----------|-----------|--------------|
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
**Current Canon:** [Witness | Interrogate | Solve | Expand | Refine | Final Check]
**Next action:** [Specific next step]

| Canon | Items | Done | Status |
|-------|-------|------|--------|
| Witness | 0 | 0 | Not started |
| Interrogate | 0 | 0 | Not started |
| Solve | 0 | 0 | Not started |
| Expand | 0 | 0 | Not started |
| Refine | 0 | 0 | Not started |
| Final Check | 5 | 0 | Not started |
| **Total** | **5** | **0** | **Not started** |

---

## Success Criteria

- [ ] [How to verify completion]
```

## Execution Behavior

Playbooks are living documents. The agent self-updates during execution.

**During execution:**
- Update task checkboxes as work completes
- Update Status when transitioning between Canons
- Update Risk Tracker as risks evolve (mitigated, realized, retired)
- Log decisions immediately with rationale and alternatives
- Record learnings when experiments conclude or assumptions are tested
- Update Progress section before any Checkpoint
- Update Last Updated date after any change
- Do not mark Status as Complete until Final Check passes

**Before ending any session:**
1. Update all task checkboxes to reflect current state
2. Update Progress section with current Canon and specific next action
3. Update Decision Log if any decisions were made
4. Update Learnings if anything was validated/invalidated
5. Update Risk Tracker if any risks changed

**Collaborative mode:** Wait for human confirmation at Checkpoints. Discuss significant decisions before logging them. Surface new risks as identified.

**Autonomous mode:** Proceed through Checkpoints without pausing. Log all decisions for human review. Complete the full Playbook, then present results.

**Autonomous guardrails (stop and notify human if):**
- A task falls under "Needs human input" in Authority
- A risk realizes with significant impact
- A task fails twice
- Scope change is needed
- Solve proves the approach won't work
- New high-severity risk emerges
- Work would take significantly longer than expected

**Scope changes:** Log in Decision Log with rationale. Update Scope and Risks sections. Re-evaluate whether the riskiest piece changes.

**When things go wrong:**

*Task failure:* Log in Learnings. Attempt one recovery if a clear fix exists. If recovery fails: Collaborative stops and discusses; Autonomous documents the blocker and stops.

*Risk realized:* Update Risk Tracker to "Realized." Document impact. Log response in Decision Log. Collaborative: stop and discuss. Autonomous: continue if impact is contained; stop and notify if it blocks progress.

*Solve proves approach won't work:* Log in Learnings. Document what was tried and why it failed. Stop execution (both modes). This requires human decision on whether to pivot, descope, or abandon.

**Version tracking:** Before major direction changes, archive the current Playbook to `zArchive/`. Naming: `YY-MM-DD V[N] - [playbook-name].plan.md`.

**Completion protocol (after Final Check passes):**
1. Update Status to Complete
2. Identify project artifacts affected by this work's completion
3. Update or prompt the user to update those artifacts
4. Archive the Playbook per version tracking rules

## Handoffs

**From other tools:** Problem Solver, Researcher, or Content Author may recommend creating a Playbook for complex work.

**To Play Author:** If a pattern emerges that should become a lightweight repeatable, extract it as a Play.

**To Template:** If a completed one-time Playbook represents a process you'll repeat, promote it to a Template: reset checkboxes and Progress, set Type to Template and Status to Template, keep the structure and learnings from the first run.

## Limitations

- Playbooks require user judgment; they don't replace thinking
- Playbook overhead is justified for complex work; for simple tasks, just execute
- Playbooks in `/memory/` persist but aren't version-controlled
- Stale Playbooks need verification before resuming
- Autonomous mode requires trust; use Collaborative for uncertain territory
