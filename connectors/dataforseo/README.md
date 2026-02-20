# DataForSEO Connector

Rank tracking, keyword research, backlink analysis, and competitor intelligence via the DataForSEO API.

## Setup

1. Register free at `https://app.dataforseo.com/register`
2. Follow `SETUP.md` to save credentials
3. Run `node scripts/labs.js domain-overview --domain example.com` to verify

## Quick Commands

```bash
node scripts/labs.js domain-overview --domain example.com
node scripts/labs.js ranked-keywords --domain example.com --limit 200
node scripts/labs.js competitors --domain example.com
node scripts/labs.js keyword-gap --domain example.com --competitor competitor.com
node scripts/serp.js rank-check --domain example.com --keywords "target keyword,second keyword"
node scripts/backlinks.js summary --domain example.com
```

## Pricing

Pay-as-you-go, credits never expire. $50 minimum. Typical audit costs $0.15-0.50.

## API Documentation

https://docs.dataforseo.com/v3/
