# Template for New Workspace Root - Instructions

This template provides the standard structure for creating new workspace roots.

## Using This Template

### 1. Copy the Template

Copy this entire directory to create your new workspace:

```bash
cp -r "/path/to/Template for New Workspace Root" "/path/to/Your New Workspace"
```

### 2. Customize README.md

Replace all `[placeholders]` with your workspace-specific information:
- `[Workspace Name]` - The name of your workspace
- `[One-sentence description]` - Brief description of workspace purpose
- `[Feature 1-4]` - Key features of the workspace
- `[2-3 sentences]` - Detailed explanation of what the workspace does
- `[Critical constraints]` - Important rules for this workspace

Keep README.md **brief** (30-50 lines). This is for humans, not AI agents.

### 3. Customize AGENTS.md

Replace all `[placeholders]` and complete all sections:

**Workspace Structure Section:**
- List all root directories (always include `/pro accelerator/`)
- Mark which are active (read/write) vs reference (read-only)
- Add explicit AI agent rules

**Foundation Documents:**
- Add all documents that must be referenced
- Include full paths using root-relative format
- Explain when to reference each one

**Workflows:**
- Create sections for each major workflow
- Provide step-by-step instructions
- Include validation steps

**Content Sections:**
- Define target audience if creating content
- List what the workspace creates
- List what it does NOT create
- Set quality standards

Remove any sections that don't apply to your workspace.

### 4. Populate git/ Directory

Add your core instruction files and resources:
- Main instruction files (referenced from AGENTS.md)
- Resource directories (templates, examples, references)
- Create `git/zArchive/` subdirectory

See `git/README.md` in this template for guidance.

### 5. Create Additional Directories

Based on your workspace needs:
- Output directories (e.g., `/AI Output/`, `/Content/`, `/Deliverables/`)
- Client directories (e.g., `/clients/`)
- Asset directories (e.g., `/Marketing/`, `/Assets/`)

### 6. Create Workspace File

Create a `.code-workspace` file in `/GPT/Workspaces/`:

**Simple workspace (active + shared only):**

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

**With reference workspace:**

```json
{
  "folders": [
    {
      "path": "../pro accelerator"
    },
    {
      "path": "../../Path/To/Your Workspace"
    },
    {
      "path": "../../Path/To/Reference Workspace"
    }
  ],
  "settings": {}
}
```

### 7. Update MASTER Workspace

Add your new workspace root to `MASTER.code-workspace`.

### 8. Delete This File

Remove `_TEMPLATE_INSTRUCTIONS.md` from your new workspace - it's only for template users.

## Template Structure Explained

```
Template for New Workspace Root/
├── _TEMPLATE_INSTRUCTIONS.md    # These instructions (delete after use)
├── README.md                     # Brief human-facing overview (customize)
├── AGENTS.md                     # Complete AI agent instructions (customize)
└── git/                          # Core instructions and resources
    └── README.md                 # Guidance on using git/ directory
```

## Standard Elements

Every workspace should have:
- ✅ README.md (brief, 30-50 lines)
- ✅ AGENTS.md (complete instructions)
- ✅ Workspace structure section in AGENTS.md
- ✅ Foundation document references
- ✅ Clear workflows
- ✅ Quality standards
- ✅ git/ directory for core materials

## Reference

See `/pro accelerator/zShared Management/README.md` (Workspace Structure section) for:
- Complete multi-root workspace documentation
- Best practices
- AI agent rules
- Common configurations

## Questions?

This template is based on the standardized structure across all existing workspaces.

**Workspace Pattern Reference:**
- **Standalone pattern** - Self-contained project with no external dependencies
- **Reference pattern** - Builds on methodology from another workspace (read-only reference)

See `/pro accelerator/zShared Management/README.md` for complete pattern documentation.

