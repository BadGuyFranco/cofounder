# WordPress Connector

Manage WordPress sites via REST API: posts, pages, media, comments, and taxonomies.

## Quick Start

```bash
cd "/cofounder/tools/Connectors/wordpress"
npm install
node scripts/site.js verify
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Single Site:** `/memory/Connectors/wordpress/.env`

```
WP_SITE_URL=https://yoursite.com
WP_USERNAME=your_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

**Multiple Sites:** Create subdirectories for each site:

```
/memory/Connectors/wordpress/
  myblog/.env      <- blog.example.com
  myshop/.env      <- shop.example.com
```

**Not configured?** Follow `SETUP.md` to create your Application Password.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Scripts

| Script | Purpose |
|--------|---------|
| `site.js` | Verify connection, get site info |
| `posts.js` | Create, list, update, delete, schedule posts |
| `pages.js` | Create, list, update, delete pages |
| `media.js` | Upload, list, update, delete media files |
| `taxonomies.js` | Manage categories and tags |
| `comments.js` | List, create, moderate comments |
| `users.js` | List users, get user info |

Run any script with `help` for full command syntax.

## Multi-Site Behavior

When multiple sites are configured and no `--site` flag is specified, ask which site to use before executing operations.

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/tools/Connectors/wordpress" && npm install
```

**"WP_SITE_URL not found":** Create `.env` with your site URL and credentials.

**"401 Unauthorized":** Check username and application password. Password format: `xxxx xxxx xxxx xxxx xxxx xxxx` (spaces included).

**"403 Forbidden":** User role may lack permissions for this action.

**"404 Not Found":** Post/page/media ID doesn't exist or REST API is disabled.

**"rest_no_route":** WordPress REST API may be disabled. Check Settings > Permalinks or security plugins.

## API Documentation

https://developer.wordpress.org/rest-api/
