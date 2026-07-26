# Browser Control Development

Extension and customization patterns for Browser Control.

## Site Guides

Site-specific automation patterns help agents work with particular websites. Two locations:

| Location | Purpose |
|----------|---------|
| `/memory/tools/browser-control/sites/` | User overrides (checked first) |
| `/cofounder/tools/Browser Control/sites/` | Shared defaults (fallback) |

**Loading precedence:** User file wins. If no user file exists, use cofounder version.

**Fork model:** Creating a user file means you own that site's patterns. You get full control but cofounder updates won't flow to your version. Don't create a user file if you want automatic improvements.

### Adding a New Site Guide

Create `sites/[SiteName].md` with:

- Base URL patterns
- Capabilities table
- Authentication notes
- Common workflows (using MCP tool names and/or CLI commands)
- Known quirks
- Failure patterns

See existing site guides for examples.

## MCP Server Configuration

The launcher script (`start-mcp.js`) accepts pass-through arguments for the Playwright MCP server. Common options:

| Flag | Purpose |
|------|---------|
| `--browser <name>` | Browser to use: chromium (default), chrome, firefox, webkit, msedge |
| `--headless` | Run without visible window |
| `--caps vision` | Enable vision-based interactions (screenshot analysis) |
| `--caps pdf` | Enable PDF generation |
| `--save-trace` | Save Playwright trace for debugging |
| `--save-video 800x600` | Record session video |
| `--proxy-server <url>` | Route through proxy |
| `--device "iPhone 15"` | Emulate a device |
| `--viewport-size 1280x720` | Set viewport dimensions |

To add flags, edit the `args` array in the MCP config files (`.cursor/mcp.json` and `.mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["tools/Browser Control/start-mcp.js", "--caps", "vision,pdf"]
    }
  }
}
```

## CLI Scripts

The CLI scripts in `scripts/` use a local HTTP server architecture. `session.js start` launches the server and browser; individual scripts send commands to it.

Scripts can be extended or new ones added following the existing pattern. See `scripts/utils.js` for the shared communication layer.

## Profile Management

Both MCP and CLI share the same profile resolution (`scripts/profile-hardening.js` → `resolveProfileDir`): `~/.browser-control/profiles/<profile>/`. Login data persists across sessions regardless of which interface is used.

- **CLI:** `node scripts/session.js start --profile <name>`
- **MCP:** `BROWSER_CONTROL_PROFILE=<name> node "tools/Browser Control/start-mcp.js"`

`default` is used when neither is set.

## Profile Hardening (native prompt suppression)

`scripts/profile-hardening.js` prepares a profile so **native Chrome prompts** stop blocking automation — password-save bubbles, autofill, translate bars, notification/permission prompts, download bubbles, restore-session nags, first-run screens. It is distinct from `scripts/dialog.js`, which only handles **JavaScript** dialogs (`alert`/`confirm`/`prompt`).

Both launch paths call `hardenProfile()` before the browser starts:

- `scripts/server.js` (`initBrowser`) — before `chromium.launchPersistentContext()`.
- `start-mcp.js` — before spawning `@playwright/mcp`.

What it does:

- Deep-merges a small set of preference keys into each sub-profile's `Preferences` (always `Default`; `Profile 1` only if it already exists) and into `Local State`.
- Backs up `Preferences`/`Local State` (timestamped `*.bak-<ts>`) before writing.
- Never deletes a profile; preserves cookies/localStorage/logins (those are separate files we don't touch).
- Idempotent — re-running writes identical values and keeps JSON valid.
- Skips writing if the profile is **locked** (`SingletonLock`/`SingletonSocket` present → Chrome running), to avoid corrupting a live profile.

Presets:

| Profile | Notifications | Geo / Cam / Mic | Password / Autofill / Translate / Download prompts | Extra launch flag |
|---------|---------------|-----------------|----------------------------------------------------|-------------------|
| any (`standard`) | blocked | site default | suppressed | — |
| `autonomous` | blocked | blocked by default | suppressed | `--disable-notifications` |

### Launch flags

Playwright already injects many automation flags (`--no-first-run`, `--no-default-browser-check`, `--password-store=basic`, `--use-mock-keychain`, `--disable-search-engine-choice-screen`, `--disable-popup-blocking`, `--disable-features=…,Translate,…`, etc. — see `playwright-core/.../chromiumSwitches.js`). **Do not duplicate these.** In particular, do not add a second `--disable-features`: Chromium keeps only the last occurrence of a repeated switch, so it would clobber Playwright's curated list. Notification/permission suppression therefore rides on `Preferences`, not flags. `launchArgsForProfile()` adds only `--disable-notifications`, and only for `autonomous`.

### Limits

Hardening cannot suppress OS-level dialogs (macOS keychain/screen-recording/file picker), CAPTCHAs, or 2FA. Those still require a human.

### Self-test

```bash
node scripts/test-profile-hardening.js
```

Creates temp fake profiles, runs hardening twice, and asserts: expected keys written, idempotent + valid JSON, pre-existing login markers preserved, `Profile 1` handled only when present, locked/corrupt profiles left untouched.
