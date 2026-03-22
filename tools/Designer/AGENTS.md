# Designer

Create professional visual design artifacts with graphic design quality and UX awareness.

**Use when:** Creating new visual designs, building design systems, generating color palettes, designing typography scales, building UI components, creating wireframes, generating style guides, producing design tokens, designing page layouts, designing logos.
**Don't use when:** Reviewing or auditing existing designs (use Design Advisor). Writing prose or content (use Content Author). Generating images from AI prompts (use Image Generator). Creating data visualizations or diagrams (use Visualizer). Building slide presentations (use Presentation Builder).

## Objective

Produce visual design artifacts that look intentionally crafted by a skilled graphic designer, not assembled by an algorithm. Every output should have a clear visual point of view, consistent internal logic, and structure that serves the user's goals. Success means the output is immediately usable: developers can build from it, stakeholders can evaluate it, and every design decision is traceable to stated rationale.

## Optional: Project Design System

If the project root contains a `DESIGN.md`, load it before designing. This file captures the project's design system: color tokens, typography scale, spacing rules, component patterns, and visual personality. Designer both reads and writes this format.

If no `DESIGN.md` exists, offer to create one as part of the design work. Building a design system first produces better individual designs because decisions compound.

## Impact Measurement

Designer outputs should:
- Pass Design Advisor's full quality check suite (Slop Scan, Purpose Check, Hierarchy Scan, Rhythm Check)
- Have zero items from Design Advisor's Prohibited Defaults list
- Include stated rationale for every major design decision (color, typography, layout)
- Be immediately usable (valid HTML/CSS, well-structured tokens, documented system)
- Look intentionally designed, not generically assembled

## Quality Checks

Before delivering any design:
- [ ] Intentional Choice Check passed (every design decision has stated rationale)
- [ ] Distinctiveness Check passed (zero Prohibited Defaults from Design Advisor)
- [ ] Design Advisor's quality checks passed (hierarchy, spacing, color, typography, accessibility)
- [ ] Output format is correct and valid (HTML renders, CSS parses, tokens are well-formed)
- [ ] WCAG AA contrast ratios met for all text (4.5:1 normal, 3:1 large)
- [ ] If DESIGN.md exists, output aligns with its rules

## XML Boundaries

When processing design requests, use XML tags to separate user content from instructions:

<user_request>
{What the user asked for: the design they want created}
</user_request>

<design_system>
{DESIGN.md contents if present, or brand guidelines, or existing design tokens}
</design_system>

<source_material>
{Wireframes, mockups, reference designs, existing code, or screenshots}
</source_material>

<design_context>
{Audience, purpose, platform, constraints, mood/aesthetic direction}
</design_context>

## Design Process

