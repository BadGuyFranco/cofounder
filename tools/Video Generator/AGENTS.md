# Video Generator

Route video generation and editing requests to the appropriate service.

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

## Setup Detection

Before generating videos, check which services are configured.

### Check Configuration Status

**Replicate configured?**
```bash
test -f "/memory/connectors/replicate/.env" && grep -q "REPLICATE_API_TOKEN" "/memory/connectors/replicate/.env" && echo "YES" || echo "NO"
```

**Google AI configured?**
```bash
test -f "/memory/connectors/google/.env" && grep -q "GOOGLE_AI_API_KEY" "/memory/connectors/google/.env" && echo "YES" || echo "NO"
```

### Legacy Credential Migration

If `/memory/tools/Video Generator/.env` exists with credentials, silently migrate them:

**Migration logic:**
1. Check if `/memory/tools/Video Generator/.env` exists
2. If `REPLICATE_API_TOKEN` exists in old location AND `/memory/connectors/replicate/.env` does NOT have it:
   - Copy token to `/memory/connectors/replicate/.env`
3. If `GEMINI_API_KEY` exists in old location AND `/memory/connectors/google/.env` does NOT have `GOOGLE_AI_API_KEY`:
   - Copy to `/memory/connectors/google/.env` as `GOOGLE_AI_API_KEY`
4. Rename old file to `/memory/tools/Video Generator/.env.migrated`

**Silent migration command sequence:**
```bash
# Check and migrate Replicate token
if [ -f "/memory/tools/Video Generator/.env" ]; then
  OLD_TOKEN=$(grep REPLICATE_API_TOKEN "/memory/tools/Video Generator/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$OLD_TOKEN" ]; then
    if ! grep -q REPLICATE_API_TOKEN "/memory/connectors/replicate/.env" 2>/dev/null; then
      mkdir -p "/memory/connectors/replicate"
      echo "REPLICATE_API_TOKEN=$OLD_TOKEN" >> "/memory/connectors/replicate/.env"
    fi
  fi
  
  # Migrate Gemini key
  OLD_GEMINI=$(grep GEMINI_API_KEY "/memory/tools/Video Generator/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$OLD_GEMINI" ]; then
    if ! grep -q GOOGLE_AI_API_KEY "/memory/connectors/google/.env" 2>/dev/null; then
      mkdir -p "/memory/connectors/google"
      echo "GOOGLE_AI_API_KEY=$OLD_GEMINI" >> "/memory/connectors/google/.env"
    fi
  fi
  
  mv "/memory/tools/Video Generator/.env" "/memory/tools/Video Generator/.env.migrated"
fi
```

## First-Time Onboarding

If no services are configured, present this to the user:

---

**Video generation requires at least one AI service. Which would you like to set up?**

**Option 1: Replicate (Recommended)**
- Setup time: ~5 minutes
- Cost: ~$0.10-0.50 per video
- Process: Get API token, paste it here
- Provides access to Google Veo and other video models

**Option 2: Google AI (Limited)**
- Setup time: 45-60 minutes
- Direct Veo access is in limited preview
- Most users should use Replicate to access Veo models instead

**Recommendation:** Start with Replicate. It provides reliable access to Google's Veo models plus other video generators.

Which would you like to set up? (1 or 2)

---

### Setting Up Replicate

1. Tell user: "Go to https://replicate.com/account/api-tokens and create a new API token."
2. User provides token (starts with `r8_`)
3. Create `/memory/connectors/replicate/.env`:
   ```
   REPLICATE_API_TOKEN=r8_xxxxxxxxxx
   ```
4. Verify:
   ```bash
   cd "/cofounder/connectors/replicate" && node scripts/account.js verify
   ```

### Setting Up Google AI

Point user to: `/connectors/google/SETUP.md` Part B (API Key setup).

**Note:** Direct Veo video generation via Google AI is in limited preview. Even after setup, video generation may not work. Replicate is recommended.

## Service Priority

When both services are configured:
1. **Primary:** Replicate (reliable Veo access, better model selection)
2. **Fallback:** Google AI (limited; may not support video generation)

User can override by specifying service in their request.

## Routing

### Generate a New Video (Text-to-Video)

**Route to:** Replicate Connector

**When:** User requests a new video from a text prompt.

**Best practice:** For highest quality, first generate an image using Image Generator, then animate it.

**Command:**
```bash
cd "/cofounder/connectors/replicate"
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "YOUR_PROMPT"}' \
  --download ./videos
```

See `processes/Replicate.md` for detailed instructions.

### Generate Video from Image (Image-to-Video)

**Route to:** Replicate Connector

**When:** User provides an image and wants to animate it into a video.

**Command:**
```bash
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "subtle motion description", "first_frame_image": "https://..."}' \
  --download ./videos
```

### Edit an Existing Video

**Route to:** `processes/Local Editing.md`

**When:** User wants to trim, crop, resize, concatenate, add text overlays, adjust speed, or convert format of an existing video.

**Command:**
```bash
cd "/cofounder/tools/Video Generator"
node scripts/local-video-edit.js [options]
```

## Available Services

| Service | Process File | Credential Location |
|---------|--------------|---------------------|
| Replicate | `processes/Replicate.md` | `/memory/connectors/replicate/.env` |
| Google AI | `processes/Google.md` | `/memory/connectors/google/.env` |

### Default Models

**Replicate:** See `/connectors/replicate/defaults.json` for curated defaults.
- Current video default: `google/veo-3.1`
- Alternatives: `google/veo-3`, `google/veo-2`

## Workflow: Text-Only Video Requests

When user requests a video without providing an image:

1. **Generate the image first:**
   ```bash
   cd "/cofounder/connectors/replicate"
   node scripts/predictions.js run google/nano-banana-pro \
     --input '{"prompt": "detailed scene description", "aspect_ratio": "16:9"}' \
     --download ./images
   ```

2. **Use that image for video generation:**
   ```bash
   node scripts/predictions.js run google/veo-3.1 \
     --input '{"prompt": "motion description", "first_frame_image": "https://...or-local-path"}' \
     --download ./videos
   ```

This two-step approach provides better quality and more control than direct text-to-video.

## Video Duration and Extensions

Duration varies by model:

| Model | Base Duration | Notes |
|-------|---------------|-------|
| `google/veo-3.1` | Variable | Audio support, last-frame control |
| `google/veo-3` | ~8 seconds | Audio support |
| `google/veo-2` | ~5 seconds | No audio |

**For longer videos:** Some models support extensions or multiple generations that can be concatenated using local editing.

## Troubleshooting

**No services configured:** Run the onboarding flow above.

**Dependencies not installed:**
```bash
cd "/cofounder/connectors/replicate" && npm install
```

**FFmpeg not found (for local editing):** Install with `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux).

**Long generation time:** Video generation typically takes 1-3 minutes. This is normal.

**API errors:** Check the specific process file for troubleshooting steps.

## Tips for Better Video Prompts

- Be specific about motion: "camera slowly pans left", "person walks toward camera"
- Describe the scene: "sunset lighting", "indoor office setting"
- Include style: "cinematic", "documentary style", "slow motion"
- Keep it simple: AI video works best with clear, focused prompts
- **For subtle movements:** Emphasize "extremely subtle", "minimal", "imperceptible" to prevent exaggerated motion
- **For continuity:** Use consistent prompts when generating multiple clips
