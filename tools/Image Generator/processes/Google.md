# Google AI - Image Generation

Generate images using Google Gemini via the centralized Connector.

## Prerequisites

**Credential location:** `/memory/Connectors/google/.env`

Required variable:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

**Not configured?** Follow `/tools/Connectors/google/SETUP.md` Part B (API Key setup only; OAuth not required for image generation).

## Generate an Image

```bash
cd "/cofounder/tools/Connectors/google"
node scripts/ai.js image "your prompt here" --output ./image.png
```

**With aspect ratio:**
```bash
node scripts/ai.js image "your prompt here" --aspect-ratio 16:9 --output ./landscape.png
```

**With custom output directory:**
```bash
node scripts/ai.js image "your prompt here" --output-dir /path/to/folder --output filename.png
```

## Supported Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| 1:1 | Square (default) |
| 16:9 | Widescreen landscape |
| 9:16 | Portrait / Stories |
| 4:3 | Standard landscape |
| 3:4 | Standard portrait |
| 3:2, 2:3 | Photo format |
| 4:5, 5:4 | Social media |
| 21:9 | Ultrawide |

## Aspect Ratio Translation

If user requests specific dimensions, calculate the closest supported ratio:

| Requested | Ratio | Use |
|-----------|-------|-----|
| 1920x1080 | 16:9 | `--aspect-ratio 16:9` |
| 1080x1920 | 9:16 | `--aspect-ratio 9:16` |
| 1024x1024 | 1:1 | `--aspect-ratio 1:1` |
| 1200x900 | 4:3 | `--aspect-ratio 4:3` |

## Output

- **Default location:** `./generated_images/`
- **Naming format:** `gemini_[timestamp]_[prompt-excerpt].png`

## Troubleshooting

**API key not found:** Verify `GOOGLE_AI_API_KEY` is set in `/memory/Connectors/google/.env`

**Model overloaded (503):** Wait a moment and retry.

**Dependencies missing:** Run `npm install` in the Connectors/google directory.

See `/tools/Connectors/google/AGENTS.md` for additional troubleshooting.
