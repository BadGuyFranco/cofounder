# [Project Name] — Project Context

> **Living context for AI assistants and collaborators.**  
> Last updated: [DATE]

---

## What This Is

[2-3 sentence description of the project. What it does, why it exists.]

---

## Who It's For & How We Think

**Target:** [Primary user description]

**Core Philosophy:**

| We Choose | Over |
|-----------|------|
| Simple | Powerful |
| Stable | Novel |
| [value] | [alternative] |
| [value] | [alternative] |

**We build for people who:**
- [characteristic]
- [characteristic]
- [characteristic]

**We avoid:**
- [anti-pattern]
- [anti-pattern]

---

## Current State

| Domain | Progress | Status |
|--------|----------|--------|
| Architecture & Infrastructure | 100% | ✅ Complete |
| [Domain] | [X]% | [status] |
| [Domain] | [X]% | [status] |
| [Domain] | [X]% | [status] |

**Overall: ~[X]%**

**Immediate Priorities:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

> **Deep dive:** [docs/PROGRESS.md](docs/PROGRESS.md) for detailed tracking

---

## Architecture Snapshot

```
Monorepo: apps/api + apps/web + packages/database,types,utils
Stack:    React + TypeScript + Express + PostgreSQL + Prisma
Auth:     Clerk (JWT)
Style:    Tailwind CSS, Zustand state, modular architecture
```

**Key Domains:** [Domain 1], [Domain 2], [Domain 3]
Each domain is self-contained with its own dashboard, settings, and [domain-specific feature].

> **Deep dive:** [docs/architecture.md](docs/architecture.md)

---

## Key Constraints (Non-Negotiable)

1. **[Constraint 1]** — [Brief description]
2. **[Constraint 2]** — [Brief description]
3. **[Constraint 3]** — [Brief description]

> **Deep dive:** [docs/PRINCIPLES.md](docs/PRINCIPLES.md)

---

## Key Decisions Made

| Decision | Summary |
|----------|---------|
| [Decision area] | [Brief summary] |
| [Decision area] | [Brief summary] |
| [Decision area] | [Brief summary] |

> **Deep dive:** [docs/architecture/decisions/](docs/architecture/decisions/)

---

## Workspace Structure

```
[project-name]/
├── CONTEXT.md          ← You are here (universal entry point)
├── AGENTS.md           ← AI code generation rules
├── apps/api/           ← Express backend
├── apps/web/           ← React frontend
├── packages/           ← Shared code (database, types, utils)
└── docs/               ← Technical documentation
```

---

## Document Reference

| Question | Go To |
|----------|-------|
| How do I set up the project? | [README.md](README.md) |
| What are the core principles? | [docs/PRINCIPLES.md](docs/PRINCIPLES.md) |
| How should I write code? | [AGENTS.md](AGENTS.md) |
| What's the full technical spec? | [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) |
| What's implemented vs planned? | [docs/PROGRESS.md](docs/PROGRESS.md) |
| Why was X decision made? | [docs/architecture/decisions/](docs/architecture/decisions/) |

---

## Quick Commands

```bash
npm install           # Install dependencies
npm run dev           # Start all (API + Web)
npm run db:generate   # After schema changes
npm run db:studio     # Visual database browser
```

---

## Maintenance Note

**Update this document when:**
- Major progress is made (completing a domain)
- Key architectural decisions change
- Priorities shift significantly

Keep it under 1000 words. This is a router, not a reference manual.

---

*This file lives at the workspace root to provide universal context across all folders.*
