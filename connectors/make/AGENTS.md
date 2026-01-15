# Make Connector

Connect to Make.com to manage scenarios, webhooks, data stores, and more.

## API Documentation

https://developers.make.com/api-documentation

## Quick Start

```bash
node scripts/teams.js list --org-id YOUR_ORG_ID
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/make/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
MAKE_API_TOKEN=xxx
MAKE_REGION=us2
```

**Not configured?** Follow `SETUP.md` to create your Make API token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Troubleshooting

**"MAKE_API_TOKEN not found":** Create `/memory/connectors/make/.env` with your token.

**"401 Unauthorized":** Check your API token is valid and has required scopes.

**"403 Forbidden":** Your token may lack permissions, or the endpoint requires a paid plan.

**Wrong region error:** Check your Make.com URL and set the correct `MAKE_REGION`.
