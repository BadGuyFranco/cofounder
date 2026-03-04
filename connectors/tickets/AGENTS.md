# Tickets Connector

CoBuilder's integrated ticketing system for bug tracking. File, list, update, and comment on tickets from Claude Code sessions or any CLI environment.

## Quick Start

```bash
# List all open tickets
node scripts/list.js

# File a new bug
node scripts/create.js --title "Bug title" --description "Details" --component server

# Update a ticket's status
node scripts/update.js <ticket-id> --status resolved

# Add a comment
node scripts/comment.js <ticket-id> --body "Fixed by changing X"
```

## Configuration

**Target selection** (which server to talk to):
- `--target local` (default) -- `http://localhost:3000`
- `--target staging` -- `https://api-staging.cobuilder.me`
- Or set `TICKETS_TARGET=staging` in environment

**User ID** (who is filing the ticket):
- `--user-id <uuid>` -- specific user UUID
- Or set `TICKETS_USER_ID=<uuid>` in environment
- Default: `v0-anonymous` (dev-bypass mode)

## Scripts

| Script | Purpose | Key flags |
|--------|---------|-----------|
| `create.js` | File a new ticket | `--title`, `--description`, `--component`, `--severity`, `--context` |
| `list.js` | List/search tickets | `--status`, `--severity`, `--component`, `search --q "text"` |
| `update.js` | Update ticket fields | `--status`, `--severity`, `--component`, `--context` |
| `comment.js` | Add a comment | `--body`, `--commenter-type` |

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

## Valid Enum Values

- **reporterType / commenterType:** `developer`, `agent`, `user`
- **status:** `open`, `in_progress`, `resolved`, `closed`, `wont_fix`
- **severity:** `critical`, `high`, `medium`, `low`
- **component:** any string (conventions: `server`, `ide`, `smart-layer`, `billing`, `database`, `auth`, `security`, `website`)

## Convention for Claude Code Sessions

Every session should:
1. List open tickets at session start: `node scripts/list.js --status open`
2. File a ticket for every bug found during the session
3. Update tickets to `in_progress` when starting a fix
4. Update tickets to `resolved` when the fix is verified
5. List tickets at session end to verify the tracker reflects reality
