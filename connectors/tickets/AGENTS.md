# Tickets Connector

CoBuilder's integrated ticketing system for org-scoped bug tracking. File, list, update, and comment on tickets from Claude Code sessions or any CLI environment.

## Quick Start

```bash
# List all open tickets
node scripts/list.js --status open

# File a new bug
node scripts/create.js --title "Bug title" --description "Details" --component server

# File a feature request with tags
node scripts/create.js --title "Add dark mode" --description "..." --component ide --type feature --tags "ui,theme"

# Update a ticket's status
node scripts/update.js <ticket-id> --status resolved

# Set to waiting (blocked on external input)
node scripts/update.js <ticket-id> --status waiting

# Add a comment
node scripts/comment.js <ticket-id> --body "Fixed by changing X"
```

## Configuration

**Target selection** (which server to talk to):
- `--target staging` (default) -- `https://api-staging.cobuilder.me` — all bugs live here under CoBuilder HQ
- `--target local` -- `http://localhost:3000` — only for local dev/testing
- Or set `TICKETS_TARGET=local` in environment to override

**Org selection** (which organization to scope tickets to):
- `--org <uuid>` -- specific org UUID
- Or set `COBUILDER_ORG_ID=<uuid>` in environment
- Default: CoBuilder HQ (`00000000-0000-4000-a000-000000000002`)

**Service account** (who is filing the ticket):
- Default on staging: `admin@cobuilder.me` (UUID `00000000-0000-4000-a000-000000000003`) — admin of CoBuilder HQ org
- Default on local: dev system user (`00000000-0000-4000-a000-000000000001`)
- Override: `--user-id <id>` or `TICKETS_USER_ID=<id>` in environment
- Both staging and local run in dev-bypass mode — `--user-id` must be an internal UUID (not a clerk_id string).

## Scripts

| Script | Purpose | Key flags |
|--------|---------|-----------|
| `create.js` | File a new ticket | `--title`, `--description`, `--component`, `--type`, `--severity`, `--visibility`, `--tags`, `--context` |
| `list.js` | List/search tickets | `--status`, `--severity`, `--component`, `--type`, `--visibility`, `search --q "text"` |
| `update.js` | Update ticket fields | `--status`, `--severity`, `--type`, `--visibility`, `--assigned-to`, `--tags` |
| `comment.js` | Add a comment | `--body`, `--commenter-type` |

## Valid Enum Values

- **type:** `bug`, `feature`, `support`, `task`
- **visibility:** `private` (filer only), `team` (team members), `internal` (org members), `customer` (org + filer)
- **status:** `open`, `in_progress`, `waiting`, `resolved`, `closed`, `wont_fix`
- **severity:** `critical`, `high`, `medium`, `low`
- **reporterType / commenterType:** `developer`, `agent`, `user`
- **component:** any string (conventions: `server`, `ide`, `smart-layer`, `billing`, `database`, `auth`, `security`, `website`)

## The Context Field

When filing bugs, include a `--context` JSON string to tell the fixer which files and packages to read:

```bash
node scripts/create.js \
  --title "Trace field mismatch" \
  --description "Server sends timestamps but IDE expects timing" \
  --component server \
  --severity medium \
  --context '{"packages":["server","ide"],"files":["server/src/debug-trace.plugin.ts","cobuilder-ide/src/renderer/src/components/devtools/TracePanel.tsx"]}'
```

Context fields (all optional):
- `packages` -- which monorepo packages are involved
- `files` -- specific files to read (relative to infrastructure/)
- `adrs` -- relevant architecture decisions
- `dependencies` -- external packages involved
- `related_tickets` -- related ticket IDs

## Four-Tier Visibility Model

Tickets have a `visibility` field that controls who can see them (enforced by database RLS):

| Visibility | Who can see |
|-----------|-------------|
| `private` | Only the user who filed the ticket |
| `team` | Members of the ticket's team (requires `--team-id`) |
| `internal` | All members of the ticket's organization |
| `customer` | Org members + the filing user (for customer-reported bugs) |

Default is `internal` — visible to all CoBuilder HQ org members.

## Well-Known Service Accounts

All ticket operations on staging authenticate as the CoBuilder HQ admin service account. No Clerk JWT is needed — staging's auth middleware accepts the `X-User-Id` header as a fallback.

| Identity | clerk_id | UUID | Email | Role |
|----------|----------|------|-------|------|
| CoBuilder HQ Admin | `service_cobuilder-hq-admin` | `00000000-0000-4000-a000-000000000003` | `admin@cobuilder.me` | admin of CoBuilder HQ |
| Dev System User (local only) | `system_dev-bypass` | `00000000-0000-4000-a000-000000000001` | `system+dev-bypass@cobuilder.dev` | admin of CoBuilder HQ |

**How it works on staging:** The staging server runs in dev-bypass mode (`NODE_ENV=development`), which passes the `X-User-Id` header value directly as the internal user ID — no clerk_id resolution occurs. The connector sends `X-User-Id: 00000000-0000-4000-a000-000000000003` (the admin user's internal UUID). This UUID is used both for RLS context and as the `user_id` column value on writes.

**If the service account is missing** (e.g., after a database wipe), re-run migration 0023 or manually insert the three rows: user, org, and membership. See `database/migrations/0023_ticketing_system_user.sql` for the original seed SQL. The HQ admin user (`...0003`) was added after 0023 — insert it manually:

```sql
INSERT INTO users (id, clerk_id, email, display_name)
VALUES ('00000000-0000-4000-a000-000000000003', 'service_cobuilder-hq-admin', 'admin@cobuilder.me', 'CoBuilder HQ Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (org_id, user_id, role)
VALUES ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', 'admin')
ON CONFLICT (org_id, user_id) DO NOTHING;
```

## Convention for Claude Code Sessions

Every session should:
1. List open tickets at session start: `node scripts/list.js --status open`
2. File a ticket for every bug found during the session
3. Update tickets to `in_progress` when starting a fix
4. Update tickets to `resolved` when the fix is verified
5. List tickets at session end to verify the tracker reflects reality
