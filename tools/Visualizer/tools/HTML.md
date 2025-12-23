# HTML Tool

Renders visualizations as interactive HTML files with CSS styling and minimal JavaScript for interactivity.

## Overview

HTML is the primary output tool for all visualization techniques. It provides:
- Full control over styling and layout
- Moderate interactivity (expand/collapse, hover, zoom)
- Browser-based testing and iteration
- No external dependencies

## Output Format

Single HTML file containing:
- Inline CSS (no external stylesheets)
- Inline JavaScript (no external scripts)
- Self-contained and portable

## File Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Visualization Title]</title>
    <style>
        /* All CSS here */
    </style>
</head>
<body>
    <!-- Visualization structure here -->
    
    <script>
        /* Interactivity JavaScript here */
    </script>
</body>
</html>
```

## Styling Principles

### Color Palette

Use a cohesive palette. Define CSS variables:

```css
:root {
    --primary: #2563eb;
    --primary-light: #3b82f6;
    --secondary: #64748b;
    --background: #ffffff;
    --surface: #f8fafc;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --accent-1: #10b981;
    --accent-2: #f59e0b;
    --accent-3: #ef4444;
    --accent-4: #8b5cf6;
}
```

**Category colors:** Use accent colors consistently for categories across the visualization.

### Typography

```css
body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: var(--text);
}

.node-label {
    font-weight: 500;
}

.detail-text {
    font-size: 14px;
    color: var(--text-muted);
}
```

### Spacing and Layout

Use consistent spacing units:

```css
:root {
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
}
```

### Visual Hierarchy

- **Primary elements:** Larger, bolder, primary color
- **Secondary elements:** Medium size, secondary color
- **Tertiary elements:** Smaller, muted color
- **Interactive elements:** Hover states, cursor changes

## Interactivity Patterns

### Expand/Collapse

```html
<div class="collapsible">
    <div class="collapsible-header" onclick="toggleCollapse(this)">
        <span class="collapse-icon">▶</span>
        <span class="header-text">Section Title</span>
    </div>
    <div class="collapsible-content" style="display: none;">
        <!-- Hidden content -->
    </div>
</div>
```

```javascript
function toggleCollapse(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.collapse-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}
```

### Hover Tooltips

```html
<div class="node" data-tooltip="Full description text here">
    <span class="node-label">Brief Label</span>
</div>
```

```css
.node {
    position: relative;
    cursor: pointer;
}

.node::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-sm) var(--space-md);
    background: var(--text);
    color: var(--background);
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
    z-index: 100;
}

.node:hover::after {
    opacity: 1;
    visibility: visible;
}
```

### Zoom Controls

```html
<div class="zoom-controls">
    <button onclick="zoomIn()">+</button>
    <button onclick="zoomOut()">−</button>
    <button onclick="resetZoom()">Reset</button>
</div>
<div id="visualization" class="zoomable">
    <!-- Content -->
</div>
```

```javascript
let currentScale = 1;
const zoomStep = 0.1;
const minScale = 0.5;
const maxScale = 2;

function zoomIn() {
    if (currentScale < maxScale) {
        currentScale += zoomStep;
        applyZoom();
    }
}

function zoomOut() {
    if (currentScale > minScale) {
        currentScale -= zoomStep;
        applyZoom();
    }
}

function resetZoom() {
    currentScale = 1;
    applyZoom();
}

function applyZoom() {
    document.getElementById('visualization').style.transform = `scale(${currentScale})`;
}
```

### Highlight on Hover

```css
.node:hover {
    background: var(--primary-light);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.connection:hover {
    stroke: var(--primary);
    stroke-width: 3px;
}
```

## Technique-Specific Patterns

### Hierarchy (Tree)

Use nested divs with indentation:

```html
<div class="tree">
    <div class="tree-node level-0">
        <div class="node-content">Root</div>
        <div class="children">
            <div class="tree-node level-1">
                <div class="node-content">Child 1</div>
            </div>
            <div class="tree-node level-1">
                <div class="node-content">Child 2</div>
            </div>
        </div>
    </div>
</div>
```

### Flow (Diagram)

Use SVG for connections, divs for nodes:

```html
<div class="flow-diagram">
    <svg class="connections">
        <line x1="100" y1="50" x2="100" y2="100" />
        <polygon points="95,95 100,105 105,95" /> <!-- Arrow -->
    </svg>
    <div class="flow-node" style="top: 20px; left: 60px;">Start</div>
    <div class="flow-node" style="top: 120px; left: 60px;">Step 1</div>
</div>
```

### Concept Map

Use SVG for the entire visualization:

```html
<svg class="concept-map" viewBox="0 0 800 600">
    <!-- Connections first (behind nodes) -->
    <g class="connections">
        <line x1="200" y1="300" x2="400" y2="200" />
        <text x="300" y="240" class="connection-label">enables</text>
    </g>
    <!-- Nodes on top -->
    <g class="nodes">
        <g class="node" transform="translate(200, 300)">
            <rect x="-50" y="-20" width="100" height="40" rx="5" />
            <text>Concept A</text>
        </g>
    </g>
</svg>
```

### Matrix

Use CSS Grid:

```html
<div class="matrix-2x2">
    <div class="axis-label y-axis">Dimension Y →</div>
    <div class="axis-label x-axis">Dimension X →</div>
    <div class="quadrant q1">Quadrant 1</div>
    <div class="quadrant q2">Quadrant 2</div>
    <div class="quadrant q3">Quadrant 3</div>
    <div class="quadrant q4">Quadrant 4</div>
</div>
```

```css
.matrix-2x2 {
    display: grid;
    grid-template-columns: 40px 1fr 1fr;
    grid-template-rows: 1fr 1fr 40px;
    gap: 2px;
    width: 600px;
    height: 400px;
}
```

## Testing

After generating HTML:

1. Save the file with `.html` extension
2. Open in browser using browser tools
3. Test all interactive elements:
   - Expand/collapse works
   - Hover tooltips appear
   - Zoom controls function
   - Layout responds correctly

## Output Location

Save generated visualizations to:
- User-specified location, or
- Same directory as source content with `[Source Name] Visualization.html`

## Troubleshooting

**Tooltips cut off:** Add `overflow: visible` to parent containers

**Zoom breaks layout:** Ensure transform-origin is set appropriately

**Expand/collapse not working:** Check JavaScript is not blocked; verify onclick handlers

**SVG not rendering:** Verify viewBox dimensions match content

**Colors inconsistent:** Use CSS variables throughout

