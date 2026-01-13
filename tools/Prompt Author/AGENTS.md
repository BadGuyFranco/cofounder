# Prompt Author

Write prompts that reliably produce the outputs you want.

**Core principles:** See `.cursor/rules/Prompt Standards.mdc` (auto-loads when editing prompts).

This tool provides the **methodology** for complex prompt work. Use it when you need to write, review, or debug prompts beyond basic quality checks.

## Artifact Types

| Type | Purpose | Key Distinguisher |
|------|---------|-------------------|
| **Standalone Prompt** | One-shot behavior instruction | Self-contained, no file references |
| **AGENTS.md** | Tool documentation for agent systems | Lives in tool directory, may reference supporting files |
| **Library Component** | Reference file loaded by other prompts | Informs but does not instruct; no objective |

**Library components** are the critical distinction. They contain domain knowledge (frameworks, patterns, constraints) but no workflow or decision logic. If a file says "do this, then that," it's a prompt, not a library component.

**Examples:** Content Author's content types, Marketing System's supporting frameworks.

## Before Writing: Clarify

If the user's request is unclear, ask:
- What type of artifact? (Standalone prompt, AGENTS.md, or library component)
- What should success look like?
- What user content will it process?
- What's the scope?

Don't guess. Wrong assumptions waste time.

## Prompt Structure

### Standalone Prompts

```markdown
## Objective
[Evaluable success criteria]

## Quality Checks
- [ ] [Verifiable check]

## XML Boundaries
[Tags for user content]

## [Domain Sections]
[Named for content, not "Instructions"]
```

**Include clarification instruction:** "If the request is ambiguous, ask for clarification before proceeding."

### AGENTS.md (Tool Documentation)

**Pattern reference:** `/cofounder/system/templates/Behavior Tool Template/`

**Where to create:** User tools go in `/memory/my tools/[Tool Name]/`, not in `/cofounder/`.

### Library Components

```markdown
# [Component Name]

[One-line description]

## [Content Sections]
[Domain knowledge organized by topic]
[No workflow, no decision logic]
```

**No objective, no quality checks, no XML boundaries.** Parent prompt handles all of that.

## Composition

When AGENTS.md files reference library components:

**Explicit loading:** State which files to load and when.
```markdown
## Before Writing
Load `/tools/Content Author/content types/[type].md` based on request.
```

**Consistent conventions:** XML tags, terminology, and format expectations must align across all files in a tool.

**Test the chain:** Stress test the full path. Composition failures happen at boundaries.

## Writing Process

1. **Identify type** - Standalone prompt, AGENTS.md, or library component?
2. **Define success** - What does good output look like? What inputs?
3. **Write minimal** - Only what's needed. Apply position principle (see Prompt Standards).
4. **Add clarification path** - What should prompt ask when unclear?
5. **Apply threshold test** - Cut until quality degrades (see Prompt Standards).
6. **Verify** - Run Prompt Standards quality checks. Fix issues before delivering.

## When Rules Flex

**Positive examples work for:** Code, structured data, technical formats.

**Complex domains:** Some need detail. Test: does removing instruction cause failure?

**Creative tasks:** Define objective even if measurement is subjective.

**Library components:** Skip objective, quality checks, XML boundaries.

## Reviewing Prompts

For auditing existing prompts, load `tools/Prompt Author/Prompt Review Process.md` which provides:
- Triage (salvage or rewrite?)
- Stress testing
- Audit checklist
- Diagnosis workflow
