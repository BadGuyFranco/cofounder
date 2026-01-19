# Monday.com Connector Setup

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue below.

**Account requirements:**
- Monday.com account (free tier works)

## Account Options

**Regular Free Account:** API access is included. Get your token from avatar > Developers > API token.

**Free Developer Account (recommended for testing):** Monday.com offers a dedicated developer account at https://developer.monday.com/apps/docs with:
- Up to 10 users, unlimited boards
- 1,000 items, 25K automation/integration actions per month
- 10M API complexity limit

The developer account is ideal for building and testing without affecting production data.

## Step 1: Get Your API Token

### For Admins

1. Log into Monday.com
2. Click your **avatar** (bottom left)
3. Go to **Administration**
4. Navigate to **Connections** > **API**
5. Under **Personal API Token**, click **Generate**
6. Copy the token

### For Non-Admin Users

1. Log into Monday.com
2. Click your **avatar** (bottom left)
3. Go to **Developers**
4. Navigate to **My Access Tokens**
5. Click **Show** to reveal your token
6. Copy the token

### Alternative: Developer Center

1. Go to your avatar > **Developers**
2. Click **My Access Tokens** in the left sidebar
3. Generate or reveal your token

## Step 2: Provide Credentials

Once you have your API token, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `MONDAY_API_KEY` - Your API token (long JWT string starting with `eyJ...`)

**File location:** `/memory/connectors/monday/.env`

## Step 3: Verify Setup

The AI will install dependencies and run the verification. You should see a list of boards you have access to.

## Token Permissions

Your token inherits your Monday.com permissions:
- You can only access boards you can see in the UI
- Write operations require write permissions on the board
- Admin operations require admin permissions

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

**"Not Authenticated":**
- Token may be expired or invalid
- Regenerate your token in Monday.com

**"No boards found":**
- You may not have access to any boards
- Check your Monday.com account has boards

**"Cannot find module":**
- Run `npm install` in the monday directory

**"Rate limit exceeded":**
- Wait a minute and try again
- Consider adding delays between bulk operations

## API Playground

Use the Monday.com API Playground to test queries:
https://monday.com/developers/v2/try-it-yourself

This is helpful for debugging complex queries or understanding column value structures.

## Multiple Accounts

If you need to access multiple Monday.com accounts, you'll need separate tokens. Token switching is not currently implemented.
