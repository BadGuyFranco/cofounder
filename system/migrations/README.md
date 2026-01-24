# Migrations

Changes that require updates to `/memory/` after `git pull`.

See `AGENTS.md` for AI instructions on applying migrations.

## Version History

| Version | Description |
|---------|-------------|
| 2026-01-24 | Workspace Authority declaration; voice.md moves to root folder level; adds /memory/AGENTS.md |
| 2026-01-20 | Browser Control setup improvements, Update.md clarifications |
| 2025-01-15 | Miniforge setup (replaces Homebrew/Xcode) |
| 2025-01-14 | Memory directory restructure (mirrors /cofounder/ paths) |

## Creating Migrations (Maintainers)

1. Create file: `YYYY-MM-DD-description.md`
2. Update `/cofounder/system/version.txt` to same date
3. Document what changed and migration steps
