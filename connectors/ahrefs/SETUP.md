# Ahrefs Connector Setup

**This is optional.** Domain Rating lookups (`metrics.js dr`) work for free with no account and no key. Only follow this setup if you need the deeper, paid data: full domain snapshot, referring domains, anchor text, and organic keywords.

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- An Ahrefs account on a plan that includes API v3 access.
- You must be a workspace **owner or admin** (only they can create API keys).
- You must be able to sign in at `app.ahrefs.com`.

## Step 1: Open the API keys page

1. Go to `https://app.ahrefs.com/account/api-keys` (Account settings > API keys).
2. If prompted, sign in to your Ahrefs account.

You should see the API keys management page.

**Tell the AI when you are on this page.**

## Step 2: Create a new API key

1. Click **Generate** (or **Create API key**).
2. Give it a name you will recognize, for example:

```
cofounder
```

3. Confirm/create the key.

**Tell the AI when the key has been created.**

## Step 3: Copy the key value

The key is shown only once. Copy the full value now. It looks like a long string of letters and numbers.

**Paste the key to the AI.** The AI will create your configuration file at `/memory/connectors/ahrefs/.env`. Do not paste it into any other file or share it elsewhere.

## Step 4: Verify Setup

The AI will run:

```bash
node scripts/auth.js check
```

Expected output: `"ok": true` with the message that the key is valid, verified by a free test query. This check spends zero API units.

If you see a 401 error, the key was copied incorrectly. Recreate it at `https://app.ahrefs.com/account/api-keys` and provide the new value.

Note: each key expires after 1 year, so a future re-setup may be needed.
