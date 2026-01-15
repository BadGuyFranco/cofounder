# HuggingFace Connector

Access HuggingFace Hub: models, datasets, repositories, and inference.

## Quick Start

```bash
node scripts/account.js verify
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

**Not configured?** Follow `SETUP.md`.

**What can I do?** See `CAPABILITIES.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `models.js` | Browse, search, download models |
| `datasets.js` | Browse, search, download datasets |
| `repos.js` | Create, delete, manage repositories |
| `inference.js` | Run models via Inference API |
| `account.js` | Verify credentials, show configuration |

Run any script with `help` for full command syntax.

## Configuration

**Credentials:** `/memory/connectors/huggingface/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Troubleshooting

**"HUGGINGFACE_API_TOKEN not found":** Create `.env` with your token.

**"401 Unauthorized":** Token invalid. Generate new one at https://huggingface.co/settings/tokens

**"403 Forbidden":** Gated model/dataset. Visit the page and accept terms first.

**"Model is loading":** Cold start needed. Use `--wait` flag to retry automatically.

**"Repository not found":** Check format is `owner/name`.

## API Documentation

https://huggingface.co/docs/hub/api
