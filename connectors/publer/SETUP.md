# Publer Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

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
- Publer account with Business or Enterprise plan (API access required)
- At least one social media account connected in Publer

## Step 1: Access Publer Settings

1. Log in to Publer at https://app.publer.com
2. Click your profile icon (bottom-left sidebar)
3. Select "Settings"

**Tell the AI when done.**

## Step 2: Navigate to API Section

1. In Settings, click "Integrations" in the left sidebar
2. Look for "API" or "Developer" section
3. You should see API key management

**Note:** If you don't see API options, your plan may not include API access. Upgrade to Business or Enterprise plan.

**Tell the AI when done.**

## Step 3: Generate API Key

1. Click "Generate API Key" or "Create New Key"
2. Give it a descriptive name (e.g., "Cofounder Integration")
3. Copy the generated API key immediately (you won't see it again)

**Important:** Treat this key like a password. Don't share it or commit it to version control.

**Tell the AI when done.**

## Step 4: Get Workspace ID (Optional)

1. In Publer, go to any page
2. Look at the URL; it often contains your workspace ID
3. Or run `node scripts/workspaces.js list` after setup to get IDs

**Tell the AI when done.**

## Step 5: Create Configuration File

Create a `.env` file:

**Location:** `/memory/connectors/publer/.env`

**Content:**
```
PUBLER_API_KEY=your_api_key_here
PUBLER_WORKSPACE_ID=your_workspace_id_here
```

Replace placeholders with your actual credentials.

**Tell the AI when done.**

## Step 6: Verify Setup

```bash
cd "/cofounder/connectors/publer"
npm install
node scripts/user.js me
```

If successful, you'll see your user profile. If there's an error, check your API key.

**Tell the AI the result.**

## API Access Requirements

| Plan | API Access |
|------|-----------|
| Free | No |
| Professional | No |
| Business | Yes |
| Enterprise | Yes |

If you're on Free or Professional, you'll need to upgrade to use this connector.

## Rate Limits

Publer allows 100 API requests per 2 minutes per user. The connector handles rate limiting automatically, pausing when limits are approached.

## Security Notes

- Keep your API key private
- Use environment variables, not hardcoded values
- The `.env` file is gitignored by default
- Rotate keys periodically for security

## Troubleshooting

### "401 Unauthorized"
- API key is invalid or expired
- Solution: Generate a new key in Publer Settings

### "403 Forbidden"
- Your plan doesn't include API access
- Solution: Upgrade to Business or Enterprise plan

### "Cannot find module"
- Dependencies not installed
- Solution: Run `npm install` in the publer directory

### "No .env file found"
- Configuration file missing
- Solution: Create `/memory/connectors/publer/.env` with your credentials

## Need Help?

- Publer Documentation: https://publer.com/docs
- Publer Support: Contact via app or support@publer.com
