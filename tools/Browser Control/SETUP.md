# Browser Control Setup

## MCP Browser Tools (Built into Cursor)

MCP browser tools require the **Browser MCP server** to be enabled in Cursor.

### Setup Steps

1. Open Cursor Settings (Cmd+, on Mac, Ctrl+, on Windows)
2. Search for "MCP" or navigate to Features > MCP Servers
3. Enable the `cursor-ide-browser` server
4. Restart Cursor if prompted

### Verify Setup

Try running `browser_navigate` to any URL. If it works, setup is complete.

### Troubleshooting

**"MCP server not found" or similar error:**
- Verify cursor-ide-browser is enabled in settings
- Restart Cursor
- Check Cursor's MCP server logs for errors

**Browser tools still don't work:**
- Some Cursor versions may require updating to support MCP browser tools
- Check for Cursor updates

## Playwright Scripts (External Automation)

For Playwright scripts that run outside Cursor, install Node.js and Playwright.

### Setup Steps

1. Install Node.js (if not installed): Download from https://nodejs.org or use your package manager

2. Create automation directory and install Playwright:
   ```bash
   mkdir -p ~/playwright-automation
   cd ~/playwright-automation
   npm init -y
   npm install playwright
   npx playwright install chromium
   ```

### Verify Setup

```bash
cd ~/playwright-automation
node -e "const { chromium } = require('playwright'); console.log('Playwright installed successfully');"
```

### Troubleshooting

**"Cannot find module 'playwright'":**
```bash
cd ~/playwright-automation
npm install playwright
```

**"Executable doesn't exist" or browser not found:**
```bash
npx playwright install chromium
```

**"node: command not found":**
- Install Node.js from https://nodejs.org
- Or add to PATH: `export PATH="$HOME/nodejs/bin:$PATH"`
