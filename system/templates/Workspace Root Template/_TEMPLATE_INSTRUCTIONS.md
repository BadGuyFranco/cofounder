# Workspace Root Template - Setup Instructions

This template provides the standard structure for creating new workspace roots that use the Pro Accelerator shared library.

## Using This Template

### 1. Copy the Template

Copy this entire directory to create your new workspace:

```bash
cp -r "system/templates/Workspace Root Template" "/path/to/Your Workspace Name"
```

### 2. Customize AGENTS.md

Replace all `[placeholders]` with workspace-specific information:

- `[Workspace Name]` - Name of your workspace
- `[One-sentence description]` - What this workspace is for
- `[Primary Constraint]` - The most important rule
- `[Workflows]` - Your actual work processes
- `[Quality Standards]` - Standards for deliverables

**Key principle:** Reference `/pro accelerator/` tools, don't duplicate their instructions.

### 3. Customize README.md

Brief human-facing overview (keep to ~30 lines):
- What the workspace is for
- Quick reference to structure
- Key constraints

### 4. Set Up Directories

The template includes empty directories. Populate as needed:

**clients/** - Create subdirectories per client:
```
clients/
├── Client A/
├── Client B/
└── Client C/
```

**internal/** - Team processes and documentation:
```
internal/
├── SOPs/
├── onboarding/
└── processes/
```

**marketing/** - All marketing-related content:
```
marketing/
├── content/        # Blog posts, articles, talks
├── assets/         # Logos, images, brand materials
└── research/       # Competitive analysis, market research
```

**git/scripts/** - Workspace-specific automation:
```
git/scripts/
├── custom_script.py
└── automation.sh
```

**git/templates/** - Reusable documents:
```
git/templates/
├── proposal_template.md
├── contract_template.md
└── email_templates/
```

**zArchive/** - Move replaced items here (don't delete):
```
zArchive/
├── old_version_v1.md
└── deprecated_workflow.md
```

### 5. Create Workspace File

Create a `.code-workspace` file in your Cursor workspaces location:

```json
{
  "folders": [
    {
      "path": "../pro accelerator"
    },
    {
      "path": "../../Path/To/Your Workspace"
    }
  ],
  "settings": {}
}
```

**Note:** `/pro accelerator/` should always be first so its AGENTS.md is discovered.

### 6. Delete This File

Remove `_TEMPLATE_INSTRUCTIONS.md` from your new workspace after setup.

## Template Structure

```
Workspace Root Template/
├── _TEMPLATE_INSTRUCTIONS.md   # These instructions (delete after use)
├── AGENTS.md                   # AI agent instructions (customize)
├── README.md                   # Human overview (customize)
├── clients/                    # Client work directory
├── internal/                   # SOPs and team processes
├── marketing/
│   ├── content/                # Articles, thought leadership
│   ├── assets/                 # Brand materials, images
│   └── research/               # Market research
├── git/
│   ├── scripts/                # Workspace-specific automation
│   └── templates/              # Reusable documents
└── zArchive/                   # Deprecated items
```

## Single Source of Truth

**Critical:** This template follows the single source of truth principle.

- Tool instructions live in `/pro accelerator/tools/[Tool]/AGENTS.md`
- Workspace AGENTS.md references tools, doesn't duplicate their instructions
- When tools update in `/pro accelerator/`, workspaces automatically get the updates

**Wrong approach:**
```markdown
## Content Writing
[Copy of Content Author instructions here]
```

**Correct approach:**
```markdown
## Content Writing
For content creation, load `/pro accelerator/tools/Content Author/AGENTS.md`
```

