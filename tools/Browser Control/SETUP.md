# Browser Control Setup

## Before Starting

**STOP.** Tell the user the following and do not proceed until they confirm:

> This setup installs a dedicated browser that the AI can control to navigate websites, take screenshots, and interact with web pages on your behalf. It will not affect your regular browser.
>
> **Estimated time:** 5 minutes
>
> Are you ready?

Do not continue past this point until the user responds.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Prerequisites

Verify Node.js is installed:

```bash
node --version
```

- If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version (e.g., `v20.x.x`): Continue to Step 1.

## Step 1: Install Dependencies

Navigate to the Browser Control directory and install:

```bash
cd "$(dirname "$(find ~ -path '*/cofounder/tools/Browser Control' -type d 2>/dev/null | head -1)")/cofounder/tools/Browser Control"
npm install
```

Or if you know your cofounder path:

```bash
cd /path/to/cofounder/tools/Browser\ Control
npm install
```

**Tell the AI when done.**

## Step 2: Install Chromium

Playwright needs its own Chromium browser:

```bash
npx playwright install chromium
```

This downloads Chromium to `~/.cache/ms-playwright/`. It's separate from any Chrome you have installed.

**Tell the AI when done.**

## Verify Setup

Start a browser session:

```bash
node scripts/session.js start
```

You should see Chromium open. Navigate to a test page:

```bash
node scripts/navigate.js https://wisermethod.com
```

The browser should navigate to wisermethod.com. Take a snapshot to verify reading works:

```bash
node scripts/snapshot.js
```

You should see structured page content in the terminal.

**Setup complete.** Browser Control is ready to use. The browser window will remain open for your use.

## Troubleshooting

### "node: command not found" or "npm: command not found"

Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section.

Quick fix: Run `conda activate` first, then retry the command.

### "Cannot find module 'playwright'"

Run `npm install` in the Browser Control directory.

### "Executable doesn't exist" or browser not found

Run `npx playwright install chromium` to download the browser.

### "Browser session not running"

Start a session first with `node scripts/session.js start`.

### "ECONNREFUSED" errors

The session server isn't running. Start it with `node scripts/session.js start`.

### Browser opens but scripts timeout

The page may be slow to load. Try increasing timeout:

```bash
node scripts/navigate.js https://example.com --timeout 60000
```

### Port already in use

Another process is using port 9222. Either stop it or use a different port:

```bash
node scripts/session.js start --port 9223
node scripts/navigate.js https://example.com --port 9223
```
