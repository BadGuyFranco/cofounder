# Design Advisor

Raise the quality of visual design output across any medium. Applies design principles, enforces anti-patterns, and routes to domain-specific guidance.

**Use when:** Building UI, reviewing design quality, creating visual layouts, improving aesthetics of any output that humans will see.
**Don't use when:** Writing prose (use Content Author), generating images from prompts (use Image Generator), creating diagrams (use Visualizer).

## Objective

Every visual output should look intentionally designed, not generically assembled. Success means a human looking at the result would not immediately think "AI made this." The design should have a clear point of view, consistent internal logic, and no lazy defaults.

## Optional: Project Design Preferences

If the current project root contains a `design-preferences.md`, load it before designing. This file captures project-specific choices: brand colors, typography, aesthetic direction, constraints. Each project can have its own.

If no `design-preferences.md` exists, apply universal principles from this file and the relevant domain. The tool works without preferences; preferences make it project-aware.

## Impact Measurement

Design Advisor outputs should:
- Pass the Squint Test (hierarchy visible when blurred)
- Pass the AI Slop Test (not immediately recognizable as AI-generated)
- Have zero prohibited anti-patterns present
- Show intentional choices in typography, color, spacing, and layout

## Quality Checks

Before delivering any visual output:
- [ ] Hierarchy is clear (primary, secondary, tertiary elements distinct)
- [ ] No anti-patterns from the Prohibited Defaults list
- [ ] Spacing has rhythm (varied, not uniform padding everywhere)
- [ ] Color palette has defined roles (not colors sprinkled arbitrarily)
- [ ] Typography uses no more than 2-3 families with clear purpose for each
- [ ] Interactive elements have distinct states (hover, focus, active, disabled)
- [ ] Accessibility basics met (contrast ratios, touch targets, focus indicators)

## XML Boundaries

When processing design requests, use XML tags to separate user content from instructions:

<user_request>
{What the user asked for, the interface or visual they want built}
</user_request>

<design_context>
{Brand guidelines, existing design system, project design-preferences.md if present}
</design_context>

<source_material>
{Wireframes, mockups, reference designs, or existing code to improve}
</source_material>

## Enforcement Mechanisms

Apply these while generating each component, not just at the end. These are the equivalent of Content Author's Bridge Check and Deletion Check.

**Slop Scan**

After writing each visual component (a card, a section, a page layout), scan it against the Prohibited Defaults list. If any match, rewrite before moving on. Don't accumulate violations and fix them later; catch them at the point of generation.

Test: For each component, ask "Would a designer look at this and think 'AI'?" If the answer is anything other than "no," identify which default triggered it and replace with an intentional choice.

**Purpose Check**

For every visual element (color, border, shadow, icon, divider, animation), ask: "What is this element's job?" Valid jobs: communicate information, create hierarchy, guide the eye, reinforce brand, indicate state. If you can't name the job, remove the element.

Test: Point at any element and state its purpose in one phrase. "Decoration" and "it looks nice" are not purposes. "Separates navigation from content" and "indicates active state" are.

**Hierarchy Scan**

After completing a section or page, verify that visual weight follows information priority. The most important element should be the most visually prominent. The second most important should be clearly secondary.

Test: If you removed all text and only looked at size, weight, color, and spacing, would the reading order still be correct?

**Rhythm Check**

Scan spacing values in the output. If you see the same padding/margin value repeated more than three times consecutively, you have uniform spacing. Introduce variation: tighter groupings within related elements, larger gaps between sections.

Test: List the spacing values used between consecutive elements. If more than three in a row are identical, the design lacks rhythm.

**When checks conflict:** Slop Scan and Purpose Check are the tie-breakers. If a component passes both, it earns its place.

## Domain Routing

Design Advisor covers universal principles (this file) plus domain-specific guidance. Load the relevant domain file when context is clear:

| Context | Domain File |
|---------|-------------|
| Web applications, websites, frontend components | `domains/web-frontend.md` |

If the request doesn't match a domain, apply universal principles from this file. If the request is ambiguous, ask which domain applies.

## Universal Design Principles

These apply regardless of medium. Domain files add specifics; they don't replace these.

### Hierarchy

Every design needs a clear reading order. The viewer should instantly know what matters most.

**The Squint Test:** Blur your eyes or shrink the design to thumbnail size. If you can still identify the most important element, the second most important, and clear groupings, hierarchy works. If everything looks the same weight, it doesn't.

Build hierarchy through multiple dimensions simultaneously:
- **Size:** 3:1 ratio minimum between primary and secondary elements
- **Weight:** Bold vs regular, not medium vs regular (too subtle)
- **Contrast:** High contrast draws the eye; low contrast recedes
- **Position:** Top-left is primary in LTR layouts; center draws attention in symmetric layouts
- **Space:** Generous whitespace around an element increases its importance

Use 2-3 dimensions together. A heading that is larger AND bolder AND has more space above it reads as clearly primary. Size alone is not enough.

### Rhythm and Spacing

Uniform spacing is the enemy of good design. Varied spacing creates rhythm: tight groupings signal relationships, generous gaps signal separation. This is the difference between "laid out" and "designed."

Principles:
- Group related elements tightly; separate unrelated elements generously
- Vertical rhythm should derive from a base unit (your body line-height is a good foundation)
- Margins between sections should be noticeably larger than margins within sections
- When everything has the same padding, nothing has emphasis

### Color Intent

Every color needs a job. If you can't name why a color is there, remove it.

Roles:
- **Primary:** Brand, CTAs, key actions (use sparingly; accent power comes from rarity)
- **Neutral:** Text, backgrounds, borders (tint toward brand hue, never pure gray)
- **Semantic:** Success, error, warning, info (consistent meaning across the entire system)
- **Surface:** Background layers that create depth

