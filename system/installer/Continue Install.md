# Continue Install

The CoFounder Installer downloaded the toolkit. Now let's set up your environment.

## Step 1: Install Package Manager (Miniforge)

Check if conda is already installed:

```bash
conda --version
```

If conda is found, skip to Step 2.

If NOT found, install Miniforge for your operating system:

### Mac

```bash
curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-$(uname -m).sh -o /tmp/miniforge.sh && bash /tmp/miniforge.sh -b -p $HOME/miniforge3 && $HOME/miniforge3/bin/conda init zsh && $HOME/miniforge3/bin/conda init bash && rm /tmp/miniforge.sh
```

After installation, restart your terminal or run:
```bash
source ~/.zshrc
```

### Windows (Git Bash)

Download and run the installer:
```bash
curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe -o /tmp/miniforge.exe && cmd.exe /c "$(cygpath -w /tmp/miniforge.exe) /InstallationType=JustMe /RegisterPython=0 /S /D=%USERPROFILE%\\miniforge3"
```

After installation, close and reopen Git Bash.

### Verify Installation

```bash
conda --version
```

If you see a version number, continue to Step 2.

## Step 2: Install Node.js

Check if Node.js is already installed:

```bash
node --version
```

If node is found, skip to Step 3.

If NOT found, install via conda:

```bash
conda install -y nodejs
```

### Verify Installation

```bash
node --version
```

If you see a version number, continue to Step 3.

## Step 3: Initialize Memory Structure

The installer created an empty `/memory/` folder. Now populate it with the required structure.

Create these directories:

```bash
mkdir -p memory/tools/Content\ Author/Writing\ Samples
mkdir -p memory/tools/Image\ Generator
mkdir -p memory/tools/Video\ Generator
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
  ]
}
```

Replace `[name]` with the user's actual name in both the filename and the path.

## Step 6: Voice Setup

Now run the voice discovery process. Load and follow:

`/cofounder/system/installer/Start Here.md`

## Maintainer Access

If the user has write access to the cofounder repository (they're a maintainer), create:

```bash
touch memory/.maintainer
```

This signals they can modify the shared library.

## Troubleshooting

### "conda: command not found"

Miniforge is installed but the terminal doesn't see it yet.

**Mac:** Run `source ~/miniforge3/bin/activate`

**Windows:** Close and reopen Git Bash.

### "Permission denied" creating folders

The parent folder may not allow writes. Create the folders manually in Finder (Mac) or Explorer (Windows), then tell Cursor to continue.

### Node.js installation fails

Try installing directly:

**Mac:**
```bash
brew install node
```

**Windows:** Download from https://nodejs.org and run the installer.
