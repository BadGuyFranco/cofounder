# Shared Tools

AI agent routing for the shared tools library.

## Path Resolution

`/cofounder/` and `/memory/` are workspace roots, not filesystem paths. Resolve to actual paths from `user_info.Workspace Paths` before running terminal commands.

## First Time Setup

New users: Follow `/cofounder/system/installer/Continue Install.md`

## Structure

| Directory | Purpose |
|-----------|---------|
| `/tools/` | AI agents that do things (Content Author, Image Generator, etc.) |
| `/connectors/` | API integrations to external platforms (Google, LinkedIn, etc.) |
| `/standards/` | Coding standards and patterns to follow (Web Apps, etc.) |
| `/system/` | Setup guides and maintenance documentation |
| `/memory/` | User configuration (voice, API keys) - gitignored |

## Tool Routing

See `.cursor/rules/Always Apply.mdc` for authoritative tool routing and when to load them.

Each tool has its own `AGENTS.md` with detailed instructions.
