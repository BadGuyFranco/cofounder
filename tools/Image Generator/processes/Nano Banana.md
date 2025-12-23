# Nano Banana - Image Generation

Generate images using Google Gemini API.


## Prerequisites

Verify these environment variables are set in `/memory/Image Generator/.env`:
- `GEMINI_API_KEY` - Your Google AI API key (required)
- `GEMINI_MODEL` - Model to use (required)


## Generate an Image

**Basic generation:**
```bash
cd "pro accelerator/tools/Image Generator"
python3 scripts/generate_image_gemini.py "your prompt here"
```

**With aspect ratio:**
```bash
python3 scripts/generate_image_gemini.py "your prompt" --aspect-ratio 16:9
```

**With custom output:**
```bash
python3 scripts/generate_image_gemini.py "your prompt" --output-dir /path/to/folder --output filename.png
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

If the user requests specific dimensions (e.g., 1920x1080), calculate the closest supported ratio:

| Requested | Ratio | Use |
|-----------|-------|-----|
| 1920x1080 | 16:9 | `--aspect-ratio 16:9` |
| 1080x1920 | 9:16 | `--aspect-ratio 9:16` |
| 1024x1024 | 1:1 | `--aspect-ratio 1:1` |
| 1200x900 | 4:3 | `--aspect-ratio 4:3` |


## Parameters

| Parameter | Description |
|-----------|-------------|
| `prompt` | Text description of the image (required) |
| `--aspect-ratio`, `-a` | Aspect ratio from supported list |
| `--output-dir`, `-d` | Directory to save image |
| `--output`, `-o` | Output filename |


## Troubleshooting

**API key not found:** Verify `GEMINI_API_KEY` is set in `/memory/Image Generator/.env`

**Model overloaded (503):** Wait a moment and retry

**Import error:** Install dependencies from `requirements.txt` in the Image Generator directory.


## Output

- **Default location:** `./generated_images/`
- **Naming format:** `gemini_[timestamp]_[prompt-excerpt].png`
- **Quality:** Native resolution, no post-processing

