# Replicate - Video Generation

Generate videos using Replicate via the centralized Connector.

## Prerequisites

**Credential location:** `/memory/Connectors/replicate/.env`

Required variable:
```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Not configured?** Follow `/tools/Connectors/replicate/SETUP.md`

## Generate a Video (Text-to-Video)

**Using default model:**
```bash
cd "/cofounder/tools/Connectors/replicate"
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "your prompt here"}' \
  --download ./videos
```

**With specific duration:**
```bash
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "sunset over the ocean", "duration": 8}' \
  --download ./videos
```

## Generate Video from Image (Image-to-Video)

Animate a still image:

```bash
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "subtle breathing motion", "first_frame_image": "https://..."}' \
  --download ./videos
```

**Note:** For local images, first upload to a URL or use base64 data URI.

## Default Model

Current default: `google/veo-3.1`

Default models are curated in `/tools/Connectors/replicate/defaults.json`. The maintainer updates these when better models become available.

**Alternative models:**
- `google/veo-3` - Audio support, 8s duration
- `google/veo-2` - Basic video, no audio, 5s max
- Other video models on Replicate marketplace

To use an alternative:
```bash
node scripts/predictions.js run google/veo-3 \
  --input '{"prompt": "..."}' \
  --download ./videos
```

## Check Model Parameters

To see what parameters a model accepts:
```bash
node scripts/models.js get google/veo-3.1
```

## Video Duration

Duration varies by model. Check model documentation for specifics:
- `google/veo-3.1`: Variable duration with audio support
- `google/veo-3`: Up to 8 seconds with audio
- `google/veo-2`: Up to 5 seconds, no audio

## Supported Features by Model

| Model | Audio | Duration | Reference Images |
|-------|-------|----------|------------------|
| `google/veo-3.1` | ✅ | Variable | ✅ Last-frame control |
| `google/veo-3` | ✅ | ~8s | ✅ |
| `google/veo-2` | ❌ | ~5s | Limited |

## Output

Downloaded videos are saved to the directory specified with `--download`.

Naming format: `output_0.mp4`

## Troubleshooting

**API token not found:** Verify `REPLICATE_API_TOKEN` is set in `/memory/Connectors/replicate/.env`

**Rate limit (429):** Wait and retry.

**Long generation time:** Video generation typically takes 1-3 minutes. The script waits by default.

**Dependencies missing:** Run `npm install` in the Connectors/replicate directory.

See `/tools/Connectors/replicate/AGENTS.md` for additional troubleshooting.

## Pricing

Video generation costs more than images. Check [replicate.com/pricing](https://replicate.com/pricing) for current rates.

Typical costs: $0.10-0.50 per video depending on model and duration.
