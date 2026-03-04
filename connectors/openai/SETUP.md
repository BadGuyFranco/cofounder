# OpenAI Connector Setup

## Prerequisites

```bash
node --version
```
If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

---

## Step 1: Open OpenAI Platform

Go to https://platform.openai.com

Sign in or create an account.

**Tell the AI when done.**

## Step 2: Create an API Key

1. Click **API Keys** in the left sidebar (or go to https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Give it a name (e.g. "CoFounder")
4. Copy the key — it starts with `sk-`

**Provide the key to the AI.**

## Step 3: (Optional) Get Your Organization ID

If your account belongs to multiple organizations:
1. Go to https://platform.openai.com/account/organization
2. Copy the **Organization ID** (starts with `org-`)

Skip this if you only have one organization.

## Step 4: The AI Creates Your .env File

The AI will create `/memory/connectors/openai/.env`:
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_ORG_ID=org-...   # only if needed
```

## Step 5: Verify Setup

```bash
node scripts/models.js list
```

Expected: a JSON array of available models.

## Step 6: Test Chat

```bash
node scripts/chat.js ask "What is 2 + 2?"
```

Expected: a short response from GPT.

## Notes

- OpenAI requires a payment method and prepaid credits before API calls work
- Add billing at: https://platform.openai.com/account/billing
