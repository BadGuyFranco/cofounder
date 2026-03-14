# Browser Control

Automate a visible Chromium browser via MCP tools or CLI scripts.

## Behavior

Be autonomous. Only pause for required user input (login, CAPTCHA, ambiguous decisions). Routine follow-through (cleanup, docs, session management) requires no prompting.

## Two Interfaces

Browser Control has two interfaces. Use whichever is available.

**MCP tools (preferred):** If you have `browser_*` tools in your tool list, use them. They offer smarter waiting, built-in retry, vision capabilities, and element refs from accessibility snapshots. No session management needed; the browser launches automatically.

**CLI scripts (fallback):** If MCP tools are not available, use the scripts in `scripts/`. These work from any terminal, any context. Support interactive element indexing for reliable element targeting.

Both share the same Playwright install and the same profile directory (`~/.browser-control/profiles/default/`).

## MCP Workflow

1. **Navigate** with `browser_navigate`
2. **Snapshot** with `browser_snapshot` (returns accessibility tree with element refs)
3. **Act** using refs from the snapshot (`browser_click`, `browser_type`, etc.)
4. **Verify** by taking another snapshot

Element refs from snapshots are how you target elements. Use them instead of CSS selectors.

### MCP Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to URL |
| `browser_navigate_back` | Go back one page |
| `browser_snapshot` | Read page content (accessibility tree with refs) |
| `browser_click` | Click element by ref |
| `browser_hover` | Hover over element |
| `browser_drag` | Drag element to target |
| `browser_type` | Type text into focused element |
| `browser_press_key` | Press keyboard key (Enter, Tab, etc.) |
| `browser_press_sequentially` | Type text character by character |
| `browser_select_option` | Select dropdown option |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_take_screenshot` | Capture page image (vision enabled) |
| `browser_tabs` | List, open, close, switch tabs |
| `browser_run_code` | Execute JavaScript on the page |
| `browser_pdf_save` | Generate PDF of page |

## CLI Workflow

**Interactive element indexing (recommended):**

```bash
node scripts/session.js start
node scripts/navigate.js https://example.com
node scripts/snapshot.js --interactive    # See numbered elements
node scripts/click.js --index 5          # Click element #5
node scripts/type.js --index 3 --text "hello"  # Type into element #3
```

This is the most reliable way to target elements. The snapshot numbers them; click/type by number.

**Classic workflow:**

```bash
node scripts/session.js start
node scripts/navigate.js https://example.com
node scripts/snapshot.js
node scripts/click.js --selector "button.submit"
node scripts/session.js stop
```

Session options: `--port <n>`, `--profile <name>`, `--headless`

### CLI Scripts

| Script | Purpose |
|--------|---------|
| session.js | Start/stop browser |
| navigate.js | Go to URL |
| snapshot.js | Read page content (`--interactive` for indexed elements) |
| click.js | Click element (`--index`, `--selector`, `--text`, `--coords`) |
| type.js | Type text (`--index`, `--selector`) or press keys (`--key`) |
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
| trace.js | Record session trace for debugging |
| video.js | Video recording (requires session restart) |

Run `node scripts/<name>.js help` for options.

### Tracing (CLI debugging)

Record a session trace for debugging failed automations:

```bash
node scripts/trace.js start
# ... perform actions ...
node scripts/trace.js stop --output ~/debug-trace.zip
npx playwright show-trace ~/debug-trace.zip
```

## Obstacles

| Issue | Action |
|-------|--------|
| Login required | Tell user to log in manually in the browser window |
| CAPTCHA | Tell user to solve it |
| Cookie consent | Click accept button |
| Multiple matches (CLI) | Use `--interactive` snapshot, then `--index` |
| Element not in snapshot (MCP) | Scroll or navigate to reveal it, then re-snapshot |
| Stale element index (CLI) | Re-run `snapshot.js --interactive` to refresh |

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

Profile data: `~/.browser-control/profiles/default/`. Login once, stay logged in across sessions.

## Site Guides

Check `/memory/tools/browser-control/sites/` first, then `sites/`. See `DEVELOPMENT.md` for customization.

## Setup

See `SETUP.md` for installation.

## Troubleshooting

| Error | Fix |
|-------|-----|
| MCP tools not available | Restart IDE to reload MCP config. Or use CLI scripts. |
| "Browser session not running" (CLI) | Run `session.js start` |
| Browser not launching | Run `npx playwright install chromium` |
| "Timeout exceeded" | Automatic retry handles most cases. Increase `--timeout` if persistent. |
| "strict mode violation" (CLI) | Use `--interactive` + `--index` instead of CSS selector |
| Element ref not found (MCP) | Take a fresh snapshot |
| Element index not found (CLI) | Re-run `snapshot.js --interactive` (page changed since last snapshot) |
