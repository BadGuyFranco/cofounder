# Utility: Accessibility Check

## Purpose

Validate design output against WCAG 2.1 AA standards. This is the accessibility validation step in Phase 5 (Validate). Run on every design before delivery.

## When to Use

- Phase 5 of the Design Process (always)
- When reviewing existing designs for accessibility
- When the user specifically requests an accessibility audit

## Process

### Step 1: Color Contrast

Check every text/background pairing in the design.

**WCAG AA requirements:**

| Content Type | Minimum Ratio | How to Check |
|-------------|---------------|-------------|
| Normal text (under 24px / under 18.66px bold) | 4.5:1 | Compare text color against its background |
| Large text (24px+ / 18.66px+ bold) | 3:1 | Compare text color against its background |
| UI components and graphics | 3:1 | Compare interactive element against adjacent colors |

**Calculating contrast with OKLCH:**
The contrast ratio is calculated from relative luminance, which maps to the L (lightness) component in OKLCH. A rough check: if the lightness difference between foreground and background is less than 40%, the pairing likely fails.

For precise validation, convert OKLCH to sRGB, then calculate relative luminance:
```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
contrast = (L_lighter + 0.05) / (L_darker + 0.05)
```

**Report format:**

| Pairing | Foreground | Background | Ratio | Required | Result |
|---------|-----------|-----------|-------|----------|--------|
| Body text | neutral-900 | surface-base | X:1 | 4.5:1 | Pass/Fail |
| Button label | white | primary-500 | X:1 | 4.5:1 | Pass/Fail |

### Step 2: Interactive States

Every interactive element must have visible states for different interaction modes.

**Required states:**

| Element | Hover | Focus | Active | Disabled |
|---------|-------|-------|--------|----------|
| Button | Required | Required | Required | Required |
| Link | Required | Required | Optional | Optional |
| Input | Optional | Required | Optional | Required |
| Checkbox/Radio | Required | Required | Required | Required |
| Card (if clickable) | Required | Required | Optional | Optional |

**Focus indicators:**
- Must be visible (not just browser default if it's been overridden)
- Must have 3:1 contrast against adjacent colors
- Must not rely on color alone (use outline, ring, or border)
- `outline: 2px solid [visible-color]; outline-offset: 2px;` is a reliable pattern

**Check:** Tab through all interactive elements. Can you see where focus is at all times?

### Step 3: Touch Targets

Interactive elements must be large enough to tap on touch devices.

**Minimum size:** 44x44px (CSS pixels)

**Common violations:**
- Icon buttons without padding (the icon is 16px but the button is also 16px)
- Close buttons in corners
- Inline text links with no vertical padding
- Table row actions

**Fix pattern:** Even if the visual element is small, the clickable area can be larger:
```css
.icon-button {
  /* Visual size */
  width: 24px;
  height: 24px;
  /* Touch target */
  padding: 10px;
  /* Total: 44px */
}
```

### Step 4: Semantic HTML

Check that the HTML structure conveys meaning:

- [ ] Headings follow a logical hierarchy (h1, then h2, then h3; no skipping levels)
- [ ] Lists use `<ul>`, `<ol>`, `<dl>` (not divs with bullets)
- [ ] Buttons are `<button>`, not `<div onclick>`
- [ ] Links are `<a>`, not `<span onclick>`
- [ ] Navigation is wrapped in `<nav>`
- [ ] Main content is in `<main>`
- [ ] Form inputs have associated `<label>` elements (not just placeholder text)
- [ ] Images have `alt` text (empty `alt=""` for decorative images)
- [ ] Tables have `<th>` headers with `scope` attribute

### Step 5: Color Independence

Information must not be conveyed by color alone.

**Check each instance where color communicates meaning:**
- Status indicators: must include icon or text alongside color
- Form validation: must include error text, not just red border
- Charts/graphs: must include labels, patterns, or legends
- Links in body text: must have underline or other non-color indicator

### Step 6: Motion and Animation

If the design includes animation:

- [ ] Animations respect `prefers-reduced-motion` media query
- [ ] No auto-playing animations that can't be paused
- [ ] No flashing content (more than 3 flashes per second)
- [ ] Loading indicators are text-described (not just visual)

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Step 7: Report

Present findings grouped by severity:

**Critical** (blocks users):
- Contrast failures on primary content
- Missing focus indicators
- Non-semantic interactive elements (div buttons)
- Information conveyed by color alone

**Major** (degrades experience):
- Touch targets below 44px
- Missing form labels
- Heading hierarchy issues
- Missing alt text

**Minor** (improvements):
- Suboptimal contrast on decorative elements
- Missing `prefers-reduced-motion`
- Inconsistent focus styles

For each finding, state:
1. What the issue is
2. Where it occurs (specific element)
3. How to fix it (specific CSS/HTML change)

## Quality Gates

- [ ] All text/background pairings checked for contrast
- [ ] All interactive elements have visible focus indicators
- [ ] All touch targets meet 44px minimum
- [ ] Semantic HTML verified (headings, buttons, labels, landmarks)
- [ ] No information conveyed by color alone
- [ ] Reduced motion support included (if animations present)
- [ ] Report delivered with severity grouping and specific fixes
