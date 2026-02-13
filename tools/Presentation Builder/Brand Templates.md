# Brand Templates

Create and maintain brand templates for Presentation Builder. A brand template is a complete, working presentation that serves as the starting point for all presentations using that brand.

**Use when:** User wants to create a new brand template, edit an existing template, add CSS utilities, update styling, or improve template slides
**Route to `AGENTS.md` when:** User wants to create an actual presentation

## Core Concept

A brand template IS a presentation. You can double-click it to preview. What you see is exactly what new presentations will look like. This eliminates translation bugs and makes templates easy to verify.

## Template Structure

```
/path/to/brand/
  AGENTS.md                  # Routes agents to Presentation Builder
  Template.html              # Complete working presentation
  Template Assets/           # All assets the HTML needs
    reveal.js                # reveal.js runtime
    reveal.css, reset.css    # Core styles
    theme.css                # Base reveal.js theme
    brand.css                # Brand overrides (colors, fonts, layouts)
    logo.png, etc.           # Logo files
  brand.yaml                 # Optional metadata
  theme.css                  # Source file for brand.css
```

## Creating a Brand Template

### Option A: From Scratch

1. Run scaffold script:
```bash
node scripts/create-brand.js --path /path/to/brand --name "Brand Name" --primary "#hex" --dark
```

2. Add logo files to the assets folder

3. Customize `theme.css` with brand styling

4. Edit the generated HTML to create representative slides

5. Double-click to verify it renders correctly

### Option B: From Existing Presentation

1. Take a finished presentation you like

2. Replace the title with `{{TITLE}}` placeholder

3. Clean up slides to be representative examples, not specific content

4. Rename to `Template.html` and `Template Assets/`

5. Double-click to verify

## Template HTML Requirements

**Title placeholder:** Use `{{TITLE}}` where the presentation title should appear. The script replaces this when creating new presentations.

**Asset references:** All paths must use the template's assets folder name:
```html
<link rel="stylesheet" href="Template Assets/brand.css">
<img src="Template Assets/logo.png">
```

**Slide markers:** Keep the markers so the AI knows where to edit:
```html
<!-- SLIDES START -->
<section>...</section>
<!-- SLIDES END -->
```

**Representative slides:** Include examples of slide types the brand uses:
- Cover slide with branding
- Section dividers with brand gradient
- Content slides (bullets, tables, metrics)
- Closing slide

## Brand CSS (brand.css)

The CSS file defines what's possible. When generating slides, the AI reads this to understand available classes.

### Required Overrides

```css
:root {
  --r-heading-font: 'Brand Font', sans-serif;
  --r-heading-color: #brand-primary;
  --r-main-font: 'Body Font', sans-serif;
  --r-main-color: #text-color;
  --r-link-color: #accent;
}
```

### Standard Utility Classes

Include these in brand.css (the AI expects them):

```css
/* Brand colors */
.brand-primary { color: #primary; }
.brand-secondary { color: #secondary; }
.brand-accent { color: #accent; }
.bg-brand-primary { background-color: #primary; color: #contrast; }

/* Layouts */
.columns { display: flex; gap: 2em; }
.col { flex: 1; }

.metrics { display: flex; justify-content: center; gap: 4em; }
.metric { text-align: center; }
.metric .number { font-size: 2.5em; font-weight: bold; }
.metric .label { font-size: 0.5em; opacity: 0.6; }

/* Text helpers */
.attribution { font-size: 0.45em; opacity: 0.5; }
.text-muted { color: #muted; }
.section-slide h1, .section-slide h2, .section-slide p { color: #fff; }
```

### Adding Custom Layouts

When the user needs a layout the template doesn't support:

1. Add CSS to `brand.css`
2. Add an example slide to the template HTML
3. Verify it renders correctly
4. Document the class in a comment

Example:
```css
/* Three-column layout */
.columns-3 { display: flex; gap: 1.5em; }
.columns-3 .col { flex: 1; }
```

## Brand-Specific Elements

### Logo Overlay (bottom-right corner)

```html
<div class="brand-overlay">
  <img src="Template Assets/logo-small.png" alt="Brand">
</div>
```

```css
.brand-overlay {
  position: fixed;
  bottom: 16px;
  right: 24px;
  z-index: 100;
  pointer-events: none;
}
.brand-overlay img { height: 28px; opacity: 0.5; }
```

### Cover Slide Branding

```html
<section>
  <div class="cover-brand">
    <img src="Template Assets/logo.png" class="cover-logo" alt="">
  </div>
  <h1>{{TITLE}}</h1>
  <p class="attribution">Brand Name | [Author] | [Date]</p>
</section>
```

### Section Dividers

```html
<section class="section-slide" data-background-gradient="linear-gradient(135deg, #primary 0%, #secondary 100%)">
  <h2>Section Title</h2>
</section>
```

## Improving Templates

When improvements are made to a presentation, consider backporting to the template:

1. **New CSS utility needed?** Add to brand.css
2. **Better slide layout discovered?** Update example in template
3. **Styling tweak looks better?** Update CSS variables

After changes, always double-click template to verify it still works.

## Testing a Template

1. Double-click the template HTML. Does it render?
2. Check all slides. Do logos appear? Colors correct?
3. Create a test presentation from it:
```bash
node scripts/create-project.js --path /tmp/test --title "Test" --template /path/to/Template.html
```
4. Double-click the test presentation. Same as template?
5. Delete test when done.

## Scripts

### create-brand.js

Scaffold a new brand template:

```bash
node scripts/create-brand.js --path /path/to/brand --name "Brand" [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--path` | Brand directory | required |
| `--name` | Brand name | required |
| `--primary` | Primary color | #2563eb |
| `--secondary` | Secondary color | #7c3aed |
| `--accent` | Accent color | #06b6d4 |
| `--dark` | Dark theme | false |

This creates a starting point. You must customize it.

## Template AGENTS.md

Include a lightweight AGENTS.md in the template folder. This prevents agents from editing the template directly when users drag it into context.

```markdown
# [Brand] Presentation Template

This is a brand template for Presentation Builder. Do not edit directly.

**To build a presentation:** Read and follow `/cofounder/tools/Presentation Builder/AGENTS.md`

The workflow will:
1. Ask where to save the new presentation
2. Copy this template to that location
3. Rename the files appropriately
4. Then edit the copy (never this template)

**To edit this template:** Read and follow `/cofounder/tools/Presentation Builder/Brand Templates.md`
```

## Checklist: New Brand Template

- [ ] AGENTS.md routes to Presentation Builder
- [ ] Template HTML renders when double-clicked
- [ ] `{{TITLE}}` placeholder in title
- [ ] All asset paths use template folder name
- [ ] Logo files in assets folder
- [ ] brand.css has color variables set
- [ ] brand.css has standard utility classes
- [ ] Cover slide shows branding
- [ ] Section dividers use brand gradient
- [ ] At least 3-4 representative slide types included
- [ ] Logo overlay appears on all slides (if desired)
- [ ] Test presentation created and verified
