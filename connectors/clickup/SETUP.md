# ClickUp Connector Setup

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
- ClickUp account (free tier works)
- At least one workspace with spaces and lists

## Step 1: Open ClickUp Settings

1. Log in to ClickUp at https://app.clickup.com
2. Click your avatar in the bottom-left corner

**Tell the AI when done.**

## Step 2: Navigate to Settings

In the menu that appeared, click **Settings**.

**Tell the AI when done.**

## Step 3: Open Apps Section

In the left sidebar, click **Apps**.

Or go directly to: https://app.clickup.com/settings/apps

**Tell the AI when done.**

## Step 4: Generate API Token

Click the **Generate** button (or **Create an App** if you see that instead).

**Tell the AI when done.**

## Step 5: Name Your Token

If prompted for a name, enter:

```
Cofounder Connector
```

**Tell the AI when done.**

## Step 6: Copy Your API Token

You should now see your API token displayed. It starts with `pk_`.

**Copy the entire token and provide it to the AI.** The AI will create your configuration file.

## Verify Setup

The AI will run:

```bash
node scripts/workspaces.js list
```

Expected output: A list of workspaces you have access to with their IDs and names.

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
4. Provide the new token to the AI

## Troubleshooting

**"Token starts with 'Bearer'":** Don't include "Bearer" prefix; just the token itself.

**"Cannot see my workspace":** Token was generated in a different ClickUp account.

**"Rate limited":** ClickUp allows 100 requests per minute. Wait and retry.

**"Task not found":** Task may be in Trash. Check ClickUp web interface.
