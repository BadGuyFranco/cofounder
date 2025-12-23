# [Workspace Name] - AI Agent Instructions

[One-sentence description of what this workspace is for]

## Workspace Structure

This workspace has multiple root directories:

- **`/pro accelerator/`** - Shared tools and libraries (read instructions from here)
- **`/[Workspace Name]/`** - Active workspace (your working directory)

**Important:** `/pro accelerator/` contains the shared tool library. See `/pro accelerator/AGENTS.md` for tool routing and `/pro accelerator/README.md` for an overview.

## Available Tools

For the full list of available tools and when to use them, see `/pro accelerator/AGENTS.md`.

Common tools you may need:
- **Content Author** - Writing content (load `/pro accelerator/tools/Content Author/AGENTS.md`)
- **Image Generator** - Creating images (load `/pro accelerator/tools/Image Generator/AGENTS.md`)
- **Visualizer** - Creating diagrams (load `/pro accelerator/tools/Visualizer/AGENTS.md`)

**Single Source of Truth:** Tool instructions live in `/pro accelerator/`. Do not duplicate them here. Reference and load them when needed.

## Workspace Rules

**Read/Write:**
- `/[Workspace Name]/` - All content creation and modifications happen here

**Read-Only (unless explicitly instructed):**
- `/pro accelerator/` - Shared library; do not modify

## Directory Structure

```
/[Workspace Name]/
├── AGENTS.md           # This file - workspace instructions
├── README.md           # Brief human overview
├── clients/            # Client-specific work
├── internal/           # SOPs, team processes, internal docs
├── marketing/
│   ├── content/        # Blog posts, articles, thought leadership
│   ├── assets/         # Brand materials, logos, images
│   └── research/       # Competitive analysis, market research
├── git/
│   ├── scripts/        # Workspace-specific automation
│   └── templates/      # Reusable documents (proposals, contracts)
└── zArchive/           # Replaced or deprecated items
```

## Primary Constraint

[State the most critical rule for this workspace. Examples:]
- "Always use Content Author for any written content"
- "All client deliverables must be reviewed before delivery"
- "Never commit API keys or sensitive data"

## Workflows

### [Primary Workflow Name]

[Describe the main workflow for this workspace]

**Steps:**

1. **[Step 1]** - [What to do, what tool to use if applicable]
2. **[Step 2]** - [What to do]
3. **[Step 3]** - [Where to save output]
4. **[Validation]** - [How to verify quality]

### [Secondary Workflow] (if applicable)

[Additional workflows as needed]

## What This Workspace Creates

- [Output type 1]
- [Output type 2]
- [Output type 3]

## Quality Standards

Every deliverable must:
1. [Standard 1]
2. [Standard 2]
3. [Standard 3]

## Where Content Lives

| Location | Purpose |
|----------|---------|
| `/clients/` | Client-specific projects and deliverables |
| `/internal/` | SOPs, team processes, internal documentation |
| `/marketing/content/` | Blog posts, articles, thought leadership |
| `/marketing/assets/` | Brand materials, logos, images, design files |
| `/marketing/research/` | Competitive analysis, market research, notes |
| `/git/scripts/` | Custom automation scripts for this workspace |
| `/git/templates/` | Reusable documents (proposals, contracts, emails) |
| `/zArchive/` | Previous versions and deprecated items |

## Getting Started

To begin work in this workspace:

1. Review this AGENTS.md file
2. Check `/pro accelerator/AGENTS.md` for available tools
3. [Workspace-specific first step]
4. [Next step]


## Template Instructions (DELETE WHEN DONE)

**When customizing this template:**

1. Replace all `[placeholders]` with workspace-specific content
2. Define your Primary Constraint clearly
3. Document actual workflows you'll use
4. Update "What This Workspace Creates" with real outputs
5. Remove sections that don't apply

**Single Source of Truth reminder:**
- Tool instructions live in `/pro accelerator/tools/[Tool]/AGENTS.md`
- Reference them, don't duplicate them
- This file defines workspace context, not tool behavior

**Directory usage:**
- `clients/` - Organize by client name
- `internal/` - SOPs, processes, team documentation
- `marketing/content/` - Blog posts, articles, thought leadership
- `marketing/assets/` - Logos, images, brand materials
- `marketing/research/` - Competitive analysis, market research
- `git/scripts/` - Workspace automation (not general tools)
- `git/templates/` - Proposals, contracts, reusable documents
- `zArchive/` - Move old versions here instead of deleting

**Delete this section when done.**

