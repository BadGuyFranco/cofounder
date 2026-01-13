# Connectors

Connect to external platforms via their APIs.

## Routing Priority

1. **Check `/memory/my connectors/[platform]/`** first (user-created)
2. **Fall back to `/cofounder/connectors/[platform]/`** (built-in)

If `/memory/my connectors/` doesn't exist and user needs a custom connector, create it first.

## Available Connectors

| Platform | Location |
|----------|----------|
| Airtable | `airtable/` |
| ClickUp | `clickup/` |
| Cloudflare | `cloudflare/` |
| Go High Level | `gohighlevel/` |
| Google | `google/` |
| HeyGen | `heygen/` |
| HuggingFace | `huggingface/` |
| HubSpot | `hubspot/` |
| LinkedIn | `linkedin/` |
| Make | `make/` |
| Meetup | `meetup/` |
| Monday.com | `monday/` |
| Notion | `notion/` |
| Publer | `publer/` |
| Replicate | `replicate/` |
| Supabase | `supabase/` |
| WordPress | `wordpress/` |
| X.com | `xcom/` |

## Using a Connector

1. Load the connector's `AGENTS.md`
2. If user asks "what can I do?" → Show `CAPABILITIES.md`
3. If credentials missing → Walk through `SETUP.md`
4. For command syntax → Run `node scripts/[script].js help`

**Credentials location:** `/memory/Connectors/[platform]/.env`

## Credential Setup Rules

**NEVER open a browser during credential setup.** Provide step-by-step text instructions only.

When walking users through `SETUP.md`:
- Give instructions one step at a time
- Wait for user confirmation before proceeding
- Never use browser automation tools
- Never navigate to URLs on behalf of the user

The user handles all browser interactions. The AI provides guidance.

## File Structure

| File | Audience | Purpose |
|------|----------|---------|
| `AGENTS.md` | AI | Configuration and execution |
| `SETUP.md` | User | Credential setup steps |
| `CAPABILITIES.md` | User | What it can do |

## Building New Connectors

- **Write access to `/cofounder/`** → Build in `/cofounder/connectors/`
- **Read-only access** → Build in `/memory/my connectors/`

See `DEVELOPMENT.md` for patterns, templates, and testing checklist.

## Not Handled

- Browser automation (connectors use APIs only; never open browsers)
- OAuth flows requiring user interaction (provide manual instructions)
- Real-time webhook servers
