# Build the Designer Tool

**Created:** 2025-03-19 | **Updated:** 2025-03-19
**Type:** One-time
**Collaboration:** Collaborative
**Status:** Draft
**Method:** WISER Playbook

## Context

CoFounder needs a graphic/visual designer tool that *creates* design artifacts, not just reviews them. The existing Design Advisor tool is a quality reviewer and critic. Designer is the creator: it produces real, tangible design outputs (HTML, CSS, SVG, design tokens, style guides) with the eye of a graphic designer who has UX skills.

The focus is visual design first, UX second. Think: a graphic designer who understands usability, not a UX researcher who can pick colors. Every output should look intentionally designed, be structurally sound for users, and produce files that developers or other tools can use immediately.

**Key files:**
- `tools/DEVELOPMENT.md` - how to build tools
- `tools/ARCHITECTURE.md` - architecture constraints
- `.cursor/rules/Prompt Standards.mdc` - how to write AGENTS.md files
- `.cursor/rules/Always Apply.mdc` - routing table (needs update)
- `system/templates/Behavior Tool Template/` - starting template
- `tools/Design Advisor/AGENTS.md` - the reviewer tool (Designer's complement)
- `tools/Design Advisor/domains/web-frontend.md` - web-specific design guidance
- `tools/Visualizer/AGENTS.md` - reference for technique/tool routing pattern
- `tools/Content Author/AGENTS.md` - reference for a mature behavior tool

## Preconditions

- `/memory/.maintainer` exists (write access to `/cofounder/` confirmed)
- Existing Design Advisor tool reviewed (to avoid duplication)
- Research on agentic design systems completed (v0, Stitch, Bolt, Figma AI, UXPin Merge, etc.)

## Authority

**Autonomous:** Create all files within `tools/Designer/`. Edit `.cursor/rules/Always Apply.mdc` routing table.
**Needs human input:** Final review of AGENTS.md methodology. Any changes to Design Advisor. Decisions about whether specific capabilities belong in Designer vs Design Advisor.

---

## Witness

*Verify before planning; plans built on stale assumptions fail.*

**Audit:** Read these files before proceeding:

- [ ] `tools/DEVELOPMENT.md` - full tool development guide
- [ ] `tools/ARCHITECTURE.md` - architecture constraints
- [ ] `.cursor/rules/Prompt Standards.mdc` - prompt writing standards
- [ ] `system/templates/Behavior Tool Template/AGENTS.md` - the template to start from
- [ ] `system/templates/Behavior Tool Template/README.md` - README template
- [ ] `tools/Design Advisor/AGENTS.md` - the full Design Advisor (understand boundaries)
- [ ] `tools/Design Advisor/domains/web-frontend.md` - web design domain reference
- [ ] `tools/Design Advisor/utilities/design-audit.md` - audit workflow reference
- [ ] `tools/Design Advisor/utilities/design-review.md` - review workflow reference
- [ ] `tools/Design Advisor/domains/template-domain.md` - domain template
- [ ] `tools/Visualizer/AGENTS.md` - reference for technique routing pattern
- [ ] `tools/Content Author/AGENTS.md` - reference for enforcement mechanism pattern
- [ ] `tools/Presentation Builder/AGENTS.md` - reference for visual output tool

**Findings:**
- [Audit will populate these]

**Objective:** A fully functional Designer behavior tool that creates professional visual design artifacts (HTML/CSS/Tailwind components, color palettes, typography systems, design tokens, wireframes, style guides, SVG graphics) with graphic design quality and UX awareness.

**Scope:**
- In: AGENTS.md, README.md, domain files, workflow files, utility files, routing table update
- Not in scope: Scripts or npm dependencies (behavior tool), modifications to Design Advisor, image generation (delegate to Image Generator)
- Depends on: Design Advisor (for quality review of output), Image Generator (for rendering HTML to images)

**Current State:** `tools/Designer/` directory exists but is empty. This playbook file is the only content.

**Deliverable:** A complete, production-quality Designer tool following all CoFounder conventions.

**Checkpoint:** Current state verified. Shared understanding established. The boundary between Designer (creates) and Design Advisor (reviews) is clear.

---

## Interrogate

*Surface unknowns and challenge assumptions before committing.*

**Questions for user** (each with a recommended default):
- [ ] Should Designer invoke Design Advisor's quality checks automatically on its output, or leave that to the user? Recommend automatic: Designer creates, then runs Design Advisor's Slop Scan and quality checks before delivery.
- [ ] Should the tool generate Tailwind CSS by default, or plain CSS? Recommend Tailwind: it constrains the design vocabulary and produces more consistent results (confirmed by Sony Interactive research). Fall back to plain CSS when the project doesn't use Tailwind.
- [ ] Should Designer generate a project-level `design-preferences.md` (which Design Advisor already reads) or a more comprehensive `DESIGN.md` (Google Stitch's format that includes tokens, components, and rules)? Recommend DESIGN.md: it's the emerging standard, is agent-readable, and contains everything Design Advisor's preferences file does plus more.
- [ ] What domains should ship in v1? Recommend three: Web Apps (SaaS, dashboards), Marketing (landing pages, campaigns), Brand Identity (logos excluded, but color/type/spacing systems). More can be added using the domain template.

**Execution risks:**

| Risk | Status | Mitigation | Notes |
|------|--------|------------|-------|
| Overlap with Design Advisor | Active | Clear boundary: Designer creates, Advisor reviews. Designer references Advisor for quality checks. Cross-reference both AGENTS.md files during build. | Biggest risk. Must be clean separation. |
| Prompt too long for effective execution | Active | Follow Elegance Principle. Keep AGENTS.md under 300 lines. Move domain knowledge to domain files, creation workflows to workflow files, utilities to utility files. | Design Advisor is 253 lines and works well. |
| Generated designs look generic/AI-made | Active | Build anti-pattern lists directly into creation workflows. Require the agent to make intentional choices and state rationale. Include "distinctiveness checkpoint" before delivery. | This is the core quality challenge. |
| Color palettes fail accessibility | Active | Bake WCAG contrast validation into the color workflow. Use OKLCH color space for perceptual uniformity. Require contrast ratios to be stated, not just generated. | Non-negotiable for professional quality. |
| Token/system output format fragmentation | Active | Standardize on CSS custom properties as the universal output. Offer Tailwind `@theme` and W3C DTCG JSON as optional secondary formats. One source of truth, multiple outputs. | CSS custom properties work everywhere. |
| Wireframes confused with finished designs | Active | Clearly label wireframe output as wireframes. Use grayscale + annotation style for wireframes. Separate wireframe workflow from component/page workflows. | Wireframes serve a different purpose. |

**Reuse check:**
- [ ] Design Advisor's Prohibited Defaults list (reuse as-is; Designer enforces these during creation, not just review)
- [ ] Design Advisor's Enforcement Mechanisms (Slop Scan, Purpose Check, Hierarchy Scan, Rhythm Check; Designer runs these before delivery)
- [ ] Design Advisor's Context Registers (Applications, Marketing, Content; map to Designer's domains)
- [ ] Design Advisor's `domains/web-frontend.md` (Designer references this for web-specific guidance, doesn't duplicate it)
- [ ] Content Author's enforcement mechanism pattern (Bridge Check, Deletion Check; adapt pattern for design context)
- [ ] Visualizer's technique routing pattern (technique files + tool files; adapt for design workflows)
- [ ] Image Generator's `scripts/html-to-png.js` (render Designer's HTML output to images)
- [ ] Image Generator's `scripts/svg-to-png.js` (render Designer's SVG output to images)
- [ ] Playbook Author's WISER structure (Designer's multi-phase creation process mirrors Witness-Interrogate-Solve-Expand-Refine)

