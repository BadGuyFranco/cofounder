# Utility: Brand Extract

## Purpose

Extract a design system from an existing website or codebase. Reverse-engineer the implicit visual rules into explicit tokens and a DESIGN.md. Useful when a project has existing design but no documented system.

## When to Use

- A project has a live site but no documented design system
- User wants to codify existing visual patterns into tokens
- Starting work on a project and need to understand its current design language
- Creating a DESIGN.md for a project that doesn't have one

## Methods

### Method 1: Extract from CSS/Code

Read the project's CSS files directly. This is the most reliable method.

**Step 1: Find the styles**
Look for:
- `*.css` files in the project root, `src/`, `styles/`, `public/`
- Tailwind config (`tailwind.config.js`, `tailwind.config.ts`)
- CSS-in-JS theme objects
- CSS custom properties in `:root`

**Step 2: Extract colors**
Search for:
- CSS custom properties with "color" in the name
- Hex values (#xxx, #xxxxxx)
- RGB/HSL/OKLCH values
- Tailwind color configuration

Group by apparent role:
- Repeated hex values are likely primary/brand colors
- Grays or near-grays are neutrals
- Red/green/amber/blue in small quantities are likely semantic

**Step 3: Extract typography**
Search for:
- `font-family` declarations
- `font-size` values (identify the scale)
- `font-weight` values in use
- `line-height` values
- Google Fonts imports or `@font-face` declarations

**Step 4: Extract spacing**
Search for:
- Padding and margin values
- Gap values
- Tailwind spacing configuration
- Identify the base unit (is it 4px, 8px, or irregular?)

**Step 5: Extract components**
Look for common patterns:
- Button styles (classes, variants)
- Card/container patterns
- Border radius values
- Shadow values
- Transition/animation values

### Method 2: Extract from Live Site

If the project has a live URL but the code isn't accessible, use Browser Control MCP to inspect.

**Step 1: Navigate to the site**
Open the URL in the browser.

**Step 2: Extract computed styles**
Use browser evaluation to extract styles from key elements:

```javascript
// Extract color palette from all elements
const colors = new Set();
document.querySelectorAll('*').forEach(el => {
  const style = getComputedStyle(el);
  colors.add(style.color);
  colors.add(style.backgroundColor);
  colors.add(style.borderColor);
});
```

**Step 3: Extract font information**
```javascript
const fonts = new Set();
document.querySelectorAll('*').forEach(el => {
  const style = getComputedStyle(el);
  fonts.add(style.fontFamily);
});
```

**Step 4: Screenshot for reference**
Take screenshots of key pages for visual reference during the extraction.

### Method 3: Extract from Screenshot/Image

If only a screenshot or mockup is available, analyze visually:
- Identify the color palette by sampling key areas
- Identify font characteristics (serif/sans, weight, approximate sizes)
- Identify spacing patterns (tight/spacious, consistent/varied)
- Identify component patterns (card styles, button styles)

This method is least precise. Note approximations in the output.

## Output

Generate a DESIGN.md documenting the extracted system:

```markdown
# Design System: [Project Name]
*Extracted from [source: codebase / live site / screenshot] on [date]*

## Visual Direction
[Observed personality, based on the extracted values]

## Color
[Extracted palette organized by role, converted to OKLCH with hex fallbacks]

## Typography
[Extracted fonts, scale, weights]

## Spacing
[Extracted spacing values, identified base unit]

## Components
[Observed patterns: buttons, cards, inputs, etc.]

## Notes
[Uncertainties, approximations, things that need human confirmation]
```

Also generate the CSS custom properties file with extracted tokens.

## Quality Gates

- [ ] Colors extracted and organized by role (primary, neutral, semantic)
- [ ] Typography identified (families, scale, weights)
- [ ] Spacing base unit identified
- [ ] Component patterns documented
- [ ] Output is DESIGN.md + CSS custom properties
- [ ] Approximations and uncertainties noted
- [ ] Source method documented (code/live site/screenshot)
