# Workflow: Typography System

## Purpose

Design a type system with modular scale, font selection, fluid sizing, and vertical rhythm. The system should feel intentional and distinctive, not defaulted.

## When to Use

- Building a new typography system
- Phase 3 (Foundation) of the Design Process when type is needed
- Establishing type hierarchy for a project

## Inputs

- Typography voice from Phase 2 Direction (geometric/humanist, sharp/rounded, condensed/wide)
- Domain context (web-apps favor readability; marketing favors personality; brand favors distinctiveness)
- Existing font constraints (if the project already uses specific fonts)

## Process

### Step 1: Select Scale Ratio

The scale ratio determines how much size increases between each level. Smaller ratios create subtle hierarchy; larger ratios create dramatic hierarchy.

| Ratio | Name | Character | Best for |
|-------|------|-----------|----------|
| 1.125 | Major Second | Subtle, dense | Data-heavy dashboards, compact UI |
| 1.200 | Minor Third | Moderate, readable | General-purpose web apps |
| 1.250 | Major Third | Clear, balanced | Most projects (recommended default) |
| 1.333 | Perfect Fourth | Distinct, confident | Marketing pages, editorial content |
| 1.500 | Perfect Fifth | Dramatic, expressive | Hero-driven landing pages, brand sites |
| 1.618 | Golden Ratio | Bold, high-end | Luxury brands, minimal pages with few type levels |

**Select based on Direction and domain:** Dense, functional interfaces need smaller ratios. Spacious, editorial layouts need larger ratios. State why you chose this ratio.

### Step 2: Generate the Scale

Apply the ratio to a 16px (1rem) base. Five sizes cover most interfaces:

| Role | Scale Step | Example at 1.250 | Use |
|------|-----------|-------------------|-----|
| Caption | -1 | 0.8rem (12.8px) | Metadata, timestamps, legal, labels |
| Body | 0 (base) | 1rem (16px) | Primary content, form inputs |
| Subheading | +1 | 1.25rem (20px) | Section headers, lead text, card titles |
| Heading | +2 | 1.563rem (25px) | Page section titles |
| Display | +3 | 1.953rem (31.25px) | Page titles, hero text |

For marketing or brand contexts, add a +4 step for large display text.

**Generate as CSS custom properties:**

```css
:root {
  --text-caption: 0.8rem;
  --text-body: 1rem;
  --text-subheading: 1.25rem;
  --text-heading: 1.563rem;
  --text-display: 1.953rem;
}
```

### Step 3: Select Fonts

**Rules:**
- Maximum 2 families. One is often enough.
- Never use: Inter, Roboto, Arial, Open Sans, Lato, Montserrat as primary (Design Advisor Prohibited Defaults).
- System fonts are valid for apps where performance matters more than personality.

**Font pairing strategy:**

| Pattern | When | Example |
|---------|------|---------|
| Single family, multiple weights | Clean, consistent, functional UI | Plus Jakarta Sans 400/500/600/700 |
| Display + Body | Editorial, marketing, brand distinction | Fraunces (display) + Instrument Sans (body) |
| Serif + Sans-serif | Traditional authority + modern clarity | Newsreader (headings) + DM Sans (body) |

**Selection by personality (from Phase 2 Direction):**

| Voice | Recommended alternatives |
|-------|------------------------|
| Geometric, precise | Outfit, Urbanist, Figtree |
| Humanist, approachable | Plus Jakarta Sans, Nunito Sans, DM Sans |
| Editorial, authoritative | Fraunces, Newsreader, Lora, Source Serif 4 |
| Technical, sharp | JetBrains Mono (code only), Onest, Instrument Sans |
| Distinctive, premium | Cabinet Grotesk, Satoshi, General Sans |

State why you chose this font. Connect to the Direction from Phase 2.

### Step 4: Define Weight and Style Hierarchy

Map font weights to information hierarchy:

| Level | Weight | Use |
|-------|--------|-----|
| Primary emphasis | 700 (Bold) | Headlines, buttons, key metrics |
| Secondary emphasis | 600 (Semibold) | Subheadings, labels, nav items |
| Body | 400 (Regular) | Paragraph text, form content |
| De-emphasis | 400 + reduced opacity or lighter color | Captions, helper text, metadata |

**Never use:** 300 (Light) for body text on screens (readability suffers). Medium (500) vs Regular (400) contrast is too subtle for hierarchy.

### Step 5: Set Line Heights and Spacing

| Context | Line Height | Rationale |
|---------|-------------|-----------|
| Body text | 1.5 (24px at 16px) | Readable for extended content |
| Subheadings | 1.35 | Tighter, but still multi-line safe |
| Headings | 1.2 | Tight; single line or very few lines |
| Display | 1.1 | Very tight; headline impact |
| Captions | 1.4 | Slightly open for small text readability |

**Vertical rhythm:** Use the body line-height as the base spacing unit. At 16px/1.5, the base is 24px. Space sections in multiples: 24, 48, 72, 96.

**Letter spacing:**
- Body: 0 (default)
- Headings: -0.02em to -0.01em (tighten for large text)
- Captions / all-caps labels: +0.05em to +0.08em (open for small or uppercase text)

### Step 6: Add Fluid Sizing (responsive)

Use `clamp()` for sizes that should scale between mobile and desktop:

```css
:root {
  --text-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-subheading: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-heading: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  --text-display: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
}
```

**Rules:**
- Always include a rem minimum so text doesn't collapse on small screens
- The `vw` component controls how aggressively text scales
- Don't use fluid sizing for buttons, labels, or UI elements that need consistency
- Caption size stays fixed (fluid at small sizes creates readability issues)

### Step 7: Output

Generate the complete type system as CSS custom properties:

```css
:root {
  /* Scale */
  --text-caption: 0.8rem;
  --text-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-subheading: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-heading: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  --text-display: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);

  /* Weights */
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line heights */
  --leading-tight: 1.1;
  --leading-heading: 1.2;
  --leading-subheading: 1.35;
  --leading-body: 1.5;

  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;

  /* Font families */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Vertical rhythm base */
  --rhythm: 1.5rem; /* 24px */
}
```

Include a type specimen: a short HTML block demonstrating each level in use with the selected fonts.

## Quality Gates

- [ ] Scale ratio stated with rationale
- [ ] Font choice stated with rationale (not from Prohibited Defaults list)
- [ ] Maximum 2 font families
- [ ] Body text minimum 16px (1rem)
- [ ] Line heights appropriate for each level
- [ ] Fluid sizing implemented for responsive contexts
- [ ] Vertical rhythm base defined
- [ ] Type specimen included showing hierarchy
- [ ] Letter spacing adjusted for headings and small text
