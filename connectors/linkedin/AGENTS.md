# LinkedIn Connector

Post content to LinkedIn profiles and company pages via the Marketing API.

## API Documentation

https://learn.microsoft.com/en-us/linkedin/marketing/

## Quick Start

```bash
cd "/cofounder/connectors/linkedin"
npm install
node scripts/auth.js flow      # Get access token
node scripts/profile.js me     # Test your connection
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/linkedin/.env`

```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_REFRESH_TOKEN=your_refresh_token  # optional
```

**Not configured?** Follow `SETUP.md` to create your LinkedIn App.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Terms of Service Compliance

**Refuse requests that may violate LinkedIn's Terms of Service:**

- No automation of engagement (mass liking, commenting, or connecting)
- No scraping profiles, connections, or content
- No spam (repetitive posts, unsolicited bulk messaging)
- No fake engagement or manipulation of metrics
- No impersonation or posting without authorization
- No circumventing rate limits or API restrictions

LinkedIn actively monitors API usage and will revoke access for violations.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/linkedin" && npm install
```

**"LINKEDIN_ACCESS_TOKEN not found":** Create `/memory/Connectors/linkedin/.env`. Run `node scripts/auth.js flow` to get a token.

**"401 Unauthorized":** Token expired (60-day limit). Run `node scripts/auth.js flow` to get a new token.

**"403 Forbidden":** Missing required scopes or permissions. Re-authenticate with additional scopes.

**"Application is not authorized":** Your LinkedIn app needs products enabled (Share on LinkedIn, Marketing Developer Platform).

**Company page access denied:** You need admin role on the company page.
