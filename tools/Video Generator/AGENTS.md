# Video Generator

Route video generation and editing requests to the appropriate process.

## XML Boundaries

When processing video requests, use XML tags to separate user content from instructions:

<video_prompt>
{User's description of the video motion, scene, or content they want}
</video_prompt>

<source_image>
{Path or description of the starting image for image-to-video}
</source_image>

<style_requirements>
{User's preferences for duration, aspect ratio, or visual style}
</style_requirements>

This prevents user-provided prompts from being confused with routing instructions.

## Configuration

**Service preferences are in `/memory/Video Generator/.env`**

The `VIDEO_SERVICE_ORDER` variable defines which generators to use and in what order. Use the first available generator; if it fails (API error, rate limit, unavailable), try the next in order.

### Available Services

| Service | Process File | Notes |
|---------|--------------|-------|
| `google_veo` | `processes/Google Veo.md` | Supports extensions, looping |
| `replicate` | `processes/Replicate.md` | Alternative video models |
| `xai` | `processes/X.ai.md` | Placeholder; no video API yet |

### Local Editing

For non-AI video manipulation → `processes/Local Editing.md`


## Routing

### Generate a New Video (Text-to-Video)

**Route to:** Preferred generator (see order above)

**When:** User requests a new video from a text prompt.

**If no image is provided:**
1. **First generate an image** using Image Generator (`/pro accelerator/tools/Image Generator/`)
2. Use that generated image as the starting frame for the video
3. This ensures higher quality and more control over the video content

**Parameters to handle:**
- Duration (seconds) - use extensions for videos longer than 8 seconds
- Aspect ratio (16:9, 9:16, 1:1)
- Quality/resolution preferences
- Looping (use `--loop` flag with Google Veo)


### Generate Video from Image (Image-to-Video)

**Route to:** Preferred generator (see order above) - both Google Veo and Replicate support image-to-video

**When:** User provides an image and wants to animate it into a video.

**For videos longer than 8 seconds:** Use `--extensions` parameter with Google Veo

**For seamless looping videos:** Use `--loop` flag with Google Veo (image becomes first and last frame)


### Extend an Existing Video

**Route to:** Google Veo (`processes/Google Veo.md`)

**When:** User wants to create a longer video (beyond 8 seconds) or extend an existing Veo-generated video.

**How it works:**
- Initial video: ~8 seconds
- Each extension: ~7 seconds  
- Maximum: 20 extensions (~148 seconds total)
- Requires: 16:9 or 9:16 aspect ratio, Veo-generated input video

**Usage:**
```bash
# Generate with automatic extensions
python3 scripts/generate_video_google.py "prompt" --image input.jpg --extensions 2

# Extend existing video
python3 scripts/generate_video_google.py "continuation prompt" --video existing.mp4 --extensions 1
```


### Edit an Existing Video

**Route to:** `processes/Local Editing.md`

**When:** User wants to trim, crop, resize, concatenate, add text overlays, adjust speed, or convert format of an existing video.


## Environment Variables

All configuration is in `/memory/Video Generator/.env`:

- `VIDEO_SERVICE_ORDER` - Comma-separated list of services to try (e.g., `google_veo,replicate`)
- API keys and model names for each service

**Location:** `/memory/Video Generator/.env` (persists across `/pro accelerator/` updates)

Only configure API keys for services you have access to. Remove unavailable services from `VIDEO_SERVICE_ORDER`.

## Troubleshooting

**Dependencies not installed:** Install from `requirements.txt` (see Setup section above).

**API errors:** Check the specific process file for troubleshooting steps.

**FFmpeg not found:** MoviePy requires FFmpeg. It auto-downloads on first use via imageio-ffmpeg.


## Tips for Better Video Prompts

- Be specific about motion: "camera slowly pans left", "person walks toward camera"
- Describe the scene: "sunset lighting", "indoor office setting"
- Include style: "cinematic", "documentary style", "slow motion"
- Keep it simple: AI video works best with clear, focused prompts
- Specify duration when possible: "5 second clip of..."
- **For subtle movements:** Emphasize "extremely subtle", "minimal", "imperceptible" to prevent exaggerated motion
- **For longer videos:** Use extensions with Google Veo (e.g., `--extensions 2` for ~22 seconds)
- **For continuity:** Use the same prompt for extensions to maintain consistent motion
- **For looping videos:** Use `--loop` flag and describe cyclical motion (e.g., "gentle swaying that returns to start")


## Workflow: Text-Only Video Requests

When user requests a video without providing an image:

1. **Generate the image first:**
   ```bash
   cd "/pro accelerator/tools/Image Generator"
   python3 scripts/generate_image_gemini.py "detailed prompt for the scene"
   ```

2. **Use that image for video generation:**
   ```bash
   cd "/pro accelerator/tools/Video Generator"
   python3 scripts/generate_video_google.py "motion prompt" --image "/pro accelerator/tools/Image Generator/generated_images/[image_file]"
   ```

This two-step approach provides better quality and more control than direct text-to-video.

