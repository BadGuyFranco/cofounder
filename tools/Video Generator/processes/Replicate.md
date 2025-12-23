# Replicate - Video Generation

Generate videos using Replicate API with your configured video model.


## Prerequisites

Verify these environment variables are set in `/memory/Video Generator/.env`:
- `REPLICATE_API_TOKEN` - Your Replicate API token (required)
- `REPLICATE_VIDEO_MODEL` - Video model to use (required)


## Generate a Video (Text-to-Video)

**Basic generation:**
```bash
cd "pro accelerator/tools/Video Generator"
python3 scripts/generate_video_replicate.py "your prompt here"
```

**With custom output:**
```bash
python3 scripts/generate_video_replicate.py "your prompt" --output video.mp4
```


## Generate Video from Image (Image-to-Video)

Animate a still image into a video:

```bash
python3 scripts/generate_video_replicate.py "camera slowly zooms in" --image input.jpg
```

The prompt describes the motion/action to apply to the image.


## Model Configuration

The video model is configured in `/memory/Video Generator/.env` via `REPLICATE_VIDEO_MODEL`. 

Check the model's Replicate page for specific capabilities (resolution, duration, input types).


## Parameters

| Parameter | Description |
|-----------|-------------|
| `prompt` | Text description of the video (required) |
| `--image`, `-i` | Input image for image-to-video |
| `--output`, `-o` | Output filename |
| `--output-dir`, `-d` | Directory to save video |


## Troubleshooting

**API token not found:** Verify `REPLICATE_API_TOKEN` is set in `/memory/Video Generator/.env`

**Rate limit (429):** Wait and retry

**Model cold start:** First request may take longer as the model loads

**Import error:** Install dependencies from `requirements.txt` in the Video Generator directory.


## Output

- **Default location:** `./generated_videos/`
- **Naming format:** `[timestamp]_[prompt-excerpt]_replicate.mp4`
- **Format:** MP4


## Pricing

Replicate uses per-second compute pricing. Check [replicate.com/pricing](https://replicate.com/pricing) for current rates. Video generation typically costs more than image generation.


## When to Use Replicate

**Best for:**
- Image-to-video animation
- Fallback when Google Veo is unavailable
- Consistent, reliable generation

**Strengths:**
- Supports both text-to-video and image-to-video
- High quality output
- Good API reliability

