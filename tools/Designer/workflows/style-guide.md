# Workflow: Style Guide

## Purpose

Generate a visual HTML document that demonstrates and documents a design system. The style guide is the reference that designers and developers use to build consistently. It shows the tokens in action, not just as a list.

## When to Use

- After creating a design system (design-system workflow) to document it
- When a project needs a living reference for its visual language
- When onboarding new team members to a project's design patterns

## Inputs

- Complete design tokens (from DESIGN.md or design-system workflow output)
- Component designs (from component workflow, if any exist)
- Brand context and personality notes

## Process

### Step 1: Structure the Guide

The style guide is a single HTML page with anchor-linked sections:

1. **Overview** - Visual identity summary, personality, key principles
2. **Color** - Palette swatches with names, values, roles, and contrast notes
3. **Typography** - Type specimen showing all scale levels, weights, and line heights
4. **Spacing** - Visual demonstration of the spacing scale
5. **Components** - Each component with all its variants and states
6. **Patterns** - Common layouts and compositions

### Step 2: Build the Color Section

Display each color as a swatch with its information:

```html
<div class="color-swatch" style="background: var(--color-primary-500)">
  <span class="swatch-name">Primary 500</span>
  <span class="swatch-value">oklch(55% 0.22 250)</span>
  <span class="swatch-hex">#3366cc</span>
  <span class="swatch-role">CTAs, active states, key actions</span>
</div>
```

**Organization:**
- Group by role (Primary scale, Neutral scale, Semantic, Surfaces)
- Show the full scale for primary and neutral (all 10+ steps)
- Show contrast pairings: text on each background color with pass/fail indicator

### Step 3: Build the Typography Section

Show each type level rendered with the actual fonts:

```html
<div class="type-specimen">
  <p class="type-label">Display (1.953rem / 700)</p>
  <p class="type-display">The quick brown fox jumps over the lazy dog</p>
</div>
```

**Include:**
- Each scale level with size, weight, line height, and letter spacing
- Font family names and weights loaded
- A paragraph of body text showing line height and measure (line length)
- Heading + body text together showing vertical rhythm

### Step 4: Build the Spacing Section

Visual demonstration of each spacing value:

```html
<div class="spacing-demo">
  <div class="spacing-block" style="width: var(--space-4); height: var(--space-4)"></div>
  <span>space-4: 1rem (16px)</span>
</div>
```

Show spacing values as colored blocks at each size. Include the usage guidance from the design system.

### Step 5: Build the Component Section

For each component in the design system:
- Render the component in its default state
- Show all variants side by side
- Show all interactive states
- Include the HTML code for each variant

```html
<div class="component-example">
  <h3>Button</h3>
  <div class="example-row">
    <button class="btn-primary">Primary</button>
    <button class="btn-secondary">Secondary</button>
    <button class="btn-ghost">Ghost</button>
  </div>
  <details>
    <summary>Code</summary>
    <pre><code>&lt;button class="btn-primary"&gt;Label&lt;/button&gt;</code></pre>
  </details>
</div>
```

### Step 6: Style the Guide Itself

The style guide should practice what it documents. Use the project's own design tokens to style the guide page. This proves the tokens work and keeps the guide visually consistent with the project.

**Guide-specific additions:**
- Sidebar navigation with anchor links to each section
- Section dividers between major groups
- Code blocks with syntax-appropriate styling
- A "Copy" affordance near token values

### Step 7: Output

Single self-contained HTML file with all styles and fonts inlined or CDN-linked.

The file should be immediately browsable: double-click to open, no build step required.

## Quality Gates

- [ ] All color tokens displayed as swatches with values and roles
- [ ] All type levels demonstrated with actual fonts
- [ ] Spacing scale visualized
- [ ] Components shown with all variants and states
- [ ] HTML code examples included for components
- [ ] Guide uses the project's own design tokens
- [ ] Navigation between sections works (anchor links)
- [ ] File is self-contained and opens in browser by double-clicking
- [ ] Contrast pairings shown with WCAG pass/fail indicators
