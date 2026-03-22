# Workflow: Component Design

## Purpose

Design individual UI components (buttons, cards, forms, navigation, modals, tables) as self-contained HTML/CSS with all interactive states. Every component should be production-ready and use the project's design tokens.

## When to Use

- Building specific UI components for a project
- Phase 4 (Compose) when the output is one or more components
- Expanding a design system with concrete component implementations

## Inputs

- Design tokens (from DESIGN.md, design-system workflow, or inline tokens from Phase 3)
- Component type and purpose
- Domain context (web-apps, marketing, brand) for intensity calibration

## Process

### Step 1: Define Component Purpose

Before writing code, state:
- What this component does (its job in the interface)
- What information it displays or what action it enables
- Where it appears (page context, container)
- How it relates to adjacent components

### Step 2: Define States

Every interactive component needs these states designed explicitly:

| State | When | Visual Treatment |
|-------|------|-----------------|
| Default | Resting, no interaction | Base styling |
| Hover | Cursor over (pointer devices) | Subtle change: background shift, shadow lift, or border color |
| Focus | Keyboard focus (tab navigation) | Visible ring or outline; never remove without replacement |
| Active | Being clicked/pressed | Slight press effect: darken, reduce shadow, or scale down |
| Disabled | Not available | Reduced opacity (0.5-0.6), no pointer events, no focus ring |
| Loading | Awaiting response | Skeleton, spinner, or pulsing placeholder |
| Error | Validation failed | Error color border, error message text |
| Empty | No content | Guidance text, illustration, or call to action |

Not all states apply to all components. Buttons need default/hover/focus/active/disabled/loading. Cards may only need default/hover/focus. Forms need default/focus/error/disabled.

### Step 3: Write the HTML Structure

Use semantic HTML. The structure should make sense without CSS.

**Rules:**
- Use the most specific HTML element (`<button>`, `<nav>`, `<aside>`, not `<div>` for everything)
- Add ARIA attributes where semantics aren't obvious
- Include focus management for complex components (modals, dropdowns)
- Text content should be realistic, not "Lorem ipsum" (use plausible placeholder content)

### Step 4: Apply Design Tokens

Style using the project's CSS custom properties. If Tailwind is the output format, map tokens to utility classes.

**Token reference order:**
1. Component-level tokens (if defined): `--button-padding`, `--card-radius`
2. Semantic tokens: `--color-primary`, `--text-body`
3. Primitive tokens: `--space-4`, `--radius-md`

Never use raw values (e.g., `padding: 16px`) when a token exists. Tokens create consistency and enable theming.

### Step 5: Apply Visual Design

This is where graphic design skill matters. Apply the design principles from the loaded domain file and the Direction from Phase 2.

**Hierarchy within the component:**
- Primary element (headline, CTA) gets the most visual weight
- Secondary elements (body text, metadata) recede
- Use 2-3 dimensions simultaneously: size + weight + color

**Spacing within the component:**
- Group related content tightly
- Separate distinct sections with more space
- Padding should feel proportional to content volume

**Typography within the component:**
- Map text to the type scale (don't invent sizes)
- Use weight for emphasis, not just size
- Truncation strategy for long content (ellipsis, line clamping, or expanding)

**Color within the component:**
- Use semantic colors for semantic meaning (error = error color, success = success color)
- Use neutral colors for structural elements (borders, backgrounds, dividers)
- Use primary color sparingly (CTAs, active states, key actions)

### Step 6: Handle Variants

Most components need multiple variants:

| Variant Type | Examples |
|-------------|---------|
| Size | Small, medium, large |
| Emphasis | Primary, secondary, ghost, text-only |
| Color | Default, success, error, warning |
| Layout | Horizontal, vertical, compact |

**Don't generate every combination.** Design the base component + the variants the user actually needs. Ask which variants matter if unclear.

### Step 7: Responsive Behavior

Define how the component adapts:
- **Does it reflow?** (horizontal to vertical on small screens)
- **Does it resize?** (fluid width, or fixed)
- **Does it hide elements?** (collapse metadata on mobile)
- **Does it change interaction?** (hover on desktop, tap on mobile)

Include responsive rules in the CSS output using `min-width` media queries (mobile-first).

### Step 8: Output

Self-contained HTML that renders correctly when opened in a browser.

```html
<!-- [Component Name] -->
<style>
  /* Design tokens (inline if no external file) */
  :root { /* ... */ }

  /* Component styles */
  .component-name { /* ... */ }
  .component-name:hover { /* ... */ }
  .component-name:focus-visible { /* ... */ }
  .component-name:active { /* ... */ }
  .component-name:disabled { /* ... */ }
</style>

<div class="component-name">
  <!-- Semantic HTML structure -->
</div>
```

For Tailwind output, use utility classes directly on elements instead of a `<style>` block.

## Component Patterns

Quick reference for common components:

**Buttons:** Verb + object labels ("Save changes", not "Submit"). Primary/secondary/ghost variants. 44px minimum touch target. Loading state replaces label with spinner.

**Cards:** Optional image, required heading, optional body text, optional actions. Don't nest cards inside cards. Click target should be the entire card if it links somewhere.

**Forms:** Labels above inputs (not inside as placeholders). Error messages below the field, not in tooltips. Group related fields. Disabled vs read-only distinction.

**Navigation:** Current page indicator. Mobile collapse strategy. Keyboard navigable. Don't use hover-only dropdowns.

**Modals:** Trap focus inside. Close on Escape. Close on backdrop click. Title + body + actions. Don't use for simple confirmations (use inline instead).

**Tables:** Sortable column indicators. Row hover highlight. Responsive strategy (horizontal scroll or card reflow). Align numbers right, text left.

## Quality Gates

- [ ] All applicable states designed (hover, focus, active, disabled, loading, error, empty)
- [ ] Semantic HTML used (not div soup)
- [ ] Design tokens used (no raw values when tokens exist)
- [ ] Focus indicator visible for keyboard navigation
- [ ] Touch target minimum 44px for interactive elements
- [ ] Responsive behavior defined
- [ ] Text is realistic (not Lorem ipsum)
- [ ] Intentional Choice Check: stated rationale for key visual decisions
