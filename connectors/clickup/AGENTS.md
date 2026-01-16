# ClickUp Connector

Connect to ClickUp to manage workspaces, spaces, folders, lists, and tasks.

## API Documentation

https://clickup.com/api/

## Quick Start

```bash
node scripts/workspaces.js list
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/clickup/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

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

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"CLICKUP_API_KEY not found":** Create `/memory/connectors/clickup/.env` with your token.

**"OAUTH_017":** Token is invalid or expired. Generate a new API token in ClickUp.

**"SPACE_017":** Space not found or token lacks access.

**"ITEM_017":** Task not found or was deleted.

**"Team not found":** Workspace ID is incorrect. Use `node scripts/workspaces.js list` to find valid IDs.

**"429 Too Many Requests":** Rate limit hit (100 requests/minute). Scripts auto-retry with backoff.
