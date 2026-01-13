# HuggingFace Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

- HuggingFace account (free tier available)

## Step 1: Create Account

1. Go to https://huggingface.co
2. Click "Sign Up" and create an account (or sign in if you have one)

**Tell the AI when done.**

## Step 2: Go to Token Settings

1. Go to https://huggingface.co/settings/tokens
2. Click **"Create new token"**

**Tell the AI when done.**

## Step 3: Name Your Token

In the **Token name** field, enter:

```
Cofounder Connector
```

**Tell the AI when done.**

## Step 4: Select Token Type

Select **Write** at the top (gives full read/write access including inference).

**Tell the AI when done.**

## Step 5: Create and Copy Token

1. Click **"Create token"**
2. Copy the token (starts with `hf_`, shown only once)

**Provide the token to the AI.** The AI will create the configuration file.

## Verify Setup

The AI will run: `node scripts/account.js verify`

Expected output:
```
Authentication successful!
Username: your-username
```

## Gated Models

Some models require accepting terms before access:

1. Go to the model page (e.g., https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct)
2. Click "Agree and access repository"

## Regenerating Tokens

If your token is compromised:

1. Go to https://huggingface.co/settings/tokens
2. Delete the compromised token
3. Create a new token
4. Provide the new token to the AI
