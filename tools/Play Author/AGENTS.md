# Play Author

## Objective

Given a task, produce a prompt that an agent can execute without clarification and that produces consistent outputs across varied inputs.

**Verify:** Run the prompt with three varied inputs. If all three produce the expected output without intervention, the prompt works. Varied inputs test reliability.

## Core Insight

A prompt is a Play for agents. The same structure that makes instructions executable by humans makes them executable by agents. The difference is expression, not structure.

## Before Writing

If the request is unclear, ask:
- What type? (Standalone prompt, AGENTS.md, cursor rule, or library component)
- What should success look like?
- What content will it process?
- What's the scope?

Don't guess. Wrong assumptions waste time.

**Reuse check:** Before writing a new Play, check if existing tools or Plays already solve the problem:
- Review `/cofounder/tools/` and `/cofounder/connectors/` for relevant capabilities
- Check `/memory/my tools/` and `/memory/my connectors/` for custom solutions
- If a Play exists, extend or compose with it rather than duplicating

## Prompt Types

| Type | Purpose | Key Distinguisher |
|------|---------|-------------------|
| **Standalone Prompt** | One-shot behavior instruction | Self-contained, no file references |
| **AGENTS.md** | Tool documentation for agent systems | Lives in tool directory, may reference supporting files |
| **Cursor Rule (.mdc)** | Behavior that auto-loads based on context | Triggered by file patterns or always-apply |
| **Library Component** | Reference file loaded by other prompts | Informs but does not instruct; no objective |

**Library components** contain domain knowledge but no workflow or decision logic. If a file says "do this, then that," it's a prompt, not a library component. Examples: Content Author's content types, Marketing System's frameworks.

**Where to create:** User tools go in `/memory/my tools/[Tool Name]/`, not in `/cofounder/`. For AGENTS.md structure, see `/cofounder/system/templates/Behavior Tool Template/`.

## The Structure

Every effective prompt follows this structure. Not every prompt needs every section, but the skeleton is always underneath.

| Section | What It Answers | Position |
|---------|-----------------|----------|
| **Context** | When to use? When NOT to use? | Opening |
| **Objective** | What will it accomplish? How will you verify? | Opening |
| **Inputs** | What does it need? (Use XML tags to separate from instructions) | Opening |
| **Identity** | What role does the agent assume? | Opening |
| **Steps** | What does it do? Where are decision points? | Middle |
| **Tools** | What resources, files, or capabilities are needed? | Middle |
| **Pitfalls** | What goes wrong? What's the response? | Middle |
| **Variations** | How does it adapt for different conditions? | Middle |
| **Success** | How do you know it worked? | Closing |

Models attend most to beginning and end. Put identity, objective, and critical constraints at the opening. Put success criteria and output format at the closing.

## Writing Each Section Well

**Context:** "Use when X" is incomplete. "Use when X, not when Y" draws a boundary. Agents need to know when NOT to activate.

**Objective:** Vague: "Improve the code." Precise: "Refactor to eliminate duplicate logic; verify by running tests."

**Inputs:** "Data" is useless. "User request wrapped in `<user_request>` tags" is actionable. Use XML boundaries: `<user_request>`, `<source_material>`, `<context>`.

**Identity:** "Code reviewer focused on maintainability" shapes judgment differently than "code reviewer focused on performance."

**Steps:** "Analyze the code" is incomplete. "Analyze the code; if complexity exceeds threshold, recommend decomposition before proceeding" tells the agent how to navigate choices. Every step that requires judgment needs: the decision, the criteria, and what to do for each outcome.

**Pitfalls:** "May over-engineer" is a warning. "May over-engineer; if solution requires more than 3 new abstractions, stop and verify necessity with user" is guidance. Include a clarification pitfall: "If the request is ambiguous, ask for clarification before proceeding."

**Success:** "Works well" is subjective. "All tests pass, no new linter errors, PR ready for review" is verifiable.

## Quality Tests

**Clarity:** Can an agent unfamiliar with your context follow it?

**Completeness:** Does it produce the output it promises?

**Elegance:** Can you remove anything without degrading execution? If yes, cut it.

## Writing Process

1. **Identify type** - Standalone prompt, AGENTS.md, cursor rule, or library component?
2. **Define context** - When should this activate? When NOT?
3. **Define success** - What does good output look like? How will you verify?
4. **Write minimal** - Only what's needed. Cut until quality degrades.
5. **Add decision points** - Where does the agent need judgment? What informs it?
6. **Add pitfall responses** - What goes wrong? What's the specific response?
7. **Test with varied inputs** - Run three different inputs. All should produce expected output.
8. **Diagnose failures** - If output fails, identify which section broke: wrong scope (Context), wrong goal (Objective), missing info (Inputs), wrong judgment (Steps), or unhandled edge case (Pitfalls). Fix that section. Retest.

## Composition

When AGENTS.md files reference library components:

**Explicit loading:** State which files to load and when.

**Consistent conventions:** XML tags, terminology, and format expectations must align across all files.

**Test the chain:** Run the full path with realistic input. Composition failures happen at boundaries.

## When Rules Flex

**Patterns over examples:** Show structure, not content. Positive examples cause mimicry; patterns cause understanding. Reserve examples for code, structured data, and technical formats where exact reproduction is the goal.

**Complex domains:** Some need detail. Test: does removing instruction cause failure?

**Creative tasks:** Define objective even if measurement is subjective.

**Library components:** Skip objective, quality checks, XML boundaries. Parent prompt handles those.

## Reviewing Plays

For auditing existing Plays, load `tools/Play Author/Play Review Process.md`.
