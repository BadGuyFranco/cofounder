# Node.js Installation

Node.js is required for connectors and some tools (Image Generator, Video Generator).

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check If Already Installed

```bash
node --version
```

If you see a version number (e.g., `v20.10.0`), Node.js is installed. Skip to verification.

## Prerequisites: Miniforge

Node.js is installed via Miniforge (conda). First check if conda is available:

```bash
conda --version
```

If you see "command not found", install Miniforge first:

Follow `/cofounder/system/installer/dependencies/miniforge.md`

Then return here.

## Install Node.js

### Mac

```bash
conda install -y nodejs
```

After installation, restart your terminal or run:

```bash
source ~/.zshrc
```

### Windows (Git Bash)

```bash
conda install -y nodejs
```

After installation, close and reopen Git Bash.

## Verify Installation

```bash
node --version
npm --version
```

Both should show version numbers.

## Troubleshooting

**"node: command not found" after installation:**
- Mac: Run `source ~/.zshrc` or restart terminal
- Windows: Close and reopen Git Bash
- Or run `conda activate` first

**"conda: command not found":**
- Miniforge isn't installed or not in PATH
- Follow `/cofounder/system/installer/dependencies/miniforge.md`

**npm packages fail to install:**
- Try `conda update nodejs` to get the latest version
- Check network connectivity
