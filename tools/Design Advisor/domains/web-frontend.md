# Domain: Web Frontend

## Purpose and Scope

Design guidance for web applications, websites, and frontend components built with HTML, CSS, and JavaScript. Covers typography, color, spatial design, motion, interaction, responsive behavior, and UX writing as they apply to the browser.

This domain extends the universal principles in AGENTS.md with web-specific techniques, CSS patterns, and implementation guidance. Load AGENTS.md first; this file adds to it.

## Target Specifications

**Stack:** HTML, CSS, JavaScript/TypeScript, React, Tailwind CSS (adapt to project stack)
**Rendering context:** Browsers (Chrome, Safari, Firefox, Edge)
**Audience context:** Users on desktop, tablet, and mobile devices with varying input methods (mouse, touch, keyboard)

## Typography

### Type System

Use a modular scale with fluid sizing. Five sizes cover most interfaces:

| Role | Size | Use Case |
|------|------|----------|
| Caption | 0.75rem | Metadata, legal, timestamps |
| Secondary | 0.875rem | Secondary UI, helper text |
| Body | 1rem (16px minimum) | Primary content |
| Subheading | 1.25-1.5rem | Section headers, lead text |
| Headline | 2-4rem | Page titles, hero text |

Pick a scale ratio (1.25 major third, 1.333 perfect fourth, 1.5 perfect fifth) and commit. Too many sizes too close together (14px, 15px, 16px, 18px) create muddy hierarchy.

Use `clamp()` for fluid sizing: `clamp(1rem, 0.5rem + 2vw, 2.5rem)`. The middle value controls scaling rate. Add a rem offset so text doesn't collapse on small screens. Don't use fluid type for buttons, labels, or UI elements that need consistency.

### Font Selection

**Avoid invisible defaults:** Inter, Roboto, Open Sans, Lato, Montserrat. These are everywhere and make designs feel generic.

**Better alternatives from Google Fonts:**
- Instead of Inter: Instrument Sans, Plus Jakarta Sans, Outfit
- Instead of Roboto: Onest, Figtree, Urbanist
- Instead of Open Sans: Source Sans 3, Nunito Sans, DM Sans
- Editorial/premium feel: Fraunces, Newsreader, Lora

**System fonts are underrated** for apps where performance matters more than personality: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui`.

One font family in multiple weights often creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast (display headlines + body serif). Never pair fonts that are similar but not identical.

### Vertical Rhythm

Line-height should be the base unit for vertical spacing. Body text at `line-height: 1.5` on `16px` type = 24px. Space sections in multiples of that base. Increase line-height by 0.05-0.1 for light text on dark backgrounds.

### Readability

Use `ch` units for measure: `max-width: 65ch`. Line-height scales inversely with line length. Narrow columns: tighter leading. Wide columns: more breathing room.

### OpenType Features

Use these for polish. Most developers miss them:
- `font-variant-numeric: tabular-nums` for data tables (digits align in columns)
- `font-variant-numeric: diagonal-fractions` for fractions
- `font-variant-caps: all-small-caps` for abbreviations
- `font-variant-ligatures: none` for code blocks
- `font-kerning: normal` on body text

### Font Loading

Prevent layout shift with `font-display: swap` and metric-matched fallbacks using `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` on the fallback `@font-face`. Tools like Fontaine calculate overrides automatically.

## Color

### Use OKLCH

OKLCH is perceptually uniform: equal steps in lightness look equal (unlike HSL, where 50% lightness in yellow looks bright while 50% in blue looks dark).

```css
--color-primary: oklch(60% 0.15 250);
--color-primary-light: oklch(85% 0.08 250);
--color-primary-dark: oklch(35% 0.12 250);
```

Reduce chroma as you move toward white or black. High chroma at extreme lightness looks garish.

### Tinted Neutrals

Never use pure gray. Add a subtle hint of your brand hue (chroma 0.01) to all neutrals. The tint is tiny but perceptible. It creates subconscious cohesion.

```css
/* Dead gray (avoid) */
--gray-100: oklch(95% 0 0);

/* Warm-tinted (better) */
--gray-100: oklch(95% 0.01 60);

