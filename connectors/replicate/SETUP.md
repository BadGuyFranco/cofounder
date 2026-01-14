# Replicate Connector Setup

## Prerequisites

- Replicate account (free tier available)
- Credit card on file for paid models (optional)

## Step 1: Create Account

1. Go to https://replicate.com
2. Click "Sign in" and create an account (GitHub or Google sign-in available)

## Step 2: Get API Token

1. Go to https://replicate.com/account/api-tokens
2. Click "Create token"
3. Give it a name (e.g., "Cofounder Connector")
4. **Copy the token immediately** (starts with `r8_`, shown only once)

## Step 3: Provide Credentials

Once you have your API token, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `REPLICATE_API_TOKEN` - Your API token (starts with `r8_`)

**File location:** `/memory/connectors/replicate/.env`

**Note:** Default models are managed in the connector itself (`defaults.js`), not in your credentials file. This ensures you always get the latest curated models. Advanced users can override defaults by adding model variables to their .env.

## Step 4: Verify Setup

The AI will run: `node scripts/account.js verify`

Expected output:
```
Verifying Replicate credentials...

Authentication successful!

Configuration:
  API Token: r8_xxxxx...
```

## Billing

Replicate uses pay-per-use pricing. Costs vary by model:

| Model Type | Typical Cost |
|------------|--------------|
| Image generation | $0.003-0.05 per image |
| Video generation | $0.10-0.50 per video |
| Background removal | $0.002 per image |
| Transcription | $0.0001 per second |

Free tier: Some models offer free runs for new accounts.

Check current pricing at: https://replicate.com/pricing

## Popular Models

**Image Generation:**
- `black-forest-labs/flux-1.1-pro` - High quality, fast
- `stability-ai/sdxl` - Stable Diffusion XL
- `bytedance/sdxl-lightning-4step` - Very fast

**Video Generation:**
- `google-deepmind/veo-2` - High quality video
- `minimax/video-01` - Alternative video model

**Utilities:**
- `cjwbw/rembg` - Background removal
- `nightmareai/real-esrgan` - Image upscaling
- `openai/whisper` - Speech to text

Browse all models: https://replicate.com/explore

## Regenerating Tokens

If your token is compromised:

1. Go to https://replicate.com/account/api-tokens
2. Delete the compromised token
3. Create a new token
4. Update `/memory/connectors/replicate/.env`

## Troubleshooting

**"Invalid API token":** Token was copied incorrectly or has been deleted. Generate a new one.

**"Payment required":** Some models require a credit card on file. Add payment at https://replicate.com/account/billing

**"Model not found":** The model name or version is incorrect. Use `node scripts/models.js get <owner/name>` to verify.
