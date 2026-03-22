# Domain: Marketing

## Purpose and Scope

Design guidance for landing pages, campaign pages, product pages, pricing pages, and marketing websites. These are persuasion environments where the design IS the impression. Users spend seconds, not hours; the design must capture attention, build trust, and guide toward action.

This domain extends the universal principles in AGENTS.md with marketing-specific techniques. Load AGENTS.md first; this file adds to it.

## Target Specifications

**Stack:** HTML, CSS, JavaScript/TypeScript, Tailwind CSS (adapt to project stack)
**Rendering context:** Browsers on all devices; mobile may be primary traffic source
**Audience context:** First-time visitors making a decision. They don't know the product; the page must earn their attention.

## Visual Intensity

**Personality:** High. The page IS the impression.
**Typography:** Expressive, distinctive, memorable. Larger scale ratios (1.333-1.618).
**Color:** Bold palette with strong brand presence. More accent usage than apps.
**Motion:** More dramatic entrances and scroll-driven interactions (but purposeful, not decorative).
**Layout:** Spacious, editorial, scroll-driven narrative.

## Layout Patterns

### Page as Narrative

Marketing pages tell a story through scroll. Each section advances the narrative:

| Beat | Section | Job |
|------|---------|-----|
| 1 | Hero | Hook: what is this and why should I care? |
| 2 | Problem | Tension: the pain point or gap |
| 3 | Solution | Resolution: how the product solves it |
| 4 | Features | Evidence: specific capabilities that deliver the solution |
| 5 | Social proof | Trust: testimonials, logos, metrics |
| 6 | Pricing (optional) | Commitment: what it costs |
| 7 | CTA | Action: clear next step |
| 8 | Footer | Utility: links, legal, secondary nav |

Not every page needs every beat. Simple pages (waitlist, launch) may only need Hero + CTA.

### Hero Section

The hero sets the tone for the entire page. Get it right.

**Required elements:**
- Headline (the core value proposition in one sentence)
- Supporting text (1-2 sentences expanding on the headline)
- Primary CTA (one clear action)
- Visual (product screenshot, illustration, or abstract brand element)

**Hero patterns:**

| Pattern | When | Layout |
|---------|------|--------|
| Split | Product has a visual interface to show | Text left, image right (desktop); stacked on mobile |
| Centered | Brand-forward, abstract product | Centered headline + CTA, full-width visual below |
| Full-bleed image | Visual product (physical goods, places) | Text overlaid on image with gradient scrim |
| Minimal | Developer tools, B2B | Centered text, no image, strong typography |

**Hero typography:** Use the Display size from the type scale. Headlines should be short (6-10 words). If the headline needs two lines, break it intentionally at a natural pause.

### Feature Sections

Avoid the identical card grid (Prohibited Default). Instead:

**Alternating layout:** Text + image, then image + text. Creates visual rhythm.

**Asymmetric grid:** Features of different importance get different visual treatment. The primary feature gets a large image and detailed description. Secondary features get compact treatment.

**Progressive disclosure:** Show the top 3 features prominently. Put the rest behind an expandable section or separate page.

### Social Proof

**Effective patterns:**
- Named testimonials with photo, name, title, company (anonymous quotes are worthless)
- Logo bars for recognizable client names (grayscale, consistent height)
- Specific metrics ("43% faster" not "significantly faster")
- Case study links for depth

**Avoid:**
- Generic praise quotes ("Great product!")
- Unnamed testimonials
- More than 6-8 logos in a row (visual noise)
- Testimonial carousels (users don't click through them)

### CTA Sections

The page should have a clear primary CTA repeated at strategic points:
- In the hero (first exposure)
- After the feature section (after understanding value)
- Before the footer (final chance)

**CTA design:**
- Button label uses verb + value ("Start free trial", "See pricing", "Get the guide")
- Primary CTA is visually dominant (brand color, large, high contrast)
- Secondary CTAs (learn more, see demo) are visually subordinate
- Never put two equally-weighted CTAs side by side

## Typography

### Scale for Marketing

Use a larger scale ratio (1.333 Perfect Fourth or 1.500 Perfect Fifth).

| Role | Size | Use |
|------|------|-----|
| Caption | 0.75rem | Legal, metadata, small labels |
| Body | 1rem-1.125rem | Paragraph text, feature descriptions |
| Lead | 1.25rem-1.5rem | Subheadlines, section intros, hero supporting text |
| Heading | 2rem-2.5rem | Section titles |
| Display | 3rem-5rem | Hero headline (fluid with clamp) |

### Font Selection

Marketing pages benefit from distinctive fonts. This is where personality matters.

**Headline + body pairing:** Use a display font for headlines and a clean sans-serif for body. The contrast creates interest.

**Weight for impact:** Use 700-900 weight for headlines. The visual mass commands attention.

**Line length:** Limit body text to 65 characters. Section descriptions on marketing pages are often too wide; constrain them with `max-width`.

## Color

### Palette Usage

Marketing pages use more color than apps. The brand should be visible.

- **Primary:** Larger presence than in apps. Hero backgrounds, section accents, CTA buttons.
- **Neutral:** Still dominant overall, but less than apps (60% vs 80%).
- **Accent:** Secondary brand color for highlights, badges, decorative elements.

### Section Background Strategy

Alternate section backgrounds to create visual separation:

| Section | Background |
|---------|-----------|
| Hero | Brand color, gradient, or full-bleed image |
| Feature 1 | White / light neutral |
| Feature 2 | Tinted neutral (light) |
| Social proof | White / light neutral |
| CTA | Brand color or dark background (high contrast with the CTA button) |
| Footer | Dark neutral |

The contrast between sections creates rhythm. Don't put two same-background sections adjacent.

### Gradients

Gradients are useful in marketing but most AI-generated gradients are bad (Prohibited Default: purple-to-blue, cyan-on-dark).

**Good gradient rules:**
- Use the brand's color family (hue shift within 30-40 degrees)
- Low-to-medium saturation (not neon)
- Subtle angle (135-180 degrees, not 45)
- Use for backgrounds, not text

## Spacing

Marketing pages are spacious. Don't fear whitespace.

| Context | Token |
|---------|-------|
| Within components | space-4 to space-6 |
| Between elements in a section | space-6 to space-8 |
| Section padding (vertical) | space-16 to space-24 |
| Between sections | space-0 (background shift handles separation) |
| Hero padding | space-24 to space-32 |

## Quality Gates

**Mandatory checks (from AGENTS.md):**
- [ ] Squint Test passes
- [ ] Prohibited Defaults scan passes
- [ ] Spacing has rhythm
- [ ] Color palette has defined roles
- [ ] Typography limited to 2-3 families

**Domain-specific checks:**
- [ ] Hero communicates value proposition in under 5 seconds
- [ ] Primary CTA is visually dominant and uses verb + value label
- [ ] Social proof uses named sources (not anonymous)
- [ ] Feature sections avoid identical card grid layout
- [ ] Section backgrounds create visual rhythm (alternating)
- [ ] Mobile layout is designed (not just desktop shrunk)
- [ ] No more than one primary CTA per viewport
- [ ] Page tells a coherent narrative from hero to footer

## Common Failure Modes

**Feature dumping:** Listing every feature with equal weight. Fix: pick 3-5 features that matter most to the target audience. Everything else is secondary.

**CTA confusion:** Multiple equally-weighted actions competing. Fix: one primary CTA per viewport. Everything else is visually subordinate.

**Stock photo dependence:** Generic team photos, handshakes, laptops-on-tables. Fix: product screenshots, custom illustrations, or strong typography without images. No image is better than a bad image.
