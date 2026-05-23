# CourtListener Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- A free CourtListener account (run by the nonprofit Free Law Project).

## Step 1: Create a free account

1. Go to https://www.courtlistener.com
2. Click **Sign In**, then **Register**, and create a free account.
3. Verify your email address.

**Tell the AI when done.**

## Step 2: Copy your API token

1. Log in and open your **Profile / Account** menu.
2. Find **Developer Tools** (the API token page under your profile).
3. Copy the **REST API token** (about 40 characters).

**Provide the token to the AI, or add it yourself in Step 3.**

## Step 3: Provide credentials

The AI creates `/memory/connectors/courtlistener/.env` with:

```
COURTLISTENER_API_TOKEN=your_token_here
```

You can paste the token to the AI, or edit that file yourself to avoid putting the token in chat.

## Verify Setup

The AI will run:

```bash
node scripts/citations.js lookup "255 P.3d 1083"
```

Expected output: a JSON result whose `clusters` include `Denver Post Corp. v. Ritter`. That confirms the token works and citation lookup is live.
