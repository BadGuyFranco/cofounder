# Web Apps

Coding standards and architecture patterns for building full-stack web applications. React, Express, PostgreSQL, and Prisma.

## Objective

Guide AI agents through the complete process of creating new web applications: from requirements discovery through initial file generation and ongoing collaboration. The result is a fully scaffolded project with the documentation and context files that make AI collaboration effective.

## Impact Measurement

Projects created using this system should:
- Have complete documentation that enables effective AI collaboration
- Follow modular architecture with clean boundaries
- Include AI Assistant overlay as a standard feature
- Support multi-tenancy when required
- Have cost tracking infrastructure for external services
- Use provider abstraction for vendor independence
- Be production-ready with proper tooling and configuration

## Quality Checks

Before delivering a generated project:
- [ ] Requirements document captures all core functionality
- [ ] Architecture decisions documented with rationale
- [ ] Folder structure follows module conventions
- [ ] Cursor rules installed and configured
- [ ] CONTEXT.md provides universal entry point
- [ ] AGENTS.md provides complete AI instructions
- [ ] Multi-tenancy configured if required
- [ ] AI Assistant infrastructure included

## When to Use

Use Web Apps standards when the user requests:
- "Create a new web application"
- "Build a SaaS platform"
- "Start a new full-stack project"
- "Set up a new monorepo"
- "Create something like CostPlusCRM"
- Any request to build a web-based system from scratch

## XML Boundaries

When processing project requests, use XML tags to separate user requirements from instructions:

