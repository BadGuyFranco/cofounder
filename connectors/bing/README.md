# Bing Webmaster Tools Connector

Manage sites, sitemaps, crawl data, and URL indexing on Bing Search via the Bing Webmaster API.

## Setup

1. Follow `SETUP.md` to generate your API key and verify your sites
2. Add your API key to `/memory/connectors/bing/.env`
3. Run `node scripts/webmaster.js sites` to confirm connection

## What It Does

- List verified sites
- Submit and manage sitemaps
- View crawl statistics and errors
- Submit URLs for Bing indexing
- Query keyword impression and click data

## Quick Commands

```bash
node scripts/webmaster.js sites
node scripts/webmaster.js crawl-stats --site https://example.com
node scripts/webmaster.js add-sitemap --site https://example.com --sitemap https://example.com/sitemap.xml
node scripts/webmaster.js submit-url --site https://example.com --url https://example.com/new-page
```

## API Documentation

https://learn.microsoft.com/en-us/bingwebmaster/getting-access
