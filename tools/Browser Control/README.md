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

Browser Control runs a local server managing a Chromium instance. Scripts send commands to the server. The browser stays open between commands so you can watch automation in real-time.

```
session.js start  →  Launches browser + server
navigate.js       →  Browser navigates
click.js          →  Browser clicks
session.js stop   →  Closes browser + server
```

## Limitations

- Cannot solve CAPTCHAs (user must intervene)
- Cannot bypass login walls (user must authenticate)
- Chromium only (Firefox/WebKit not supported)

## Documentation

| File | Purpose |
|------|---------|
| SETUP.md | Installation |
| AGENTS.md | AI agent instructions |
| DEVELOPMENT.md | Extension and customization |
| scripts/*.js help | Per-script usage details |
| sites/*.md | Site-specific patterns |