**Checkpoint:** Unknowns surfaced. Riskiest piece identified (Design Advisor overlap and generic output quality). Existing tools reviewed for reuse.

---

## Solve

*Build the riskiest piece first. Prove it works before expanding.*

**Riskiest piece:** The AGENTS.md core - specifically the boundary with Design Advisor and the creation methodology that produces non-generic output.

### Task 1: Write the AGENTS.md skeleton

- [ ] Start from `system/templates/Behavior Tool Template/AGENTS.md`
- [ ] Define the one-line description: "Create professional visual design artifacts with graphic design quality and UX awareness."
- [ ] Write Use when / Don't use when (establishing the Designer vs Design Advisor boundary)
- [ ] Write the Objective with evaluable success criteria
- [ ] Write Impact Measurement
- [ ] Write Quality Checks
- [ ] Write XML Boundaries (custom tags for design context)
- [ ] Define the creation methodology (the "Design Process" - see structure below)
- [ ] Write Limitations

**Use when / Don't use when boundary (draft):**

```
Use when: Creating new visual designs, building design systems, generating color
palettes, designing typography scales, building UI components, creating wireframes,
generating style guides, producing design tokens, designing page layouts.

Don't use when: Reviewing or auditing existing designs (use Design Advisor). Writing
prose or content (use Content Author). Generating images from AI prompts (use Image
Generator). Creating data visualizations or diagrams (use Visualizer). Building
slide presentations (use Presentation Builder).
```

