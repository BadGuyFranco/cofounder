# Go High Level Connector

Connect to Go High Level CRM.

## API Documentation

https://highlevel.stoplight.io/docs/integrations

## Quick Start

```bash
cd "/cofounder/tools/Connectors/gohighlevel"
npm install
node scripts/contacts.js search "john" --location "First Strategy"
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/gohighlevel/.env`

```
GHL_FIRST_STRATEGY_ID=VKxBzjSxzspKqBPmB1cV
GHL_FIRST_STRATEGY_KEY=pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

GHL_WISER_ID=BbJWkTXiYkK3LrkcdCYo
GHL_WISER_KEY=pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

GHL_DEFAULT=First Strategy
```

**Not configured?** Follow `SETUP.md` to get your API key and Location ID.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Multi-Location Behavior

All commands require `--location "Name"` unless `GHL_DEFAULT` is set. Use `node scripts/contacts.js locations` to list available locations.

## Destructive Actions Warning

**Before executing ANY destructive operation:**
1. Warn the user explicitly about what will happen
2. List specific consequences (data loss, notifications sent, costs incurred)
3. Wait for explicit confirmation before proceeding

Scripts will prompt for confirmation. Use `--force` only when the user has already confirmed.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/tools/Connectors/gohighlevel" && npm install
```

**"No .env file found":** Create `/memory/Connectors/gohighlevel/.env` with your credentials.

**"No location specified":** Use `--location "Name"` or set `GHL_DEFAULT` in .env.

**"Unauthorized":** Check API key is correct and has appropriate scopes.
