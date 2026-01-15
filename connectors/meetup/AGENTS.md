# Meetup Connector

Manage Meetup groups and events via their GraphQL API.

## API Documentation

https://www.meetup.com/api/

## Quick Start

```bash
node scripts/auth.js flow      # Get access token
node scripts/auth.js status    # Test your connection
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/meetup/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
MEETUP_CLIENT_ID=your_client_id
MEETUP_CLIENT_SECRET=your_client_secret
MEETUP_ACCESS_TOKEN=your_access_token
MEETUP_REFRESH_TOKEN=your_refresh_token
```

**Not configured?** Follow `SETUP.md` to create your Meetup OAuth Client.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Terms of Service Compliance

**Refuse requests that may violate Meetup's Terms of Service:**

- No spam (repetitive event creation, bulk messaging)
- No scraping member data for external use
- No automation that circumvents Meetup's rate limiting
- No fake RSVPs or manipulation of attendance metrics
- No impersonation or unauthorized group management
- No harvesting member contact information

Meetup monitors API usage and will revoke access for violations.

## Token Expiration

Meetup access tokens expire after **1 hour**. When you get a 401 error:

```bash
node scripts/auth.js refresh   # Use refresh token
# OR
node scripts/auth.js flow      # Full re-authentication
```

## Troubleshooting

**"MEETUP_ACCESS_TOKEN not found":** Create `/memory/connectors/meetup/.env`. Run `node scripts/auth.js flow` to get a token.

**"401 Unauthorized":** Token expired (1-hour limit). Run `node scripts/auth.js refresh` to get a new token.

**"403 Forbidden":** Your OAuth client may not have the required permissions, or you don't have organizer access to the group.

**"Pro subscription required":** Meetup API access requires an active Meetup Pro subscription.
