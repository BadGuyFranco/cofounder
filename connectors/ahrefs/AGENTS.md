# Ahrefs Connector

Domain Rating, backlink profile, and organic keyword data via the Ahrefs API v3.

## Status

Active. Domain Rating works with no key; advanced data needs a paid key.

## Two Tiers

| Tier | Needs a key? | Commands |
|------|--------------|----------|
| Free, public | No key, no units | `metrics.js dr` (DR for any domain + competitors), `auth.js check` |
| Paid, keyed | Paid plan + `AHREFS_API_KEY` | `metrics.js overview` / `limits`, all of `backlinks.js`, `keywords.js` |

The free tier uses the public `domain-rating-free` endpoint and covers the highest-value SEO Expert need (DR and competitor-DR benchmarking) at zero cost. Only reach for a paid key when referring domains, anchors, or organic keywords are required.

## Quick Start

```bash
node scripts/metrics.js dr --domain example.com
```

No key needed. If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Create and store the optional paid API key (AI walks the user through it) |
| `CAPABILITIES.md` | Full list of what this connector can do |

## Configuration

**Credentials (optional):** `/memory/connectors/ahrefs/.env`

`/memory/` is a workspace root. Resolve from the workspace paths before reading or creating this file. No file is needed for the free `dr` command.

```
AHREFS_API_KEY=your_api_key
```

The key comes from Account settings > API keys (`app.ahrefs.com/account/api-keys`), requires a paid plan, and is separate from the Browser Control login at `/memory/tools/browser-control/sites/ahrefs.env`. All three coexist: free `dr` first, paid key for deeper data, Browser Control as fallback (see Relationship to Browser Control).

**Want the paid data?** Walk the user through `SETUP.md`.

## Domain Rating License

The free `dr` data is subject to Ahrefs' Domain Rating License (`ahrefs.com/legal/domain-rating-license`): attribution required if DR is displayed or published publicly, and it may not be resold as a competing service. Internal audit use is fine. Surface this note if a user wants to publish DR figures.

## Scripts

| Script | Commands | Purpose |
|--------|----------|---------|
| `auth.js` | `check` | Validate the key (free test query, zero units) |
| `metrics.js` | `dr`, `overview`, `limits` | Domain Rating, full snapshot, unit usage |
| `backlinks.js` | `refdomains`, `anchors` | Referring domains, anchor text distribution |
| `keywords.js` | `organic` | Ranked keywords, quick-win position filtering |

Run any script with `help` for full syntax.

## Key Commands

| Command | What It Returns |
|---------|----------------|
| `node scripts/metrics.js dr --domain D` | Domain Rating for D (free, no key) |
| `node scripts/metrics.js dr --domain D --competitors a.com,b.com` | DR for D and each competitor (free, no key) for benchmark gap |
| `node scripts/metrics.js overview --domain D` | DR + backlink stats + organic traffic/keywords/value |
| `node scripts/metrics.js limits` | API units remaining this billing period |
| `node scripts/backlinks.js refdomains --domain D --limit 50` | Top referring domains by DR |
| `node scripts/backlinks.js anchors --domain D` | Anchor text distribution |
| `node scripts/keywords.js organic --domain D --min-position 11 --max-position 20` | Quick-win keywords (positions 11-20) |

## Relationship to Browser Control

This API connector is the primary path for Domain Rating, referring domains, anchors, and organic keywords. The Browser Control Ahrefs guide (`tools/Browser Control/sites/Ahrefs.md`, login at `/memory/tools/browser-control/sites/ahrefs.env`) remains the fallback for:

- Data not exposed by this connector's commands (broken-backlink reclaim, Content Gap, Link Intersect)
- Runs where the API key is missing, rate-limited (60 req/min), or out of units
- Cross-checking a value the API returns

Order of preference: this connector first, Browser Control second, manual / Ahrefs Webmaster Tools third.

## Unit Awareness

- Most requests consume API units (minimum 50 units each); the Rank Tracker, Management, and free test queries do not.
- Requests targeting `ahrefs.com` or `wordcount.com` are free test queries (used by `auth.js check`).
- Check remaining units with `node scripts/metrics.js limits` before large pulls.
- Rate limit: 60 requests per minute (HTTP 429 if exceeded).

## Troubleshooting

**"AHREFS_API_KEY not found":** Create `/memory/connectors/ahrefs/.env`. Follow `SETUP.md`.

**401 Unauthorized:** Key is wrong or revoked. Recreate at `app.ahrefs.com/account/api-keys`. Keys expire after 1 year.

**403 Forbidden:** Plan has no API access, or the key is missing. Confirm API access is included on the Ahrefs subscription.

**429 Too Many Requests:** Rate limit (60/min). Wait and retry, or batch fewer calls.

**Empty result for a list endpoint:** The domain may have no data for the chosen mode. Try `--mode domain` or widen `--protocol both`.

## API Reference

https://docs.ahrefs.com/en/api
