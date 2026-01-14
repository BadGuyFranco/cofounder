# Migrations

Instructions for updating `/memory/` when the library changes.

## When to Use

When `/memory/system/version.txt` differs from `/cofounder/system/version.txt` (or `version.txt` is missing).

## Process

1. Read `/cofounder/system/version.txt` to get current library version
2. Read `/memory/system/version.txt` to get user's last applied version (if missing, assume never migrated)
3. Find all migration files in this directory dated AFTER user's version
4. Guide user through each migration in chronological order
5. After completing all migrations, update `/memory/system/version.txt` to match library version

## Migration Files

Files are named `YYYY-MM-DD-description.md`. Each contains:
- What changed and why
- Step-by-step migration instructions
- Verification steps

Read and execute them in date order (oldest first).

## Example

User's `/memory/system/version.txt`: `2025-01-01`  
Library `/cofounder/system/version.txt`: `2025-01-14`

Apply: `2025-01-14-memory-restructure.md` (any migrations between those dates)

Then set `/memory/system/version.txt` to `2025-01-14`.

## New Users

If `/memory/system/version.txt` doesn't exist, user either:
1. Never completed setup (direct to `/cofounder/system/Start Here.md`)
2. Setup predates versioning (apply all migrations, then create `system/version.txt`)
