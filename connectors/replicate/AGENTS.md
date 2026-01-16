# Replicate Connector

Run machine learning models for image generation, video generation, audio processing, and more.

## Quick Start

```bash
node scripts/account.js verify
```

If you get "Cannot find module", run `npm install` first.

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

**Credentials:** `/memory/connectors/replicate/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

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

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"REPLICATE_API_TOKEN not found":** Create `.env` with your token.

**"401 Unauthorized":** Token invalid. Generate new one at https://replicate.com/account/api-tokens

**"Model not found":** Check format is `owner/name` (e.g., `black-forest-labs/flux-1.1-pro`).

**"Prediction failed":** Check parameters with `node scripts/models.js get <model>`.

## API Documentation

https://replicate.com/docs/reference/http
