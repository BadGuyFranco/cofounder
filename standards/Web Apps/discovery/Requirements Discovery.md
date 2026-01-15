# Requirements Discovery Process

This document guides the collaborative discovery process for new web application projects. The goal is to understand what you're building before writing any code.

## Process Overview

Requirements discovery is a conversation, not a questionnaire. Ask questions one topic at a time, let the user elaborate, and dig deeper when answers are vague or raise follow-up questions.

```
1. Project Identity     →  Name, purpose, audience
2. Core Functionality   →  Main features and user flows
3. Architecture Needs   →  Multi-tenancy, auth, integrations
4. Scope & Priority     →  MVP vs future, explicit exclusions
5. Document             →  Create REQUIREMENTS.md
```

## Phase 1: Project Identity

Start here. These answers shape everything else.

### Questions

**What is this application called?**
Get a working name. It can change later, but we need something to call it.

**In one sentence, what does it do?**
Force clarity. If this takes more than one sentence, dig into what the core value proposition is.

**Who is the primary user?**
Options to consider:
- Solopreneurs / individuals
- Small teams (2-10 people)
- SMB (10-100 employees)
- Enterprise
- Consumers (B2C)
- Developers / technical users

**What problem does it solve for them?**
Understanding the pain point helps validate feature priorities later.

### Listen For

- Vague answers ("it does lots of things") - narrow down
- Conflicting users ("anyone who needs X") - identify primary
- Solution-focused answers - redirect to problems

## Phase 2: Core Functionality

Understand the main things users will do.

### Questions

**What are the 3-5 main things a user will do in this application?**
Not feature lists - user activities. "Manage their contacts" not "contact list, contact detail page, contact search."

For each activity:
- **What data do they work with?** (contacts, projects, invoices, etc.)
- **What actions do they take?** (create, edit, organize, share, etc.)
- **What's the happy path?** (typical user flow)

**What does success look like for a user?**
This reveals the core value. If success is "saved time," different from "made money" or "stayed organized."

**Are there different types of users with different needs?**
Roles, permissions, admin vs regular user. Keep it simple unless complexity is genuinely needed.

### Example Dialogue

User: "Users manage their projects and track time."

Follow-up: "Walk me through a typical session. User opens the app - then what? What's the first thing they do? What's the most common thing they do?"

User: "They probably check their active projects, then either log time or update a task."

Now we understand: Projects contain tasks, time is logged against something (project? task?), there's a concept of active vs inactive.

## Phase 3: Architecture Needs

Technical decisions driven by requirements.

### Multi-Tenancy

**Will this serve multiple customers/organizations, or is it single-use?**

If multiple customers (SaaS model):
- Each customer's data is isolated
- Customer = "tenant" in the system
- Every database query filters by tenant
- Billing is per-tenant

If single customer (internal tool, personal project):
- No tenant isolation needed
- Simpler data model
- Can add multi-tenancy later if needed (but it's harder)

**Decision point:** If uncertain, ask: "Could you imagine selling this to other companies/people in the future?" If yes, build multi-tenant from the start.

### Authentication

**Does this need user accounts?**
Almost always yes. Confirm.

**Who can sign up?**
- Anyone (public registration)
- Invite-only
- Single org (internal tool)

**Are there different roles/permissions?**
Common patterns:
- Owner / Admin / Member
- Admin / User
- Custom role system

**Recommendation:** Use Clerk for auth. Don't build it yourself unless there's a specific reason (compliance, offline-only, etc.).

### External Integrations

**What external services will this connect to?**

Common categories:
- **Payments:** Stripe, PayPal
- **Email:** AWS SES, SendGrid, Gmail API
- **Storage:** S3, Cloudflare R2
- **Analytics:** Segment, Mixpanel
- **Communication:** Twilio (SMS), Slack
- **AI:** OpenAI, Anthropic

For each integration:
- Is it core to the product or nice-to-have?
- Do users pay for usage? (affects cost tracking)

### Data & Compliance

**Any special data requirements?**
- Sensitive data (PII, health, financial)?
- Data residency requirements?
- Compliance frameworks (SOC2, HIPAA, GDPR)?

Most early-stage projects: "No special requirements" is fine. Just confirm.

## Phase 4: Scope & Priority

Define what's in and what's out.

### Questions

**What must work for you to consider this launchable?**
This is the MVP. Be ruthless. Cut everything that's not essential to the core value proposition.

**What's explicitly out of scope for now?**
Write these down. Future-you will thank present-you. Prevents scope creep.

**What's the one feature that, if it doesn't work well, kills the product?**
This is where quality matters most. Everything else can be "good enough."

### Example Scope Definition

**In Scope (MVP):**
- User authentication
- Create and manage projects
- Log time against projects
- Basic reporting (hours per project)

**Out of Scope (Phase 2+):**
- Team collaboration
- Client portal
- Invoicing
- Mobile app
- Integrations

**Critical Path:**
Time logging must be fast and frictionless. If it takes more than 10 seconds to log time, users won't do it.

## Phase 5: Document

Create the requirements document.

### Output: REQUIREMENTS.md

Create this file in the new project at `docs/REQUIREMENTS.md`:

```markdown
# [Project Name] - Requirements

> Last updated: [date]

## Overview

[One paragraph describing what this is and who it's for]

## Users

### Primary User
[Description of main user type]

### User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| [role] | [who they are] | [what they can do] |

## Core Features

### Feature 1: [Name]
**What:** [Description]
**Why:** [Problem it solves]
**Data:** [What data is involved]
**Actions:** [What users can do]

### Feature 2: [Name]
...

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | [yes/no] | [why] |
| Authentication | [Clerk/other] | [why] |
| [other] | [choice] | [why] |

## External Services

| Service | Purpose | Cost Model |
|---------|---------|------------|
| [service] | [what for] | [how billed] |

## Scope

### MVP (Launch Requirements)
- [ ] [feature]
- [ ] [feature]
- [ ] [feature]

### Out of Scope (Future)
- [feature]
- [feature]

### Critical Path
[What must work perfectly]

## Open Questions

- [anything unresolved]
```

## Tips for Effective Discovery

### Ask "Why" More Than "What"

"I need a dashboard" - Why? What decisions does it support? What question does it answer?

Understanding the why reveals the actual requirement. The dashboard might not be the right solution.

### Challenge Complexity

When users describe complex features, ask: "Is there a simpler version that would work for v1?"

Often the 80% solution is 20% of the work.

### Listen for Hidden Requirements

"Oh, and it needs to work on mobile" - buried requirements are often important ones.

"Obviously it should be fast" - performance requirements. Define "fast."

### Don't Solutioneer

Resist the urge to jump to solutions. Understand the problem fully first.

User: "I need a Kanban board"
Bad: "Okay, we'll build a Kanban board"
Good: "What workflow are you trying to visualize? Walk me through how you'd use it."

Maybe they need Kanban. Maybe they need something simpler. Maybe they need something different entirely.

### Document Decisions, Not Just Requirements

When you make a choice (multi-tenancy yes/no, Clerk vs custom auth), document WHY.

Future sessions will ask "why did we do it this way?" The answer should be in the docs.

## After Discovery

With requirements documented:

1. **Review with user** - "Here's what I captured. Is this accurate?"
2. **Proceed to architecture** - Make technical decisions based on requirements
3. **Generate project** - Scaffold the codebase
4. **Create development plan** - Prioritized todo list based on MVP
