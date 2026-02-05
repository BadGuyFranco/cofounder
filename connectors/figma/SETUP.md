# Figma Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- A Figma account (free or paid)
- Access to the files you want to work with

## Step 1: Open Figma Settings

1. Go to https://www.figma.com
2. Log in to your account
3. Click your profile icon in the top-left corner
4. Select **Settings**

**Tell the AI when done.**

## Step 2: Navigate to Security

1. In the Settings page, click the **Security** tab

**Tell the AI when done.**

## Step 3: Generate Personal Access Token

1. Scroll down to the **Personal access tokens** section
2. Click **Generate new token**

**Tell the AI when done.**

## Step 4: Name Your Token

In the **Token name** field, enter:

```
cofounder-connector
```

**Tell the AI when done.**

## Step 5: Set Token Expiration

Select an expiration period. Recommended: **90 days** or **No expiration** for convenience.

**Tell the AI when done.**

## Step 6: Select Scopes

Select all of the following scopes:

**Files**
- [x] Read-only access to file content (`file_content:read`)
- [x] Read-only access to file metadata (`file_metadata:read`)

**Comments**
- [x] Read-only access to file comments (`file_comments:read`)
- [x] Post and delete comments (`file_comments:write`)

**Libraries**
- [x] Read-only access to published components and styles in file (`library_content:read`)
- [x] Read-only access to components and styles by key (`library_assets:read`)
- [x] Read-only access to team components and styles (`team_library_content:read`)

**User**
- [x] Read-only access to current user (`current_user:read`)

**Tell the AI when done.**

## Step 7: Generate Token

1. Click **Generate token**
2. **IMPORTANT:** Copy the token immediately. You will only see it once.

The token looks like: `figd_XXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Provide the token to the AI.** The AI will create your configuration file.

## Verify Setup

The AI will run:

```bash
node scripts/users.js me
```

Expected output:
```
Authenticated as:
  Name: Your Name
  Email: you@example.com
  User ID: 123456789
```

## Finding File Keys

To use most scripts, you need a file key. Get it from the Figma URL:

```
https://www.figma.com/file/ABC123xyz/My-Design-Name
                           ^^^^^^^^^
                           This is the file key
```

Or from design URLs:
```
https://www.figma.com/design/ABC123xyz/My-Design-Name
```

## Finding Node IDs

For image exports, you need node IDs. Get them from:

1. **URL:** When you select a frame, the URL includes `?node-id=1:23`
2. **File JSON:** Run `node scripts/files.js get <file_key> --depth 2` and look at the `id` fields

## Note for Git Bash Users (Windows)

If you're running commands outside the IDE and encounter issues, open Git Bash and run commands from there. Git Bash handles paths correctly on Windows.
