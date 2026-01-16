# Installing Python Packages

When you see "ModuleNotFoundError" or missing package errors, install the tool's Python packages.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Quick Fix

Navigate to the tool directory and run:

```bash
pip install -r requirements.txt
```

## Examples

**For Transcriber:**
```bash
cd "/cofounder/tools/Transcriber" && pip install -r requirements.txt
```

## Troubleshooting

**"pip: command not found":**
Python is not properly installed. Options:
1. Install Miniforge: Follow `/cofounder/system/installer/dependencies/miniforge.md`
2. Or use `python -m pip install -r requirements.txt`

**"Permission denied":**
Try `pip install --user -r requirements.txt`

**Package conflicts or version errors:**
Create a dedicated environment:
```bash
conda create -n transcriber python=3.11
conda activate transcriber
pip install -r requirements.txt
```
