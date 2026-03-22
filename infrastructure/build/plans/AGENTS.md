# CoFounder -- Plan Lifecycle

Plans are structured execution documents for multi-session priorities. They follow a strict lifecycle and are designed to be executable prompts -- a cold session can pick up a plan and execute it without additional context.

## When to Create a Plan

- The priority will take more than one session
- The work involves multiple components or cross-cutting concerns
- The approach has meaningful alternatives that need evaluation
- The founder wants to review and approve the approach before execution begins

**Single-session work does not need a plan.** Just execute and log in SESSION_LOG.md.

## Priority Lifecycle

Every priority moves through four phases:

### 1. Research
- Architecture audit: what exists, what state it is in
- Code inventory: what files, what patterns, what dependencies
- Dependency mapping: what touches what, what breaks if this changes
- Open questions: list them and get answers before planning
- Findings go in the plan's research notes, NOT in PRIORITIES.md

### 2. Plan
- Define the approach, the phases, the verification criteria
- Declare authority boundaries: what the builder can do without asking, what requires confirmation
- Estimate effort per phase
- Identify risks and mitigations
- A plan is context-independent: a new session can read it cold and know exactly what to do

### 3. Execute
- Follow the plan's phases in order
- Update the Current status line after every significant milestone
- The Current status line is crash recovery -- if a session ends unexpectedly, the next session reads this line and knows where to pick up
- Log deviations. If 3+ deviations accumulate, stop and re-plan with the founder.

### 4. Final Check
- Verify all acceptance criteria from the plan
- Run verification commands
- Review the work as if someone else did it
- Update PRIORITIES.md status to `done`
- Update SESSION_LOG.md with the outcome

## Plan File Format

Plans live in this directory. Name them: `YYYY-MM-DD-slug.md`

Every plan file must include:

```
# [Priority slug]: [Title]

**Priority:** [link to PRIORITIES.md entry]
**Status:** [research | planning | executing | verifying | done | blocked]
**Current status:** [One line describing exactly where execution stands right now]

## Research Notes
[Findings from the research phase]

## Approach
[What we are going to do and why this approach vs. alternatives]

## Authority
[What the builder can do without asking. What requires confirmation.]

## Phases
### Phase 1: [Name]
- [ ] [Task]
- [ ] [Task]
**Verification:** [How to verify this phase is complete]

### Phase 2: [Name]
...

## Acceptance Criteria
- [ ] [Criterion]
- [ ] [Criterion]

## Risks
| Risk | Mitigation |
|------|-----------|
| [Risk] | [Mitigation] |
```

## Current Status Line Convention

The `Current status:` line is the single most important line in a plan. It must be updated after every significant milestone. Format:

```
**Current status:** [Phase N, Step M] [What just completed]. Next: [What comes next].
```

Examples:
- `**Current status:** [Phase 1, Step 3] Completed dependency audit. Next: write migration script.`
- `**Current status:** [Phase 2, Step 1] Blocked on founder input -- need decision on auth provider. Waiting.`
- `**Current status:** [Phase 3, Step 5] All tests passing. Next: Final Check.`

## Routing

- **What should we work on?** -> `../PRIORITIES.md`
- **Session protocols?** -> `../AGENTS.md`
- **Architecture decisions?** -> `../../decisions/README.md`
