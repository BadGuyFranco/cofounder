# Content Author

A content writing system that produces authentic, practitioner-quality content. Built on testable enforcement mechanisms, not vague guidelines.

## Quick Start

**Load these two files together (both required):**
1. `AGENTS.md` - Universal craft rules (enforcement mechanisms, prohibitions)
2. `memory/tools/Content Author/voice.md` - This author's voice (patterns, examples, verification)

Then load format file from `content types/` directory. Load `content types/spark.md` if format uses opening hooks.

**How the files work together:**
- AGENTS.md defines WHAT makes good writing (universal, voice-agnostic)
- voice.md defines HOW this specific author sounds (testable patterns + examples)

Both must be loaded. They cannot function independently.

**Context priority:** If constrained, prioritize: AGENTS.md enforcement mechanisms → voice.md testable patterns.

## If voice.md Is Missing

This file lives in `/memory/tools/Content Author/` and is author-specific.

**See `VoiceSetup.md` for complete setup instructions.** That document covers:
- Voice Discovery Q&A process (works even without writing samples)
- How to extract patterns from writing samples (if available)
- How to filter patterns against AGENTS.md (avoid duplication)
- How to create testable patterns with anti-parroting safeguards
- How to structure voice.md to work with AGENTS.md
- How to test and iterate until voice is right

## System Architecture

### Core Files

| File | Purpose | Location |
|------|---------|----------|
| AGENTS.md | Universal craft rules, enforcement mechanisms | `/cofounder/tools/Content Author/` |
| voice.md | Persona-specific patterns, examples, verification | `/memory/tools/Content Author/` |
| VoiceSetup.md | Setup guide for creating voice.md | `/cofounder/tools/Content Author/` |

### Format Files

Located in `content types/`. Each contains: purpose, specifications, workflow, quality gates, failure modes.

Available: blog-post, linkedin, x-posts, long-form, cold-email, script, speaking-notes, social-media

### Utilities

Located in `utilities/`. Run before format execution when needed.
- `build-concepts.md` - Concept development and novelty testing
- `content-review.md` - Systematic review and improvement process

## Key Principles

**Enforcement over guidelines:** Bridge Check and Deletion Check are mandatory, not suggestions. Content must pass both.

**Voice consistency:** All formats apply the same voice.md patterns. Format files adapt for length/platform, not different voice.

**Single source of truth:** AGENTS.md, voice.md, and spark.md are the sources. Format files reference them, never duplicate.

**Authentic output:** Following rules mechanically while missing substance is failure. Break rules when you can name the rule and explain why breaking it strengthens this moment.

## Creating New Formats

See `content types/template-format.md`. Never duplicate rules from core files; always reference them.

## Notes

**Authenticity constraints are non-negotiable:** Never fabricate examples, anecdotes, or specific details.

**The two-file system:** AGENTS.md alone produces good generic writing. Adding voice.md (with its patterns and examples) produces writing that sounds like a specific author. Both together produce the target voice reliably.
