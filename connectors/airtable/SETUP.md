# Airtable Connector Setup

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
- Airtable account (free tier works)
- At least one base to work with

## Step 1: Access Developer Hub

1. Log in to Airtable at https://airtable.com
2. Click your profile icon (top-right)
3. Select "Developer hub"

Or go directly to: https://airtable.com/create/tokens

## Step 2: Create Personal Access Token

1. Click "Create new token"
2. Give it a descriptive name (e.g., "Cofounder Connector")
3. Add scopes:
   - `data.records:read` - Read records
   - `data.records:write` - Create/update/delete records
   - `schema.bases:read` - Read base and table schemas
   - `schema.bases:write` - (Optional) Create/modify tables
4. Add access:
   - Select specific bases, OR
   - "All current and future bases in all current and future workspaces" (for full access)
5. Click "Create token"
6. **Copy the token immediately** (shown only once)

## Step 3: Provide Credentials

Once you have your Personal Access Token, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `AIRTABLE_PAT` - Your Personal Access Token (starts with `pat`)

**File location:** `/memory/connectors/airtable/.env`

## Step 4: Verify Setup

The AI will run the verification command. You should see a list of bases you have access to.

## Token Scopes Reference

| Scope | Permissions |
|-------|-------------|
| `data.records:read` | Read records from tables |
| `data.records:write` | Create, update, delete records |
| `schema.bases:read` | Read base/table structure |
| `schema.bases:write` | Create/modify tables and fields |
| `webhook:manage` | Create and manage webhooks |
| `user.email:read` | Read user email addresses |

**Minimum for this connector:** `data.records:read`, `data.records:write`, `schema.bases:read`

## Development Environment

Airtable doesn't have sandbox accounts. For safe testing:

1. Duplicate your production base:
   - Open the base
   - Click dropdown arrow next to base name
   - Click "..." menu
   - Select "Duplicate base"
   - Name it "My Base (Dev)"

2. Use the dev base ID in your testing

3. Create a separate PAT with access only to dev bases

## Finding Your Base ID

1. Open your base in Airtable
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The `appXXXXXXXXXXXXXX` part is your Base ID

## Regenerating Tokens

If your token is compromised:

1. Go to Developer Hub
2. Find the token
3. Click "Regenerate" or delete and create new
4. Update `/memory/connectors/airtable/.env`

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

**"Token starts with 'key'":** You're using a deprecated API key. Create a Personal Access Token instead.

**"Cannot see my base":** Token wasn't granted access to that base. Edit token and add the base.

**"Permission denied":** Token missing required scope. Edit token and add scopes.

**"Token not found":** Token was deleted or regenerated. Create new one.