**Creation methodology (draft structure):**

The Designer's core process should follow a creative workflow:

1. **Brief** - Understand what's being designed (audience, purpose, constraints, brand)
2. **Direction** - Establish visual direction (mood, aesthetic, references, personality)
3. **Foundation** - Build design foundations (color palette, type system, spacing scale)
4. **Compose** - Create the actual design (layout, components, hierarchy, details)
5. **Validate** - Run Design Advisor quality checks (Slop Scan, Purpose Check, Hierarchy Scan, Rhythm Check)

This maps to how graphic designers actually work: brief, moodboard, style tiles, comp, review.

### Task 2: Write the core creation workflows

These go in `workflows/` and contain the step-by-step creation process for each type of output:

- [ ] `workflows/design-system.md` - Create a complete design system (tokens + components + documentation)
- [ ] `workflows/color-palette.md` - Generate OKLCH color palettes with WCAG validation
- [ ] `workflows/typography.md` - Design type systems with modular scales and font selection
- [ ] `workflows/component.md` - Design individual UI components (buttons, cards, forms, nav, etc.)
- [ ] `workflows/page-layout.md` - Design full page compositions
- [ ] `workflows/wireframe.md` - Create structural wireframes (grayscale, annotated)
- [ ] `workflows/style-guide.md` - Generate documented style guide as HTML

### Task 3: Write the domain files

These go in `domains/` and provide context-specific design guidance:

- [ ] `domains/web-apps.md` - SaaS, dashboards, admin panels, tools
- [ ] `domains/marketing.md` - Landing pages, campaign pages, product pages
- [ ] `domains/brand.md` - Brand visual identity systems (color, type, spacing, personality)
- [ ] `domains/template-domain.md` - Template for adding new domains

### Task 4: Write the utility files

These go in `utilities/` and provide reusable sub-processes:

- [ ] `utilities/design-brief.md` - Structured requirements gathering
- [ ] `utilities/brand-extract.md` - Extract design system from existing site/code (using Browser Control MCP or reading CSS)
- [ ] `utilities/accessibility-check.md` - WCAG validation process for design output

### Task 5: Write supporting files

- [ ] `README.md` - Brief human overview following template
- [ ] Verify AGENTS.md passes Prompt Standards quality tests

### Task 6: Validate the boundary

- [ ] Read completed AGENTS.md alongside Design Advisor's AGENTS.md
- [ ] Confirm zero overlap in "Use when" triggers
- [ ] Confirm Designer references Design Advisor for validation (not duplicating its content)
- [ ] Confirm Design Advisor doesn't need modifications to work with Designer

**Checkpoint:** AGENTS.md skeleton proves the concept. The creation methodology produces a clear, non-overlapping workflow distinct from Design Advisor. Pass/fail: can you read both AGENTS.md files and instantly know which tool to use for any design request?

---

## Expand

*Build out the full task. Each milestone: 3-5 tasks max.*

### Milestone 1: Core AGENTS.md

Write the complete AGENTS.md with all required sections. This is the heart of the tool.

