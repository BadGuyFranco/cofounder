# Airtable Connector

Connect to Airtable to manage bases, tables, and records.

## API Documentation

https://airtable.com/developers/web/api/introduction

## Quick Start

```bash
cd "/cofounder/connectors/airtable"
npm install
node scripts/bases.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/airtable/.env`

```
AIRTABLE_PAT=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Not configured?** Follow `SETUP.md` to create your Personal Access Token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/airtable" && npm install
```

**"AIRTABLE_PAT not found":** Create `/memory/Connectors/airtable/.env` with your token.

**"AUTHENTICATION_REQUIRED":** Token is invalid or expired. Generate a new PAT.

**"NOT_FOUND":** Base, table, or record ID doesn't exist or token lacks access.

**"INVALID_PERMISSIONS":** Token doesn't have required scopes. Check PAT configuration.

**"429 Too Many Requests":** Rate limit hit. Scripts auto-retry, but reduce request frequency.
