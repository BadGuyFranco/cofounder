# Publer Connector

Connect to Publer API for social media scheduling and publishing across multiple platforms.

## Status

Active. Full functionality for:
- Post scheduling and management
- Multi-platform publishing
- Media library management
- Analytics and insights
- Workspace and account management

## Features

- **Post Management**: Create, schedule, update, delete, and duplicate posts
- **Multi-Platform**: Post to 10+ social networks with platform-specific customizations
- **Media Library**: Upload, organize, and manage images, videos, and documents
- **Analytics**: Post insights, hashtag analysis, best times, competitor tracking
- **Workspaces**: Manage multiple workspaces and connected accounts
- **Rate Limiting**: Built-in handling for 100 req/2min limit

## Requirements

- Publer Business or Enterprise plan (API access required)
- Node.js 18+
- npm

## Quick Start

```bash
cd "/cofounder/connectors/publer"
npm install
# Add credentials to /memory/Connectors/publer/.env
node scripts/user.js me  # Verify setup
```

## Documentation

| File | Purpose |
|------|---------|
| `AGENTS.md` | AI agent reference |
| `SETUP.md` | Configuration instructions |
| `CAPABILITIES.md` | Complete command reference |

## Available Scripts

| Script | Purpose |
|--------|---------|
| `user.js` | User profile |
| `workspaces.js` | Workspaces and accounts |
| `posts.js` | Post CRUD and scheduling |
| `media.js` | Media uploads and library |
| `analytics.js` | Performance metrics |

## API Reference

https://publer.com/docs

## Support

- Publer Docs: https://publer.com/docs
- Publer Support: support@publer.com
