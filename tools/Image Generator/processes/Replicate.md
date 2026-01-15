# Replicate - Image Generation

Generate images using Replicate via the centralized Connector.

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

## Prerequisites

**Credential location:** `/memory/connectors/replicate/.env`

Required variable:
```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Not configured?** Follow `/connectors/replicate/SETUP.md`

## Generate an Image

**Basic generation (uses curated default model):**
```bash
cd "/cofounder/connectors/replicate"
node scripts/predictions.js run google/nano-banana-pro \
  --input '{"prompt": "your prompt here"}' \
  --download ./images
```

**With aspect ratio:**
```bash
node scripts/predictions.js run google/nano-banana-pro \
  --input '{"prompt": "your prompt here", "aspect_ratio": "16:9"}' \
  --download ./images
```

**With specific output directory:**
```bash
node scripts/predictions.js run google/nano-banana-pro \
  --input '{"prompt": "a professional podcast studio with modern design", "aspect_ratio": "16:9"}' \
  --download /path/to/output
```

## Default Model

Current default: `google/nano-banana-pro`

Default models are curated in `/connectors/replicate/defaults.json`. The maintainer updates these when better models become available.

**Alternative models:**
- `black-forest-labs/flux-1.1-pro` - Battle-tested, excellent prompt following
- `black-forest-labs/flux-2-max` - Highest fidelity
- `google/imagen-4` - Google flagship, simpler API

To use an alternative:
```bash
node scripts/predictions.js run black-forest-labs/flux-1.1-pro \
  --input '{"prompt": "..."}' \
  --download ./images
```

## Supported Aspect Ratios

| Ratio | Native Resolution |
|-------|-------------------|
| 1:1 | 1024x1024 |
| 16:9 | 1344x768 |
| 9:16 | 768x1344 |
| 4:3 | 1152x896 |
| 3:2 | 1216x832 |
| 21:9 | 1536x640 |

## Aspect Ratio Translation

The Connector maps requested dimensions to the closest ratio:

| Requested | Detected Ratio |
|-----------|----------------|
| 1920x1080 | 16:9 |
| 1080x1920 | 9:16 |
| 1024x1024 | 1:1 |
| 1440x810 | 16:9 |

## Output

Downloaded images are saved to the directory specified with `--download`.

Naming format: `output_0.png` (or `.jpg` depending on model output)

## Check Model Parameters

To see what parameters a model accepts:
```bash
node scripts/models.js get google/nano-banana-pro
```

## Troubleshooting

**API token not found:** Verify `REPLICATE_API_TOKEN` is set in `/memory/connectors/replicate/.env`

**Rate limit (429):** Wait and retry.

**Dependencies missing:** Run `npm install` in the connectors/replicate directory.

See `/connectors/replicate/AGENTS.md` for additional troubleshooting.
