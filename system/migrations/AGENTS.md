# Migrations

Instructions for updating `/memory/` when the library changes.

## When to Use

When `/memory/system/version.txt` differs from `/cofounder/system/version.txt` (or is missing).

## Process

1. Read `/cofounder/system/version.txt` (library version)
2. Read `/memory/system/version.txt` (user's version; if missing, see below)
3. Find migration files in this directory dated AFTER user's version
4. Execute each migration in date order (oldest first)
5. Update `/memory/system/version.txt` to match library version

Migration files are named `YYYY-MM-DD-description.md` and contain step-by-step instructions.

## Missing version.txt

If `/memory/system/version.txt` does not exist:

**Check if `/memory/my tools/` exists:**
- Yes → Setup predates versioning. Apply all migrations, then create version.txt.
- No → Setup incomplete. Direct to `/cofounder/system/installer/Continue Install.md`.
