# Make Connector

Connect to Make.com to manage scenarios, webhooks, data stores, and more.

## API Documentation

https://developers.make.com/api-documentation

## Quick Start

```bash
cd "/cofounder/connectors/make"
npm install
node scripts/teams.js list --org-id YOUR_ORG_ID
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/make/.env`

```
MAKE_API_TOKEN=xxx
MAKE_REGION=us2
```

**Not configured?** Follow `SETUP.md` to create your Make API token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/make" && npm install
```

**"MAKE_API_TOKEN not found":** Create `/memory/Connectors/make/.env` with your token.

**"401 Unauthorized":** Check your API token is valid and has required scopes.

**"403 Forbidden":** Your token may lack permissions, or the endpoint requires a paid plan.

**Wrong region error:** Check your Make.com URL and set the correct `MAKE_REGION`.
