# Notion Connector

Connect to Notion to manage pages and databases.

## API Documentation

https://developers.notion.com/reference

## Quick Start

```bash
node scripts/pages.js create "My Page Title" --parent-id abc123 --content "Hello world"
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/notion/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
NOTION_API_KEY=secret_xxxxxxxxxxxxx
```

**Not configured?** Follow `SETUP.md` to create your Notion integration.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"NOTION_API_KEY not found":** Create `/memory/connectors/notion/.env` with your key.

**"Could not find page/database":** The integration must be explicitly connected to the page. In Notion: "..." menu > "Add connections" > Select your integration.

**Properties not updating:** Property names are case-sensitive; match exactly.
