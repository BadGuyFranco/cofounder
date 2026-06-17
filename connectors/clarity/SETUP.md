# Microsoft Clarity Connector Setup

Clarity itself is free and unlimited. This setup only generates the Data Export **API token** so the AI can pull behavior signals programmatically. You also need the Clarity tracking tag installed on your site (that is what collects the data); if you have not done that, set it up in the Clarity dashboard first.

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- A Microsoft Clarity account with a project for your site (`clarity.microsoft.com`).
- You must be a **project admin** (only admins can generate Data Export tokens).
- The Clarity tag should already be installed and collecting data on the site.

## Step 1: Open Data Export settings

1. Sign in at `https://clarity.microsoft.com`.
2. Open the project for the site you want to analyze.
3. Go to **Settings** > **Data Export**.

**Tell the AI when you are on this page.**

## Step 2: Generate a new API token

1. Click **Generate new API token**.
2. Give it a descriptive name (4 to 32 characters; letters, numbers, hyphens, underscores, periods; no spaces). For example:

```
cofounder
```

3. Confirm to generate the token.

**Tell the AI when the token has been generated.**

## Step 3: Copy the token value

The token is shown once. Copy the full value now (a long JWT string).

**Paste the token to the AI.** The AI will create your configuration file at `/memory/connectors/clarity/.env`. Do not paste it into any other file or share it elsewhere.

Note: the token is scoped to this one Clarity project. If you analyze a different site later, generate a separate token for that project.

## Step 4: Verify Setup

The AI will run:

```bash
node scripts/auth.js check
```

Expected output: `"ok": true` with the list of metrics returned. This check spends 1 of your 10 daily API requests.

If you see a 401 error, the token was copied incorrectly or has expired. Regenerate it at Settings > Data Export and provide the new value.

## Good to know

- **Quota:** 10 API requests per project per day. The AI batches calls; avoid running checks repeatedly.
- **Window:** the API only returns the last 1 to 3 days. For longer trends, the AI pulls on a cadence and stores snapshots.
- **No recordings or heatmaps via API:** those stay in the Clarity dashboard for you to watch. The AI flags which pages and sessions are worth opening.
