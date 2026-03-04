# OpenAI Connector

GPT and o-series completions, embeddings, image generation, and audio via OpenAI's API.

## Quick Start

```bash
node scripts/models.js list
node scripts/chat.js ask "Hello GPT"
```

## Configuration

**Credentials:** `/memory/connectors/openai/.env`

```
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...   # optional
```

Get your key at: https://platform.openai.com/api-keys

## Scripts

| Script | Purpose |
|--------|---------|
| `chat.js` | Chat completions (GPT-4o, o3-mini, etc.) |
| `models.js` | List available models |

```bash
node scripts/chat.js help
node scripts/models.js help
```

## Current Models

| Model | Notes |
|-------|-------|
| `gpt-4o` | Best balance of speed and capability — default |
| `gpt-4o-mini` | Fast and cheap, handles most tasks |
| `o3-mini` | Reasoning model — complex logic, math, code |
| `o1` | Strongest reasoning (slowest, most expensive) |

Run `node scripts/models.js list` for the live list (includes all fine-tuned models too).

## Key Notes

- Auth: `Authorization: Bearer OPENAI_API_KEY`
- JSON mode: add `response_format: { type: "json_object" }` + mention JSON in the prompt
- `o1`/`o3` models do **not** support `temperature` or `system` messages — omit both for those models
- Token usage: `usage.prompt_tokens` / `usage.completion_tokens`
- Organization ID (`OPENAI_ORG_ID`) only needed for accounts belonging to multiple orgs

## Troubleshooting

**"Incorrect API key":** Keys start with `sk-`. Ensure no trailing whitespace in `.env`.

**"You exceeded your current quota":** Add billing at https://platform.openai.com/account/billing

**"temperature is not supported with this model":** Remove `--temperature` flag when using o1/o3 models.

**"response_format requires JSON in prompt":** When using `--json`, mention "JSON" in your message or system prompt.

## API Documentation

https://platform.openai.com/docs/api-reference
