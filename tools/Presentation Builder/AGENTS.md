# Presentation Builder

Create professional presentations using reveal.js. Output is a self-contained folder: one HTML file and one assets subfolder. Double-click the HTML file to present in any browser. No server required.

**Use when:** User wants to create a presentation, slide deck, pitch deck, talk, or workshop slides
**Route to `Brand Templates.md` when:** User wants to create, edit, or improve a brand template

## Quick Start

```bash
# From a brand template (recommended)
node scripts/create-project.js --path /path/to/project --title "My Presentation" --template /path/to/brand/Template.html

# Without a template
node scripts/create-project.js --path /path/to/project --title "My Presentation"
```

## Process

### Step 0: Check for Brand Template

Ask: "Is this for a specific brand? If so, where is the brand template?"

Brand templates are complete, working presentations (HTML + Assets folder). If the user has one, use `--template` to copy it. If not, create a minimal starter.

### Step 1: Route the Source

Ask: "Do you have source material, or are we starting from scratch?"

**From Proposal Author:**
1. Read `Base Proposal.md`
2. Extract: Top 10 Compelling Aspects, Transformation Arc, Proof Arsenal, Objection Map, Value Framework
3. Skip to Step 3

**Standalone:**
1. Gather: topic, audience, purpose, duration
2. If source material exists, read and extract key points
3. If not, ask:
   - Core message (one sentence)
   - Audience (role, knowledge, concerns)
   - Call to action
   - Supporting evidence

### Step 2: Calibrate

Confirm or adjust:
- **Type:** Pitch, technical, educational, strategy, general
- **Duration:** Affects slide count
- **Context:** Live, screen share, PDF, self-guided
- **Tone:** Formal, conversational, technical, inspirational

Defaults: general, 15-20 min, screen share, conversational.

### Step 3: Design Structure

Load `methodology/structure.md`. Select structural arc for presentation type.

Outline as beats:
```
Beat 1: Hook (1-2 slides)
Beat 2: Problem (2-3 slides)
Beat 3: Solution (3-5 slides)
...
```

Get user approval before generating slides.

### Step 4: Generate Slides

Load `methodology/slide-design.md` for design principles.

If using a brand template, read its CSS (`brand.css`) to understand available layout classes.

**Content rules:**
- One idea per slide
- Headlines state conclusions, not topics
- Body text uses fragments, not sentences
- Speaker notes for non-trivial slides

**Pacing rules:**
- Alternate dense and sparse
- Section dividers between major beats
- Max 3 dense slides in a row

**Technical rules:**
- Each slide is a `<section>` element
- `class="fragment"` for progressive reveal
- `<aside class="notes">` for speaker notes
- `data-background-gradient` or `data-background-color` for backgrounds

### Step 5: Scaffold Project

```bash
node scripts/create-project.js --path "{path}" --title "{title}" --template "{template.html}"
```

Then write slides into the HTML between `<!-- SLIDES START -->` and `<!-- SLIDES END -->`.

### Step 6: Preview and Iterate

Tell user: Double-click the HTML file to preview.

**Keyboard:** Arrows (navigate), S (notes), F (fullscreen), Esc (overview)

Edit HTML directly based on feedback. User refreshes browser to see changes.

### Step 7: Export

```bash
node scripts/build.js --path "{path}" --pdf   # PDF
node scripts/build.js --path "{path}" --png   # PNG per slide
```

## Slide Types

| Type | HTML |
|------|------|
| Cover | `<section>` with `<h1>` and `.attribution` |
| Section divider | `<section class="section-slide" data-background-gradient="...">` |
| Content | `<section>` with `<h2>`, `<ul>`, `<p>` |
| Two columns | `<div class="columns"><div class="col">...</div><div class="col">...</div></div>` |
| Metrics | `<div class="metrics"><div class="metric"><div class="number">X</div><div class="label">Y</div></div></div>` |
| Quote | `<blockquote>` |
| Code | `<pre><code data-line-numbers="...">` |

## Reveal.js Quick Reference

**Fragment:**
```html
<li class="fragment">Appears on click</li>
```

**Speaker notes:**
```html
<aside class="notes">Notes here</aside>
```

**Background:**
```html
<section data-background-gradient="linear-gradient(135deg, #42affa, #1a6b99)">
```

**Code highlighting:**
```html
<pre><code data-trim data-line-numbers="1-3|5-8">
```

## Configuration

Edit `Reveal.initialize({...})` in the HTML:

| Option | Values | Default |
|--------|--------|---------|
| `transition` | slide, fade, convex, concave, zoom, none | slide |
| `width` | pixels | 1920 |
| `height` | pixels | 1080 |
| `slideNumber` | true/false | true |

## Resuming a Project

1. Read the presentation's HTML file to understand current slides
2. Ask what to change
3. Edit `<section>` elements between `<!-- SLIDES START -->` and `<!-- SLIDES END -->`
4. User refreshes browser to see changes

## Scripts

Scripts are in `/cofounder/tools/Presentation Builder/scripts/`.

| Script | Purpose |
|--------|---------|
| `create-project.js` | Create presentation from template |
| `build.js` | Export to PDF or PNG |
| `check-setup.js` | Verify dependencies |

## Methodology

| File | When |
|------|------|
| `methodology/structure.md` | Step 3: structural arcs |
| `methodology/slide-design.md` | Step 4: design principles |

## Pitfalls

| Problem | Solution |
|---------|----------|
| No source material | Guide through discovery questions |
| Too dense | Add section dividers, sparse slides |
| Same-looking slides | Vary types: dividers, metrics, quotes |
| Topic headlines | Rewrite as conclusions |
| Colors not applying | Check `brand.css` link in HTML head |

## Quality Checks

- [ ] One idea per slide
- [ ] Headlines are conclusions
- [ ] Pacing varies dense/sparse
- [ ] Section dividers between beats
- [ ] Speaker notes on key slides
- [ ] HTML opens by double-clicking

If unclear on any requirement, ask before proceeding.
