# Zoho CRM Connector

Comprehensive access to Zoho CRM: records, automation, pipelines, and organization management.

## Quick Start

```bash
node scripts/auth.js test --org mycompany  # Test connection
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | What this connector can do |

**Not configured?** Follow `SETUP.md`.

**What can I do?** See `CAPABILITIES.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `auth.js` | OAuth setup, token management, multi-org |
| `records.js` | CRUD for all modules (Leads, Contacts, Accounts, Deals, etc.) |
| `search.js` | Search records, COQL queries |
| `workflows.js` | Workflow rules automation |
| `blueprints.js` | Blueprint process automation |
| `pipelines.js` | Deal pipeline management |
| `scoring.js` | Lead/contact scoring rules |
| `webhooks.js` | Webhook integrations |
| `modules.js` | Module metadata, custom modules |
| `fields.js` | Field metadata, custom fields, picklists |
| `users.js` | Users, roles, profiles, territories |
| `org.js` | Organization details and settings |
| `tags.js` | Tag management |
| `bulk.js` | Bulk import/export operations |

Run any script with `help` for full command syntax:
```bash
node scripts/records.js help
node scripts/workflows.js help
```

## Configuration

### OAuth Credentials

**Location:** `/memory/connectors/zoho/<org>.json`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

Each organization has its own JSON config file:

```json
{
  "orgName": "mycompany",
  "region": "us",
  "edition": "professional",
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

`edition` is the expected CRM plan for that org (for example: `standard`, `professional`, `enterprise`, `ultimate`). Use it as the primary limit signal for what scripts and operations should be offered.

### Client Credentials (shared)

**Location:** `/memory/connectors/zoho/.env`

```
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
```

## Multi-Organization Support

Each Zoho organization requires separate authentication. Use `--org` to specify:

```bash
node scripts/auth.js setup --org main-company --region us
node scripts/auth.js setup --org subsidiary --region eu
node scripts/records.js list --module Leads --org main-company
```

List configured organizations:
```bash
node scripts/auth.js orgs
```

Set or view the configured edition for an org:
```bash
node scripts/auth.js edition --org main-company
node scripts/auth.js edition --org main-company --edition professional
```

## Module Operations

Use `records.js` with `--module` for any CRM module:

```bash
# Standard modules
node scripts/records.js list --module Leads
node scripts/records.js list --module Contacts
node scripts/records.js list --module Accounts
node scripts/records.js list --module Deals
node scripts/records.js list --module Products

# Create records
node scripts/records.js create --module Leads --field-Last_Name "Smith" --field-Company "Acme"

# Custom modules work the same way
node scripts/records.js list --module Custom_Module
```

## Regions

Zoho operates in multiple data centers. Specify region during setup:

| Region | Code | API Domain |
|--------|------|------------|
| US | us | zohoapis.com |
| EU | eu | zohoapis.eu |
| India | in | zohoapis.in |
| Australia | au | zohoapis.com.au |
| Japan | jp | zohoapis.jp |
| China | cn | zohoapis.com.cn |
| Canada | ca | zohoapis.ca |

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"No organization configuration found":**
```bash
node scripts/auth.js setup --org <name> --region <region>
```

**"Access token expired":** Tokens auto-refresh. If refresh fails:
```bash
node scripts/auth.js flow --org <name>
```

**"INVALID_TOKEN" or "AUTHENTICATION_FAILURE":** Re-run the OAuth flow.

**"INVALID_DATA":** Check field names match Zoho API names (e.g., `Last_Name` not `lastName`).

**"DUPLICATE_DATA":** Record with same unique field value exists. Use upsert instead.

**"MANDATORY_NOT_FOUND":** Required field missing. Check module requirements.

**Rate limited:** Zoho uses credit-based limits. Wait and retry, or check your plan's limits.

## API Documentation

- CRM API v8: https://www.zoho.com/crm/developer/docs/api/v8/
- Scopes: https://www.zoho.com/crm/developer/docs/api/v8/scopes.html
- Limits: https://www.zoho.com/crm/developer/docs/api/v8/api-limits.html
