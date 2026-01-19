# Video Generator Setup

This is an advanced tool that requires external dependencies.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Check What's Installed

Run these checks:

**Node.js:**
```bash
node --version
```

**Replicate npm packages:**
```bash
cd "/cofounder/connectors/replicate" && npm list 2>/dev/null | head -1
```

**Replicate credentials:**
```bash
test -f "/memory/connectors/replicate/.env" && grep -q "REPLICATE_API_TOKEN" "/memory/connectors/replicate/.env" && echo "Configured" || echo "Not configured"
```

**FFmpeg (for local editing):**
```bash
ffmpeg -version 2>/dev/null | head -1 || echo "Not installed"
```

## What's Missing?

Based on the checks above, report only what's missing:

| Dependency | What It Does |
|------------|--------------|
| Node.js | JavaScript runtime for running scripts |
| npm packages | Replicate connector libraries |
| Replicate API key | Authentication with Replicate.com |
| FFmpeg | Video editing (optional, only for local edits) |

**If everything shows as installed/configured:** Skip to AGENTS.md Usage section.

**If anything is missing:** Would you like me to walk you through installing what's needed?

## Installation Walkthrough

Only proceed if user confirms.

### Step 1: Node.js (if missing)

Follow `/cofounder/system/installer/dependencies/nodejs.md`

### Step 2: npm packages (if missing)

```bash
cd "/cofounder/connectors/replicate" && npm install
```

### Step 3: Replicate API key (if missing)

1. Go to https://replicate.com/account/api-tokens
2. Create a new API token
3. Provide the token (starts with `r8_`)

Create the credentials file:

```bash
mkdir -p "/memory/connectors/replicate"
echo "REPLICATE_API_TOKEN=r8_your_token_here" > "/memory/connectors/replicate/.env"
```

### Step 4: FFmpeg (optional, if needed for local editing)

```bash
conda install -y ffmpeg
```

Requires Miniforge. If conda is not available, follow `/cofounder/system/installer/dependencies/miniforge.md` first.

## Verify Setup

```bash
cd "/cofounder/connectors/replicate" && node scripts/account.js verify
```

Expected output: Account information with username and credits.

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.