/* Cool-tinted (better) */
--gray-100: oklch(95% 0.01 250);
```

### Palette Roles

| Role | Purpose |
|------|---------|
| Primary | Brand, CTAs, key actions. 1 color, 3-5 shades. |
| Neutral | Text, backgrounds, borders. 9-11 shade scale. |
| Semantic | Success, error, warning, info. 4 colors, 2-3 shades each. |
| Surface | Cards, modals, overlays. 2-3 elevation levels. |

Skip secondary/tertiary unless you need them. One accent color is usually enough. Overuse kills accent power.

### Dark Mode

Dark mode is not inverted light mode. Key differences:
- Use lighter surfaces for depth (not shadows)
- Desaturate accent colors slightly
- Reduce body font weight (350 instead of 400)
- Never use pure black backgrounds; use dark gray (oklch 12-18%)
- Use two token layers: primitives (--blue-500) stay the same; semantic tokens (--color-primary) get redefined

### Contrast and Accessibility

WCAG AA minimums: 4.5:1 for body text, 3:1 for large text and UI components. Placeholder text still needs 4.5:1. Don't trust your eyes; test with WebAIM Contrast Checker or browser DevTools.

Avoid heavy use of alpha/transparency. It creates unpredictable contrast and usually signals an incomplete palette. Define explicit colors for each context.

## Spatial Design

### Spacing System

Use a 4pt base: 4, 8, 12, 16, 24, 32, 48, 64, 96px. The 8pt system is too coarse (you'll need 12px constantly). Name tokens semantically (--space-sm, --space-lg), not by value (--spacing-8). Use `gap` instead of margins for sibling spacing.

### Grid

`repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints. Named `grid-template-areas` for complex layouts, redefined at breakpoints.

Use `clamp()` for fluid spacing that breathes on larger screens.

### Cards

Cards are overused. Spacing and alignment create visual grouping naturally. Use cards only when:
- Content is truly distinct and actionable
- Items need visual comparison in a grid
- Content needs clear interaction boundaries

Never nest cards inside cards. Use spacing, typography, and subtle dividers for hierarchy within a card.

### Container Queries

Viewport queries are for page layouts. Container queries are for components. A card in a narrow sidebar stays compact; the same card in main content expands. Use `container-type: inline-size` on the parent, `@container` rules on children.

### Optical Adjustments

Text at `margin-left: 0` looks indented due to letterform whitespace. Use negative margin (-0.05em) to optically align. Geometrically centered icons often look off-center; adjust toward visual center. Touch targets need 44px minimum (use padding or pseudo-elements to expand the hit area beyond visual size).

### Depth

Create a semantic z-index scale: dropdown, sticky, modal-backdrop, modal, toast, tooltip. Create a consistent shadow elevation scale (sm, md, lg, xl). Shadows should be subtle; if you can clearly see a shadow, it's probably too strong.

## Motion

### Duration

| Duration | Use Case |
|----------|----------|
| 100-150ms | Instant feedback: button press, toggle, color change |
| 200-300ms | State changes: menu open, tooltip, hover |
| 300-500ms | Layout changes: accordion, modal, drawer |
| 500-800ms | Entrance animations: page load, hero reveals |

Exit animations should be ~75% of entrance duration.

### Easing

Don't use the default `ease`. Use exponential curves for natural deceleration:
- `cubic-bezier(0.25, 1, 0.5, 1)` for smooth ease-out (recommended default)
- `cubic-bezier(0.22, 1, 0.36, 1)` for slightly more dramatic
- `cubic-bezier(0.16, 1, 0.3, 1)` for snappy, confident

Never use bounce or elastic easing. They feel dated. Real objects decelerate smoothly.

### Performance

Only animate `transform` and `opacity`. Everything else causes layout recalculation. For height animations, use `grid-template-rows: 0fr` to `1fr` transitions.

Use CSS custom properties for staggered animations: `animation-delay: calc(var(--i, 0) * 50ms)`. Cap total stagger time (10 items at 50ms = 500ms max).

### Reduced Motion

Non-negotiable. Vestibular disorders affect ~35% of adults over 40. Use `@media (prefers-reduced-motion: reduce)` to provide crossfade alternatives or disable motion. Preserve functional animations (progress bars, loading indicators) but remove spatial movement.

### Perceived Performance

Target under 80ms for micro-interactions (feels instant). Use optimistic UI for low-stakes actions. Skeleton screens beat spinners. Show content progressively; don't wait for everything to load.

## Interaction

### Interactive States

Every interactive element needs all eight states designed: default, hover, focus, active, disabled, loading, error, success. Hover and focus are different states; keyboard users never see hover.

### Focus Indicators

Never remove focus outlines without replacement. Use `:focus-visible` to show focus rings only for keyboard users. Focus rings need 3:1 contrast, 2-3px thickness, offset from the element.

### Forms

Placeholders are not labels. Always use visible label elements. Validate on blur, not on every keystroke (exception: password strength). Place errors below fields with `aria-describedby`.

### Loading

Skeleton screens over spinners. Optimistic updates for low-stakes actions (likes, follows). For long waits, show progress or set expectations ("This usually takes 30 seconds").

### Modals and Overlays

Prefer alternatives: drawers, popovers, inline expansion. If you must use a modal, use the native `<dialog>` element with `showModal()`. For tooltips and dropdowns, use the Popover API (`popover` attribute, `popovertarget`).

### Destructive Actions

Undo is better than confirmation dialogs. Users click through confirmations mindlessly. Remove from UI immediately, show undo toast, delete after expiry. Reserve confirmation for truly irreversible or high-cost actions.

