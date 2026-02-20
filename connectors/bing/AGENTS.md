# Bing Webmaster Tools Connector

Site verification status, sitemap management, crawl statistics, URL submission, and keyword data via the Bing Webmaster API.

## Quick Start

```bash
node scripts/webmaster.js sites
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step API key setup and site verification |
| `CAPABILITIES.md` | What this connector can do |

**Not configured?** Follow `SETUP.md`.

**What can I do?** See `CAPABILITIES.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `webmaster.js` | All Bing Webmaster Tools operations |

Run with `help` for full syntax:
```bash
node scripts/webmaster.js help
```

## Site Registry

Verified Bing sites are cached at `/memory/connectors/bing/sites.json` after any `sites` command runs. Check this file first when a site URL is needed - no need to ask the user which property to use.

```json
{
  "last_updated": "2026-02-20",
  "sites": [
    { "url": "https://example.com", "verified": true }
  ]
}
```

If the file is missing or stale, run `node scripts/webmaster.js sites` to refresh.

## Configuration

**Credentials:** `/memory/connectors/bing/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
BING_WEBMASTER_API_KEY=your_api_key_here
```

**Not configured?** Follow `SETUP.md` to generate an API key.

## Available Commands

| Command | What It Does |
|---------|-------------|
| `sites` | List all verified sites in the Bing Webmaster account |
| `sitemaps --site URL` | List sitemaps submitted for a site |
| `add-sitemap --site URL --sitemap URL` | Submit a sitemap to Bing |
| `remove-sitemap --site URL --sitemap URL` | Remove a sitemap from Bing |
| `crawl-stats --site URL` | 30-day crawl volume, error count, blocked pages |
| `crawl-issues --site URL` | Crawl errors grouped by issue type |
| `submit-url --site URL --url URL` | Submit a single URL for Bing indexing |
| `submit-urls --site URL --urls URL1,URL2,...` | Submit up to 10 URLs (batch) |
| `keyword-stats --query "keyword"` | Monthly impressions, clicks, CTR for a keyword |

## Calling from SEO Expert

Run from the cofounder workspace root (not from inside the connector directory):

```bash
node connectors/bing/scripts/webmaster.js sites
node connectors/bing/scripts/webmaster.js crawl-stats --site https://example.com
node connectors/bing/scripts/webmaster.js add-sitemap --site https://example.com --sitemap https://example.com/sitemap.xml
```

## Troubleshooting

**"BING_WEBMASTER_API_KEY not found":** Create `/memory/connectors/bing/.env` with the API key. Follow `SETUP.md`.

**401 Unauthorized:** API key is invalid or expired. Generate a new key at `https://www.bing.com/webmasters/` under API Access.

**403 Forbidden:** Site is not verified in the Bing Webmaster account. Follow the verification steps in `SETUP.md`.

**Empty crawl-stats or crawl-issues:** Site may be newly added or not yet crawled by Bingbot. Allow 48-72 hours after verification.

**Batch limit:** `submit-urls` accepts a maximum of 10 URLs per call. Split larger lists into multiple calls.

## API Reference

https://learn.microsoft.com/en-us/bingwebmaster/getting-access
