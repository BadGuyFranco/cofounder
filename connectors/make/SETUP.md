# Make Connector Setup

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
- Make.com account

## Step 1: Create a Make API Token

1. Log in to [make.com](https://www.make.com)
2. Click your profile icon (bottom left)
3. Select **Profile**
4. Go to the **API** tab
5. Click **Add token**
6. Name it (e.g., "Cofounder Connector")
7. Select the scopes you need (see Scopes section below)
8. Click **Create**
9. Copy the token (it won't be shown again)

## Step 2: Determine Your Region

Look at your Make.com URL:
- `us1.make.com` → Region is `us1`
- `us2.make.com` → Region is `us2`
- `eu1.make.com` → Region is `eu1`
- `eu2.make.com` → Region is `eu2`

## Step 3: Provide Credentials

Once you have your API token and region, provide them to the AI. The AI will create the configuration file.

**Required credentials:**
- `MAKE_API_TOKEN` - Your Make.com API token
- `MAKE_REGION` - Your region (us1, us2, eu1, or eu2)

**File location:** `/memory/connectors/make/.env`

## Step 4: Verify Setup

The AI will install dependencies and run the verification to show your user information and team IDs.

## API Token Scopes

When creating your API token, select the scopes you need:

| Scope | Required For |
|-------|--------------|
| `scenarios:read` | List and get scenarios |
| `scenarios:write` | Run, start, stop scenarios |
| `hooks:read` | List and get webhooks |
| `hooks:write` | Manage webhook queue |
| `data-stores:read` | List and get data stores |
| `data-stores:write` | Add, update, delete records |
| `teams:read` | List teams |
| `organizations:read` | List organizations |
| `users:read` | Get current user info |

**Recommended:** Select all scopes for full functionality.

## Free Plan Notes

Make.com free accounts have API access, but with significant limitations:

**Works on free plan:**
- List teams, organizations, user info
- List scenarios, webhooks, data stores
- Trigger webhooks (via POST to webhook URL)

**Requires paid plan (token auth forbidden):**
- Get individual scenario details
- Run, start, or stop scenarios via API
- Read, add, update, or delete data store records

If you see "Forbidden to use token authorization for this organization", that endpoint requires a paid Make.com plan.

## Security Notes

- Keep your API token secret; it provides access to your Make.com account
- Tokens can be revoked in your Make.com profile settings
- Consider creating a dedicated token for this connector
- Rotate tokens periodically

## Troubleshooting

**"401 Unauthorized" errors:**
- Verify your API token in the `.env` file
- Check the token hasn't been revoked in Make.com
- Ensure the token has the required scopes

**"403 Forbidden" errors:**
- The token may lack the required scope
- Some operations may require paid plans

**"404 Not Found" errors:**
- Check the resource ID (scenario, webhook, data store)
- Verify you're using the correct region

**Wrong region:**
- Check your Make.com URL
- Update `MAKE_REGION` in your `.env` file

**Connection errors:**
- Verify internet connection
- Check if make.com is accessible
- Try a different region if one is having issues
