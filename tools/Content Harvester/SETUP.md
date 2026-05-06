# Content Harvester Setup

Content Harvester is a Node.js script tool with one local npm dependency for RSS and Atom parsing.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check What's Installed

Run these checks to see what's already configured:

**Node.js:**

```bash
node --version
```

**npm packages:**

```bash
cd "/cofounder/tools/Content Harvester" && npm list 2>/dev/null
```

**Optional connector credentials:**

```bash
test -f "/memory/connectors/xcom/.env" && echo "X.com configured" || echo "X.com not configured"
test -f "/memory/connectors/reddit/.env" && echo "Reddit configured" || echo "Reddit not configured"
```

## What's Missing?

Based on the checks above, report only what's missing:

| Dependency | What It Does |
|------------|--------------|
| Node.js | JavaScript runtime for running scripts |
| npm packages | RSS and Atom feed parsing |
| Connector credentials | Optional platform API-backed source collection |

If everything is installed and configured, use `AGENTS.md`.

If anything is missing: Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if the user confirms.

### Step 1: Node.js

If Node.js is missing, follow `/cofounder/system/installer/dependencies/nodejs.md`.

### Step 2: npm Packages

Dependencies install automatically on first script run. Manual install:

```bash
cd "/cofounder/tools/Content Harvester" && npm install
```

### Step 3: Optional Connectors

For connector-backed sources, follow that connector's setup guide:

- X.com: `/cofounder/connectors/xcom/SETUP.md`
- Reddit: `/cofounder/connectors/reddit/SETUP.md`

RSS, Reddit RSS, Substack RSS, and manual URL sources do not require connector credentials.

## Verification

```bash
node scripts/harvest.js validate --request examples/basic-rss.harvest.json
```

Expected output:

```text
Request valid: basic-rss
```

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

**"Cannot find module fast-xml-parser":** Run the harvest command again after automatic dependency installation, or run `npm install`.

**Connector credentials missing:** Remove the connector source from the request or configure the connector.
