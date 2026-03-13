# Design Advisor

A design quality system that raises the bar on visual output across any medium. Built on universal design principles, prohibited anti-patterns, and domain-specific guidance.

## Documentation

- **AGENTS.md** - Complete instructions for AI agents

## Key Features

- **Universal design principles** - Hierarchy, rhythm, color intent, typography discipline, and intentionality checks that apply to any visual output
- **Enforcement mechanisms** - Slop Scan, Purpose Check, Hierarchy Scan, and Rhythm Check run during generation, not just at delivery
- **AI Slop Test** - Curated list of prohibited defaults that flag AI-generated design (Inter font, cards-in-cards, purple gradients, glassmorphism)
- **Domain-specific guidance** - Deep reference material for web frontend design (typography, color, spatial, motion, interaction, responsive, UX writing)
- **Design operations** - Structured workflows for audit, review, polish, distill, normalize, bolder, and quieter

## Common Use Cases

Use Design Advisor when building web interfaces, reviewing UI quality, or improving the visual design of any output humans will see. It works alongside other tools: Content Author handles the words, Design Advisor handles how they look.

## Files

| File | Purpose |
|------|---------|
| AGENTS.md | Universal design principles, anti-patterns, design operations |
| domains/web-frontend.md | Web-specific guidance (CSS, HTML, React, Tailwind) |
| domains/template-domain.md | Template for adding new domains |
| utilities/design-audit.md | Technical quality audit workflow |
| utilities/design-review.md | Subjective design critique workflow |
| NOTICE.md | Attribution for source material |

## Domains

| Domain | Covers |
|--------|--------|
| web-frontend | Typography, color, spatial design, motion, interaction, responsive, UX writing for web |

New domains can be added using `domains/template-domain.md`.
