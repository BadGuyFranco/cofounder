# Domain: Brand Identity

## Purpose and Scope

Design guidance for building visual identity systems: the color, typography, spacing, and personality rules that define how a brand looks and feels across all touchpoints. This domain covers the systematic visual identity, not logo design or brand strategy.

This domain extends the universal principles in AGENTS.md with brand-specific techniques. Load AGENTS.md first; this file adds to it.

## Target Specifications

**Stack:** CSS custom properties, DESIGN.md, style guide HTML
**Rendering context:** Cross-platform (web, email, documents, presentations)
**Audience context:** The people building things for the brand. They need clear, specific rules they can follow without guessing.

## What Brand Identity Design Covers

| In Scope | Out of Scope |
|----------|-------------|
| Color palette with usage rules | Logo design (iterative human process) |
| Typography system with pairing | Brand strategy (positioning, voice, values) |
| Spacing and layout principles | Marketing copy or messaging |
| Visual personality definition | Photography direction (art direction) |
| Component styling guidelines | Motion graphics or video style |
| Dark mode / theme variants | Print production specs |
| DESIGN.md system output | Figma/Sketch component libraries |

## Brand Personality Axes

Every brand occupies positions on these axes. Define them before making visual decisions.

| Axis | Left | Right |
|------|------|-------|
| Tone | Playful | Serious |
| Energy | Calm | Dynamic |
| Approach | Approachable | Exclusive |
| Density | Spacious | Compact |
| Expression | Restrained | Bold |
| Warmth | Cool | Warm |

**How to use:** Rate the brand on each axis (e.g., "Serious but approachable, calm, spacious, moderately bold, warm"). These positions directly inform visual choices:

| Personality Trait | Color | Typography | Spacing | Border Radius |
|-------------------|-------|-----------|---------|---------------|
| Playful | Saturated, warm, varied | Rounded sans, loose tracking | Generous, uneven | 12-16px |
| Serious | Desaturated, cool, restrained | Geometric sans or serif, tight | Structured, even | 2-6px |
| Bold | High contrast, saturated primary | Heavy weights, large display | Dramatic, asymmetric | Varies (commit to a direction) |
| Restrained | Low contrast, muted palette | Light-medium weights, moderate display | Even, generous | 4-8px |
| Warm | Warm hues (red, orange, yellow), tinted neutrals | Humanist sans or serif | Comfortable, not tight | 8-12px |
| Cool | Cool hues (blue, green, purple), blue-tinted neutrals | Geometric sans | Clean, precise | 4-8px |

### Defining Personality

Ask the user to describe the brand in 3-5 adjectives. Map those to axis positions. If they can't articulate it, use comparison:

> "Which of these products feels closest to the vibe you want?"
> - Apple (restrained, premium, cool)
> - Notion (clean, approachable, calm)
> - Stripe (confident, technical, cool)
> - Mailchimp (playful, warm, approachable)
> - Linear (dense, precise, serious)

The comparison reveals personality faster than abstract axis sliders.

## Color for Brand

### Primary Color Selection

The primary color IS the brand in most people's memory. Choose with intention.

**Color-personality associations:**

| Hue Range | Associations | Industries |
|-----------|-------------|-----------|
| Blue (220-260) | Trust, reliability, competence | Finance, enterprise, healthcare |
| Green (130-170) | Growth, health, sustainability | Fintech, wellness, environmental |
| Purple (270-310) | Creativity, premium, wisdom | Design tools, luxury, education |
| Red (350-20) | Energy, urgency, passion | Media, food, entertainment |
| Orange (20-50) | Optimism, accessibility, action | SaaS, community, e-commerce |
| Yellow (50-80) | Warmth, clarity, caution | Consumer apps, communication |
| Teal (175-210) | Balance, calm, modernity | Productivity, analytics |

These are tendencies, not rules. A financial product can be orange if the brand is deliberately unconventional. State the reasoning.

### Extended Palette

Beyond the primary, a brand palette typically includes:

