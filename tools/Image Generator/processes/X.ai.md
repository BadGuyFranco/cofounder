# X.ai - Image Generation

Generate images using X.ai's image generation API.


## Prerequisites

Verify these environment variables are set in `/memory/Image Generator/.env`:
- `XAI_API_KEY` - Your X.ai API key (required)
- `XAI_IMAGE_MODEL` - Image model to use (required)


## Generate an Image

**Basic generation:**
```bash
cd "pro accelerator/tools/Image Generator"
python3 scripts/generate_image_xai.py "your prompt here"
```

**With custom output:**
```bash
python3 scripts/generate_image_xai.py "your prompt" --output-dir /path/to/folder --output filename.png
```

**Generate multiple images:**
```bash
python3 scripts/generate_image_xai.py "your prompt" --count 3
```


## Parameters

| Parameter | Description |
|-----------|-------------|
| `prompt` | Text description of the image (required) |
| `--output-dir`, `-d` | Directory to save image |
| `--output`, `-o` | Output filename |
| `--count`, `-n` | Number of images to generate (1-10) |


## Limitations

**X.ai does NOT support:**
- Aspect ratio selection
- Image size/resolution control
- Quality settings
- Style parameters

Images are generated at the model's native resolution (fixed size).


## Revised Prompts

X.ai may revise your prompt before generating. The revised prompt is displayed in the output if it differs from your original prompt.


## Pricing & Rate Limits

- **Cost:** ~$0.07 per image
- **Rate limit:** 10 images per request, 5 requests per second


## Troubleshooting

**API key not found:** Verify `XAI_API_KEY` is set in `/memory/Image Generator/.env`

**401 Unauthorized:** Check that your API key is valid

**429 Rate limit:** Wait a moment and retry

**Import error:** Install dependencies from `requirements.txt` in the Image Generator directory.


## Output

- **Default location:** `./generated_images/`
- **Naming format:** `xai_[timestamp]_[prompt-excerpt].png`
- **Quality:** Native resolution, no post-processing


## When to Use X.ai

**Best for:**
- Quick image generation without aspect ratio requirements
- Alternative when other generators are unavailable
- Variety in image style (different model characteristics)

**Not ideal for:**
- Specific dimensions or aspect ratios needed
- Precise control over output format

