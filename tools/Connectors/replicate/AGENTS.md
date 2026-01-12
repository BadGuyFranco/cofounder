# Replicate Connector

Connect to Replicate to run machine learning models for image generation, video generation, audio processing, and more.

## API Documentation

https://replicate.com/docs/reference/http

## Quick Start

```bash
cd "/cofounder/tools/Connectors/replicate"
npm install
node scripts/account.js verify
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |
| `defaults.json` | Curated default models (maintainer-managed) |

## Configuration

**Credentials:** `/memory/Connectors/replicate/.env`

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Default Models:** `defaults.json` (in connector, not memory)

The connector maintains curated default models for each category (image, video, background removal, etc.). These are managed by the cofounder maintainer and updated when better models become available.

**User Overrides:** Advanced users can override defaults by adding to their `.env`:
```
REPLICATE_IMAGE_MODEL=some-other/model
REPLICATE_VIDEO_MODEL=another/video-model
```

**Not configured?** Follow `SETUP.md` to get your API token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Scripts

| Script | Purpose |
|--------|---------|
| `predictions.js` | Run models, get results, manage predictions |
| `models.js` | Browse models, view parameters, list versions |
| `account.js` | Verify credentials, show configuration |

## Common Workflows

### Generate an Image

```bash
node scripts/predictions.js run black-forest-labs/flux-1.1-pro \
  --input '{"prompt": "a futuristic cityscape at sunset", "aspect_ratio": "16:9"}' \
  --download ./images
```

### Generate a Video

```bash
node scripts/predictions.js run google-deepmind/veo-2 \
  --input '{"prompt": "a timelapse of clouds moving over mountains"}' \
  --download ./videos
```

### Check Model Parameters

```bash
node scripts/models.js get black-forest-labs/flux-1.1-pro
```

## Integration with Image/Video Generator

This connector provides the core Replicate API functionality. The Image Generator and Video Generator tools use this connector for their Replicate backends.

**Shared credential:** Both tools can use the API token from `/memory/Connectors/replicate/.env`.

**Shared defaults:** Both tools should read from `defaults.json` for model selection.

## Model Upgrade Workflow (Maintainer Only)

Default models are curated in `defaults.json`. When the maintainer asks about upgrading models (e.g., "are there better models for our Replicate connector?"), follow this process:

**Step 1: Review Current Defaults**
Read `defaults.json` to see current models and their last-updated dates.

**Step 2: Research Alternatives**
- Check Replicate's featured collections: `node scripts/models.js collections`
- Look up specific collection: `node scripts/models.js collection text-to-image`
- Web search for recent Replicate model releases and benchmarks
- Check run counts and community feedback on Replicate.com

**Step 3: Compare and Recommend**
For each category, present:
- Current default model
- Potential alternatives with pros/cons
- Run counts (popularity indicator)
- Cost comparison if significant
- Recommendation with rationale

**Step 4: Update with Confirmation**
Only update `defaults.json` after maintainer approval. Include:
- New model identifier
- Updated date
- Notes explaining the choice
- Relevant alternatives

**Trigger phrases:** "upgrade replicate models", "better models for replicate", "review replicate defaults"

## Troubleshooting

**"Cannot find module":**
```bash
cd "/cofounder/tools/Connectors/replicate" && npm install
```

**"REPLICATE_API_TOKEN not found":** Create `/memory/Connectors/replicate/.env` with your token.

**"401 Unauthorized":** Token is invalid or expired. Generate a new one at https://replicate.com/account/api-tokens

**"Model not found":** Check the model name format is `owner/name` (e.g., `black-forest-labs/flux-1.1-pro`).

**"Prediction failed":** Check the model's input parameters with `node scripts/models.js get <model>`. Some models have required parameters.

**Slow predictions:** Some models (especially video) can take several minutes. The script waits by default; use `--no-wait` to return immediately and check status later.
