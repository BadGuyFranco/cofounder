# ClickUp Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

- ClickUp account (free tier works)
- At least one workspace with spaces and lists

## Step 1: Access Settings

1. Log in to ClickUp at https://app.clickup.com
2. Click your avatar (bottom-left corner)
3. Select "Settings"

**Tell the AI when done.**

## Step 2: Navigate to Apps

1. In the left sidebar, click "Apps"
2. You should see an "Apps" or "API" section

Or go directly to: https://app.clickup.com/settings/apps

**Tell the AI when done.**

## Step 3: Generate API Token

1. Click "Generate" or "Create an App" to create a personal API token
2. If prompted, give it a name (e.g., "Cofounder Connector")
3. **Copy the token immediately** (starts with `pk_`)

**Provide the API token to the AI.** The AI will create your configuration file.

## Verify Setup

The AI will run:

```bash
node scripts/workspaces.js list
```

Expected output: A list of workspaces you have access to with their IDs and names.

## Token Scopes

Personal API tokens have full access to everything in your ClickUp account. There are no scope limitations.

**Security note:** Keep this token private. Anyone with this token can access all your ClickUp data.

## Finding IDs

ClickUp uses different ID types:

**Workspace ID (Team ID):**
- Run `node scripts/workspaces.js list`
- Shows as numeric ID

**Space ID:**
- Run `node scripts/spaces.js list <workspace_id>`
- Shows as numeric ID

**Folder ID:**
- Run `node scripts/folders.js list <space_id>`
- Shows as numeric ID

**List ID:**
- Run `node scripts/lists.js list <folder_id>` or `node scripts/lists.js folderless <space_id>`
- Shows as numeric ID

**Task ID:**
- Run `node scripts/tasks.js list <list_id>`
- Shows as alphanumeric ID (e.g., "abc123")

## Regenerating Tokens

If your token is compromised:

1. Go to Settings > Apps
2. Delete the old token
3. Generate a new one
4. Update `/memory/Connectors/clickup/.env`

## Troubleshooting

**"Token starts with 'Bearer'":** Don't include "Bearer" prefix; just the token itself.

**"Cannot see my workspace":** Token was generated in a different ClickUp account.

**"Rate limited":** ClickUp allows 100 requests per minute. Wait and retry.

**"Task not found":** Task may be in Trash. Check ClickUp web interface.
