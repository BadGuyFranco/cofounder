# Workflow: Page Layout

## Purpose

Design a full page composition with grid system, responsive breakpoints, section rhythm, content hierarchy, and visual flow. The output is a complete HTML page that demonstrates the design, not a wireframe.

## When to Use

- Designing a complete page (landing page, dashboard, settings page, profile page)
- Phase 4 (Compose) when the output is a full page
- Translating a wireframe into a designed page

## Inputs

- Design tokens (from DESIGN.md or Phase 3 Foundation)
- Page purpose and primary action
- Content (real or realistic placeholder)
- Domain file loaded (web-apps, marketing, or brand)

## Process

### Step 1: Define the Page's Job

Every page has one primary job. State it.

- **What is the single most important thing a user should do on this page?** (sign up, understand the product, configure settings, view data)
- **What information hierarchy serves that job?** (what's most important, second, third)
- **What's the entry point?** (above the fold, after scrolling, from a specific flow)

### Step 2: Establish Grid System

Define the page grid before placing content.

**Standard grid:**
```css
.page-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
```

**Responsive breakpoints:**

| Breakpoint | Width | Columns | Behavior |
|-----------|-------|---------|----------|
| Mobile | < 640px | 4 | Single column, stacked |
| Tablet | 640-1024px | 8 | Two column where appropriate |
| Desktop | 1024-1280px | 12 | Full grid |
| Wide | > 1280px | 12, max-width contained | Content doesn't stretch infinitely |

**Column assignments by content type:**
- Full-width sections (heroes, CTAs): span all columns
- Primary content: 7-8 columns
- Sidebar: 4-5 columns
- Narrow content (articles, forms): 6-8 columns, centered
- Cards: 3-4 columns each in a grid

### Step 3: Plan Section Rhythm

A page is a sequence of sections. Each section has a visual role. Plan the rhythm before coding.

**Common section types:**

| Section | Visual Character | Typical Height |
|---------|-----------------|---------------|
| Hero | High impact, spacious, large type | 60-100vh |
| Content | Medium density, readable | Natural |
| Feature highlight | Alternating layout (text+image, image+text) | Natural |
| Social proof | Testimonials, logos, metrics | Compact |
| CTA | High contrast, clear action | Compact |
| Footer | Dense, low hierarchy | Natural |

**Rhythm rules:**
- Alternate section backgrounds (white, tinted, white, tinted) to create visual separation
- Section padding should be generous (space-16 to space-24 for major sections)
- Don't use horizontal rules or divider lines between sections; background shifts are cleaner
- Vary section heights; uniform sections feel monotonous
- Dense sections followed by spacious sections creates rhythm

### Step 4: Design Each Section

Work through sections top-to-bottom. For each section:

1. **Place content on the grid** (column spans, alignment)
2. **Apply type hierarchy** (which heading level, which text size)
3. **Apply color** (background, text, accent placement)
4. **Add spacing** (section padding, element gaps, breathing room)
5. **Consider the section's relationship to neighbors** (contrast with previous/next section)

**For each section, run the Intentional Choice Check:** Can you state why this section looks the way it does?

### Step 5: Design Navigation

Navigation is part of the page layout, not separate from it.

**Patterns:**

| Context | Pattern |
|---------|---------|
| Marketing / landing page | Minimal top nav, logo left, CTA right, transparent over hero |
| Web app / dashboard | Sidebar nav (left) or top nav with breadcrumbs |
| Content / blog | Top nav with category links, search |

**Mobile navigation:** Hamburger menu or bottom tab bar. Don't use hover-triggered dropdowns.

**Sticky behavior:** If the nav sticks, ensure it has a solid background, a subtle bottom border or shadow, and reduced height compared to its initial state.

### Step 6: Design Above the Fold

What appears before scrolling is the first impression. It must communicate:
- What this page/product is (headline)
- Why it matters (subheadline or supporting text)
- What to do next (primary CTA)

**Squint Test:** Blur the above-the-fold area. Can you still identify: the headline, the CTA, and the general purpose? If not, hierarchy needs work.

### Step 7: Responsive Adaptation

Define how the layout changes at each breakpoint. This is not just "stack everything on mobile."

**Responsive decisions per section:**
- Which elements reflow (side-by-side to stacked)?
- Which elements resize (fluid images, text)?
- Which elements hide (secondary CTAs, decorative elements)?
- Does the reading order change?

**Implementation:**
```css
/* Mobile first */
.feature-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

/* Desktop */
@media (min-width: 1024px) {
  .feature-section {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }
}
```

### Step 8: Output

Complete HTML page with embedded CSS. Should open in a browser and look correct.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="[Google Fonts URL]" rel="stylesheet">
  <style>
    /* Design tokens */
    :root { /* ... */ }

    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; }

    /* Layout */
    /* ... sections, grid, responsive ... */
  </style>
</head>
<body>
  <nav><!-- Navigation --></nav>
  <main>
    <section><!-- Hero --></section>
    <section><!-- Content sections --></section>
  </main>
  <footer><!-- Footer --></footer>
</body>
</html>
```

For Tailwind output: use CDN link in the head and utility classes on elements.

## Quality Gates

- [ ] Page has a clear primary action / purpose
- [ ] Grid system defined with responsive breakpoints
- [ ] Section rhythm varies (not all same height or spacing)
- [ ] Above the fold communicates purpose, value, and action
- [ ] Navigation designed with mobile strategy
- [ ] Responsive behavior defined for all major breakpoints
- [ ] Squint Test passes (hierarchy visible when blurred)
- [ ] No uniform spacing between all sections
- [ ] Content is realistic (not Lorem ipsum)
- [ ] HTML is valid and renders correctly in browser
