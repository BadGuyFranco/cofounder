# xAI Connector

Grok chat completions via xAI's OpenAI-compatible API.

## Quick Start

```bash
node scripts/models.js list
node scripts/chat.js ask "Hello Grok"
```

## Configuration

**Credentials:** `/memory/connectors/xai/.env`

```
XAI_API_KEY=xai-...
```

Get your key at: https://console.x.ai

## Scripts

| Script | Purpose |
|--------|---------|
| `chat.js` | Send messages, get completions |
| `models.js` | List available Grok models |

```bash
node scripts/chat.js help
node scripts/models.js help
```

## Current Models

| Model | Notes |
|-------|-------|
| `grok-3` | Flagship — default |
| `grok-3-mini` | Fast, low cost |
| `grok-2-vision` | Multimodal (text + image) |

Run `node scripts/models.js list` for the live list.

## Key Notes

- xAI uses the **OpenAI-compatible** API format (`/v1/chat/completions`)
- Base URL: `https://api.x.ai/v1`
- Auth: `Authorization: Bearer XAI_API_KEY`
- Token usage returned in every response (`usage.prompt_tokens` / `usage.completion_tokens`)

## Troubleshooting

**"Incorrect API key":** Check `XAI_API_KEY` in `/memory/connectors/xai/.env`. Keys start with `xai-`.

**"model not found":** Run `node scripts/models.js list` to see current available models.

**Rate limits:** xAI enforces per-minute and per-day limits depending on plan tier.

## API Documentation

https://docs.x.ai/api
