# Continue Install

The installer cloned CoFounder. Now let's set up your workspace.

## Step 1: Clean Up and Create Folders

Delete the `.vscode` folder in the workspace root if it exists (use the IDE's file explorer or delete tool, not terminal).

Then create the memory and workspaces folders as siblings to cofounder/:

```bash
mkdir -p memory && mkdir -p workspaces
```

## Step 2: Configure IDE

First, detect the IDE by running:

```bash
env | grep -iE "(cursor|windsurf|antigravity)" | head -5
```

- If result contains "cursor" or CURSOR_* env vars: **Skip this step.** Continue to Step 3.
- If no matches (VS Code or other): **Skip this step.** Continue to Step 3.
- If result contains "windsurf" or WINDSURF_* env vars: **Follow Windsurf instructions below.**
- If result contains "antigravity" or ANTIGRAVITY_* env vars: **Follow Antigravity instructions below.**

### Windsurf instructions

Create a global rule memory with these exact values:

- **Title:** Always Apply System Rules
- **Content:** Always load and follow `/cofounder/.cursor/rules/Always Apply.mdc` before any task execution. This file contains core collaboration principles, tool routing, and operational standards that never break. The `alwaysApply: true` flag in YAML frontmatter makes these rules absolute across all workspaces.
- **Tags:** `["global_rule", "hard_rule", "cofounder"]`

### Antigravity instructions

Open (or create) the file:
~/.gemini/GEMINI.md
and write this instruction in it
Always Apply System Rules
- **Content:** Always load and follow `/cofounder/.cursor/rules/Always Apply.md` before any task execution. This file contains core collaboration principles, tool routing, and operational standards that never break. The `alwaysApply: true` flag in YAML frontmatter makes these rules absolute across all workspaces.


## Step 3: Initialize Memory Structure

Create directories and copy template files:

```bash
mkdir -p memory/tools/Content\ Author/Writing\ Samples && mkdir -p memory/connectors && mkdir -p memory/my\ tools && mkdir -p memory/my\ connectors && mkdir -p memory/plans && mkdir -p memory/system && cp cofounder/system/templates/Memory\ Templates/memory-root-AGENTS.md memory/AGENTS.md && cp cofounder/system/templates/Memory\ Templates/my-tools-AGENTS.md memory/my\ tools/AGENTS.md && cp cofounder/system/templates/Memory\ Templates/my-connectors-AGENTS.md memory/my\ connectors/AGENTS.md && cp cofounder/system/version.txt memory/system/version.txt
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

Update the AGENTS.md file, replacing `[Your Name]` with their actual name and by removing the "## Template Instructions (DELETE WHEN DONE)" section in the new file when complete

## Step 5: Create Workspace File

Create the workspace file using this command (replace `[name]` with the user's actual name):

```bash
cat > workspaces/[name].code-workspace <<'EOF'
{
  "folders": [
    { "path": "../cofounder" },
    { "path": "../memory" },
    { "path": "../[name]" }
  ],
  "settings": {
    "terminal.integrated.defaultProfile.windows": "Git Bash",
    "terminal.integrated.profiles.windows": {
      "Git Bash": {
        "path": "C:\\Progra~1\\Git\\bin\\bash.exe",
        "icon": "terminal-bash"
      }
    }
  }
}
EOF
```

Replace `[name]` with the user's actual name in both the filename and the path inside the JSON.

After creating the workspace file, tell the user:

"Congratulations! You just completed the hardest part. You're now officially a 'computer nerd' who can tell your friends you're using an AI IDE and installed CoFounder to write AI content. Welcome to the club."

Then ask:

"Ready to set up your digital twin content author? You'll need 2 or 3 writing samples and about 15 more minutes. If you'd rather come back later, just type 'Start Here' in any new chat and we'll pick up where we left off."

If the user is ready, load and follow:

`/cofounder/system/installer/Start Here.md`

If the user wants to come back later, end the session.

## Troubleshooting

### "Permission denied" creating folders

The parent folder may not allow writes. Create the folders manually in Finder (Mac) or Explorer (Windows), then tell the AI to continue.

### Memory directory already exists

If `/memory/` already has content, skip the copy steps that would overwrite existing files.

## Maintainer Access

If the user has write access to the cofounder repository (they're a maintainer), create:

```bash
touch memory/.maintainer
```

This signals they can modify the shared library.
