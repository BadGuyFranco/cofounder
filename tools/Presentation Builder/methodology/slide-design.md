# Slide Design Principles

How to design individual slides that communicate clearly and look professional. These principles apply regardless of theme or topic.

## The Fundamental Rule

One idea per slide.

If a slide requires the audience to hold two unrelated thoughts simultaneously, it is two slides. If a slide has content the audience can't absorb before you advance, it has too much.

## Visual Hierarchy

Every slide must have a clear reading order. The audience should know where to look first, second, and third without thinking about it.

**Hierarchy tools (in order of strength):**
1. Size -- Larger elements read first
2. Color/contrast -- High contrast draws the eye
3. Position -- Top-left reads first in Western audiences (top-right in RTL)
4. Whitespace -- Isolated elements draw attention

**Test:** Squint at the slide. Can you still identify the hierarchy? If everything blurs into equal weight, the hierarchy is broken.

## Text Density

| Slide Type | Max Text | Notes |
|------------|----------|-------|
| Title/cover | 2 lines | Title + subtitle only |
| Section divider | 1-2 lines | Section name + brief context |
| Content | 5-7 bullet points | Each under 15 words |
| Quote | 3 lines | Shorter quotes hit harder |
| Data | 3 metrics | More than 3 becomes noise |
| Code | 15-20 lines | Use highlighting to focus attention |

If you need more text, split into multiple slides with progressive reveal.

## Typography

**Headlines**: Short. Declarative. State the conclusion, not the topic.
- Bad: "Q3 Revenue"
- Good: "Q3 Revenue Grew 47%"
- Bad: "Our Approach"
- Good: "Three Principles That Drive Everything"

**Body text**: Fragments over sentences. The presenter speaks the full thought; the slide shows the anchor.
- Bad: "We have seen that our customers report higher satisfaction when they receive personalized onboarding."
- Good: "Personalized onboarding: 92% satisfaction"

**Font sizes** (16:9 at 1920x1080):
- H1: 48-64px
- H2: 36-42px
- Body: 24-28px
- Captions: 16-20px
- Never below 16px

## Color Usage

**Use color with purpose.** Color should signal meaning, not decoration.

| Color Role | Use For |
|------------|---------|
| Primary | Headlines, key data, links, interactive elements |
| Secondary | Accents, section backgrounds, gradients |
| Neutral | Body text, borders, backgrounds |
| Success/warning | Data comparisons when directional meaning matters |

**Limit to 3 colors per slide** (not counting neutrals/grays). More than 3 creates visual noise.

## Images

**When to use images:**
- To show something that words can't convey (product, place, person, diagram)
- To create emotional resonance (hero images, photography)
- To break up text-heavy sections

**When NOT to use images:**
- Generic stock photos that add no information ("team of people smiling at laptops")
- Clip art or low-resolution images
- When the data or text IS the point

**Image rules:**
- Full-bleed or generous size. Small floating images look amateur.
- One image per slide. Two images compete for attention.
- High resolution only. Pixelated images destroy credibility.

## Data Visualization

**Present the insight, not the data.**

- Bad: A spreadsheet screenshot with 50 cells
- Good: One chart showing the key trend, with the insight in the title

**Chart selection:**
| Message | Chart Type |
|---------|-----------|
| Trend over time | Line chart |
| Comparison | Bar chart |
| Part of a whole | Pie chart (max 5 segments) or stacked bar |
| Relationship | Scatter plot |
| Single metric | Big number, centered |

**Data design rules:**
- Title states the insight: "Revenue doubled in Q3" not "Q3 Revenue Data"
- Remove chart junk: gridlines, legends (when labels can go on the data directly), 3D effects
- Highlight the key data point. One number in color, the rest in gray.
- Source attribution at bottom in small text

## Animations and Transitions

**Use animations to control information flow, not for visual flair.**

Good uses of click animations (fragments):
- Progressive reveal of list items (builds anticipation)
- Step-by-step process walkthrough
- Code highlighting progression
- Before/after reveals

Bad uses of animations:
- Making every element fly in from different directions
- Gratuitous transitions between slides (fade or slide-left is sufficient)
- Animations that slow the presentation pace

**Rule:** If removing the animation would not change how the audience processes the information, remove the animation.

## Speaker Notes

Every non-trivial slide should have speaker notes. Notes serve three purposes:

1. **Talking points** -- What to say that isn't on the slide
2. **Transitions** -- How to bridge to the next slide
3. **Timing cues** -- How long to spend, when to pause for questions

Notes are not a script. They are anchor points for the presenter.

## Layout Selection Guide

| Content | Layout | Why |
|---------|--------|-----|
| Opening slide | `cover` | Sets the tone with title and attribution |
| New major section | `section` | Visual break with color signals a shift |
| Regular content | `default` | Standard text, lists, and inline elements |
| Single impactful statement | `center` | Whitespace focuses attention |
| Comparison/contrast | `two-cols` | Side-by-side makes differences visible |
| Content with photo | `image-right` or `image-left` | Balances text and visual |
| Full-bleed photography | `cover` with background | Maximum visual impact |
| Testimonial | `quote` | Centered treatment signals importance |
| Key metrics | `center` with grid | Numbers deserve prominence |
| Closing | `end` | Clean sign-off |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too much text on one slide | Split into multiple slides. Use progressive reveal. |
| Title restates the topic | Title should state the conclusion or insight. |
| All slides look identical | Vary layouts. Mix dense and sparse. Use section dividers. |
| Bullet points with full sentences | Use fragments. Presenter speaks the full thought. |
| No visual hierarchy | Make one element clearly dominant on each slide. |
| Decorative images | Every image should communicate something the text doesn't. |
| Inconsistent styling | Stick to the theme. Don't override fonts/colors per-slide. |
| No speaker notes | Add notes for anything the audience can't see on the slide. |
