# Cloudflare Connector

Connect to Cloudflare to manage zones, DNS records, page rules, caching, and more.

## API Documentation

https://developers.cloudflare.com/api/

## Quick Start

```bash
cd "/cofounder/connectors/cloudflare"
npm install
node scripts/zones.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/cloudflare/.env`

```
CLOUDFLARE_API_TOKEN=your_api_token_here
```

**Not configured?** Follow `SETUP.md` to create your API Token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Scripts

### Core (Zone-Level)

| Script | Purpose |
|--------|---------|
| `zones.js` | List and manage zones (domains) |
| `dns.js` | Manage DNS records |
| `page-rules.js` | Manage page rules and redirects |
| `ssl.js` | View and update SSL/TLS settings |
| `cache.js` | Purge cache |
| `firewall.js` | Manage firewall rules |

### Platform Services (Account-Level)

| Script | Purpose |
|--------|---------|
| `workers.js` | Deploy and manage Workers |
| `kv.js` | Manage Workers KV storage |
| `r2.js` | Manage R2 object storage (buckets, files) |
| `d1.js` | Manage D1 SQLite databases |
| `pages.js` | Manage Pages projects and deployments |
| `queues.js` | Manage Queues for async messaging |

### Analytics and Protection

| Script | Purpose |
|--------|---------|
| `analytics.js` | Get zone analytics and traffic data |
| `email-routing.js` | Manage email forwarding rules |
| `turnstile.js` | Manage CAPTCHA widgets |
| `waiting-room.js` | Manage traffic queuing rooms |

### Media

| Script | Purpose |
|--------|---------|
| `images.js` | Manage Cloudflare Images |
| `stream.js` | Manage Cloudflare Stream videos |

### Domain Registration

| Script | Purpose |
|--------|---------|
| `registrar.js` | Manage Cloudflare-registered domains |
| `domain-check.js` | Check domain availability (uses RDAP, free, no account) |

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/cloudflare" && npm install
```

**"CLOUDFLARE_API_TOKEN not found":** Create `/memory/Connectors/cloudflare/.env` with your token.

**"Authentication error" (10000):** Token is invalid or expired. Generate a new token.

**"Unknown X-Auth-User-Service-Key" (6003):** Using wrong auth method. Use API Token, not Global API Key.

**"Actor 'com.cloudflare.api.token...' requires permission..." (9109):** Token missing required permissions. Edit token and add permissions.

**"Zone not found":** Domain not in your Cloudflare account or token lacks zone access.

**"Rate limited" (429):** Too many requests. Wait and retry. Limit: 1,200 requests per 5 minutes.