- [ ] Write full AGENTS.md following the skeleton from Solve (one-line description, Use when/Don't use when, Objective, Impact Measurement, Quality Checks, XML Boundaries, Design Process methodology, Domain Routing table, Output Formats section, Rendering section, Limitations)
- [ ] Include the "Intentional Choice" enforcement mechanism: for every design decision (color, font, spacing, layout), the agent must state WHY it chose that option. "It looks nice" is not a reason. This is Designer's equivalent of Content Author's Bridge Check.
- [ ] Include the "Distinctiveness Check": before delivery, the agent scans output against Design Advisor's Prohibited Defaults list. If any match, redesign that element with an intentional alternative.
- [ ] Include output format specifications (HTML/Tailwind as default, CSS custom properties for tokens, OKLCH for colors, DESIGN.md for design systems)
- [ ] Run Prompt Standards quality tests (Clarity, Completeness, Elegance, Boundary)

### Milestone 2: Workflow Files

Write the creation workflow files that AGENTS.md routes to.

- [ ] Write `workflows/design-system.md` - Complete design system creation workflow (tokens, components, documentation, DESIGN.md output)
- [ ] Write `workflows/color-palette.md` - OKLCH palette generation with roles (primary, neutral, semantic, surface), WCAG contrast validation, light/dark mode generation, 60-30-10 weight distribution
- [ ] Write `workflows/typography.md` - Modular scale selection, font pairing, fluid sizing with `clamp()`, vertical rhythm, heading/body/caption hierarchy
- [ ] Write `workflows/component.md` - Individual component design (buttons, cards, forms, navigation, modals, tables) with all states (default, hover, focus, active, disabled, error, loading)
- [ ] Write `workflows/page-layout.md` - Full page composition with grid systems, responsive breakpoints, section rhythm, content hierarchy

### Milestone 3: Domain and Utility Files

Write the context-specific domain guidance and reusable utility files.

- [ ] Write `workflows/wireframe.md` - Grayscale structural layouts with annotations, content placeholders, interaction notes
- [ ] Write `workflows/style-guide.md` - Generate HTML documentation of a design system (color swatches, type specimens, spacing demo, component library)
- [ ] Write `domains/web-apps.md` - SaaS/dashboard design guidance (data density, scan patterns, functional aesthetics, sidebar/topbar patterns, empty states, loading states)
- [ ] Write `domains/marketing.md` - Landing page design guidance (hero sections, social proof, CTAs, scroll narrative, conversion-focused layout, editorial spacing)
- [ ] Write `domains/brand.md` - Brand visual identity (color personality, type voice, spacing philosophy, visual tone, application rules)

### Milestone 4: Utilities, README, and Registration

- [ ] Write `domains/template-domain.md` - Template for adding new domains (following Design Advisor's pattern)
- [ ] Write `utilities/design-brief.md` - Structured requirements gathering (audience, purpose, constraints, brand, mood, references, deliverables)
- [ ] Write `utilities/brand-extract.md` - Process to extract design system from existing site or codebase (read CSS files, identify colors/fonts/spacing, output as DESIGN.md)
- [ ] Write `utilities/accessibility-check.md` - WCAG validation process (contrast ratios, touch targets, focus indicators, semantic HTML, ARIA)
- [ ] Write `README.md` following template

### Milestone 5: Integration and Registration

- [ ] Add Designer to `.cursor/rules/Always Apply.mdc` Tool Routing table
- [ ] Verify Designer's routing triggers don't conflict with existing tools (especially Design Advisor, Image Generator, Visualizer, Presentation Builder)
- [ ] Cross-reference Designer's AGENTS.md with Design Advisor's AGENTS.md for boundary clarity
- [ ] Verify all internal file references in AGENTS.md point to correct paths
- [ ] Verify workflow, domain, and utility files all follow consistent structure

### Documentation Updates
- [ ] Update `.cursor/rules/Always Apply.mdc` with Designer routing entry
- [ ] No other documentation affected (Designer is additive)

**Checkpoint:** All milestones complete. Documentation impact addressed.

---

## Refine

*User stress-tests the solution. AI iterates based on feedback.*

- [ ] User reviews AGENTS.md for methodology quality and completeness
- [ ] User tests Designer on a real design request (e.g., "design a color palette for a fintech SaaS app" or "create a landing page layout for a developer tool")
- [ ] User compares Designer output quality against Design Advisor output to confirm clean separation
- [ ] Iterate on any identified gaps, unclear instructions, or quality issues
- [ ] User confirms the tool produces output that doesn't look like "AI slop"

**Checkpoint:** Solution works well in practice.

---

## Final Check

*Refine confirmed the solution works; Final Check confirms nothing was left inconsistent.*

- [ ] Documentation Updates from Expand are done (spot-check)
- [ ] No stale references in docs or code
- [ ] All internal file references in AGENTS.md, workflows, domains, and utilities are valid
- [ ] All checkboxes reflect actual state
- [ ] Decision Log and Learnings are current

---

## Decision Log

| Date | Decision | Rationale | Alternatives |
|------|----------|-----------|--------------|
| 2025-03-19 | Behavior tool (not Script) | Core value is methodology and prompt engineering. Designer generates HTML/CSS/SVG code inline. No npm scripts needed for v1. Scripts can be added later if patterns emerge. | Script tool with token generators, Composite tool with sub-tools per output type |
| 2025-03-19 | Designer creates, Advisor reviews | Clean separation of concerns. Avoids duplicating Design Advisor's quality framework. Designer invokes Advisor's checks before delivery. | Merge into Design Advisor, standalone with own quality checks |
| 2025-03-19 | Tailwind CSS as default output | Sony Interactive research confirms Tailwind + Claude produces the best wireframes. Tailwind's utility classes constrain the design vocabulary and improve consistency. Plain CSS fallback when project doesn't use Tailwind. | Plain CSS only, CSS-in-JS, styled-components |
| 2025-03-19 | OKLCH color space for palettes | Perceptually uniform: a 10% change in lightness/chroma produces consistent visual change across all hues. Better than HSL for generating harmonious palettes programmatically. | HSL (familiar but perceptually inconsistent), hex (no color math), LCH (OKLCH is the refined version) |
| 2025-03-19 | DESIGN.md as design system format | Google Stitch's emerging standard. Human-readable, agent-readable, portable. Contains everything Design Advisor's design-preferences.md does plus tokens, components, and rules. Compatible with Design Advisor's existing preference loading. | design-preferences.md (simpler but less comprehensive), JSON tokens only (not human-readable), Figma files (not CLI-compatible) |
| 2025-03-19 | Workflow files instead of inline process | Keeps AGENTS.md under 300 lines (Elegance Principle). Each workflow is self-contained and can be loaded only when needed. Follows Visualizer's technique file pattern. | Everything in AGENTS.md (too long), separate METHODOLOGY.md (non-standard) |
| 2025-03-19 | Three domains for v1 | Web Apps, Marketing, and Brand cover the three most common design contexts. Template domain enables easy expansion. Matches Design Advisor's Context Registers. | More domains (scope creep), fewer (insufficient coverage) |

## Learnings

| Date | Learning | Impact |
|------|----------|--------|
| 2025-03-19 | Agentic design tools (v0, Stitch, Bolt) all converge on HTML/Tailwind as the optimal output format for AI-generated UI | Validates Tailwind-first approach. Not a novel choice but a validated one. |
| 2025-03-19 | Google Stitch's DESIGN.md is a markdown-based design system format that's human and agent readable | Adopt this format as Designer's primary design system output. It bridges the gap between design decisions and code generation. |
| 2025-03-19 | Sony Interactive research shows chain-of-thought prompting with XML-tagged examples produces 77.5% better wireframes | Designer workflows should use structured reasoning, not just "generate a wireframe." The agent should reason about hierarchy, layout, and composition before generating code. |
| 2025-03-19 | The three-layer token architecture (primitive, semantic, component) is the industry standard | Designer's design-system workflow must generate all three layers, not just primitive values. |
| 2025-03-19 | Design Advisor already has a comprehensive Prohibited Defaults list and Enforcement Mechanisms | Designer should reference these, not duplicate them. Import pattern: "Run Design Advisor's Slop Scan against this output before delivery." |

## Resume Instructions

When a new context window picks up this Playbook:
1. Read this entire Playbook (Context, Witness, Risks, Decision Log, Learnings, Progress)
2. Read the Key files listed in Context
3. Check Progress for current Canon and next action
4. Verify task checkboxes match actual state (correct if drifted)
5. Continue from the documented next action

## Progress

**Last worked:** 2025-03-19
**Current Canon:** Witness
**Next action:** Begin Witness audit: read all key files listed in the Witness section, then populate Findings.

| Canon | Items | Done | Status |
|-------|-------|------|--------|
| Witness | 13 | 0 | Not started |
| Interrogate | 13 | 0 | Not started |
| Solve | 18 | 0 | Not started |
| Expand | 17 | 0 | Not started |
| Refine | 5 | 0 | Not started |
| Final Check | 5 | 0 | Not started |
| **Total** | **71** | **0** | **Not started** |

---

## Success Criteria

- [ ] `tools/Designer/AGENTS.md` exists and passes Prompt Standards quality tests
- [ ] `tools/Designer/README.md` exists and follows template
- [ ] All workflow files exist and contain complete, actionable creation processes
- [ ] All domain files exist with context-specific design guidance
- [ ] All utility files exist with reusable sub-processes
- [ ] Designer is registered in `.cursor/rules/Always Apply.mdc` routing table
- [ ] A test design request produces professional-quality output that passes Design Advisor's quality checks
- [ ] Zero overlap between Designer and Design Advisor "Use when" triggers
- [ ] Output doesn't trigger any items on Design Advisor's Prohibited Defaults list
