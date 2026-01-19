# Miniforge Installation

Miniforge provides the `conda` package manager, required for Transcriber and Python tools.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check If Already Installed

```bash
conda --version
```

If you see a version number, Miniforge (or Anaconda/Miniconda) is installed. Skip to verification.

## If conda Not Found But Miniforge Directory Exists

Check if Miniforge is installed but not initialized:

```bash
test -d ~/miniforge3 && echo "Miniforge installed but not initialized" || echo "Not installed"
```

If installed but not initialized, run:

```bash
~/miniforge3/condabin/conda init bash
```

Then restart Git Bash (close and reopen the terminal).

## Install Miniforge

### Mac

```bash
curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-$(uname -m).sh -o /tmp/miniforge.sh && bash /tmp/miniforge.sh -b -p $HOME/miniforge3 && $HOME/miniforge3/bin/conda init zsh && $HOME/miniforge3/bin/conda init bash && rm /tmp/miniforge.sh
```

After installation, restart your terminal or run:

```bash
source ~/.zshrc
```

### Windows (Git Bash)

First check if Miniforge exists but isn't initialized:

```bash
if [ -d ~/miniforge3 ] && ! command -v conda &> /dev/null; then
    echo "Miniforge is installed but not initialized for this shell."
    ~/miniforge3/condabin/conda init bash
    echo "Please restart Git Bash and try again."
else
    echo "Proceed with installation"
fi
```

If the above says "Please restart Git Bash", do that. Otherwise, download and run the installer:

```bash
curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Windows-x86_64.exe -o /tmp/miniforge.exe
```

```bash
cmd.exe //c "$(cygpath -w /tmp/miniforge.exe)" /InstallationType=JustMe /RegisterPython=0 /S /D=%USERPROFILE%\\miniforge3
```

After installation, close and reopen Git Bash.

## Verify Installation

```bash
conda --version
```

Should show a version number (e.g., `conda 24.x.x`).

## Troubleshooting

**"conda: command not found" after installation:**
- First check if Miniforge directory exists: `test -d ~/miniforge3 && echo "exists"`
- If it exists, initialize it: `~/miniforge3/condabin/conda init bash`
- Then restart Git Bash (close and reopen)
- Mac users may also need: `source ~/miniforge3/bin/activate` then `conda init zsh`

**Windows: Installation hangs or fails:**
- Download installer manually from https://github.com/conda-forge/miniforge/releases
- Run the .exe installer directly (not through curl)

**Mac: Permission denied:**
- Check disk permissions in System Settings > Privacy & Security
- Try installing to a different location: change `-p $HOME/miniforge3` to another path
