# Zoom Connector

Connect to Zoom via their REST API using Server-to-Server OAuth.

## Status

Active

## Quick Start

```bash
node scripts/auth.js verify
```

## Documentation Files

| File | Audience | Purpose |
|------|----------|---------|
| `AGENTS.md` | AI | Configuration and execution |
| `SETUP.md` | User | Credential setup steps |
| `CAPABILITIES.md` | User | What this connector can do |
| `README.md` | Human | Overview and quick start |

## Credentials

Location: `/memory/connectors/zoom/.env`

Required variables:
- `ZOOM_ACCOUNT_ID` - Your Zoom account ID
- `ZOOM_CLIENT_ID` - Server-to-Server OAuth app Client ID
- `ZOOM_CLIENT_SECRET` - Server-to-Server OAuth app Client Secret

## Setup

See `SETUP.md` for credential setup instructions.

## Capabilities

See `CAPABILITIES.md` for what this connector can do.

## Scripts

| Script | Purpose | Key Commands |
|--------|---------|--------------|
| `auth.js` | Authentication | `verify`, `token`, `clear` |
| `users.js` | User management | `list`, `get`, `create`, `update`, `delete` |
| `meetings.js` | Meeting management | `list`, `get`, `create`, `update`, `delete`, `end` |
| `webinars.js` | Webinar management | `list`, `get`, `create`, `update`, `delete`, `end` |
| `recordings.js` | Cloud recordings | `list`, `get`, `delete`, `recover` |
| `reports.js` | Reports and analytics | `daily`, `users`, `meetings`, `webinars` |
| `dashboard.js` | Real-time metrics | `meetings`, `webinars`, `zoom-rooms`, `quality` |
| `groups.js` | Group management | `list`, `get`, `create`, `members` |

Run `node scripts/<script>.js help` for full command documentation.

## Common Patterns

**List user's meetings:**
```bash
node scripts/meetings.js list me
```

**Create a meeting:**
```bash
node scripts/meetings.js create me --topic "Team Standup" --duration 30 --start_time 2024-02-01T09:00:00Z
```

**Get recording for a meeting:**
```bash
node scripts/recordings.js get <meeting_id>
```

**Get dashboard metrics:**
```bash
node scripts/dashboard.js meetings --type 2 --from 2024-01-01 --to 2024-01-31
```

## Troubleshooting

**"Invalid access token" or 401 error:**
- Token may have expired. Run `node scripts/auth.js clear` then retry.
- Verify credentials in `.env` file are correct.
- Ensure Server-to-Server OAuth app has required scopes enabled.

**"User not found" or 404 error:**
- Use `me` for current user or verify the user ID/email exists.
- For meeting/webinar IDs, ensure the ID is correct and belongs to your account.

**"Scope not allowed" or 403 error:**
- The S2S OAuth app needs additional scopes enabled in Zoom Marketplace.
- Check SETUP.md for required scopes and enable them in your app settings.

**"Rate limit exceeded" or 429 error:**
- Zoom has rate limits (10 req/s general, stricter for some endpoints).
- Wait a moment and retry. For bulk operations, add delays between requests.

**"No .env file found":**
- Create `/memory/connectors/zoom/.env` with your credentials.
- Follow SETUP.md for step-by-step instructions.

**"Cannot find module":**
- Dependencies auto-install on first run. If issues persist, run `npm install` in the connector directory.

## API Documentation

https://developers.zoom.us/docs/api/
