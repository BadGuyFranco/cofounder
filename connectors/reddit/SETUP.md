# Reddit Connector Setup

Step-by-step guide. The AI should walk you through each step one at a time.

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number, continue to Step 1.

**Account requirements:**
- Reddit account
- Access to Reddit's app preferences page

## Step 1: Open Reddit App Preferences

1. Go to https://www.reddit.com/prefs/apps
2. Sign in if prompted.
3. Scroll to the bottom of the page.

**Tell the AI when done.**

## Step 2: Create An App

Click **"create another app..."** or **"are you a developer? create an app..."**.

**Tell the AI when done.**

## Step 3: Fill In App Name

In the **name** field, enter a recognizable name, for example:

```
CoFounder Reddit Connector
```

**Tell the AI when done.**

## Step 4: Choose App Type

Select **web app**.

**Tell the AI when done.**

## Step 5: Add Description

In the **description** field, enter:

```
Personal Reddit API connector for content organization and research.
```

**Tell the AI when done.**

## Step 6: Add Redirect URI

In the **redirect uri** field, enter:

```
http://localhost:3000/callback
```

**Tell the AI when done.**

## Step 7: Create The App

Click **create app**.

**Tell the AI when done.**

## Step 8: Provide Client Credentials

On the app card, provide these values to the AI:

- The short string under the app name. This is `REDDIT_CLIENT_ID`.
- The value labeled **secret**. This is `REDDIT_CLIENT_SECRET`.
- Your Reddit username, without `/u/`.

The AI will create:

```
/memory/connectors/reddit/.env
```

with:

```
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REDIRECT_URI=http://localhost:3000/callback
REDDIT_USER_AGENT=script:cofounder-reddit:v1.0.0 (by /u/your_username)
```

## Step 9: Run OAuth Flow

The AI will run:

```bash
node scripts/auth.js flow
```

The script prints an authorization URL and waits for a local callback. Open that URL in your browser, authorize the app, then return here.

**Tell the AI when you see success.**

## Step 10: Store Tokens

The script prints:

```
REDDIT_ACCESS_TOKEN=...
REDDIT_REFRESH_TOKEN=...
```

The AI will add those values to `/memory/connectors/reddit/.env`.

**Tell the AI when done.**

## Verify Setup

The AI will run:

```bash
node scripts/me.js me
```

Expected output: your Reddit username, ID, karma, and rate-limit metadata.

## OAuth Scopes

Default scopes:

- `identity` - Read current account identity
- `read` - Read posts, comments, and subreddit listings
- `history` - Read saved and user history listings
- `mysubreddits` - Read subscribed subreddits

For the first version, this connector avoids posting, commenting, voting, and moderation actions.

## Data Policy Notes

- Use a unique, descriptive `REDDIT_USER_AGENT`.
- Respect Reddit's rate-limit response headers.
- Remove Reddit user content from stored datasets if it is deleted on Reddit.
- Do not use Reddit user content for AI model training without rightsholder permission.
- Commercial use may require a separate Reddit agreement.

## Troubleshooting

### "invalid_client"

Check `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.

### "invalid_grant"

The authorization code may be expired or already used. Run `node scripts/auth.js flow` again.

### "redirect_uri mismatch"

Make sure the Reddit app redirect URI is exactly:

```
http://localhost:3000/callback
```

### "401 Unauthorized"

The access token may be expired. Run:

```bash
node scripts/auth.js refresh
```

### "429 Too Many Requests"

Wait for the reset shown in the `x-ratelimit-reset` header.
