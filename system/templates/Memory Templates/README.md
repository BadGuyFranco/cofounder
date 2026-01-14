# Memory

User-specific configuration that persists across `/cofounder/` library updates.

## Structure

The `/memory/` directory structure mirrors `/cofounder/`:
- `/memory/tools/` mirrors `/cofounder/tools/` (tool configuration)
- `/memory/connectors/` mirrors `/cofounder/connectors/` (credentials)
- `/memory/my tools/` and `/memory/my connectors/` are for your custom creations

```
/memory/
├── system/
│   └── version.txt        ← Last applied migration version (YYYY-MM-DD)
├── tools/                 ← Tool configuration (mirrors /cofounder/tools/)
│   ├── Content Author/
│   │   └── voice.md       ← Writing voice and persona
│   ├── Image Generator/
│   │   └── .env           ← API keys, models, service order
│   └── Video Generator/
│       └── .env           ← API keys, models, service order
├── connectors/            ← Connector credentials (mirrors /cofounder/connectors/)
│   └── [platform]/
│       └── .env
├── my tools/              ← Your custom tools (not in /cofounder/)
│   └── [Your Tool]/
│       └── AGENTS.md
├── my connectors/         ← Your custom connectors (not in /cofounder/)
│   └── [platform]/
│       └── AGENTS.md, scripts/, etc.
├── plans/                 ← Execution plans from Planner tool
└── README.md
```

## Custom Tools

`/memory/my tools/` is where you create your own tools. These are tools you build yourself, separate from the shared `/cofounder/` library.

**Why here?**
- `/cofounder/` is read-only and receives updates via git pull
- Anything you create in `/cofounder/` would be lost on updates
- `/memory/` persists across updates and is yours to modify

**Creating a custom tool:**
1. Create a directory: `/memory/my tools/[Your Tool Name]/`
2. Add an `AGENTS.md` with instructions (use `/cofounder/system/templates/` as patterns)
3. Add to routing table in `/memory/my tools/AGENTS.md`
4. Add any scripts or supporting files

## Custom Connectors

`/memory/my connectors/` is where you create connectors for platforms not included in `/cofounder/connectors/`, or customize existing ones.

**Code vs. Credentials:**
- Connector **code** (scripts, AGENTS.md) goes in `/memory/my connectors/[platform]/`
- Connector **credentials** (.env files) go in `/memory/connectors/[platform]/`

This separation keeps credentials in one secure location regardless of where the connector code lives.

**Creating a custom connector:**
1. Read `/cofounder/connectors/DEVELOPMENT.md` for patterns and requirements
2. Create a directory: `/memory/my connectors/[platform]/`
3. Build required files (AGENTS.md, SETUP.md, CAPABILITIES.md, scripts/)
4. Add to routing table in `/memory/my connectors/AGENTS.md`
5. Store credentials in `/memory/connectors/[platform]/.env`

**Routing priority:** When you request a connector, the system checks `/memory/my connectors/` first, then falls back to `/cofounder/connectors/`. Your custom connectors take priority.

## Library Configuration

### Content Author

`/memory/tools/Content Author/voice.md` - Writing voice, persona, and style preferences.

### Image Generator

`/memory/tools/Image Generator/.env` - Service configuration:
- `IMAGE_SERVICE_ORDER` - Comma-separated list of services in preference order (e.g., `nano_banana,replicate,xai`)
- API keys and model names for each service you have access to

### Video Generator

`/memory/tools/Video Generator/.env` - Service configuration:
- `VIDEO_SERVICE_ORDER` - Comma-separated list of services in preference order (e.g., `google_veo,replicate`)
- API keys and model names for each service you have access to

## Rules

### Path Requirements

Use workspace-rooted absolute paths (`/memory/...`, `/cofounder/...`). These work regardless of which directory the agent is running from.

Example: `/memory/tools/Content Author/voice.md`

Relative paths like `../../memory/` are fragile; they break when files are loaded from different contexts.

### Directory Naming

- Directory names in `/memory/` must **exactly match** their `/cofounder/tools/` counterparts
- Example: `/memory/tools/Content Author/` (matches `/cofounder/tools/Content Author/`)

### Missing Memory Directory

If a shared library references `/memory/` and the directory doesn't exist:

1. **Stop execution** - do not proceed with assumptions
2. **Warn the user** - explain that `/memory/` is required
3. **Provide setup instructions** - tell them what needs to be created

### What Belongs Here

| In `/memory/` | In `/cofounder/` |
|---------------|---------------|
| User's voice settings | Voice template/examples |
| API keys (`.env`) | Scripts that use APIs |
| Service preferences and fallback order | Available services documentation |
| Personal style preferences | System logic and workflows |
| User-specific configuration | Reusable frameworks |
| Custom tools (`my tools/`) | Shared tools (`tools/`) |
| Custom connectors (`my connectors/`) | Shared connectors (`connectors/`) |
| Connector credentials (`connectors/`) | Connector code and patterns |

### What Does NOT Belong Here

- Generated content (goes in user's work directory)
- Temporary files
- Anything that should be version-controlled with the libraries

## For Library Authors

When creating a new shared library that needs user configuration:

1. Document required memory files in your library's `AGENTS.md`
2. Provide a template or example in your library
3. Include setup instructions for first-time users
4. Add validation that checks for `/memory/tools/[Your Library]/` before proceeding (library names match `/cofounder/tools/` directory names)
