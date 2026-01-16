# HubSpot Connector

Connect to HubSpot CRM to manage contacts, companies, deals, and more.

## API Documentation

https://developers.hubspot.com/docs/api/crm/contacts

## Quick Start

```bash
node scripts/contacts.js list
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/hubspot/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
HUBSPOT_ACCESS_TOKEN=pat-na2-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Not configured?** Follow `SETUP.md` to create your Private App.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Destructive Actions Warning

**Before executing ANY destructive operation:**
1. Warn the user explicitly about what will happen
2. List specific consequences (data loss, associations removed)
3. Wait for explicit confirmation before proceeding

Scripts will prompt for confirmation. Use `--force` only when the user has already confirmed.

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"HUBSPOT_ACCESS_TOKEN not found":** Create `/memory/connectors/hubspot/.env` with your token.

**"401 Unauthorized":** Token may be expired or missing required scopes. Regenerate in HubSpot.

**"404 Not Found":** Object ID doesn't exist or you don't have access to it.

**"Scope required":** Some features require specific HubSpot subscriptions (Sales Hub, Service Hub, Marketing Hub).
