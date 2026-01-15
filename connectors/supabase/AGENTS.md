# Supabase Connector

Connect to Supabase to manage databases, storage, auth, and edge functions across multiple projects.

## API Documentation

- Project API: https://supabase.com/docs/reference/api
- Management API: https://supabase.com/docs/reference/api/v1

## Quick Start

```bash
# First time: configure access token and project
node scripts/management.js list
node scripts/management.js configure <project-ref>

# Then use project-specific commands (use human-readable name)
node scripts/tables.js list --project test-project
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials location:** `/memory/connectors/supabase/`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
/memory/connectors/supabase/
  .env                      # Account access token
  projects/
    test-project.env        # Human-readable names (auto-generated)
    my-app.env              # Each project gets its own file
```

**Account token (`.env`):**
```
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
```

Project credentials are auto-generated via `management.js configure`. Files are named using the human-readable project name (e.g., "Test Project" becomes `test-project.env`).

**Not configured?** Follow `SETUP.md` to create your access token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Multi-Project Behavior

When the user requests a Supabase operation without specifying a project, ask which project to use. Check configured projects with `node scripts/management.js list`.

All project-level scripts accept `--project <name>` where `<name>` is the human-readable project name (e.g., `test-project`, `my-app`). You can also use the project reference ID; it will be found automatically.

## Troubleshooting

**"SUPABASE_ACCESS_TOKEN not found":**
Create a Personal Access Token at https://supabase.com/dashboard/account/tokens
Add to `/memory/connectors/supabase/.env`

**"Project 'xxx' not configured":**
Run `node scripts/management.js configure <project-ref>` first.

**"Multiple projects configured":**
Specify which project with `--project <name>`.

**"Invalid API key":** Token may be expired or revoked. Generate a new one.

**"relation does not exist":** Table name is wrong or doesn't exist.

**"permission denied":** Using anon key instead of service_role, or RLS blocking access.
