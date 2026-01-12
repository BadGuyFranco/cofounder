# Connectors

Connect to external platforms via their APIs.

## Available Connectors

| Platform | Status | Location |
|----------|--------|----------|
| Airtable | Active | `airtable/` |
| Go High Level | Active | `gohighlevel/` |
| Google | Active | `google/` |
| HeyGen | Active | `heygen/` |
| HubSpot | Active | `hubspot/` |
| LinkedIn | Active | `linkedin/` |
| Make | Active | `make/` |
| Meetup | Active | `meetup/` |
| Monday.com | Active | `monday/` |
| Notion | Active | `notion/` |
| Replicate | Active | `replicate/` |
| Supabase | Active | `supabase/` |
| X.com | Active | `xcom/` |

## Routing

When user mentions an external platform:

1. Load that connector's `AGENTS.md` for configuration and how to execute
2. **If user asks "what can I do?"** - Read `CAPABILITIES.md` and share with user
3. **If credentials not configured** - Guide user through `SETUP.md`
4. Run `node scripts/[script].js help` for detailed command syntax

**Credentials:** Each connector stores credentials in `/memory/Connectors/[platform]/.env`

## File Structure

Each connector has three files with distinct purposes:

| File | Audience | Purpose |
|------|----------|---------|
| `AGENTS.md` | AI | How to configure and execute (technical reference) |
| `SETUP.md` | User | Step-by-step instructions to get API credentials |
| `CAPABILITIES.md` | User | Simple list of what the connector can do |

**Key distinction:**
- User sees CAPABILITIES.md ("what can it do?") and SETUP.md ("how do I set it up?")
- AI reads AGENTS.md and script help to know HOW to execute

## CAPABILITIES.md Pattern

User-facing list of what's possible. No code, no technical details.

```
# [Platform] Connector Capabilities

What this connector can do for you.

## [Category]

- Simple action description
- Another action
- etc.

## Limitations

- Key restrictions users should know
```

## SETUP.md Pattern

Step-by-step instructions for getting API credentials:

1. Prerequisites (account requirements)
2. Numbered steps with URLs (user navigates manually)
3. What to copy/save at each step
4. Where to store credentials
5. Verification command

**No browser automation.** User follows text instructions manually.

## AGENTS.md Pattern

Technical reference for AI execution:

- Quick start command
- Credentials location and format
- Pointers to SETUP.md and CAPABILITIES.md
- Troubleshooting common errors

Detailed command usage comes from `node scripts/[script].js help`.

## Building New Connectors

See `DEVELOPMENT.md` for:
- Decision tree: which pattern to use
- File-by-file guide for each required file
- Authentication patterns (API Key, OAuth 2.0, OAuth 1.0a)
- Script conventions and templates
- Testing checklist

Reference connectors by pattern:
- **API Key:** `airtable/`, `heygen/`
- **OAuth 2.0:** `linkedin/`, `google/`, `meetup/`
- **OAuth 2.0 + API Key:** `google/` (OAuth for user services, API key for AI)
- **OAuth 1.0a:** `xcom/`
- **GraphQL:** `monday/`, `meetup/`
- **Multi-account:** `xcom/`, `google/`, `heygen/`
- **Comprehensive (multiple services):** `google/` (Drive, Gmail, YouTube, Calendar, AI)

## What This Tool Does NOT Handle

- Browser automation for platforms (use Browser Control)
- OAuth flows requiring user interaction
- Real-time webhook servers
