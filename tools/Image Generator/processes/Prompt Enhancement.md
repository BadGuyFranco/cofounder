# Prompt Enhancement

Improve underspecified image prompts before sending to generation services.

**Apply this process to every image generation request before constructing the final prompt.**

## When to Use

Always. Every prompt passes through this assessment, even well-specified ones.

## Assessment

Categorize the incoming prompt:

| Category | Definition | Example |
|----------|------------|---------|
| **Fully specified** | Has purpose, style/medium, and quality indicators | "Photorealistic magazine cover of a lobster wearing round glasses, studio lighting, sharp focus" |
| **Partially specified** | Has some elements but missing others | "Lobster wearing glasses for a blog post" (has purpose, missing style/quality) |
| **Bare** | Subject only, no context | "Lobster wearing glasses" |

## Decision Logic

```
IF prompt is fully specified:
    Pass through unchanged

ELSE IF prompt is partially specified:
    Fill gaps with quality defaults (see below)

ELSE IF prompt is bare:
    IF direct user interaction is possible:
        Ask: "What's this image for? (e.g., blog header, social post, presentation, artistic piece)"
        Then enhance based on answer
    ELSE (agent-to-agent call, no interaction):
        Apply professional defaults automatically
```

## Quality Defaults

When enhancing, add these elements if not already present:

### Medium (pick one based on context)

| Context Clues | Default Medium |
|---------------|----------------|
| Business, professional, editorial, marketing | "photorealistic photograph" |
| Product, e-commerce, catalog | "professional product photography" |
| Conceptual, metaphor, abstract idea | "photorealistic with cinematic composition" |
| Humor, meme, casual | "high-quality digital illustration" (cartoons acceptable here) |
| No context | "photorealistic photograph" |

### Technical Quality

Add to all enhanced prompts:
- "professional lighting with natural shadows"
- "sharp focus, high detail"
- "authentic and natural appearance"

### Composition (if subject allows)

Consider adding one:
- "centered composition" (for single subjects)
- "rule of thirds" (for scenes)
- "dramatic angle" (for impact)
- "clean background" (for clarity)

## Hard Rules

These apply to ALL prompts, even fully specified ones:

| Rule | Enforcement |
|------|-------------|
| **No unspecified text** | If the prompt implies text (signs, labels, titles) but doesn't provide exact wording, either ask for the text OR add "no text or lettering in the image" |
| **No gibberish** | Never allow prompts that would produce random letters or misspelled words. If text is needed, it must be explicitly provided. |
| **Anti-AI artifacts** | Add to all prompts: "natural, not artificial or computer-generated looking" |
| **Specify medium** | Every final prompt must have an explicit medium/style. Never leave ambiguous. |

## Enhancement Examples

**Bare prompt:** "lobster wearing glasses"

**No interaction available (agent call):**
```
Photorealistic photograph of a lobster wearing round glasses, 
professional studio lighting with natural shadows, 
sharp focus, high detail, 
clean background, 
authentic and natural appearance, 
no text or lettering in the image
```

**With interaction, user says "for a tech blog about AI":**
```
Photorealistic photograph of a lobster wearing modern round glasses, 
conceptual image representing artificial intelligence, 
professional studio lighting with soft shadows, 
sharp focus, high detail, 
clean minimal background, 
editorial quality suitable for tech publication, 
no text or lettering in the image
```

---

**Partially specified:** "watercolor painting of a sunset for my living room"

**Enhanced (preserving specified style):**
```
Watercolor painting of a sunset, 
soft diffused light with warm golden and orange tones, 
artistic composition suitable for home decor, 
high detail brushwork, 
no text or signatures in the image
```

Note: Did NOT override "watercolor" with photorealistic because user specified the style.

---

**Bare prompt with text implied:** "welcome sign for a coffee shop"

**No interaction available:**
Ask is impossible, but we can't generate gibberish text. Add:
```
Photorealistic photograph of a rustic wooden sign for a coffee shop, 
text reading "WELCOME" in clean serif lettering, 
warm inviting lighting, 
sharp focus, high detail, 
cozy cafe atmosphere in background
```

If "WELCOME" isn't right, the output is still usable and text is legible. Better than gibberish.

## Purpose-to-Style Mapping

When purpose IS known (from context or asking), use this mapping:

| Purpose | Style Direction |
|---------|-----------------|
| Blog/article header | Photorealistic, editorial quality, clean composition |
| Social media post | Can be more stylized, eye-catching, bold |
| Professional presentation | Clean, minimal, photorealistic |
| Marketing/advertising | Polished, aspirational, professional photography |
| Personal/creative project | Match stated preference, default photorealistic |
| Children's content | Illustration acceptable, bright and friendly |
| Humor/meme | Stylized acceptable, quality still matters |

## What NOT to Produce

Regardless of prompt, never generate:

1. **Elementary/amateur aesthetic** unless explicitly requested for children's content
2. **Generic stock photo feel** (add specificity to avoid this)
3. **Obvious AI hallmarks** (uncanny valley faces, melted details, impossible geometry)
4. **Random or misspelled text** (either specify exact text or exclude text entirely)
5. **Cartoon/clipart when photorealistic serves better** (unless humor/casual context)

## Success Criteria

A properly enhanced prompt:
- Has an explicit medium/style
- Has lighting/quality descriptors
- Has composition guidance
- Handles text appropriately (specified or excluded)
- Matches purpose (known or defaulted to professional)
