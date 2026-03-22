---
title: "CoFounder Architecture -- Overview"
last-verified: 2026-03-19
verified-by: Builder (initial creation)
---

# CoFounder Architecture -- Overview

This is the high-level architecture overview for CoFounder. It describes what the project is, the non-negotiable principles, how the components relate to each other, and where to find detailed architecture for each area.

**This document is current state only.** For rationale behind any decision, see the relevant decision record in `decisions/`. For the full index: `decisions/README.md`.

## What CoFounder Is

CoFounder is an AI toolkit that gives solo entrepreneurs a suite of tools, connectors, and standards for building businesses with AI collaborators. It provides behavior-based tools (instructions-only), script-based tools (Node.js/Python), composite tools (routing to sub-tools), and platform connectors (API integrations). Everything is designed to be shared across machines via Google Drive and operated through Cursor or Claude Code.

## Platform Principles

These are non-negotiable. Every tool, connector, and standard must respect them.

| Principle | Rule |
|-----------|------|
| **Path portability** | All paths resolve relative to `__dirname`. No absolute paths, no hardcoded user paths. CoFounder is shared across machines. |
| **Secrets in /memory/** | API keys, credentials, and .env files live in `/memory/`, never in `/cofounder/`. Never commit, copy, or expose secrets. |
| **AGENTS.md convention** | Every directory has an AGENTS.md as its entry point. Read it before reading code or making changes. Follow the routing chain. |
| **Write protection** | `/cofounder/` is read-only unless `/memory/.maintainer` exists. Non-maintainers work in `/memory/my tools/` and `/memory/my connectors/`. |
| **No em dashes, no emojis** | Formatting consistency across all documents. Use periods, semicolons, or commas instead. |

## Component Overview

| Component | Purpose | Status | Tech |
|-----------|---------|--------|------|
| Tools (19 active) | AI-assisted capabilities: content, images, video, diagrams, research, SEO, etc. | Shipped | Node.js, behavior instructions |
| Connectors (28 active) | API integrations: Google, Notion, Stripe, LinkedIn, HubSpot, etc. | Shipped | Node.js, REST APIs |
| Standards | Reusable project standards (Web Apps) | Shipped | Documentation |
| System | Installer, migrations, templates, quality checks | Shipped | Node.js, Markdown |
| Infrastructure | Build process, architecture decisions, session management | Building | Markdown |

## How Components Connect

CoFounder uses a hub-and-spoke model. The `.cursor/rules/Always Apply.mdc` file is the hub; it routes requests to the appropriate tool or connector based on keywords and intent.

| Connection | Mechanism | Purpose |
|-----------|-----------|---------|
| User request -> Tool/Connector | Always Apply.mdc routing table | Intent-based dispatch to the right component |
| Tool -> Connector | Direct reference in tool's AGENTS.md | Tools use connectors for external API access |
| Tool -> /memory/ | Relative path resolution | Config, credentials, and user data |
| System -> /memory/ | Migration scripts | Updating user configurations when CoFounder changes |
| Standards -> New Projects | Template copying | Web Apps standards scaffold new projects |

**Data flow:**
- User requests enter through `.cursor/rules/Always Apply.mdc` (or `AGENTS.md` in Claude Code)
- Routing table matches intent to a tool or connector
- The tool/connector reads its own AGENTS.md for instructions
- Script tools execute Node.js in `/cofounder/tools/[name]/scripts/`
- Credentials are resolved from `/memory/connectors/[platform]/.env`
- Output goes to the user or to a file in the user's workspace

## Evolution Rules

| Rule | Why |
|------|-----|
| New tools are additive | Adding a tool does not break existing tools. Register in Always Apply.mdc routing table. |
| New connectors are additive | Adding a connector does not break existing connectors. Each is self-contained. |
| Each fact exists in one place | Architecture decisions are documented in ADRs. This file references them by ID. Never restate. |
| Templates stay generic | System templates use placeholders. Project-specific content lives in the generated files, not the templates. |
| Migrations for breaking changes | If a change affects `/memory/` structure, create a migration in `system/migrations/`. |

## Key Architectural Decisions

Each decision is documented in full in its own decision record in `decisions/`. This table is for orientation only -- the ADR is the source of truth.

| Decision | Summary | ADR |
|----------|---------|-----|
| (none yet) | | |
