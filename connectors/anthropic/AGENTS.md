# Anthropic Connector

Claude chat completions via Anthropic's Messages API.

## Quick Start

```bash
node scripts/models.js list
node scripts/chat.js ask "Hello Claude"
```

## Configuration

**Credentials:** `/memory/connectors/anthropic/.env`

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at: https://console.anthropic.com

## Scripts

| Script | Purpose |
|--------|---------|
| `chat.js` | Send messages, get completions |
| `models.js` | List available Claude models |

```bash
node scripts/chat.js help
node scripts/models.js help
```

## Current Models

| Model | Notes |
|-------|-------|
| `claude-3-5-sonnet-20241022` | Best balance — default |
| `claude-3-5-haiku-20241022` | Fastest, lowest cost |
| `claude-3-opus-20240229` | Most capable (slow, expensive) |

Run `node scripts/models.js list` for the live list.

## Key Notes

- Auth header: `x-api-key` (not `Authorization: Bearer`)
- Required header: `anthropic-version: 2023-06-01`
- Messages API: `/v1/messages` (not `/v1/chat/completions`)
- System prompt is a **top-level field** on the request body, not a message
- Token usage: `usage.input_tokens` / `usage.output_tokens`
- Prompt caching available with `cache_control` headers (Beta)

## Troubleshooting

**"Invalid API Key":** Keys start with `sk-ant-api03-`. Check `/memory/connectors/anthropic/.env`.

**"overloaded_error":** Anthropic servers busy — retry with backoff.

**"context_length_exceeded":** Input too long for model. Use a model with larger context or shorten input.

**Temperature range:** Anthropic accepts 0–1 only (not 0–2 like OpenAI/xAI).

## API Documentation

https://docs.anthropic.com/en/api
