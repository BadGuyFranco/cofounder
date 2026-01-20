# Google AI - Video Generation

Generate videos using Google's Veo model via the centralized Connector.

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

## Prerequisites

**Credential location:** `/memory/connectors/google/.env`

Required variable:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

**Not configured?** Follow `/connectors/google/SETUP.md` Part B (API Key setup).

## Current Limitations

**Important:** Direct Veo video generation via Google AI is in limited preview. The Connector's `ai.js video` command may not be fully functional.

**Recommended alternative:** Use Replicate with Google's Veo models instead:
```bash
cd "/cofounder/connectors/replicate"
node scripts/predictions.js run google/veo-3.1 \
  --input '{"prompt": "your prompt"}' \
  --download /path/to/output
```

This provides access to the same Veo models with better reliability.

## Generate a Video (When Available)

```bash
cd "/cofounder/connectors/google"
node scripts/ai.js video "your prompt here" --output /path/to/video.mp4
```

**Note:** This may return an error about limited preview availability.

## Alternative: Use Veo via Replicate

Replicate hosts Google's Veo models with full API access:

| Model | Command |
|-------|---------|
| Veo 3.1 | `node scripts/predictions.js run google/veo-3.1 --input '{"prompt": "..."}' --download /path` |
| Veo 3 | `node scripts/predictions.js run google/veo-3 --input '{"prompt": "..."}' --download /path` |
| Veo 2 | `node scripts/predictions.js run google/veo-2 --input '{"prompt": "..."}' --download /path` |

## When to Use Direct Google AI

**Consider direct Google AI when:**
- You need features not available via Replicate
- Google lifts Veo preview restrictions
- You have special API access from Google

**Until then:** Use Replicate for reliable Veo video generation.

## Troubleshooting

**"Video generation (Veo) is currently in limited preview":** This is expected. Use Replicate instead.

**API key not found:** Verify `GOOGLE_AI_API_KEY` is set in `/memory/connectors/google/.env`

See `/connectors/google/AGENTS.md` for additional troubleshooting.
