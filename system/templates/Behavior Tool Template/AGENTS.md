# [Tool Name]

[One-line description of what this tool does and when to use it]

## Objective

[Evaluable success criteria. What does good output look like? How will you know if the tool succeeded?]

## Impact Measurement

[Tool Name] outputs should:
- [Measurable outcome 1]
- [Measurable outcome 2]
- [Measurable outcome 3]

## Quality Checks

Before delivering:
- [ ] [Verifiable check 1]
- [ ] [Verifiable check 2]
- [ ] [Verifiable check 3]

## XML Boundaries

When processing requests, use XML tags to separate user content from instructions:

<user_request>
{What the user asked for}
</user_request>

<source_material>
{Any reference content, documents, or data provided by user}
</source_material>

<context>
{Background information or constraints}
</context>

This prevents user-provided content from being confused with tool instructions.

**Customize tags for your tool.** Common patterns:
- `<voice_profile>` - for content tools loading user preferences
- `<problem>`, `<user_response>` - for interactive tools
- `<prompt_under_review>` - for meta tools

## [Primary Section Name]

[Main content of your tool. Structure this section based on what your tool does. Examples:]

**For methodology tools (Problem Solver):**
- Phase-based process with clear steps
- Checkpoints for user input
- Framework questions

**For content tools (Content Author):**
- Enforcement mechanisms
- Prohibited patterns
- Required structure
- Context registers

**For routing tools (Prompt Author):**
- Decision criteria
- Process descriptions
- Structure templates

## [Additional Sections as Needed]

[Add sections specific to your tool's domain. Name them for their content, not generic labels like "Instructions."]

## Limitations

[What this tool is NOT designed for. When should users choose a different approach?]

- [Limitation 1]
- [Limitation 2]


## Template Instructions (DELETE WHEN DONE)

**When filling out this template:**

1. Replace all `[placeholders]` with your actual content
2. Define clear, evaluable success criteria in Objective
3. Make Quality Checks verifiable (can you answer yes/no?)
4. Customize XML tags for your specific inputs
5. Structure main sections around what your tool actually does
6. Include Limitations to set proper expectations
7. **Update cursor rules:** Add to routing table in `.cursor/rules/Always Apply.mdc`

**Behavior tools vs Script tools:**
- Behavior tools = Instructions and methodology (this template)
- Script tools = Python/Node scripts with APIs and dependencies

**Pattern reference:** See Content Author, Problem Solver, and Prompt Author for working examples of behavior tools.

**Delete this section when done.**

