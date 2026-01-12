# Monday.com Connector

Connect to Monday.com to manage boards, items, groups, columns, subitems, comments, tags, workspaces, and users.

## API Documentation

https://developer.monday.com/api-reference/docs

## Quick Start

```bash
cd "/cofounder/tools/Connectors/monday"
npm install
node scripts/boards.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/monday/.env`

```
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
```

**Not configured?** Follow `SETUP.md` to get your API token from Monday.com.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Destructive Actions Warning

**Before executing ANY destructive operation:**
1. Warn the user explicitly about what will happen
2. List specific consequences (data loss, items deleted)
3. Wait for explicit confirmation before proceeding

Scripts will prompt for confirmation. Use `--force` only when the user has already confirmed.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/tools/Connectors/monday" && npm install
```

**"MONDAY_API_KEY not found":** Create `/memory/Connectors/monday/.env` with your token.

**"Not Authenticated":** Token may be invalid or expired. Generate a new one in Monday.com.

**"Field not found":** Check column IDs with `node scripts/boards.js get <id> --columns`.

**"Couldn't change column value":** Column value JSON structure is wrong. Use `--verbose` to debug.

**"InvalidColumnIdException":** Column ID doesn't exist. Use `node scripts/columns.js list <board_id>` to see valid IDs.
