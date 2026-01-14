# HeyGen Connector

Generate AI avatar videos via HeyGen's API.

## API Documentation

https://docs.heygen.com

## Quick Start

```bash
cd "/cofounder/connectors/heygen"
npm install
node scripts/videos.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Single Account:** `/memory/connectors/heygen/.env`

```
HEYGEN_API_KEY=your_api_key_here
```

**Multiple Accounts:** Create subdirectories for each account:

```
/memory/connectors/heygen/
  personal/.env    <- Personal HeyGen account
  business/.env    <- Business HeyGen account
```

**Not configured?** Follow `SETUP.md` to get your API key.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Multi-Account Behavior

When multiple accounts are configured and no `--account` flag is specified, ask which account to use before executing HeyGen operations.

## Scripts

| Script | Purpose |
|--------|---------|
| `videos.js` | Create, list, and manage video generations |
| `avatars.js` | List available avatars and manage custom avatars |
| `templates.js` | List and use video templates |
| `voices.js` | List available voices for TTS |

Run any script with `help` to see available commands:
```bash
node scripts/videos.js help
node scripts/avatars.js help
```

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/heygen" && npm install
```

**"HEYGEN_API_KEY not found":** Create `/memory/connectors/heygen/.env` with your API key.

**"401 Unauthorized":** API key is invalid or expired. Generate a new one in HeyGen settings.

**"402 Payment Required":** Account has insufficient credits. Purchase more in HeyGen dashboard.

**"429 Too Many Requests":** Rate limit hit. Wait and retry. HeyGen limits vary by plan.

**"Video stuck in processing":** Video generation can take 1-5 minutes. Use `videos.js status <id>` to check progress.
