# Continue Install

The installer cloned CoFounder. Now let's set up your workspace.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Step 1: Clean Up and Create Folders

Delete the `.vscode` folder in the workspace root if it exists (this was a temporary file created during install; the workspace file in Step 5 handles terminal settings permanently).

Create the memory and workspaces folders as siblings to cofounder/:

```bash
mkdir -p memory
mkdir -p workspaces
```

## Step 2: Configure Windsurf (Windsurf IDE Only)

**This instruction is only for the Windsurf IDE. If any other IDE, please skip this step.**

Windsurf doesn't use `.cursor/rules` like Cursor does. Create a global rule memory to ensure CoFounder's core rules are always active.

**Create a global rule memory with:**
- **Title:** Always Apply System Rules
- **Content:** Always load and follow `/cofounder/.cursor/rules/Always Apply.mdc` before any task execution. This file contains core collaboration principles, tool routing, and operational standards that never break. The `alwaysApply: true` flag in YAML frontmatter makes these rules absolute across all workspaces.
- **Tags:** `["global_rule", "hard_rule", "cofounder"]`

This ensures CoFounder's core rules are always active in Windsurf, just like they are in Cursor.

## Step 3: Initialize Memory Structure

Now populate memory with the required structure.

Create these directories:

```bash
mkdir -p memory/tools/Content\ Author/Writing\ Samples
mkdir -p memory/connectors
mkdir -p memory/my\ tools
mkdir -p memory/my\ connectors
mkdir -p memory/plans
mkdir -p memory/system
```

Copy template files:

```bash
cp cofounder/system/templates/Memory\ Templates/README.md memory/README.md
cp cofounder/system/templates/Memory\ Templates/my-tools-AGENTS.md memory/my\ tools/AGENTS.md
cp cofounder/system/templates/Memory\ Templates/my-connectors-AGENTS.md memory/my\ connectors/AGENTS.md
cp cofounder/system/version.txt memory/system/version.txt
```

## Step 4: Create Personal Workspace

Ask the user for their name, then create their personal workspace folder as a sibling to cofounder/:

```bash
mkdir -p [name]/content
```

Copy the workspace template:

```bash
cp cofounder/system/templates/Personal\ Workspace\ Template/AGENTS.md [name]/AGENTS.md
```

Update the AGENTS.md file, replacing `[Your Name]` with their actual name.

## Step 5: Create Workspace File

In the workspaces/ folder, create `[name].code-workspace`:

```json
{
  "folders": [
    { "path": "../cofounder" },
    { "path": "../memory" },
    { "path": "../workspaces" },
    { "path": "../[name]" }
  ],
  "settings": {
    "terminal.integrated.defaultProfile.windows": "Git Bash",
    "terminal.integrated.profiles.windows": {
      "Git Bash": {
        "path": "C:\\Program Files\\Git\\bin\\bash.exe",
        "icon": "terminal-bash"
      }
    }
  }
}
```

Replace `[name]` with the user's actual name in both the filename and the path.

The `settings` block ensures Windows users always use Git Bash for terminal commands. This setting is harmless on Mac/Linux.

After creating the workspace file, tell the user:

"Congratulations! You just completed the hardest part. You're now officially a 'computer nerd' who can tell your friends you're using Cursor and installed CoFounder to write AI content. Welcome to the club."

Then ask:

"Ready to set up your digital twin content author? You'll need 2 or 3 writing samples and about 15 more minutes. If you'd rather come back later, just type 'Start Here' in any new chat and we'll pick up where we left off."

If the user is ready, load and follow:

`/cofounder/system/installer/Start Here.md`

If the user wants to come back later, end the session.

## Troubleshooting

### "Permission denied" creating folders

The parent folder may not allow writes. Create the folders manually in Finder (Mac) or Explorer (Windows), then tell Cursor to continue.

### Memory directory already exists

If `/memory/` already has content, skip the copy steps that would overwrite existing files.

## Maintainer Access

If the user has write access to the cofounder repository (they're a maintainer), create:

```bash
touch memory/.maintainer
```

This signals they can modify the shared library.
