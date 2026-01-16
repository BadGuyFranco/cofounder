# Airtable Connector

Connect to Airtable to manage bases, tables, and records.

## API Documentation

https://airtable.com/developers/web/api/introduction

## Quick Start

```bash
node scripts/bases.js list
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/airtable/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
AIRTABLE_PAT=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Not configured?** Follow `SETUP.md` to create your Personal Access Token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"AIRTABLE_PAT not found":** Create `/memory/connectors/airtable/.env` with your token.

**"AUTHENTICATION_REQUIRED":** Token is invalid or expired. Generate a new PAT.

**"NOT_FOUND":** Base, table, or record ID doesn't exist or token lacks access.

**"INVALID_PERMISSIONS":** Token doesn't have required scopes. Check PAT configuration.

**"429 Too Many Requests":** Rate limit hit. Scripts auto-retry, but reduce request frequency.
