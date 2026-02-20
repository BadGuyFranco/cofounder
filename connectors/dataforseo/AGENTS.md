# DataForSEO Connector

Rank tracking, keyword research, backlink analysis, competitor intelligence, and search volume data via the DataForSEO API.

## Quick Start

```bash
node scripts/labs.js domain-overview --domain example.com
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Account registration and credential setup |
| `CAPABILITIES.md` | Full list of what this connector can do |

**Not configured?** Follow `SETUP.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `serp.js` | Rank checking and live SERP results |
| `backlinks.js` | Backlink summary, referring domains, link gap |
| `labs.js` | Domain overview, ranked keywords, competitors, keyword gap, keyword research |

Run any script with `help` for full syntax:
```bash
node scripts/serp.js help
node scripts/backlinks.js help
node scripts/labs.js help
```

## Configuration

**Credentials:** `/memory/connectors/dataforseo/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
DATAFORSEO_LOGIN=your@email.com
DATAFORSEO_PASSWORD=your_api_password
```

`DATAFORSEO_PASSWORD` is the API-specific password from `app.dataforseo.com/api-access`, not the account login password.

**Not configured?** Follow `SETUP.md`.

## Key Commands

| Command | What It Returns |
|---------|----------------|
| `node scripts/labs.js domain-overview --domain D` | Organic keyword count, traffic estimate, position distribution |
| `node scripts/labs.js ranked-keywords --domain D` | Every keyword the domain ranks for, with position and search volume |
| `node scripts/labs.js competitors --domain D` | Competitor domains by keyword overlap |
| `node scripts/labs.js keyword-gap --domain D --competitor C` | Keywords competitor ranks for that D does not |
| `node scripts/labs.js search-volume --keywords "kw1,kw2"` | Monthly search volume and CPC per keyword |
| `node scripts/serp.js rank-check --domain D --keywords "kw1,kw2"` | Exact position for specific keywords |
| `node scripts/serp.js serp --keyword "phrase"` | Full top-10 SERP for any keyword |
| `node scripts/backlinks.js summary --domain D` | Total backlinks, referring domains, anchor distribution |
| `node scripts/backlinks.js referring-domains --domain D` | Top domains linking to D with rank and link count |
| `node scripts/backlinks.js link-gap --domain D --competitor C` | Domains linking to C but not to D |

## Calling from SEO Expert

Run from the cofounder workspace root:

```bash
node connectors/dataforseo/scripts/labs.js domain-overview --domain example.com
node connectors/dataforseo/scripts/labs.js ranked-keywords --domain example.com --limit 200
node connectors/dataforseo/scripts/serp.js rank-check --domain example.com --keywords "target keyword"
node connectors/dataforseo/scripts/backlinks.js summary --domain example.com
```

## Cost Reference

All prices in USD. Credits never expire. $50 minimum deposit.

| Operation | Cost |
|-----------|------|
| SERP rank check (per keyword, depth 10) | ~$0.002 |
| SERP rank check (per keyword, depth 100) | ~$0.004 |
| Domain overview | ~$0.01 |
| Ranked keywords (per domain) | ~$0.01-0.04 |
| Competitor discovery | ~$0.002 |
| Keyword gap (per call) | ~$0.01 |
| Search volume (per keyword) | ~$0.001 |
| Backlink summary | ~$0.002 |
| Referring domains | ~$0.002 |
| Link gap | ~$0.002 |

Typical full SEO audit using this connector: $0.15-0.50 total.

## API Reference

https://docs.dataforseo.com/v3/

## Troubleshooting

**"DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not found":** Create `/memory/connectors/dataforseo/.env`. Follow `SETUP.md`.

**401 Unauthorized:** Wrong login or password. Double-check at `app.dataforseo.com`.

**"Task error 40501":** The target domain has no data. Domain may be too new, have no indexed content, or have no ranking keywords for the selected location.

**"Task error 40000":** Insufficient balance. Add credits at `app.dataforseo.com/billing`.
