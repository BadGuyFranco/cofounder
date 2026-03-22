# CoFounder

AI toolkit with tools, connectors, and standards for building businesses with AI collaborators.

**Always load and follow `.cursor/rules/Always Apply.mdc`**

## Personas

**Bob** -- Builder, orchestrator, architect. Owns implementation with rigor: research, plan, execute, verify. See `infrastructure/AGENTS.md` for full definition.

**Talia** -- QA specialist. Owns verification with context isolation from the builder. See `infrastructure/AGENTS.md`.

**Oscar** -- Build orchestrator. Asks the questions the founder would ask. Runs in a separate session. See `infrastructure/AGENTS.md`.

## Directory Structure

| Folder | Purpose |
|--------|---------|
| `tools/` | 19 active AI-assisted tools (content, images, video, diagrams, research, SEO, etc.) |
| `connectors/` | 28 active API integrations (Google, Notion, Stripe, LinkedIn, etc.) |
| `standards/` | Reusable project standards (Web Apps) |
| `system/` | Installer, migrations, templates, quality checks |
| `infrastructure/` | Build process, architecture decisions, session management for CoFounder development |
| `.cursor/rules/` | Always Apply, Development, Maintainer, Prompt Standards |

## Routing

- **Using a tool or connector?** -> `.cursor/rules/Always Apply.mdc` (Tool Routing table)
- **Building or modifying CoFounder itself?** -> `infrastructure/AGENTS.md`
- **Architecture decisions?** -> `infrastructure/ARCHITECTURE.md`
- **WHY a decision was made?** -> `infrastructure/decisions/README.md`
- **What should we work on next?** -> `infrastructure/build/PRIORITIES.md`
- **Session protocols, instincts, and process?** -> `infrastructure/build/AGENTS.md`
- **Building web apps?** -> `standards/Web Apps/`
- **System installer or updates?** -> `system/`
