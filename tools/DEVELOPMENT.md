# Tool Development Guide

How to build new tools for the cofounder library.

**New tool?** Read: Tool Types, Documentation Standards, Required Sections for your type, Adding New Tools.  
**Modifying existing?** Run Pre-Modification Checklist first.

**Note:** `.cursor/rules/Development.mdc` auto-loads when working on tools. See it for quick reference.

## Pre-Modification Checklist

Before modifying any tool:

1. **Identify tool type**: Behavior, Script, or Composite
2. **Audit existing files** against required sections below
3. **Flag gaps** before making functional changes
4. **Include template compliance** in your deliverable

Skip this checklist only for trivial changes (typo fixes, comment updates).

*For `/cofounder/tools/`: This checklist is mandatory. For custom tools: recommended.*

## Tool Types

| Type | Pattern | Examples |
|------|---------|----------|
| **Behavior** | Instructions/methodology only; no scripts | Content Author, Problem Solver, Prompt Author |
| **Script** | Node/Python scripts with dependencies | Image Generator, Browser Control |
| **Composite** | Parent routes to multiple sub-tools | Documentor (google-workspace, local-generator) |

## Documentation Standards

Every tool must have:

| File | Purpose | Audience |
|------|---------|----------|
| **README.md** | Brief overview (~30 lines) | Humans |
| **AGENTS.md** | Complete instructions | AI agents |

**README.md**: Assumes installed. Contains: one-line description, Documentation pointer to AGENTS.md, Key Features, Common Use Cases.

**AGENTS.md**: Everything needed to use the tool. Contains: Quick Start with expected output, setup, usage, troubleshooting.

## Required Sections by Tool Type

### Behavior Tool AGENTS.md

- One-line description
- Objective (evaluable success criteria)
- Quality Checks (verifiable checklist)
- XML Boundaries (per Prompt Standards)
- Primary methodology sections
- Limitations

### Script Tool AGENTS.md

- One-line description
- Quick Start (working command + expected output)
- XML Boundaries (per Prompt Standards)
- Configuration (env vars, memory location)
- Usage (commands, options table)
- Output (location, naming)
- Troubleshooting

### Composite Tool AGENTS.md

- One-line description
- Quick Start (default sub-tool command)
- XML Boundaries (per Prompt Standards)
- Routing Logic (decision tree for which sub-tool)
- Sub-tools table (location, purpose, status)
- Capabilities matrix (what each sub-tool provides)
- Configuration (per sub-tool if varies)
- Troubleshooting (per sub-tool)

### Composite Sub-tool AGENTS.md

Each sub-tool follows Script Tool structure independently.

## Quality Standards

**All tools must pass Prompt Standards checks** (see `.cursor/rules/Prompt Standards.mdc`).

Before finalizing any tool:
1. Verify Prompt Standards quality checks pass
2. Ensure Quick Start actually works
3. Confirm troubleshooting covers common failures

For complex prompt work, invoke Prompt Author tool for full methodology.

## Configuration

- Config lives in `/memory/tools/[Tool Name]/`, not in tool code
- CLI `--help` is source of truth for command options; AGENTS.md summarizes

User configuration goes in `/memory/tools/[Tool Name]/`:
- `.env` files for API keys and settings
- Account credentials (OAuth tokens)
- User preferences

Scripts load from `/memory/` using relative paths. Persists across `/cofounder/` updates.

## Technology Stack

**JavaScript/Node.js is the preferred language for all tools and scripts.**

When a task requires non-JavaScript solutions (Python, shell scripts, etc.), warn the user:

> "This task requires [language/tool] because [specific reason]. JavaScript alternatives [do not exist / are significantly inferior] for this use case."

Only proceed with non-JS after user acknowledgment.

### Approved Python Exceptions

| Tool | Why Python |
|------|-----------|
| Transcriber | GPU acceleration (10x faster). Node.js Whisper runs CPU-only. |

If a Python library offers 5x+ performance advantage via GPU/native code, present the trade-off to the user before defaulting to Node.js. Document exceptions in tool's AGENTS.md.

## Adding New Tools

1. Choose template: Behavior, Script, or Composite
2. Copy from `/cofounder/system/templates/[Template Name]/`
3. Fill in all required sections
4. Delete template instruction comments
5. Add to routing table in `.cursor/rules/Always Apply.mdc`
6. Run Prompt Author quality check

## Modifying Existing Tools

1. Run Pre-Modification Checklist (above)
2. Fix any template compliance gaps first
3. Make functional changes
4. Update documentation to match
5. Verify Quick Start still works