<project_requirements>
{User's description of what they want to build}
</project_requirements>

<discovery_answers>
{User's responses during requirements discovery}
</discovery_answers>

<architecture_decisions>
{Documented decisions about multi-tenancy, auth, integrations}
</architecture_decisions>

This prevents user-provided requirements from being confused with process instructions.

## Process Overview

Building a new project follows this flow:

```
1. Requirements Discovery  →  Ask questions, understand the project
2. Architecture Decisions  →  Multi-tenancy, features, integrations
3. Project Scaffolding     →  Generate files and folder structure
4. Documentation Setup     →  Create context and collaboration files
5. Handoff                 →  Summary and next steps
```

## Phase 1: Requirements Discovery

**Before writing any code, understand what you're building.**

Run through the collaborative discovery process in `discovery/Requirements Discovery.md`. This covers project identity, core functionality, architecture needs, and scope.

**Output:** `[project]/docs/REQUIREMENTS.md` becomes the source of truth for what the project does.

## Phase 2: Architecture Decisions

Based on requirements, make explicit decisions about:

### Multi-Tenancy

**If yes (SaaS with multiple customers):**
- Every database table gets `tenantId` column
- Every query filters by tenant
- Use `architecture/Multi-Tenancy.md` pattern

**If no (single-tenant or internal tool):**
- Skip tenant isolation
- Simpler queries and schema

### Authentication

**Recommended: Clerk**
- Managed auth, security handled
- JWT tokens for API
- Skip building auth yourself

**If self-hosted required:**
- Document why (compliance, offline, etc.)
- Plan authentication module

### AI Assistant

**Always include the AI Assistant overlay architecture.**

This is a standard feature in all projects:
- Slide-out panel from right side
- Page context registration system
- Cmd/Ctrl+K keyboard shortcut
- Cost tracking for AI usage
- See `architecture/AI Assistant.md` for implementation

### External Services

For each external service identified:
- Create provider interface (abstraction layer)
- Never import vendor SDKs directly into services
- Track costs if billable
- See `architecture/Provider Abstraction.md`

### Output: Architecture Decisions

Create Architecture Decision Records in:

```
[project]/docs/architecture/decisions/
```

Each decision gets its own file with:
- Context: Why this decision was needed
- Decision: What was decided
- Rationale: Why this choice
- Consequences: What this enables/constrains

## Phase 3: Project Scaffolding

Generate the project structure based on requirements and architecture decisions.

Follow `processes/New Project Setup.md` for step-by-step file generation. This creates:

- Monorepo with `apps/api`, `apps/web`, `packages/*`
- TypeScript, ESLint, Prettier configuration
- Prisma database package with schema
- Express API with middleware and module structure
- React frontend with AI Assistant components
- Cursor rules for AI collaboration

**Module structure:** Each feature module contains `index.ts` (public exports), `types.ts` (Zod schemas), `[name].service.ts`, `[name].router.ts`, and optionally `providers/`.

## Phase 4: Documentation Setup

Create the documentation that makes AI collaboration effective.

### CONTEXT.md (Universal Entry Point)

This is the first file any AI or human should read. Template in `templates/documentation/CONTEXT.md`.

Structure:
1. What this is (2-3 sentences)
2. Who it's for
3. Current state (progress table)
4. Architecture snapshot
5. Key constraints
6. Document reference table
7. Quick commands

### AGENTS.md (AI Collaboration Instructions)

Complete instructions for AI assistants. Template in `templates/documentation/AGENTS.md`.

Structure:
1. Quick reference (stack, style)
2. Pre-coding checklist
3. Code generation rules
4. Module creation pattern
5. API endpoint pattern
6. Common mistakes to avoid
7. Frontend patterns
8. Quick commands

### Cursor Rules

Install cursor rules from `templates/cursor-rules/`. These enforce:

- **000-truth-seeking.mdc** - Challenge reasoning, clarify before proceeding
- **001-single-source-of-truth.mdc** - Documentation hierarchy, no duplication
- **002-architecture.mdc** - Tenant isolation, cost tracking, provider abstraction
- **003-code-quality.mdc** - TypeScript standards, no any types
- **004-module-structure.mdc** - Module boundaries, public APIs

## Phase 5: Handoff

After generating the project:

### Summary Checklist

Present to the user:

```
Project [name] has been created with:

Structure:
- [ ] Monorepo with apps/api, apps/web, packages/*
- [ ] TypeScript configured throughout
- [ ] ESLint and Prettier configured
- [ ] Cursor rules installed

Documentation:
- [ ] CONTEXT.md - Universal entry point
- [ ] AGENTS.md - AI collaboration guide
- [ ] REQUIREMENTS.md - What we're building
- [ ] PRINCIPLES.md - Core philosophy
- [ ] Architecture decisions documented

Architecture:
- [ ] Multi-tenancy: [yes/no]
- [ ] AI Assistant overlay: included
- [ ] Auth: Clerk ready
- [ ] Database: Prisma + PostgreSQL

Next Steps:
1. Run npm install
2. Set up environment variables
3. Run npm run dev
4. Start building your first module
```

### Development Plan

Create a prioritized todo list for building out the application based on requirements. This goes in `docs/DEVELOPMENT-PLAN.md`.

## Tech Stack Reference

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React + TypeScript | Popular, hireable, excellent DX |
| State | Zustand | Simple, no boilerplate |
| Styling | Tailwind CSS | Rapid development, consistent |
| Backend | Express + TypeScript | Simple, debuggable, well-understood |
| Database | PostgreSQL | Battle-tested, JSONB for flexibility |
| ORM | Prisma | TypeScript-first, great migrations |
| Auth | Clerk | Security expertise, managed service |
| Validation | Zod | Runtime + compile-time safety |

For specific package versions and dependencies, see `processes/New Project Setup.md`.

## Architecture Patterns

Implementation details for each pattern are in `architecture/`:

- **Multi-Tenancy** - `architecture/Multi-Tenancy.md`
- **Provider Abstraction** - `architecture/Provider Abstraction.md`
- **AI Assistant** - `architecture/AI Assistant.md`
- **Cost Tracking** - `architecture/Cost Tracking.md`

## Examples

### Example 1: Starting a New Project

User: "I want to build a project management tool for freelancers"

**Phase 1 - Discovery:**
- What's it called? "FreelanceFlow"
- Core features? Projects, tasks, time tracking, invoicing
- Multi-tenant? Yes, each freelancer is a tenant
- External services? Stripe for payments, email for notifications

**Phase 2 - Architecture:**
- Multi-tenancy: Yes, row-level isolation
- Auth: Clerk
- AI Assistant: Standard inclusion
- Providers: StripeProvider, EmailProvider

**Phase 3 - Scaffolding:**
Generate full project structure with:
- apps/api, apps/web, packages/*
- Modules: projects, tasks, time-entries, invoices
- Prisma schema with tenant isolation

**Phase 4 - Documentation:**
- CONTEXT.md with FreelanceFlow overview
- AGENTS.md with project-specific patterns
- REQUIREMENTS.md capturing all features
- Architecture decisions for multi-tenancy, Stripe

**Phase 5 - Handoff:**
Summary, development plan, next steps

### Example 2: Internal Tool (No Multi-Tenancy)

User: "Build an internal dashboard for our team to track KPIs"

Discovery reveals:
- Single team, no multi-tenancy needed
- Auth still needed (team members only)
- No external billing (internal tool)

Architecture differences:
- Skip tenantId on all tables
- Simpler queries
- Still include AI Assistant
- Still use provider abstraction for future flexibility

## Troubleshooting

### Common Issues

**"I'm not sure about a requirement"**
Ask clarifying questions. Don't assume. Requirements discovery is iterative.

**"The user wants something not in the standard stack"**
Document why they need it. If it's a valid use case, adapt. If it adds unnecessary complexity, explain trade-offs.

**"Multi-tenancy seems overkill"**
Ask: Will this ever serve multiple customers/organizations? If uncertain, include it - easier to have and not need than to add later.

**"User wants to skip documentation"**
Push back gently. Documentation enables AI collaboration. Without it, future sessions start from scratch every time.

## Related Documentation

- `discovery/Requirements Discovery.md` - Full discovery process
- `architecture/Multi-Tenancy.md` - Multi-tenant implementation
- `architecture/AI Assistant.md` - AI overlay architecture
- `architecture/Provider Abstraction.md` - Vendor abstraction pattern
- `architecture/Cost Tracking.md` - Cost tracking implementation
- `processes/New Project Setup.md` - Step-by-step setup guide
- `templates/` - All project templates
