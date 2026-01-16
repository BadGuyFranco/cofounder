# Migration: Miniforge Setup (Homebrew/Xcode Replacement)

**Version:** 2025-01-15  
**Breaking:** No (additive change)  
**Affects:** All users; required for new tool features

## What Changed

CoFounder now uses **Miniforge** instead of Homebrew/Xcode for dependency management:

| Old Approach | New Approach |
|--------------|--------------|
| Xcode CLI tools | Not required |
| Homebrew | Miniforge (conda) |
| `brew install` | `conda install` |
| Mac-only | Mac AND Windows |

All tool documentation updated to show `conda install` as primary option.

## Why

- **Cross-platform:** Miniforge works on Mac AND Windows (Homebrew is Mac-only)
- **No Xcode:** Eliminates 4GB+ Xcode CLI download
- **Single installer:** One command installs the package manager
- **Cursor-installable:** AI can install Miniforge automatically
- **Complete stack:** Node.js, Python, FFmpeg, Pandoc all available via conda

## Who Must Migrate

- **New users:** Continue Install.md handles this automatically
- **Existing users with Homebrew:** Follow migration steps below
- **Existing users without Homebrew:** Follow migration steps below

## Migration Steps

### Step 1: Check Current State

Run this in Cursor chat:

```
Check my current development environment:
- Is conda installed?
- Is Node.js installed? What version and where?
- Is Python installed? What version and where?
- Is FFmpeg installed?
- Is Pandoc installed?
```

### Step 2: Install Miniforge (if not present)

**Mac:**
```bash
curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-$(uname -m).sh -o /tmp/miniforge.sh && bash /tmp/miniforge.sh -b -p $HOME/miniforge3 && $HOME/miniforge3/bin/conda init zsh && $HOME/miniforge3/bin/conda init bash && rm /tmp/miniforge.sh && echo "Miniforge installed! Restart your terminal."
```

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe -OutFile $env:TEMP\miniforge.exe; Start-Process $env:TEMP\miniforge.exe -ArgumentList '/S','/D=%USERPROFILE%\miniforge3' -Wait; Write-Host "Miniforge installed! Restart your terminal."
```

After installation, **restart your terminal** for conda to be available.

### Step 3: Install Core Dependencies

```bash
conda install -y nodejs python ffmpeg pandoc
```

### Step 4: Install Transcriber Dependencies

```bash
pip install openai-whisper torch torchaudio huggingface_hub
```

### Step 5: Verify Installation

```bash
echo "=== VERIFICATION ===" && \
node --version && \
python --version && \
ffmpeg -version | head -1 && \
pandoc --version | head -1 && \
whisper --help | head -1 && \
echo "All tools installed!"
```

Expected output shows versions for all tools.

### Step 6: Update Version

```bash
echo "2025-01-15" > /memory/system/version.txt
```

## Optional: Remove Homebrew

If you want to match the user environment exactly (recommended for tool developers):

**This is destructive. Only do this if you're sure.**

```bash
# Uninstall Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"

# Remove leftover files (if any)
sudo rm -rf /opt/homebrew

# Remove Xcode CLI tools
sudo rm -rf /Library/Developer/CommandLineTools
```

After removal, all dependencies come exclusively from Miniforge.

## Verification

After migration:

```bash
# Should show conda-installed versions
which node    # ~/miniforge3/bin/node (not /opt/homebrew/bin/node)
which python  # ~/miniforge3/bin/python
which ffmpeg  # ~/miniforge3/bin/ffmpeg
which pandoc  # ~/miniforge3/bin/pandoc

# Version file should be updated
cat /memory/system/version.txt  # 2025-01-15
```

## Coexistence

Miniforge and Homebrew CAN coexist. If you keep both:
- Homebrew tools at `/opt/homebrew/bin/`
- Miniforge tools at `~/miniforge3/bin/`
- PATH order determines which is used first

For most users, coexistence is fine. Miniforge handles CoFounder dependencies; Homebrew can handle other tools.

## Troubleshooting

### "conda: command not found"

Miniforge installed but shell not configured:

**Mac:**
```bash
source ~/miniforge3/bin/activate
~/miniforge3/bin/conda init zsh
```

Then restart terminal.

**Windows:** Open "Miniforge Prompt" from Start menu, or restart your terminal.

### "Node.js shows old version"

Homebrew Node.js may be shadowing conda Node.js:

```bash
which node  # If /opt/homebrew/bin/node, Homebrew is first in PATH
```

Either:
1. Remove Homebrew Node.js: `brew uninstall node`
2. Or reorder PATH to put Miniforge first

### "Permission denied on /opt/homebrew"

If you tried to remove Homebrew and got permission errors:

```bash
sudo rm -rf /opt/homebrew
```

## Updated Documentation

All tool and connector documentation now shows `conda install` as primary:

- `tools/Video Generator/AGENTS.md` - FFmpeg via conda
- `tools/Documentor/AGENTS.md` - Pandoc via conda
- `tools/Transcriber/AGENTS.md` - Whisper via pip (after conda Python)
- `system/installer/Continue Install.md` - Complete Miniforge setup flow

## Questions?

If you encounter issues during migration, ask in Cursor chat:

```
I'm running the Miniforge migration and encountering [describe issue]. Help me troubleshoot.
```