The 60-30-10 rule: 60% neutral, 30% secondary (text, borders), 10% accent. This is about visual weight, not pixel area.

### Typography Discipline

Type hierarchy requires fewer sizes with more contrast between them. Five sizes cover most needs: caption, secondary, body, subheading, headline. Pick a modular scale ratio (1.25, 1.333, or 1.5) and commit.

Principles:
- One font family in multiple weights often beats two competing typefaces
- If pairing fonts, contrast on multiple axes (serif + sans, condensed + wide)
- Never pair fonts that are similar but not identical
- Body text needs generous line-height (1.4-1.6); headlines can be tighter (1.1-1.3)
- Limit line length to 55-75 characters for readability

### Intentionality Over Decoration

Every visual element should serve a purpose: communicate information, create hierarchy, guide the eye, or reinforce brand. Decoration that doesn't serve one of these functions is noise.

Test: Point at any element and explain its job. "It looks nice" is not a job.

## Prohibited Defaults (The AI Slop Test)

These patterns are the fingerprints of AI-generated design. Their presence signals lazy defaults, not intentional choices. Avoid all of them.

**Typography:**
- Inter, Roboto, Arial, Open Sans, Lato, Montserrat as primary fonts (choose something distinctive)
- Monospace typography as shorthand for "technical/developer" aesthetic
- Large rounded-corner icons above every heading

**Color:**
- Pure black (#000) or pure gray for text and backgrounds (always tint)
- Gray text on colored backgrounds (use a shade of the background color)
- Cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds
- Gradient text on headings or metrics
- Dark mode with glowing accents as the default

**Layout:**
- Everything wrapped in cards (not everything needs a container)
- Cards nested inside cards (flatten the hierarchy)
- Identical card grids (same-sized cards with icon + heading + text, repeated)
- Hero metric layout (big number, small label, gradient accent)
- Centering everything (left-aligned text with asymmetric layouts reads as more designed)
- Uniform spacing everywhere

**Visual Effects:**
- Glassmorphism as default decoration (blur effects, glass cards, glow borders)
- Rounded rectangles with generic drop shadows
- Sparklines as decoration (tiny charts that convey nothing)
- Rounded elements with thick colored border on one side
- Bounce or elastic easing on animations

**Interaction:**
- Every button styled as primary (hierarchy matters; use ghost, text, secondary styles)
- Modals as the default for any overlay (consider drawers, popovers, inline expansion)
- "OK" / "Submit" / "Yes/No" as button labels

## Design Operations

These are structured approaches to common design tasks. Reference them by name in prompts.

**Audit:** Technical quality check. Walk through hierarchy, color, typography, spacing, accessibility, and responsive behavior. Flag specific violations with specific fixes. See `utilities/design-audit.md`.

**Review:** Subjective design critique. Evaluate clarity, emotional resonance, brand alignment, and whether the design achieves its stated purpose. See `utilities/design-review.md`.

**Polish:** Final pass before shipping. Tighten spacing inconsistencies, align optical centers, verify all interactive states, check edge cases (empty states, long text, error states).

**Distill:** Remove complexity. Strip to the essential elements that serve the user's goal. Question every element: does it earn its place? If removing it doesn't hurt the experience, remove it.

**Normalize:** Align with an established design system. Apply consistent tokens, spacing scale, and component patterns. Resolve inconsistencies between similar elements.

**Bolder:** Amplify a design that's too safe. Increase contrast ratios, add more dramatic scale differences, commit harder to the chosen aesthetic direction. Safe and forgettable is worse than bold and polarizing.

**Quieter:** Tone down a design that's too loud. Reduce color saturation, tighten the scale range, increase whitespace, simplify decorative elements. Restraint is a design choice.

## Context Registers

Adapt intensity based on what you're designing:

**Applications (dashboards, tools, SaaS):**
- Personality: Low to medium (tool should disappear behind the task)
- Typography: Functional, clean, highly readable
- Color: Restrained palette; semantic colors carry more weight
- Motion: Minimal, functional transitions only
- Layout: Dense information hierarchy, clear scanning patterns

**Marketing (landing pages, campaigns, product pages):**
- Personality: High (the page IS the impression)
- Typography: Expressive, distinctive, memorable
- Color: Bold palette with strong brand presence
- Motion: More dramatic entrances and interactions
- Layout: Spacious, editorial, scroll-driven narrative

**Content (blogs, documentation, articles):**
- Personality: Low (content should dominate)
- Typography: Optimized for extended reading
- Color: Minimal; neutrals with subtle accent
- Motion: Almost none; don't distract from reading
- Layout: Narrow measure, generous margins, clear heading hierarchy

## Preflight Checks

Before delivery, run all enforcement mechanisms one final time on the complete output:

1. **Slop Scan** - Zero prohibited defaults present. Scan every component.
2. **Purpose Check** - Every visual element has a stated job. No decorative waste.
3. **Hierarchy Scan** - Visual weight matches information priority throughout.
4. **Rhythm Check** - No more than three consecutive identical spacing values.
5. **Preferences alignment** - If project has design-preferences.md, verify output matches stated choices.
6. **Practice what you preach** - If the design claims to value simplicity, is it simple? If it claims bold aesthetic, is it bold?

If any check fails, fix before delivering.

## Limitations

This tool is designed for visual design quality in digital outputs. It does not cover:
- Print design (CMYK color, bleed, registration marks)
- Motion graphics or video production
- 3D modeling or game design
- Brand strategy or logo design (it applies existing brand guidelines, doesn't create them)
- User research or usability testing methodology

For UX writing guidance within web interfaces, load the web-frontend domain which includes UX writing principles. For general content writing, use Content Author.
