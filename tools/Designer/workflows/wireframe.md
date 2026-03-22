# Workflow: Wireframe

## Purpose

Create structural grayscale layouts that communicate information hierarchy, content placement, and interaction patterns without visual design distraction. Wireframes answer "what goes where and why" before "how does it look."

## When to Use

- Early in the design process to explore layout options
- When the user needs to validate structure before investing in visual design
- When communicating layout to stakeholders or developers
- Phase 4 (Compose) when the output is a wireframe, not a finished design

## Distinction from Page Layout

Wireframes and page layouts are different deliverables:

| | Wireframe | Page Layout |
|-|-----------|-------------|
| Color | Grayscale only | Full color palette |
| Typography | Generic system font | Selected fonts with scale |
| Imagery | Gray placeholder boxes | Real or realistic images |
| Content | Labels and annotations | Real or realistic text |
| States | Noted, not designed | Fully designed |
| Purpose | Validate structure | Deliver design |

If the user asks for a wireframe, don't design it. If they ask for a page design, don't wireframe it.

## Inputs

- Page purpose and primary action (from Brief)
- Content inventory (what needs to appear on the page)
- Domain context for layout patterns

## Process

### Step 1: Content Inventory

List everything that needs to appear on the page. Group into priority tiers:

| Priority | Content | Rationale |
|----------|---------|-----------|
| P1 (must see) | [items] | Required for the page's primary job |
| P2 (should see) | [items] | Supports the primary job |
| P3 (can see) | [items] | Supplementary, can be below fold or secondary |

### Step 2: Select Layout Pattern

Based on the content inventory and domain, select a structural pattern:

**Common patterns:**

| Pattern | Use When | Structure |
|---------|----------|-----------|
| Single column | Content-focused (articles, forms, onboarding) | Header, content (narrow), footer |
| Two column | Content + sidebar (dashboards, docs, settings) | Nav/sidebar + main content |
| Grid | Item collections (products, cards, gallery) | Header, grid of items, footer |
| Z-pattern | Marketing (landing pages) | Hero, alternating content blocks, CTA |
| F-pattern | Data-heavy (dashboards, tables) | Top nav, left sidebar, main content area |
| Hub and spoke | Portal/home pages | Central content with linked sections |

### Step 3: Wireframe in HTML

Use HTML with minimal CSS. Grayscale palette. System font. No decoration.

**Visual vocabulary:**

```css
/* Wireframe styles */
:root {
  --wf-bg: #ffffff;
  --wf-surface: #f5f5f5;
  --wf-border: #d4d4d4;
  --wf-text: #404040;
  --wf-text-secondary: #808080;
  --wf-placeholder: #e5e5e5;
  --wf-annotation: #3b82f6;
}

body {
  font-family: system-ui, sans-serif;
  color: var(--wf-text);
  background: var(--wf-bg);
}

/* Placeholder for images */
.wf-image {
  background: var(--wf-placeholder);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wf-text-secondary);
  font-size: 0.875rem;
  aspect-ratio: 16/9;
}

/* Annotation callout */
.wf-annotation {
  border-left: 3px solid var(--wf-annotation);
  padding-left: 8px;
  color: var(--wf-annotation);
  font-size: 0.75rem;
  font-style: italic;
}
```

### Step 4: Annotate

Wireframes need annotations. These explain the "why" that the visual can't communicate.

**What to annotate:**
- **Interaction behavior:** "Dropdown on click, not hover" / "Infinite scroll loads 20 items at a time"
- **Content rules:** "Truncate after 2 lines" / "Show 3 most recent"
- **Conditional content:** "Only visible for admin users" / "Hidden when cart is empty"
- **Responsive notes:** "Collapses to accordion on mobile" / "Image hidden below 640px"

**Annotation format:** Blue left-border callout below or beside the annotated element. Short, specific, actionable.

### Step 5: Show Content Hierarchy

Even in grayscale, hierarchy must be clear:
- **Large, bold text** for primary headings
- **Medium text** for secondary headings
- **Regular text** for body content
- **Small, gray text** for metadata and labels
- **Bordered boxes** for interactive elements (buttons, inputs)
- **Gray rectangles** for image placeholders (with aspect ratio and label)

Use realistic content labels, not "Heading 1" / "Body Text." Instead: "Product Name" / "Price" / "Add to Cart."

### Step 6: Output

Self-contained HTML file in grayscale with annotations.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wireframe: [Page Name]</title>
  <style>
    /* Wireframe styles (grayscale only) */
    /* ... */
  </style>
</head>
<body>
  <header>
    <!-- Navigation wireframe -->
  </header>
  <main>
    <!-- Content sections with annotations -->
  </main>
  <footer>
    <!-- Footer wireframe -->
  </footer>
</body>
</html>
```

## Quality Gates

- [ ] Grayscale only (no brand colors, no decoration)
- [ ] System font only (no custom fonts loaded)
- [ ] Content inventory documented with priority tiers
- [ ] Layout pattern selected with rationale
- [ ] Annotations present for interaction behavior and conditional content
- [ ] Hierarchy is clear even without color (Squint Test)
- [ ] Responsive behavior noted in annotations
- [ ] Content labels are realistic (not "Lorem ipsum" or "Heading 1")
- [ ] Image placeholders show aspect ratio and purpose label
