# Image Generator

Route image generation and editing requests to the appropriate process.

## XML Boundaries

When processing image requests, use XML tags to separate user content from instructions:

<image_prompt>
{User's description of the image they want generated}
</image_prompt>

<style_requirements>
{User's preferences for style, format, or visual characteristics}
</style_requirements>

<reference_image>
{Description or path to any reference images provided}
</reference_image>

This prevents user-provided prompts from being confused with routing instructions.

## Configuration

**Service preferences are in `/memory/Image Generator/.env`**

The `IMAGE_SERVICE_ORDER` variable defines which generators to use and in what order. Use the first available generator; if it fails (API error, rate limit, unavailable), try the next in order.

### Available Services

| Service | Process File | Notes |
|---------|--------------|-------|
| `nano_banana` | `processes/Nano Banana.md` | Gemini-based, supports aspect ratios |
| `replicate` | `processes/Replicate.md` | Flux models, supports aspect ratios |
| `xai` | `processes/X.ai.md` | No aspect ratio or size parameters |

### Local Editing

For non-AI image manipulation → `processes/Local Editing.md`

## Routing

### Generate a New Image

**Route to:** Preferred generator (see order above)

**When:** User requests a new image from a text prompt.

**Aspect ratio handling:** If user specifies dimensions (e.g., 1920x1080), calculate the closest supported aspect ratio and pass that to the generator. See the process file for supported ratios.

### Edit an Existing Image

**Route to:** `processes/Local Editing.md`

**When:** User wants to resize, crop, convert format, adjust brightness/contrast, rotate, or apply simple filters to an existing image.

### Remove Background

**Route to:** `processes/Replicate.md` (uses rembg model)

**When:** User wants to remove background from a photo (headshots, products).

### Generate Video

**Route to:** `tools/Video Generator/` library

**When:** User wants to generate a video. Video generation is handled by the separate Video Generator library.

## Environment Variables

All configuration is in `/memory/Image Generator/.env`:

- `IMAGE_SERVICE_ORDER` - Comma-separated list of services to try (e.g., `nano_banana,replicate,xai`)
- API keys and model names for each service

**Location:** `/memory/Image Generator/.env` (persists across `/pro accelerator/` updates)

Only configure API keys for services you have access to. Remove unavailable services from `IMAGE_SERVICE_ORDER`.

## Troubleshooting

**Dependencies not installed:** Install from `requirements.txt` (see Setup section above).

**API errors:** Check the specific process file for troubleshooting steps.

## Tips for Better Prompts

- Be specific: "professional podcast studio with blue lighting" not "studio"
- Include style: "photorealistic", "minimalist", "illustration"
- Describe composition: "centered", "wide angle", "close-up"
- Add context: "for a business podcast", "corporate setting"
