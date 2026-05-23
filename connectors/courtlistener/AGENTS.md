# CourtListener Connector

## Status
Active

## Quick Start

```bash
node scripts/citations.js lookup "255 P.3d 1083"
```

Resolves a citation to its matched case(s). Use this to confirm a cite is real before a filing (citation-verification gate).

## Credentials

Location: `/memory/connectors/courtlistener/.env`

Required variables:
- `COURTLISTENER_API_TOKEN` - REST API token from your CourtListener profile

## Scripts

| Script | Purpose | Key commands |
|--------|---------|--------------|
| `citations.js` | Verify and resolve citations | `lookup "<cite or text>"`, `verify "<cite>"` |
| `search.js` | Search case law / opinions | `opinions --q "<query>" [--court <id>] [--limit <n>]` |
| `opinions.js` | Fetch case metadata and full text | `cluster <id>`, `text <opinion_id> [--field plain_text]` |

Auth header: `Authorization: Token <token>` (CourtListener uses "Token", not "Bearer"). Base URL: `https://www.courtlistener.com/api/rest/v4`.

## Setup

See `SETUP.md` for token setup.

## Capabilities

See `CAPABILITIES.md`.

## Troubleshooting

- `Status: 401` or invalid token: token missing or wrong. Check `/memory/connectors/courtlistener/.env`.
- `Status: 403`: account not verified or token lacks access. Confirm email verification on courtlistener.com.
- `Status: 429`: rate limited (citation-lookup is throttled). Wait and retry; batch multiple cites into one `lookup` call (it accepts a block of text).
- `Cannot find module`: first run auto-installs deps; re-run the command.
- Empty `clusters` with `status: 200`: the string parsed but no case matched. Recheck volume/reporter/page; prefer the regional reporter cite (P.2d / P.3d) over a state reporter.

## API

https://www.courtlistener.com/help/api/rest/
