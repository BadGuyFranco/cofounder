# xAI Connector Setup

## Prerequisites

```bash
node --version
```
If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

---

## Step 1: Open xAI Console

Go to https://console.x.ai

Sign in with your X (Twitter) account or create one.

**Tell the AI when done.**

## Step 2: Create an API Key

1. Click **API Keys** in the left sidebar
2. Click **Create API Key**
3. Give it a name (e.g. "CoFounder")
4. Copy the key — it starts with `xai-`

**Provide the key to the AI.**

## Step 3: The AI Creates Your .env File

The AI will create `/memory/connectors/xai/.env`:
```
XAI_API_KEY=xai-your-key-here
```

## Step 4: Verify Setup

```bash
node scripts/models.js list
```

Expected: a JSON array of available Grok models.

## Step 5: Test Chat

```bash
node scripts/chat.js ask "What is 2 + 2?"
```

Expected: a short response from Grok.
