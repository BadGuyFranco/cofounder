# Workflow: Color Palette

## Purpose

Generate a complete color palette using OKLCH color space with WCAG accessibility validation, defined roles, and light/dark mode support.

## When to Use

- Building a new color system from scratch
- Redesigning an existing color palette
- Phase 3 (Foundation) of the Design Process when color is needed

## Inputs

- Color mood from Phase 2 Direction (warm/cool, saturated/muted, light/dark)
- Brand color if one exists (a single hex or oklch value to anchor the palette)
- Domain context (web-apps, marketing, brand) for intensity calibration

## Process

### Step 1: Define the Primary Hue

Start with one color. This is the brand's voice in color.

**If the user provides a brand color:** Convert it to OKLCH. Use its hue angle as the primary.

**If no brand color exists:** Select based on the Direction established in Phase 2.

| Personality | Hue Direction | OKLCH Hue Range |
|------------|---------------|-----------------|
| Trustworthy, corporate | Blue | 230-260 |
| Growth, health, finance | Green | 140-170 |
| Energy, urgency, passion | Red-orange | 15-40 |
| Creative, luxury, wisdom | Purple | 280-310 |
| Optimistic, accessible, warmth | Yellow-orange | 60-90 |
| Calm, nature, balance | Teal | 175-200 |

State why you chose this hue. Reference the Direction from Phase 2.

### Step 2: Build the Primary Scale

Generate a 10-step lightness scale for the primary hue. OKLCH makes this straightforward because lightness is perceptually uniform.

**Scale structure:**

| Step | Lightness | Use |
|------|-----------|-----|
| 50 | 97% | Tinted backgrounds |
| 100 | 93% | Hover backgrounds |
| 200 | 86% | Borders, dividers |
| 300 | 74% | Disabled states |
| 400 | 62% | Secondary elements |
| 500 | 55% | Primary (the anchor) |
| 600 | 46% | Hover state for primary |
| 700 | 38% | Active state |
| 800 | 30% | Dark surfaces |
| 900 | 22% | Dark text on light |
| 950 | 14% | Darkest variant |

**Chroma adjustment:** Reduce chroma at the extremes (very light and very dark steps). At 97% lightness, chroma near 0.02-0.04. At 55% lightness, chroma at full saturation (0.15-0.28 depending on hue). At 14% lightness, chroma near 0.03-0.06.

### Step 3: Build Neutral Scale

Neutrals are the backbone. Tint them toward the primary hue. Never use pure gray.

**Method:** Take the primary hue angle. Set chroma to 0.01-0.02. Generate the same 10-step lightness scale.

```css
/* Example: Primary hue at 250 (blue) */
--neutral-50: oklch(98% 0.005 250);
--neutral-100: oklch(95% 0.008 250);
--neutral-200: oklch(88% 0.01 250);
--neutral-300: oklch(78% 0.012 250);
--neutral-400: oklch(65% 0.01 250);
--neutral-500: oklch(55% 0.01 250);
--neutral-600: oklch(45% 0.008 250);
--neutral-700: oklch(35% 0.008 250);
--neutral-800: oklch(25% 0.006 250);
--neutral-900: oklch(18% 0.005 250);
--neutral-950: oklch(12% 0.004 250);
```

### Step 4: Define Semantic Colors

Fixed-meaning colors that are consistent across all contexts.

| Role | Hue | Notes |
|------|-----|-------|
| Success | Green (~145) | Confirmations, completions |
| Error | Red (~25) | Failures, destructive actions |
| Warning | Amber (~85) | Caution, attention needed |
| Info | Blue (~240) | Informational, neutral alerts |

For each semantic color, generate at minimum: a background tint (high lightness), a foreground/icon color (medium lightness), and a text color (low lightness) that passes 4.5:1 contrast against the background tint.

### Step 5: Define Surface Colors

Background layers that create depth.

| Surface | Lightness (light mode) | Lightness (dark mode) |
|---------|----------------------|---------------------|
| Base | 99% | 12% |
| Raised | 100% (white) | 16% |
| Overlay | 100% with shadow | 20% |
| Sunken | 96% | 8% |

Tint all surfaces toward the primary hue using the same low-chroma approach as neutrals.

### Step 6: Validate Contrast

For every foreground/background pairing that will appear in the design:

1. Calculate contrast ratio
2. Mark pass/fail against WCAG AA:
   - Normal text (under 24px / 18.66px bold): 4.5:1 minimum
   - Large text (24px+ / 18.66px+ bold) and UI components: 3:1 minimum
3. If any pairing fails, adjust the lighter or darker color until it passes

**Present the contrast table:**

| Foreground | Background | Ratio | WCAG AA |
|-----------|-----------|-------|---------|
| neutral-900 | white | X:1 | Pass/Fail |
| primary-500 | white | X:1 | Pass/Fail |

### Step 7: Generate Dark Mode (if needed)

Invert the lightness mapping. Dark mode is not just "swap light and dark." Principles:

- Reduce chroma slightly (saturated colors are harsher on dark backgrounds)
- Surface colors use the neutral scale (dark end)
- Primary and semantic colors adjust lightness to maintain contrast against dark surfaces
- Text uses neutral-100 to neutral-300 (not pure white)

### Step 8: Output

Output as CSS custom properties with OKLCH values and hex fallbacks:

```css
:root {
  /* Primary */
  --color-primary-500: oklch(55% 0.22 250); /* #3366cc */
  --color-primary-600: oklch(46% 0.20 250); /* #2b57ab */
  /* ... full scale ... */

  /* Neutral (tinted toward primary) */
  --color-neutral-50: oklch(98% 0.005 250); /* #f8f9fb */
  /* ... full scale ... */

  /* Semantic */
  --color-success: oklch(55% 0.18 145); /* #2d8a4e */
  --color-error: oklch(55% 0.22 25); /* #cc3333 */
  --color-warning: oklch(70% 0.16 85); /* #c9a020 */
  --color-info: oklch(55% 0.18 240); /* #3377bb */

  /* Surfaces */
  --color-surface-base: oklch(99% 0.003 250);
  --color-surface-raised: oklch(100% 0 0);
  --color-surface-sunken: oklch(96% 0.005 250);
}
```

Include a visual summary table showing each color with its name, OKLCH value, hex fallback, and role.

## Quality Gates

- [ ] Every color has a defined role (no decorative-only colors)
- [ ] All text/background pairings pass WCAG AA contrast
- [ ] Neutrals are tinted, not pure gray
- [ ] No pure black (#000000) or pure white (#ffffff) for text or backgrounds
- [ ] Primary scale has perceptually even lightness steps
- [ ] 60-30-10 distribution: 60% neutral, 30% secondary, 10% accent
- [ ] Dark mode (if generated) maintains contrast ratios
- [ ] Each color choice has stated rationale connecting to the Direction from Phase 2
