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

Navigate to the tools directory and install:

```bash
cd /path/to/cofounder/tools
npm install
```

**Tell the AI when done.**

## Step 2: Install Chromium

Playwright needs its own Chromium browser:

```bash
npx playwright install chromium
```

This downloads Chromium to `~/.cache/ms-playwright/`. It is separate from any Chrome you have installed.

**Tell the AI when done.**

## Step 3: Verify CLI Scripts

Start a browser session:

```bash
cd /path/to/cofounder/tools/Browser\ Control
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

**CLI setup complete.**

## Step 4: Enable MCP (IDE Integration)

MCP gives the AI native `browser_*` tools inside Cursor and Claude Code. This step is optional but recommended.

Check that the MCP config exists in the project:

**For Cursor:** `.cursor/mcp.json` should contain a `playwright` server entry.

**For Claude Code:** `.mcp.json` should contain a `playwright` server entry.

Both files ship with the project. If they are missing, create them with:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["tools/Browser Control/start-mcp.js"]
    }
  }
}
```

Restart your IDE to load the MCP server. After restart, the AI will have `browser_*` tools available alongside the CLI scripts.

## Troubleshooting

### "node: command not found" or "npm: command not found"

Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section.

Quick fix: Run `conda activate` first, then retry the command.

### "Cannot find module 'playwright'"

Run `npm install` in the `/cofounder/tools/` directory.

### "Executable doesn't exist" or browser not found

Run `npx playwright install chromium` to download the browser.

### "Browser session not running" (CLI)

Start a session first with `node scripts/session.js start`.

### "ECONNREFUSED" errors (CLI)

The session server isn't running. Start it with `node scripts/session.js start`.

### browser_* tools not available (MCP)

The MCP server is not loaded. Restart your IDE. If that does not help, check the MCP config file exists and contains the playwright entry.

### Browser opens but scripts timeout

The page may be slow to load. Try increasing timeout:

```bash
node scripts/navigate.js https://example.com --timeout 60000
```

### Port already in use (CLI)

Another process is using port 9222. Either stop it or use a different port:

```bash
node scripts/session.js start --port 9223
node scripts/navigate.js https://example.com --port 9223
```
