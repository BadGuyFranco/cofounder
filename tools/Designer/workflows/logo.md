# Workflow: Logo Design

## Purpose

Create a logo through structured exploration: brand brief to moodboard to concept generation to refinement to final delivery. This is the most iterative workflow in Designer, heavily routing to Image Generator for AI-generated concepts and relying on prompt engineering to translate brand direction into visual output.

## When to Use

- Creating a logo for a new brand, product, or project
- Refreshing or evolving an existing logo
- Exploring logo concepts before committing to a professional designer

## Honest Capabilities

**What this workflow does well:**
- Generating 20-50 concept directions in minutes (vs days with a human designer)
- Producing clean SVG logos via Recraft V4 on Replicate
- Producing logos with accurate text via Ideogram V3
- Translating brand personality into structured prompts that produce on-target results
- Building the logo usage system (color variants, size rules, lockups, guidelines)

**Where it struggles:**
- Precise iterative refinement ("make this 10% bolder" changes everything)
- Mathematical symmetry (close but never pixel-perfect)
- Complex illustrative marks (mascots, detailed emblems)
- Consistency across regenerations (each generation is a new roll)

**The practical expectation:** This workflow produces strong concepts and often a final logo for MVPs, startups, and side projects. For brands that demand perfection, it accelerates exploration and the final mark may need manual refinement in a vector editor.

## Inputs

- Brand personality from Phase 2 Direction (or gathered here)
- Company/product name
- Industry/domain
- Any existing brand constraints (colors, aesthetic direction)

## Process

### Phase 1: Logo Brief

Gather the information that drives every prompt. If Designer's Phase 1 (Brief) and Phase 2 (Direction) are already complete, pull from those. Otherwise, gather now.

**Required:**

| Question | Why It Matters |
|----------|---------------|
| Company/product name | Determines wordmark text and length constraints |
| What does the company do? (one sentence) | Informs symbol concepts and industry conventions |
| Who is the audience? | Determines formality, approachability, aesthetic register |
| Name 2-3 brands whose visual identity you admire | Fastest path to understanding desired aesthetic |
| What should the logo NOT look like? | Avoidance criteria are often clearer than aspirational ones |

**Personality mapping** (from Phase 2 Direction or gathered now):
- Playful ... Professional
- Bold ... Restrained
- Warm ... Cool
- Geometric ... Organic
- Simple ... Detailed

**Color direction:**
- If the brand has established colors: use them
- If not: reference `workflows/color-palette.md` Phase 2 Direction for hue-personality mapping
- For logo generation, limit to 2-3 colors maximum. Simpler logos are more versatile.

### Phase 2: Logo Type Selection

Different logo types serve different purposes. Recommend a type based on the brief, but present options.

| Type | What It Is | Best When | Example |
|------|-----------|-----------|---------|
| Wordmark | Company name as the logo | Name is short (1-2 words), distinctive, or invented | Google, Stripe, Supreme |
| Lettermark | Initials or monogram | Name is long, initials are distinctive | IBM, HBO, CNN |
| Symbol/Icon | Standalone pictorial or abstract mark | Brand is well-known enough to stand without text | Apple, Nike, Target |
| Combination Mark | Icon + wordmark together | New brands needing both recognition and name | Adidas, Spotify, Slack |
| Emblem | Text integrated into a symbol/badge | Traditional, authoritative, institutional feel | Starbucks, Harley-Davidson |

**Default recommendation:** Combination Mark for new brands (icon + name gives maximum flexibility). The icon can separate from the wordmark later as recognition grows.

**Wordmarks are underrated.** A company name set in a distinctive font with intentional letterspacing is a legitimate, professional logo. Many strong brands use pure wordmarks. If the name is distinctive, recommend this first.

### Phase 3: Concept Exploration

Generate 20-30 concepts across the chosen logo type(s). This is where prompt engineering matters.

**Prompt structure:**

