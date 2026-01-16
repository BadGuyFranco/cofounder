# Go High Level Connector

Connect to Go High Level CRM.

## API Documentation

https://highlevel.stoplight.io/docs/integrations

## Quick Start

```bash
node scripts/contacts.js search "john" --location "My Account"
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/gohighlevel/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
GHL_MY_ACCOUNT_ID=your-location-id
GHL_MY_ACCOUNT_KEY=pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

GHL_DEFAULT=My Account
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

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"No .env file found":** Create the `.env` file in `/memory/connectors/gohighlevel/` (resolve `/memory/` from `user_info.Workspace Paths`).

**"No location specified":** Use `--location "Name"` or set `GHL_DEFAULT` in .env.

**"Unauthorized":** Check API key is correct and has appropriate scopes.
