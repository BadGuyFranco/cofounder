# My Connectors

User-created custom connectors. Build connectors for platforms not included in `/cofounder/connectors/`, or customize existing ones.

## Connector Routing

| Platform | Location |
|----------|----------|
| (Add your custom connectors here) | `my connectors/[platform]/` |

## Creating a Connector

Custom connectors follow the same patterns as built-in connectors. The difference is where they live.

**Code lives here:** `/memory/my connectors/[platform]/`  
**Credentials live there:** `/memory/Connectors/[platform]/.env`

### Quick Start

1. **Plan first** - Read `/cofounder/connectors/DEVELOPMENT.md` Step 0
2. **Create directory:** `/memory/my connectors/[platform]/`
3. **Build required files:**
   - `AGENTS.md` - AI reference (config, credentials, troubleshooting)
   - `SETUP.md` - User instructions for getting credentials
   - `CAPABILITIES.md` - Simple list of what it can do
   - `README.md` - Human overview
   - `package.json` - Dependencies
   - `scripts/utils.js` - Shared utilities
   - `scripts/[domain].js` - Feature scripts
4. **Add to routing table above**
5. **Test end-to-end**

### Development Guide

See `/cofounder/connectors/DEVELOPMENT.md` for complete instructions:

- Planning phase (required before coding)
- Authentication patterns (API Key, OAuth 2.0, OAuth 1.0a)
- File-by-file templates
- Script conventions
- Testing checklist

### Reference Connectors by Pattern

Copy the pattern that matches your target API:

| Pattern | Reference | Use When |
|---------|-----------|----------|
| API Key | `/cofounder/connectors/airtable/` | Simple token auth |
| OAuth 2.0 | `/cofounder/connectors/linkedin/` | Client ID + Secret, token refresh |
| OAuth 1.0a | `/cofounder/connectors/xcom/` | Signature-based auth |
| GraphQL | `/cofounder/connectors/monday/` | GraphQL APIs |
| Multi-account | `/cofounder/connectors/xcom/` | Multiple credential sets |

### Credential Storage

All credentials (built-in or custom connectors) go in `/memory/Connectors/`:

```
/memory/Connectors/
├── [your-platform]/
│   └── .env
```

## Overriding Built-in Connectors

To customize a built-in connector:

1. Copy from `/cofounder/connectors/[platform]/` to `/memory/my connectors/[platform]/`
2. Modify as needed
3. Your version takes priority (routing checks here first)