```
[Logo type] logo for "[Company Name]", [symbol/concept description],
[industry context], [color palette], [personality adjectives],
flat vector logo, white background, no gradients, no shadows,
no 3D effects, centered composition, clean negative space, minimalist
```

**The technical tail matters.** Always append: `flat vector logo, white background, no gradients, no shadows, no 3D effects, centered composition, clean negative space, minimalist`. Without these, models default to photorealistic, textured, or overly decorated output.

#### Prompt Templates by Logo Type

**Wordmark:**
```
Modern wordmark logo for "[Company Name]", clean [serif/sans-serif]
typography, [weight: bold/light/medium] letterforms, [personality]
aesthetic, [primary color] on white background, flat vector,
no icon, no emblem, no gradients, no decorative elements
```

**Lettermark/Monogram:**
```
Monogram logo using letters "[X]" and "[Y]", [geometric/organic]
design, [symmetrical/asymmetrical] composition, [personality]
aesthetic, [color scheme], flat vector, white background,
no gradients, clean negative space
```

**Symbol/Icon:**
```
Flat vector icon logo, minimalist [concept: e.g., "mountain peak",
"rising arrow", "connected nodes"], simple geometric shapes,
[2-3 named colors], white background, no gradients, no text,
icon only, clean edges, centered composition
```

**Combination Mark:**
```
Combination logo mark, [concept] icon paired with "[Company Name]"
wordmark, [personality] aesthetic, [color palette], modern layout,
flat vector, white background, no gradients, clean negative space,
balanced proportions between icon and text
```

**Emblem:**
```
Emblem style logo, [circular/shield/badge] design, "[Company Name]"
text integrated into [border/banner/frame], [central symbol concept],
[vintage/modern/classic] aesthetic, [limited color palette],
flat vector, clean lines, no gradients
```

#### Generation Strategy

**Round 1 - Wide exploration (15-20 images):**
Generate 3-4 variations for each of 4-5 different concept directions. Vary the symbol concept, not just the style. For example, for a fintech startup: "rising arrow", "shield", "connected nodes", "abstract letter", "coin/circle motif".

**Model selection:**
- **Recraft V4 SVG** (`recraft-ai/recraft-v3-svg` on Replicate): Default choice. Native SVG output. Best for icons, symbols, and geometric marks.
- **Ideogram V3** (on Replicate): Use when the logo includes text (wordmarks, combination marks). Best text rendering accuracy (~90-95%).
- **Flux** (`black-forest-labs/flux-1.1-pro` on Replicate): Fast and cheap for rapid concept exploration. Use for Round 1 brainstorming, not final output.

**Route to Image Generator** for all generation. Use the async workflow (start + wait) for models that take longer than 30 seconds.

**Present concepts to user** in groups by direction, not as a flat grid. Label each direction:
> **Direction A: Geometric abstraction** (4 concepts)
> **Direction B: Letterform play** (4 concepts)
> **Direction C: Symbolic mark** (4 concepts)

### Phase 4: Narrow and Refine

User picks 1-3 favorite directions. Generate 10-15 more concepts focused on those directions.

**Refinement prompting:**
- Add more specific adjectives from the chosen direction
- Reference the specific elements the user liked ("like concept A3 but with more angular shapes")
- Try color variations of the same concept
- Try the concept at different levels of complexity (simpler vs more detailed)

**Style reference** (if using Ideogram V3): Upload the user's favorite concept as a style reference to generate variations that maintain the same aesthetic.

**Image-to-image** (where available): Use the best concept as an input with 0.3-0.5 strength to generate variations that maintain structure while exploring style.

**This phase is inherently imprecise.** Each generation is a new roll. Set the expectation: "We're converging on a direction. Exact control comes in the next phase."

### Phase 5: Finalize

User selects the single best logo. Now validate and build the system around it.

