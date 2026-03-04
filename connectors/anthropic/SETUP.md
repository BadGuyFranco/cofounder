# Anthropic Connector Setup

## Prerequisites

```bash
node --version
```
If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

---

## Step 1: Open Anthropic Console

Go to https://console.anthropic.com

Sign in or create an account.

**Tell the AI when done.**

## Step 2: Create an API Key

1. Click **API Keys** in the left sidebar
2. Click **Create Key**
3. Give it a name (e.g. "CoFounder")
4. Copy the key — it starts with `sk-ant-`

**Provide the key to the AI.**

## Step 3: The AI Creates Your .env File

The AI will create `/memory/connectors/anthropic/.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Step 4: Verify Setup

```bash
node scripts/models.js list
```

Expected: a JSON array of Claude models.

## Step 5: Test Chat

```bash
node scripts/chat.js ask "What is 2 + 2?"
```

Expected: a short response from Claude.

## Notes

- Anthropic requires adding a credit card and purchasing credits before API usage
- New accounts start at Tier 1 with lower rate limits — usage history upgrades you
