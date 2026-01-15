# WordPress Connector

> **Untested:** This connector has not been tested by the developer yet. Scripts may require adjustments.

Manage WordPress sites via REST API: posts, pages, media, comments, and taxonomies.

## Quick Start

```bash
node scripts/site.js verify
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Single Site:** `/memory/connectors/wordpress/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
WP_SITE_URL=https://yoursite.com
WP_USERNAME=your_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

**Multiple Sites:** Create subdirectories for each site:

```
/memory/connectors/wordpress/
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

**"WP_SITE_URL not found":** Create `.env` with your site URL and credentials.

**"401 Unauthorized":** Check username and application password. Password format: `xxxx xxxx xxxx xxxx xxxx xxxx` (spaces included).

**"403 Forbidden":** User role may lack permissions for this action.

**"404 Not Found":** Post/page/media ID doesn't exist or REST API is disabled.

**"rest_no_route":** WordPress REST API may be disabled. Check Settings > Permalinks or security plugins.

## API Documentation

https://developer.wordpress.org/rest-api/
