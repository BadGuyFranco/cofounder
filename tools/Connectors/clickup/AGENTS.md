# ClickUp Connector

Connect to ClickUp to manage workspaces, spaces, folders, lists, and tasks.

## API Documentation

https://clickup.com/api/

## Quick Start

```bash
cd "/cofounder/tools/Connectors/clickup"
npm install
node scripts/workspaces.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/clickup/.env`

```
CLICKUP_API_KEY=pk_XXXXXXXX_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Not configured?** Follow `SETUP.md` to get your API token from ClickUp.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Hierarchy

ClickUp has a hierarchical structure:

```
Workspace (Team)
└── Space
    └── Folder (optional)
        └── List
            └── Task
                └── Subtask
```

**Important:** Lists can exist directly in a Space (folderless) or inside a Folder.

## Destructive Actions Warning

**Before executing ANY destructive operation:**
1. Warn the user explicitly about what will happen
2. List specific consequences (data loss, tasks deleted)
3. Wait for explicit confirmation before proceeding

Scripts will prompt for confirmation. Use `--force` only when the user has already confirmed.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/tools/Connectors/clickup" && npm install
```

**"CLICKUP_API_KEY not found":** Create `/memory/Connectors/clickup/.env` with your token.

**"OAUTH_017":** Token is invalid or expired. Generate a new API token in ClickUp.

**"SPACE_017":** Space not found or token lacks access.

**"ITEM_017":** Task not found or was deleted.

**"Team not found":** Workspace ID is incorrect. Use `node scripts/workspaces.js list` to find valid IDs.

**"429 Too Many Requests":** Rate limit hit (100 requests/minute). Scripts auto-retry with backoff.
