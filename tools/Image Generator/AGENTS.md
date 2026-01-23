# Image Generator

Route image generation and editing requests to the appropriate service.

## Output Location

There is no default save location. Ask the user where to save generated images before proceeding.

## Path Resolution

`/cofounder/` and `/memory/` are workspace roots, not filesystem paths. Resolve from `user_info.Workspace Paths` before running terminal commands.

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

## Setup Detection

Before generating images, check which services are configured.

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

If `/memory/tools/Image Generator/.env` exists with credentials, silently migrate them:

**Migration logic:**
1. Check if `/memory/tools/Image Generator/.env` exists
2. If `REPLICATE_API_TOKEN` exists in old location AND `/memory/connectors/replicate/.env` does NOT have it:
   - Copy token to `/memory/connectors/replicate/.env`
3. If `GEMINI_API_KEY` exists in old location AND `/memory/connectors/google/.env` does NOT have `GOOGLE_AI_API_KEY`:
   - Copy to `/memory/connectors/google/.env` as `GOOGLE_AI_API_KEY`
4. Rename old file to `/memory/tools/Image Generator/.env.migrated`

**Silent migration command sequence:**
```bash
# Check and migrate Replicate token
if [ -f "/memory/tools/Image Generator/.env" ]; then
  OLD_TOKEN=$(grep REPLICATE_API_TOKEN "/memory/tools/Image Generator/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$OLD_TOKEN" ]; then
    if ! grep -q REPLICATE_API_TOKEN "/memory/connectors/replicate/.env" 2>/dev/null; then
      mkdir -p "/memory/connectors/replicate"
      echo "REPLICATE_API_TOKEN=$OLD_TOKEN" >> "/memory/connectors/replicate/.env"
    fi
  fi
  
  # Migrate Gemini key
  OLD_GEMINI=$(grep GEMINI_API_KEY "/memory/tools/Image Generator/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$OLD_GEMINI" ]; then
    if ! grep -q GOOGLE_AI_API_KEY "/memory/connectors/google/.env" 2>/dev/null; then
      mkdir -p "/memory/connectors/google"
      echo "GOOGLE_AI_API_KEY=$OLD_GEMINI" >> "/memory/connectors/google/.env"
    fi
  fi
  
  mv "/memory/tools/Image Generator/.env" "/memory/tools/Image Generator/.env.migrated"
fi
```

## First-Time Onboarding

If no services are configured, present this to the user:

---

**Image generation requires at least one AI service. Which would you like to set up?**

**Option 1: Replicate (Recommended)**
- Setup time: ~5 minutes
- Cost: ~$0.003-0.05 per image
- Process: Get API token, paste it here

**Option 2: Google AI (Gemini)**
- Setup time: 45-60 minutes
- Cost: ~$0.0025 per image (free tier available)
- Process: Complex OAuth setup required

**Recommendation:** Start with Replicate. It's dramatically easier to set up and produces excellent results. You can add Google AI later as a backup.

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

This requires:
1. Google Cloud Console project
2. Enable Generative Language API
3. Create API key in AI Studio
4. Takes 45-60 minutes for first-time users

## Service Priority

When both services are configured:
1. **Primary:** Replicate (better model selection, clearer errors)
2. **Fallback:** Google AI (if Replicate fails)

User can override by specifying service in their request.

## Routing

### Generate a New Image

**Route to:** Configured service (Replicate preferred)

**When:** User requests a new image from a text prompt.

**Aspect ratio handling:** If user specifies dimensions (e.g., 1920x1080), calculate the closest supported aspect ratio.

**Replicate (async workflow, recommended):**

Use the two-step async workflow to avoid shell timeouts on slow models:

```bash
# Step 1: Start generation (returns immediately with prediction ID)
cd "/cofounder/connectors/replicate"
node scripts/predictions.js run google/nano-banana-pro \
  --input '{"prompt": "YOUR_PROMPT", "aspect_ratio": "16:9"}' \
  --no-wait
```