**Size testing:**
Generate or resize the logo at multiple sizes to verify it reads well:
- Favicon: 32x32px
- App icon: 128x128px
- Social avatar: 400x400px
- Header: natural size
- Large: hero/billboard scale

If details are lost at small sizes, the logo needs simplification.

**Color variant generation:**
Create the logo in required variants. If the original is raster, these may need manual creation or re-prompting:
- Full color on white background
- Full color on dark background
- Single color (black on white)
- Single color (white on dark)
- Monochrome grayscale

For Recraft SVG output: modify the SVG code directly to create color variants.

**Background testing:**
Place the logo on:
- White
- Black
- Brand primary color
- A photograph (to test overlay use)

### Phase 6: Logo System

Build the usage guidelines. This is where Designer adds value beyond Image Generator alone.

**Deliver:**

1. **Logo files** - The final logo in all color variants
2. **Clear space rules** - Minimum padding around the logo (typically the height of one letter in the wordmark, or 50% of the icon height)
3. **Minimum size** - The smallest the logo should appear (based on Phase 5 size testing)
4. **Color specifications** - OKLCH, hex, and RGB values for each color in the logo
5. **Usage rules** - What not to do (stretch, rotate, recolor, add effects, place on busy backgrounds)
6. **Lockup variations** - If combination mark: horizontal lockup, stacked lockup, icon-only, wordmark-only

**Output as a section in DESIGN.md** (if building a full brand system) or as a standalone `logo-guidelines.md`.

## Prompt Quality Checklist

Before sending any prompt to Image Generator:
- [ ] Logo type specified (wordmark, lettermark, symbol, combination, emblem)
- [ ] Company name in quotes (for text-containing logos)
- [ ] Symbol/concept described concretely (not "something creative")
- [ ] Color palette specified (2-3 colors max)
- [ ] Personality adjectives included (from the brief)
- [ ] Technical tail appended (flat vector, white background, no gradients, no shadows, no 3D, centered, minimalist)
- [ ] Negative constraints included where model supports them

## Model Selection Guide

| Scenario | Model | Why |
|----------|-------|-----|
| Default for all logo types | Recraft V4 SVG | Native vector output, clean geometry, good text |
| Wordmarks and text-heavy logos | Ideogram V3 | Best text rendering accuracy |
| Fast brainstorming (Round 1) | Flux 1.1 Pro | Fast, cheap, good for exploring many directions |
| Artistic/stylized concepts | Midjourney (if available) | Best aesthetic quality, but no API and weak text |

## Vectorization

If the final logo is raster (not from Recraft SVG):

**For simple 1-2 color logos:**
Use Potrace (open source CLI). Produces clean paths with minimal cleanup.

**For multi-color logos:**
Use VTracer (open source CLI, Rust-based). Handles full color.

**For best quality:**
Vectorizer.AI (commercial API). Cleanest output, handles gradients and complex shapes.

**Route to Image Generator** for any rendering or conversion steps.

## Quality Gates

- [ ] Logo brief completed (name, industry, audience, personality, references)
- [ ] Logo type selected with rationale
- [ ] At least 15 concepts explored across 3+ directions
- [ ] User selected a final direction (not the designer choosing for them)
- [ ] Size testing completed (favicon to large)
- [ ] Color variants created (full color, single color, reversed)
- [ ] Background testing completed (white, dark, color, photo)
- [ ] Clear space and minimum size rules defined
- [ ] Usage guidelines documented
- [ ] Intentional Choice Check: rationale connecting the final logo to the brand personality from the brief

## Limitations

- Cannot make precise small adjustments to a near-final design (each regeneration changes everything)
- Text accuracy is ~90-95% at best; always verify spelling in generated output
- Symmetry is approximate, not mathematical; may need manual correction for perfectionist clients
- Complex illustrative marks (mascots, detailed scenes) are lower quality than geometric/abstract marks
- The final logo may need manual refinement in a vector editor for production-critical brands
- Cannot guarantee the generated design is unique; always check against existing trademarks
