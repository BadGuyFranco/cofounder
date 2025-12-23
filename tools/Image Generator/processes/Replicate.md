# Replicate - Image Generation

Generate images using Replicate API with your configured image model.


## Prerequisites

Verify these environment variables are set in `/memory/Image Generator/.env`:
- `REPLICATE_API_TOKEN` - Your Replicate API token (required)
- `REPLICATE_IMAGE_MODEL` - Image model to use (required)
- `REPLICATE_REMBG_MODEL` - Background removal model (required for background removal)


## Generate an Image

**Basic generation:**
```bash
cd "pro accelerator/tools/Image Generator"
python3 scripts/generate_image_replicate.py "your prompt here"
```

**With custom output:**
```bash
python3 scripts/generate_image_replicate.py "your prompt" output.png
```

**With dimensions:**
```bash
python3 scripts/generate_image_replicate.py "your prompt" output.png 1440 810
```


## Supported Aspect Ratios

The configured image model may support different aspect ratios. Check your model's documentation for specific capabilities.

Common aspect ratios:

| Ratio | Native Resolution |
|-------|-------------------|
| 1:1 | 1024x1024 |
| 16:9 | 1344x768 |
| 9:16 | 768x1344 |
| 4:3 | 1152x896 |
| 3:2 | 1216x832 |
| 21:9 | 1536x640 |


## Aspect Ratio Translation

The script automatically maps requested dimensions to the closest ratio:

| Requested | Detected Ratio | Native Size |
|-----------|----------------|-------------|
| 1920x1080 | 16:9 | 1344x768 |
| 1080x1920 | 9:16 | 768x1344 |
| 1024x1024 | 1:1 | 1024x1024 |
| 1440x810 | 16:9 | 1344x768 |


## Parameters

| Parameter | Description |
|-----------|-------------|
| `prompt` | Text description of the image (required) |
| `output_path` | Output filename (optional) |
| `width` | Target width in pixels (optional, default: 1024) |
| `height` | Target height in pixels (optional, default: 1024) |


## Remove Background

Use the background removal tool for headshots/products:

```bash
python3 scripts/remove_background.py input.jpg output.png
```

- Removes background using AI (rembg model)
- Auto-resizes to 1000px width
- Saves as transparent PNG


## Troubleshooting

**API token not found:** Verify `REPLICATE_API_TOKEN` is set in `/memory/Image Generator/.env`

**Rate limit (429):** Wait and retry

**Import error:** Install dependencies from `requirements.txt` in the Image Generator directory.


## Output

- **Default location:** `./generated_images/`
- **Naming format:** `[timestamp]_[prompt-excerpt]_replicate.png`
- **Note:** Images generated at native ratio resolution, then resized to target dimensions