Output includes: `Prediction created: abc123xyz`

```bash
# Step 2: Wait for completion and download (use longer timeout, e.g., 300000ms)
node scripts/predictions.js wait abc123xyz --download /user/specified/output.png
```

The `wait` command polls until complete, then downloads. This separates job creation from waiting, preventing shell timeout issues.

**Replicate (sync workflow, for fast models only):**
```bash
cd "/cofounder/connectors/replicate"
node scripts/predictions.js run google/nano-banana-pro \
  --input '{"prompt": "YOUR_PROMPT", "aspect_ratio": "16:9"}' \
  --download /user/specified/path
```

**Google AI:**
```bash
cd "/cofounder/connectors/google"
node scripts/ai.js image "YOUR_PROMPT" --aspect-ratio 16:9 --output /user/specified/image.png
```

See `processes/Replicate.md` and `processes/Google.md` for detailed instructions.

### Edit an Existing Image

**Route to:** `processes/Local Editing.md`

**When:** User wants to resize, crop, convert format, adjust brightness/contrast, rotate, or apply simple filters to an existing image.

### Remove Background

**Route to:** `scripts/remove-background.js`

**When:** User wants to remove background from a photo (headshots, products).

```bash
cd "/cofounder/tools/Image Generator"
node scripts/remove-background.js input.jpg output.png
```

Uses Replicate Connector credentials and curated default model.

### Render to Image

**Route to:** `scripts/svg-to-png.js`, `scripts/html-to-png.js`, `scripts/mermaid-to-png.js`, or `scripts/screenshot.js`

**When:** Convert SVG/Mermaid/HTML to PNG, or screenshot a webpage.

**Setup:** Requires `npm install` in Image Generator directory. First run may download browsers (~500MB, shared system-wide).

```bash
# SVG to PNG
cd "/cofounder/tools/Image Generator"
node scripts/svg-to-png.js input.svg output.png [--scale 2] [--width 1000]

# Mermaid to PNG
node scripts/mermaid-to-png.js input.mmd output.png [--width 800] [--scale 2] [--theme neutral]

# HTML to PNG
node scripts/html-to-png.js input.html output.png [--width 1200] [--height 630]

# Screenshot webpage
node scripts/screenshot.js "https://example.com" output.png [--width 1280] [--full-page]
```

**Mermaid options:**
- `--width N` - Max width in pixels (default: 800)
- `--scale N` - Device scale factor for higher resolution (default: 2)
- `--theme NAME` - Mermaid theme: default, neutral, dark, forest (default: neutral)
- `--background COLOR` - Background color, use 'transparent' for none (default: white)

### Generate Video

**Route to:** `/tools/Video Generator/` library

**When:** User wants to generate a video. Video generation is handled by the separate Video Generator library.

## Available Services

| Service | Process File | Credential Location |
|---------|--------------|---------------------|
| Replicate | `processes/Replicate.md` | `/memory/connectors/replicate/.env` |
| Google AI | `processes/Google.md` | `/memory/connectors/google/.env` |

### Default Models

**Replicate:** See `/connectors/replicate/defaults.json` for curated defaults.
- Current image default: `google/nano-banana-pro`
- Current background removal: `cjwbw/rembg`

**Google AI:** `gemini-2.0-flash-exp`

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this tool's directory.

**No services configured:** Run the onboarding flow above.

**Dependencies not installed:**
```bash
cd "/cofounder/connectors/replicate" && npm install
cd "/cofounder/connectors/google" && npm install
```

**API errors:** Check the specific process file for troubleshooting steps.

**Credential issues:** Verify the .env file exists and contains the correct token format.

## Tips for Better Prompts

- Be specific: "professional podcast studio with blue lighting" not "studio"
- Include style: "photorealistic", "minimalist", "illustration"
- Describe composition: "centered", "wide angle", "close-up"
- Add context: "for a business podcast", "corporate setting"