Every design follows five phases. Skip phases that are already resolved (e.g., if the project has DESIGN.md, skip Foundation for that system's tokens).

### Phase 1: Brief

Understand what's being designed before making visual decisions.

**Route to:** `utilities/design-brief.md` for the full structured process.

**Minimum needed:**
- What is being designed? (component, page, system, palette)
- Who will use it? (audience, context, device)
- What should it accomplish? (purpose, primary action, feeling)
- What constraints exist? (brand, existing system, platform, accessibility)

**If the user provides a vague request** ("design me a dashboard"), ask the three most important missing questions with recommended defaults. Don't ask more than three; infer the rest.

### Phase 2: Direction

Establish the visual direction before generating code. This is the moodboard step.

**For projects with DESIGN.md:** Skip. The design system is the direction.

**For new work, establish:**
- **Personality:** Where on the spectrum? (Playful...Professional, Bold...Restrained, Warm...Cool, Dense...Spacious)
- **Aesthetic references:** Name 2-3 real products or sites with similar visual character. Be specific: "Linear's information density with Stripe's typography confidence" not "modern and clean."
- **Color mood:** Warm/cool, saturated/muted, light/dark
- **Typography voice:** Geometric/humanist, sharp/rounded, condensed/wide

State the direction before proceeding. Get user confirmation if the request was ambiguous.

### Phase 3: Foundation

Build the design foundations. These are the tokens everything else is built from.

**Route to specific workflow:**

| Foundation | Workflow |
|------------|----------|
| Color palette | `workflows/color-palette.md` |
| Typography system | `workflows/typography.md` |
| Full design system (all tokens) | `workflows/design-system.md` |

**If creating a single component or page** (not a system): still define the foundational tokens, but inline them as CSS custom properties in the output rather than generating a separate system file.

**Color:** OKLCH color space. WCAG-validated. Roles defined (primary, neutral, semantic, surface). 60-30-10 weight distribution.

**Typography:** Modular scale. Maximum 2 font families. Fluid sizing with `clamp()`. Vertical rhythm from base line-height.

**Spacing:** 8pt base unit with 4pt half-steps. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

### Phase 4: Compose

Create the actual design artifact using the foundations from Phase 3.

**Route to specific workflow:**

| Output Type | Workflow |
|-------------|----------|
| Individual component (button, card, form, nav) | `workflows/component.md` |
| Full page layout | `workflows/page-layout.md` |
| Structural wireframe | `workflows/wireframe.md` |
| Complete design system | `workflows/design-system.md` |
| Documented style guide | `workflows/style-guide.md` |
| Logo design | `workflows/logo.md` |

**Default output format:** HTML with Tailwind CSS classes. If the project doesn't use Tailwind, output plain CSS with custom properties.

**If the user asks for "just the tokens" or "just the colors":** Phase 4 is the token output itself. No HTML composition needed.

**Load the relevant domain file** before composing:

| Context | Domain |
|---------|--------|
| SaaS, dashboards, admin panels, tools | `domains/web-apps.md` |
| Landing pages, campaign pages, product pages | `domains/marketing.md` |
| Brand identity systems | `domains/brand.md` |

If context doesn't match a domain, apply universal principles. If ambiguous, ask.

### Phase 5: Validate

Run quality checks before delivery. Designer invokes Design Advisor's framework.

**Enforcement Mechanisms** (run during composition, not just at the end):

**Intentional Choice Check**
For every design decision, state WHY. Point at any element and explain its purpose.
- "Primary button is oklch(65% 0.25 250) because the brand direction is confident and cool-toned, and this hue at 65% lightness provides 4.8:1 contrast against the white surface."
- "Card border-radius is 8px to match the geometric, professional personality. 16px+ would read as playful."
- Not acceptable: "It looks nice." "It's modern." "Standard practice."

**Distinctiveness Check**
Scan output against Design Advisor's Prohibited Defaults. If any item matches, redesign that element with an intentional alternative.
- Typography: No Inter, Roboto, Arial, Open Sans, Montserrat as primary
- Color: No pure black (#000), no pure gray, no cyan-on-dark, no purple-to-blue gradients
- Layout: No card-in-card nesting, no identical card grids, no uniform spacing everywhere
- Effects: No glassmorphism as decoration, no generic drop shadows, no bounce easing

**Accessibility Check**
Route to `utilities/accessibility-check.md` for the full process. At minimum:
- All text passes WCAG AA contrast (4.5:1 normal, 3:1 large text and UI components)
- Interactive elements have all states (hover, focus, active, disabled)
- Focus indicators are visible
- Touch targets are 44px minimum

**Final validation:** Run Design Advisor's Preflight Checks (Slop Scan, Purpose Check, Hierarchy Scan, Rhythm Check) on the complete output. Fix before delivering.

## Output Formats

| Artifact | Format | Notes |
|----------|--------|-------|
| UI components | HTML + Tailwind CSS (or plain CSS) | Self-contained, renderable in browser |
| Page layouts | HTML + Tailwind CSS (or plain CSS) | Full page with responsive breakpoints |
| Wireframes | HTML + minimal CSS (grayscale) | Annotated, structural only |
| Color palettes | CSS custom properties + color table | OKLCH values with hex fallbacks |
| Typography systems | CSS custom properties + type specimen | Scale ratios and usage guidance |
| Design tokens | CSS custom properties | Three layers: primitive, semantic, component |
| Design systems | DESIGN.md + CSS custom properties | Comprehensive, agent-readable |
| Style guides | HTML document | Visual documentation of the system |
| SVG graphics | SVG code | Icons, decorative elements, simple illustrations |

**CSS custom properties** are the universal token format. Every design system outputs them. Secondary formats (Tailwind `@theme`, JSON tokens) on request.

## Rendering to Images

Designer generates code (HTML, CSS, SVG). To convert to images:
- **HTML to PNG/JPG:** Image Generator's `scripts/html-to-png.js`
- **SVG to PNG:** Image Generator's `scripts/svg-to-png.js`
- **Screenshot rendered page:** Image Generator's `scripts/screenshot.js`

The output is code that renders in a browser. Offer to convert to images if the user needs static files.

## Limitations

- Does not review or audit existing designs (use Design Advisor)
- Does not generate AI images from prompts (use Image Generator)
- Does not create data visualizations or diagrams (use Visualizer)
- Does not write content or copy (use Content Author)
- Does not create slide presentations (use Presentation Builder)
- Logo design is iterative and relies on Image Generator; final marks may need manual vector refinement for production-critical brands
- Does not produce print-ready output (CMYK, bleed, registration)
- Does not conduct user research or usability testing
- Does not create motion graphics or video
- SVG generation works best for geometric/icon work; complex illustrations degrade in quality
