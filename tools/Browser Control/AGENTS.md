# Browser Control

Automate a visible Chromium browser via terminal commands.

## Behavior

Be autonomous. Only pause for required user input (login, CAPTCHA, ambiguous decisions). Routine follow-through (cleanup, docs, session management) requires no prompting.

## Quick Start

```bash
node scripts/session.js start     # Launch browser (stays open)
node scripts/navigate.js https://example.com
node scripts/snapshot.js          # Read page content
node scripts/session.js stop      # Close when done
```

Session options: `--port <n>`, `--profile <name>`, `--headless`

## Commands

| Script | Purpose |
|--------|---------|
| session.js | Start/stop browser |
| navigate.js | Go to URL |
| snapshot.js | Read page content (for AI) |
| click.js | Click element |
| type.js | Type text or press keys |
| wait.js | Wait for condition |
| screenshot.js | Capture image |
| execute.js | Run JavaScript |
| scroll.js | Scroll page |
| frame.js | Switch to/from iframe |
| select.js | Dropdown menus |
| mouse.js | Hover, drag |
| download.js | Download files |
| upload.js | Upload files |
| tabs.js | Manage tabs |
| cookies.js | Manage cookies |
| storage.js | localStorage/sessionStorage |
| dialog.js | Handle alerts/confirms |
| check.js | Verify element state |
| console.js | Capture console logs |
| network.js | Capture/block requests |
| emulate.js | Device/viewport emulation |
| video.js | Record session |

Run `node scripts/<name>.js help` for options.

## Workflow

1. Run `<script>.js help` if unsure of options
2. Take action (click, type, navigate)
3. Wait if needed (`--network` or `--selector`)
4. Snapshot to verify result

## Obstacles

| Issue | Action |
|-------|--------|
| Login required | Tell user to log in manually |
| CAPTCHA | Tell user to solve it |
| Cookie consent | Click accept button |
| Multiple matches | Use more specific selector |

## Output Format

```xml
<page_content>
{snapshot or extracted data}
</page_content>

<analysis>
{your interpretation}
</analysis>
```

## Persistence

Profile data: `~/.browser-control/profiles/default/`. Login once, stay logged in.

## Site Guides

Check `/memory/tools/browser-control/sites/` first, then `sites/`. See `DEVELOPMENT.md` for customization.

## Setup

See `SETUP.md` for installation.

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Browser session not running" | Run `session.js start` |
| "Timeout exceeded" | Check selector or increase `--timeout` |
| "strict mode violation" | Use more specific selector |
