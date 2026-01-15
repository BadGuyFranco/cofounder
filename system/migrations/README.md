# Migrations

Version-controlled changes that require user action after `git pull`.

## How It Works

1. **Library version** lives in `/cofounder/system/version.txt` (date format: YYYY-MM-DD)
2. **User's applied version** lives in `/memory/system/version.txt`
3. After `git pull`, compare versions and apply any migrations between them

## After Git Pull

Check for pending migrations:

```bash
# Compare versions
LIB_VERSION=$(cat /cofounder/system/version.txt)
MY_VERSION=$(cat /memory/system/version.txt 2>/dev/null || echo "0000-00-00")

if [ "$LIB_VERSION" != "$MY_VERSION" ]; then
  echo "Migrations pending. Check /cofounder/system/migrations/"
fi
```

Or simply: **After every `git pull`, check this directory for any migrations dated after your `/memory/system/version.txt`.**

## Migration File Format

Files are named `YYYY-MM-DD-description.md` and contain:
- What changed
- Why it changed
- Step-by-step migration instructions
- Verification steps

## Applying Migrations

1. Read each migration file dated after your `/memory/system/version.txt`
2. Follow the instructions in order (oldest first)
3. Update `/memory/system/version.txt` to match `/cofounder/system/version.txt`

## Creating Migrations

When making breaking changes to `/cofounder/`:

1. Create migration file: `/cofounder/system/migrations/YYYY-MM-DD-description.md`
2. Update `/cofounder/system/version.txt` to the same date
3. Document what changed and how users should migrate

## Version History

| Version | Description |
|---------|-------------|
| 2025-01-15 | Miniforge setup (replaces Homebrew/Xcode) |
| 2025-01-14 | Memory directory restructure (mirrors /cofounder/ paths) |
