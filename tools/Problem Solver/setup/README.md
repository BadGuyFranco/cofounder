# Setup Helper Scripts

This directory contains scripts that assist with installation and dependency verification.

## Purpose

Setup scripts help users install your library's dependencies and verify their environment is configured correctly. These are **installation tools**, not usage tools.

## Typical Setup Scripts

### setup.sh (or setup.py)
Automated installation script that:
- Checks for required system tools
- Installs dependencies
- Creates necessary directories
- Configures initial settings
- Provides clear success/error messages

### check_status.sh (or verify.sh)
Dependency verification script that:
- Checks all dependencies are installed
- Verifies versions meet requirements
- Tests basic functionality
- Offers to auto-fix common issues

## When to Include Setup Scripts

**Include setup scripts when:**
- Installation has multiple steps
- Dependencies need verification
- Common installation issues need handling
- Users benefit from automated setup

**Skip setup scripts when:**
- Installation is simple (single `pip install` or `npm install`)
- Standard package manager handles everything
- Setup offers no additional value

## Documentation

Setup scripts should be:
- ✅ Referenced in `AGENTS.md` under "Dependencies & Installation" section
- ❌ NOT featured in `README.md` (brief overview only)
- ✅ Mentioned in installation troubleshooting when helpful

**Note:** AGENTS.md already includes installation instructions. Setup scripts are optional helpers that can simplify complex installations.

## Example

See existing libraries for reference:
- Image Generator: `setup/setup.sh` and `setup/check_status.sh`
- Voice Transcription: `setup/setup.sh`

