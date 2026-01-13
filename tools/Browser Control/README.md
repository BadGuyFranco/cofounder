# Browser Control

Automate web browser interactions for data extraction, form filling, and site monitoring.

## When to Use

**Use Browser Control when:**
- Extracting data from JavaScript-rendered pages
- Interacting with authenticated sessions (login persists)
- Automating multi-step web workflows
- Scraping dynamic content

**Skip Browser Control when:**
- Simple HTTP requests work (use curl)
- User needs to interact manually (just provide URL)
- API is available (use API directly)

## Setup

**MCP Browser Tools** (built into Cursor): Enable the `cursor-ide-browser` MCP server in Cursor Settings > Features > MCP Servers.

**Playwright Scripts** (external): Install Node.js and run `npm install playwright && npx playwright install chromium` in your automation directory.

See `AGENTS.md` for detailed setup instructions.

## Quick Start

Navigate to a page and take a snapshot:

```
browser_navigate: https://example.com
browser_snapshot
```

Then interact using element refs from the snapshot.

## Documentation

- **AGENTS.md** - Complete AI agent instructions (MCP tools, patterns, strategies)
- **sites/** - Site-specific guides with domain quirks

## Site Guides

| Site | Guide | Key Patterns |
|------|-------|--------------|
| LinkedIn | `sites/LinkedIn.md` | Modal clicks, high-res photos, rate limits |
| Google Sheets | `sites/Google Sheets.md` | Iframe handling, table extraction |
| PodMatch | `sites/PodMatch.md` | Direct image extraction |

## Key Concepts

**Checkpoint Pattern**: Always verify actions succeeded before proceeding.  
**Snapshot First**: Take accessibility snapshot before any interaction.  
**Verify After**: Re-snapshot after clicks that should change page state.  
**Retry Logic**: Maximum 2 attempts, then hard stop and report failure.
