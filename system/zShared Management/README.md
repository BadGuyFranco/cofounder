# Shared Management

This directory contains standards, templates, and documentation for creating and maintaining shared libraries.

## What's Here

- **Template for New Shared Library/** - Starting point for behavior prompts (how to act)
- **Template for Tool Documentation/** - Starting point for tool docs (how to use)
- **README.md** (this file) - Shared library standards

## Choosing a Template

**Behavior Prompt** (Content Author, Marketing System, Problem Solver)
- Agent needs to ACT a certain way
- Requires Objective, Impact Measurement, Quality Checks
- Use: `Template for New Shared Library/`

**Tool Documentation** (Image Generator, Video Generator, Browser Control)
- Agent needs to USE a tool
- Requires Quick Start, Usage, Troubleshooting
- Use: `Template for Tool Documentation/`
- Structure should fit the specific tool; no rigid format

## Creating a New Shared Library

1. Copy the template directory to `/pro accelerator/tools/[Your Library Name]`
2. Follow the instructions in the template files
3. Delete template instructions when done
4. **Add library to routing:** Update `/.cursor/rules/Always Apply.mdc` - Add new library to "Check Shared Libraries First" list

## Documentation Standards

Each shared library must have:

**README.md** (REQUIRED)
- Brief human-facing overview
- Quick Start section at the top
- Key features
- Concise, no fluff

**AGENTS.md** (REQUIRED)
- Complete AI agent instructions
- Dependency verification commands
- Installation instructions
- Usage examples and syntax
- Troubleshooting (installation and usage)

**Additional files** (OPTIONAL)
- CHANGELOG.md - Version history (rarely used in practice)
- requirements.txt or package.json - Dependencies
- Example scripts

## Key Principles

**README.md is for humans**
- Assumes everything is already installed
- Quick reference for manual usage
- ~30-50 lines typical

**AGENTS.md is for AI**
- AI can verify and install dependencies automatically
- Complete instructions including error handling
- Everything needed to use the library successfully

## XML Boundary Convention

Use XML tags to separate AI instructions from user-provided content. This improves reliability by preventing user content from being confused with instructions.

**When to use XML boundaries:**
- User-provided content that gets injected (voice profiles, requirements, prompts)
- Data extracted from external sources (page content, transcripts, files)
- Intermediate outputs that feed into next steps (categorization results, phase outputs)

**Standard tag patterns:**

| Tag Type | Purpose | Example |
|----------|---------|---------|
| `<user_request>` | What the user asked for | Task description, prompt |
| `<source_material>` | Reference content from user | Documents, transcripts |
| `<context>` | Background information | Constraints, prior attempts |
| `<extracted_data>` | Data from external sources | Page content, API responses |
| `<[tool]_output>` | Results from a process step | `<categorization_output>` |

**Format in AGENTS.md:**

```markdown
## XML Boundaries

When processing [type of request], use XML tags to separate user content from instructions:

<tag_name>
{Description of what goes here}
</tag_name>

This prevents user-provided content from being confused with instructions.
```

**Placement:** Add XML Boundaries section early in the file, after the initial setup but before detailed instructions. Place it where the agent will see it before processing user content.

**All scripts MUST require configuration from `/memory/`**
- Configuration files (`.env`) live in `/memory/[Library Name]/`
- NEVER use hardcoded defaults for model names or API endpoints
- Scripts MUST fail with clear error if required env vars are missing
- Scripts should load from `/memory/` using relative paths from the script location
- Use: `MODEL = os.getenv("MODEL_NAME")` NOT `os.getenv("MODEL_NAME", "default")`
- Validate all required env vars at the start of functions
- Provide helpful error messages pointing to `/memory/`
- See `/memory/README.md` (root-relative path) for the memory directory structure

## File Naming

- **README.md** - ALL CAPS (user attention)
- **AGENTS.md** - ALL CAPS (AI attention)
- **Other docs** - Title Case with spaces (Standard Directory Structure.md)
- **Scripts** - Use language conventions (snake_case.py, camelCase.js)
- **Directories** - Title Case with spaces (Browser Control, Image Generator)