| Role | Selection Method |
|------|-----------------|
| Primary | From brand personality and industry |
| Accent | Complementary or analogous hue for emphasis (not just "a second color") |
| Neutral | Tinted toward primary hue |
| Semantic | Standard (green/red/amber/blue) adjusted to harmonize with primary |

The accent color should have a clear job. Common jobs: highlighting new features, marking premium content, distinguishing secondary actions from primary. If you can't name the accent color's job, you don't need one.

## Typography for Brand

### Font as Personality

Typography carries more brand personality than color. The font IS the voice.

**Selection by brand personality:**

| Brand Personality | Font Characteristics | Examples |
|-------------------|---------------------|----------|
| Professional, authoritative | Serif or geometric sans, even weight distribution | Source Serif 4, Instrument Sans |
| Friendly, approachable | Humanist sans, open counters, round terminals | Plus Jakarta Sans, Nunito Sans |
| Technical, precise | Geometric sans, even spacing, clean geometry | Outfit, Urbanist |
| Creative, distinctive | Display serif or unconventional sans | Fraunces, Cabinet Grotesk |
| Premium, luxury | High-contrast serif or elegant sans | Newsreader, Satoshi |

### Brand Typography Rules

The DESIGN.md should capture:
- Primary font family and when to use it (all text, or headlines only)
- Secondary font family (if any) and when to use it
- Weights permitted (e.g., "Only use 400, 600, and 700; never use 300 or 800")
- Minimum sizes per context (web body: 16px, mobile body: 16px, captions: 12px)
- What the brand typography should NEVER look like (specific anti-patterns)

## Applying the Brand System

### Multi-Platform Consistency

The design system must work across contexts:

| Context | Adaptation |
|---------|-----------|
| Web app | Full system, all tokens |
| Marketing site | Higher-intensity version (bigger type, more color, more space) |
| Email | System fonts fallback, color palette, simplified spacing |
| Documents | Brand fonts if available, color for headings and accents only |
| Presentations | Display typography, brand colors, generous spacing |

Each context uses the same palette and fonts but at different intensity levels.

### DESIGN.md Output

For brand identity work, the DESIGN.md is the primary deliverable. It should capture:

1. **Personality statement** - The axes positions and why
2. **Color system** - Full palette with roles, OKLCH values, usage rules
3. **Typography system** - Fonts, scale, weights, usage rules
4. **Spacing philosophy** - Dense or spacious, and the token scale
5. **Component styling** - Border radius, shadows, borders
6. **Prohibited patterns** - What this brand should never look like
7. **Application rules** - How to adapt intensity per context

## Quality Gates

**Mandatory checks (from AGENTS.md):**
- [ ] Squint Test passes
- [ ] Prohibited Defaults scan passes
- [ ] Spacing has rhythm
- [ ] Color palette has defined roles
- [ ] Typography limited to 2-3 families

**Domain-specific checks:**
- [ ] Brand personality defined on at least 3 axes
- [ ] Primary color selection has stated rationale connecting to personality
- [ ] Font selection has stated rationale connecting to personality
- [ ] DESIGN.md captures all system rules
- [ ] System works across at least 2 contexts (web + one other)
- [ ] Prohibited patterns specific to this brand are documented
- [ ] Accent color (if used) has a defined job

## Common Failure Modes

**Generic "modern" identity:** Blue primary, geometric sans, 8px radius, drop shadows. This describes 80% of SaaS brands. Fix: make at least one bold, specific choice that wouldn't work for most other brands. A distinctive font, an unusual primary hue, an extreme personality position.

**Inconsistent application:** The system exists but every page interprets it differently. Fix: the DESIGN.md must include specific enough rules that two different agents building from it would produce visually consistent output.

**All-or-nothing palette:** Only using the primary color or not using it at all. Fix: define specific usage rules (primary for CTAs and active states, neutral for everything else, accent for highlights). The palette should feel balanced, not monochrome or chaotic.
