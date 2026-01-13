# Replicate Connector

Run machine learning models for image generation, video generation, audio processing, and more.

## Quick Start

```bash
cd "/cofounder/connectors/replicate"
npm install
node scripts/account.js verify
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |
| `defaults.json` | Curated default models (maintainer-managed) |

**Not configured?** Follow `SETUP.md`.

**What can I do?** See `CAPABILITIES.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `predictions.js` | Run models, get results, manage predictions |
| `models.js` | Browse models, view parameters, list versions |
| `account.js` | Verify credentials, show configuration |

Run any script with `help` for full command syntax.

## Configuration

**Credentials:** `/memory/Connectors/replicate/.env`

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Default Models:** `defaults.json` contains curated defaults for each category (image, video, etc.). Managed by maintainer.

**User Overrides:** Add to `.env` to override defaults:
```
REPLICATE_IMAGE_MODEL=some-other/model
REPLICATE_VIDEO_MODEL=another/video-model
```

## Model Upgrade (Maintainer)

When asked to upgrade models: review `defaults.json`, research alternatives via `node scripts/models.js collections`, compare options, update only after approval.

**Trigger phrases:** "upgrade replicate models", "better models for replicate", "review replicate defaults"

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/connectors/replicate" && npm install
```

**"REPLICATE_API_TOKEN not found":** Create `.env` with your token.

**"401 Unauthorized":** Token invalid. Generate new one at https://replicate.com/account/api-tokens

**"Model not found":** Check format is `owner/name` (e.g., `black-forest-labs/flux-1.1-pro`).

**"Prediction failed":** Check parameters with `node scripts/models.js get <model>`.

## API Documentation

https://replicate.com/docs/reference/http
