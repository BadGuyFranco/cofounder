# SEO Expert

Comprehensive SEO tool that audits any website, generates ready-to-use assets, and executes actions across three operational layers.

## Documentation

- **AGENTS.md** - Complete instructions for AI agents

## Key Features

- **Auto-detects site purpose** - Reads site content to infer type, industry, and audience before asking any questions
- **Eight audit dimensions** - Technical SEO, on-page, content, E-E-A-T, backlinks, structured data, analytics, and LLM/GEO findability
- **Google Search Console integration** - Auto-detects connected properties and pulls live data (queries, CTR, indexation, sitemaps) when available
- **PageSpeed Insights automation** - Runs Core Web Vitals analysis automatically on any URL, no authentication required
- **Prioritized todo list** - Every finding sorted by impact tier with specific fixes and effort estimates

## Scripts

PageSpeed Insights and Google Search Console live in the Google connector:

| Script | Location |
|---|---|
| PageSpeed Insights | `connectors/google/scripts/pagespeed.js` |
| Search Console | `connectors/google/scripts/search-console.js` |

## Configuration

Add `PAGESPEED_API_KEY` to `memory/connectors/google/.env` for reliable PageSpeed quota:

```
PAGESPEED_API_KEY=your_key_here
```

Without a key the free anonymous quota is used, which is sufficient for normal use.

## Common Use Cases

Use this tool when a website URL is provided and the goal is to improve search rankings, diagnose a traffic drop, prepare a site for launch, or audit LLM/AI search visibility. Works on any site type: e-commerce, local business, SaaS, blog, professional services, or portfolio.
