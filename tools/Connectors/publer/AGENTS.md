# Publer Connector

Connect to Publer to schedule and publish social media content across multiple platforms.

## API Documentation

- Official Docs: https://publer.com/docs
- Postman Collection: Available in docs (Getting Started > Postman Collection)

## Quick Start

```bash
cd "/cofounder/tools/Connectors/publer"
npm install
node scripts/user.js me              # Verify credentials
node scripts/workspaces.js list      # List workspaces
node scripts/posts.js list           # List posts
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/Connectors/publer/.env`

```
PUBLER_API_KEY=your_api_key_here
PUBLER_WORKSPACE_ID=your_workspace_id_here
```

**Not configured?** Follow `SETUP.md` to get your API key.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## API Specification

| Property | Value |
|----------|-------|
| Base URL | `https://app.publer.com/api/v1` |
| Auth Method | Bearer Token |
| Rate Limit | 100 requests per 2 minutes |
| Format | JSON |

## Available Scripts

| Script | Purpose | Key Commands |
|--------|---------|--------------|
| `user.js` | User profile | `me` |
| `workspaces.js` | Workspaces and accounts | `list`, `accounts`, `current` |
| `posts.js` | Post management | `list`, `create`, `update`, `delete`, `duplicate`, `reschedule` |
| `media.js` | Media library | `list`, `upload`, `upload-url`, `folders`, `delete` |
| `analytics.js` | Performance metrics | `summary`, `charts`, `post`, `posts`, `hashtags`, `best-times`, `members`, `competitors` |

## Common Workflows

### Schedule a Post

```bash
# 1. List accounts to get IDs
node scripts/workspaces.js accounts

# 2. Upload media (optional)
node scripts/media.js upload /path/to/image.jpg

# 3. Create scheduled post
node scripts/posts.js create --text "Your post text" --accounts acc1,acc2 --schedule "2025-01-15T10:00:00"
```

### Publish Immediately

```bash
node scripts/posts.js create --text "Publishing now!" --accounts acc1 --now
```

### Create Draft for Review

```bash
node scripts/posts.js create --text "Draft for review" --accounts acc1 --draft
```

### Get Best Posting Times

```bash
node scripts/analytics.js best-times --account acc123
```

### View Post Performance

```bash
node scripts/analytics.js post post123 --verbose
```

## Terms of Service Guardrails

**Push back on requests that:**
- Exceed 100 API requests in 2 minutes
- Attempt to bypass platform-specific rate limits
- Post spam or misleading content
- Violate any connected platform's ToS

## Troubleshooting

### "401 Unauthorized"

- API key invalid or expired
- Regenerate key in Publer Settings > API

### "403 Forbidden"

- Plan doesn't include API access (Business or Enterprise required)
- Check plan at Publer Settings

### "429 Too Many Requests"

- Rate limit exceeded (100 requests per 2 minutes)
- Script will auto-retry after cooldown

### "Workspace ID Required"

Some endpoints need workspace context:

```bash
# Get workspace IDs
node scripts/workspaces.js list

# Add to .env
PUBLER_WORKSPACE_ID=your_workspace_id
```

### Post Creation Fails

- Verify account IDs are correct: `node scripts/workspaces.js accounts`
- Check media IDs if attaching: `node scripts/media.js list`
- Ensure date format is ISO 8601: `2025-01-15T10:00:00`

## Platform Support

Publer supports scheduling to:
- Facebook (pages and groups)
- Instagram (posts, stories, reels)
- X/Twitter
- LinkedIn (profiles and company pages)
- Pinterest
- TikTok
- YouTube
- Google Business Profile
- Telegram
- WordPress

Platform-specific features vary. Use `--customizations` flag for platform-specific options.

## Response Format

All scripts support `--verbose` flag for full API responses. Default output is human-readable summaries.

## Notes

- Workspace ID is optional for some endpoints (user, workspaces list)
- Analytics endpoints may vary by platform capabilities
- Some features require specific Publer plan tiers