### Keyboard

Use roving tabindex for component groups (tabs, menus, radio groups). Provide skip links for keyboard users to jump past navigation. Don't rely on gestures as the only way to perform actions; always provide a visible fallback.

## Responsive

### Mobile-First

Write base styles for mobile, use `min-width` queries to layer complexity. Desktop-first means mobile loads unnecessary styles.

### Breakpoints

Content-driven, not device-driven. Start narrow, stretch until it breaks, add a breakpoint. Three usually suffice (640, 768, 1024px). Use `clamp()` for fluid values between breakpoints.

### Input Method Detection

Screen size doesn't tell you input method. Use `@media (pointer: fine)` and `@media (pointer: coarse)` for mouse vs touch. Use `@media (hover: hover)` and `@media (hover: none)` for hover capability. Never rely on hover for functionality.

### Safe Areas

Use `env(safe-area-inset-*)` for notches, rounded corners, and home indicators. Enable with `viewport-fit=cover` in your meta tag.

### Responsive Images

Use `srcset` with width descriptors and `sizes` for resolution switching. Use `<picture>` for art direction (different crops at different sizes). Let the browser pick the optimal file.

### Adaptation Patterns

Navigation: hamburger + drawer on mobile, horizontal on tablet, full with labels on desktop. Tables: transform to stacked cards on mobile. Use `<details>`/`<summary>` for collapsible content. Don't hide critical functionality on mobile; adapt the interface, don't amputate it.

### Testing

DevTools emulation misses real touch interactions, CPU constraints, network latency, and font rendering. Test on at least one real iPhone, one real Android, and a tablet if relevant.

## UX Writing

### Button Labels

Use specific verb + object patterns: "Save changes" not "OK", "Create account" not "Submit", "Delete message" not "Yes". For destructive actions, name the destruction and show the count ("Delete 5 items").

### Error Messages

Every error should answer: What happened? Why? How to fix it? Never blame the user. Template: "[Field] needs to be [format]. Example: [example]".

### Empty States

Empty states are onboarding moments. Acknowledge briefly, explain the value of filling the space, provide a clear action. "No projects yet. Create your first one to get started" not "No items".

### Tone by Context

Success: celebratory, brief. Error: empathetic, helpful. Loading: reassuring, specific. Destructive: serious, clear. Never use humor for errors.

### Consistency

Pick one term and enforce it: Delete (not Remove/Trash), Settings (not Preferences/Options), Sign in (not Log in/Enter), Create (not Add/New).

### Accessibility in Writing

Link text must have standalone meaning ("View pricing plans" not "Click here"). Alt text describes information ("Revenue increased 40% in Q4" not "Chart"). Use `alt=""` for decorative images. Icon buttons need `aria-label`.

### Translation Readiness

Plan for text expansion (German is ~30% longer). Keep numbers separate from strings. Use full sentences as single translation units. Avoid abbreviations in translatable strings.

## Quality Gates

**Mandatory checks (from AGENTS.md):**
- [ ] Squint Test passes (hierarchy visible when blurred)
- [ ] AI Slop Test passes (no prohibited defaults)
- [ ] Spacing has rhythm (not uniform)
- [ ] Color palette has defined roles
- [ ] Typography limited to 2-3 families

**Domain-specific checks:**
- [ ] Fluid typography uses `clamp()` with rem offset
- [ ] Neutrals are tinted, not pure gray
- [ ] All interactive elements have 8 states defined
- [ ] Focus indicators present and using `:focus-visible`
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Only `transform` and `opacity` animated
- [ ] Touch targets meet 44px minimum
- [ ] WCAG AA contrast ratios met (4.5:1 body, 3:1 large text/UI)
- [ ] Mobile-first CSS with `min-width` queries
- [ ] Error messages answer what, why, and how to fix
- [ ] Button labels use verb + object pattern
- [ ] No placeholder text used as labels

## Common Failure Modes

**Generic dashboard syndrome:** Every SaaS app looks the same because they use the same card grid with the same metric layout. Break the pattern with asymmetric layouts, varied card sizes, and information density that serves the actual use case.

**Tailwind defaults as design:** Tailwind's utility classes are excellent, but `rounded-lg shadow-md p-4` on every card produces generic output. Override with intentional spacing, custom shadow scales, and tinted backgrounds.

**Dark mode as personality substitute:** Defaulting to dark mode with glowing accents feels "cool" without requiring actual design decisions. Choose a theme based on the product's context and audience, not because dark mode is easier to make look passable.

**Responsive afterthought:** Designing for desktop and then "making it work" on mobile produces cramped, hidden-feature mobile experiences. Design mobile-first; desktop gets the enhancements.

**Accessibility bolted on:** Retroactively adding contrast fixes, focus rings, and ARIA labels produces inconsistent results. Build accessibility into every component from the start.
