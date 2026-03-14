# Browser Control

Automate web browsers programmatically using Playwright.

## What It Does

- Navigate pages, click, type, scroll
- Read page content (structured for AI)
- Handle iframes, tabs, dialogs
- Download/upload files
- Manage cookies and storage
- Screenshot and video recording
- Device emulation (mobile viewports)
- Persistent login sessions

## How It Works

Browser Control has two interfaces that share the same browser and profile:

**MCP (preferred in IDE):** Runs as an MCP server inside Cursor or Claude Code. The AI gets native `browser_*` tools with smart waiting, retry, and element refs. No session management needed.

**CLI scripts (universal):** Run from any terminal. A local HTTP server manages a Chromium instance. Scripts send commands to the server.

```
MCP:     IDE starts server  ->  AI calls browser_*  ->  Browser acts
CLI:     session.js start   ->  navigate.js, click.js, etc.  ->  session.js stop
```

## Limitations

- Cannot solve CAPTCHAs (user must intervene)
- Cannot bypass login walls (user must authenticate)
- Chromium by default (Firefox/WebKit available via MCP config)

## Documentation

| File | Purpose |
|------|---------|
| SETUP.md | Installation |
| AGENTS.md | AI agent instructions |
| DEVELOPMENT.md | Extension and customization |
| scripts/*.js help | Per-script usage details |
| sites/*.md | Site-specific patterns |
