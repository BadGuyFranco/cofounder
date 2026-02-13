# Presentation Builder Setup

This tool requires Node.js for running scripts. Playwright is needed only for PDF/PNG export.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check What's Installed

Run the automated check:

```bash
node scripts/check-setup.js
```

Or check manually:

**Node.js:**
```bash
node --version
```
Expected: v18.0.0 or higher

**reveal.js vendor files:**
```bash
ls node_modules/reveal.js/dist/reveal.js 2>/dev/null && echo "OK" || echo "NOT INSTALLED"
```

**Playwright browsers (needed only for PDF/PNG export):**
```bash
ls ~/Library/Caches/ms-playwright/chromium-* 2>/dev/null && echo "OK" || echo "NOT INSTALLED"
```

Note: If Image Generator or Browser Control is already set up, Playwright browsers are already installed system-wide. No extra download needed.

## What's Missing?

Based on the checks above, report ONLY what's missing:

| Dependency | What It Does | Required For |
|------------|--------------|--------------|
| Node.js >= 18 | JavaScript runtime for scripts | All operations |
| npm packages | reveal.js vendor files and yaml parser | Creating presentations |
| Playwright browsers | Chromium for rendering | PDF and PNG export only |

**If everything is installed:** Skip to AGENTS.md Usage section.

**If anything is missing:** Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if user confirms.

### Step 1: Node.js (if missing)

Follow `/cofounder/system/installer/dependencies/nodejs.md`

### Step 2: npm packages (if missing)

```bash
cd "/cofounder/tools/Presentation Builder" && npm install
```

This installs reveal.js and the yaml parser. First run may take 30 seconds.

### Step 3: Playwright browsers (if missing, needed only for export)

If Image Generator or Browser Control is already configured, skip this step; the browsers are shared.

Otherwise:

```bash
npx playwright install chromium
```

This downloads Chromium (~150MB, stored system-wide). Only needed once.

## Verification

```bash
node scripts/check-setup.js
```

Expected output:
```
Presentation Builder Setup Check
================================
Node.js: v22.x.x (OK)
reveal.js: installed (OK)
Playwright: chromium available (OK)

All dependencies satisfied. Ready to create presentations.
```

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

**"reveal.js not found in node_modules":** npm packages not installed. Run `npm install` in the Presentation Builder directory.

**PDF export hangs or produces blank pages:** Playwright browser may be corrupted. Run `npx playwright install chromium --force` to reinstall.

**"Chromium executable not found":** Run `npx playwright install chromium`. If already installed via Image Generator, check that the browser cache path is accessible.

**Presentations work without Node.js:** Creating presentations requires Node.js (to run the scaffold script). But once created, the HTML presentation itself has zero dependencies. Anyone can open it in a browser.
