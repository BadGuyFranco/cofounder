# [Tool Name] Setup

This is an advanced tool that requires external dependencies.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check What's Installed

Run these checks to see what's already configured:

**Node.js:**
```bash
node --version
```

**npm packages:**
```bash
cd "/cofounder/tools/[Tool Name]" && npm list 2>/dev/null | head -1
```

**[Service] credentials (if applicable):**
```bash
test -f "/memory/connectors/[service]/.env" && echo "Configured" || echo "Not configured"
```

## What's Missing?

Based on the checks above, report ONLY what's missing:

| Dependency | What It Does |
|------------|--------------|
| Node.js | JavaScript runtime for running scripts |
| npm packages | Tool-specific libraries |
| [Service] API key | Authentication with [service] |

**If everything is installed/configured:** Skip to AGENTS.md Usage section.

**If anything is missing:** Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if user confirms.

### Step 1: Node.js (if missing)

Follow `/cofounder/system/installer/dependencies/nodejs.md`

### Step 2: npm packages (if missing)

```bash
cd "/cofounder/tools/[Tool Name]" && npm install
```

### Step 3: [Service] credentials (if missing)

[Instructions for getting credentials, or point to connector SETUP.md]

## Verification

```bash
[Command that proves the tool works]
```

Expected output: [What success looks like]

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

<!-- 
TEMPLATE INSTRUCTIONS:
1. Replace all [Tool Name] with your tool's name
2. Replace [Service] with the service this tool uses (e.g., Replicate, Google AI)
3. Add/remove dependency checks as needed for your tool
4. Customize the verification command
5. Delete this comment block when done
-->
