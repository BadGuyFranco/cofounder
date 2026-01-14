# Content Author: Voice Setup

## Purpose

This document guides creation of `memory/tools/Content Author/voice.md` when:
- Setting up Content Author for the first time
- Rebuilding after memory deletion
- Adapting Content Author for a different author

**End state:** A voice.md file that works in concert with AGENTS.md to produce authentic, practitioner-quality content in the target author's voice.

## Prerequisites

Before starting, read AGENTS.md completely (understand what it covers).

## The Two-File Architecture

Content Author uses two files that cannot function independently:

| File | Contains | Location |
|------|----------|----------|
| AGENTS.md | Universal craft rules (voice-agnostic) | `/cofounder/tools/Content Author/` |
| voice.md | This author's specific voice | `/memory/tools/Content Author/` |

**Segmentation principle:** If guidance applies to ANY good writer, it belongs in AGENTS.md. If it's specific to THIS author's style, it belongs in voice.md.

**What AGENTS.md already covers (do NOT duplicate in voice.md):**
- Bridge Check (causal connection between sentences)
- Deletion Check (every sentence must earn its place)
- Prohibited patterns and AI-signature vocabulary
- Concrete grounding requirement
- Opening/closing structure basics
- Context Registers (adapting to content type)
- Authenticity constraints

**Hedging exception:** AGENTS.md prohibits empty hedging but allows qualifiers that add scope information (like "In my experience" or "I've noticed"). Voice.md defines which specific qualifiers fit THIS author's voice.

## Voice Discovery Process

Run this interactive process to discover the author's voice.

**The Combined Approach:** Writing samples AND discovery questions work together. Neither alone produces the best results.
- Samples alone miss the author's INTENT (samples may contain habits they want to change)
- Questions alone miss the author's ACTUAL PATTERNS (what they naturally do well)
- Together: samples reveal patterns, questions clarify intent, the voice.md captures both

### Step 1: Writing Samples

**Before asking questions, do this:**

1. Create the Writing Samples directory if it doesn't exist:
   ```
   mkdir -p /memory/tools/Content\ Author/Writing\ Samples/
   ```

2. Ask the user:
   > "Let's start with writing samples. Please provide 3-5 pieces you've written. Ideal samples are 500+ words each, from varied contexts (articles, posts, talks, emails).
   >
   > These help me see your natural patterns. We'll also do a discovery Q&A to clarify your intent, since samples sometimes contain habits you'd want to change.
   >
   > Place them in `/memory/tools/Content Author/Writing Samples/` or paste them here."

3. Wait for samples before proceeding.

4. **If samples don't reflect desired voice:** After receiving samples, ask:
   > "Before I analyze these, is there anything about these samples that doesn't reflect how you WANT to sound? Any habits you'd like to change or directions you'd like to evolve?"

This captures intent early, before patterns are extracted.

### Step 2: Context Questions

Before the style questions, establish context. These answers inform the examples you'll generate and provide guidance for voice.md.

**Question A: Topics**

**Ask:** "What topics do you typically write about? What's your subject matter?"

Let the author describe freely. Examples of responses:
- "AI implementation and workflow automation"
- "Parenting and child development"
- "Personal finance and investing"
- "Leadership and team management"
- "Cooking and food culture"

**Question B: Audience**

**Ask:** "Who is your primary audience? Who are you writing for?"

Let the author describe freely. Examples of responses:
- "Technical founders and operators"
- "New parents figuring things out"
- "People in their 30s trying to build wealth"
- "Mid-level managers moving into leadership"
- "Home cooks who want to get better"

**Using Context in voice.md:**

Topic and audience inform voice but are NOT rigid constraints. Include them in voice.md as context, not rules:

```
## Writing Context

**Typical topics:** [from Question A]
**Primary audience:** [from Question B]

These guide tone and examples but don't limit what you can write about.
```

### Step 3: Voice Discovery Questions

**Question format:** For each question:

For Questions 1-6:
1. Ask the open-ended question
2. **Generate 3 contrasting examples relevant to the author's topic and audience** (from Questions A and B)
3. Ask: "Which sounds most like you? Or describe what feels off about all three."
4. Use response to refine understanding
5. Continue until pattern is clear

**Important:** The examples below are templates. Replace the bracketed content with examples that match the author's actual topic and audience. A parenting writer needs parenting examples; a finance writer needs finance examples. Generic examples don't resonate.

#### Question 1: Persona

**Ask:** "When you write, who are you to the reader?"

Generate 3 examples in the author's topic area showing different personas:

**Example A - The Guide:**
> "Let me walk you through what I've learned about [topic]. By the end, you'll have a clear framework to apply."

**Example B - The Peer:**
> "I've been wrestling with this same [topic-relevant problem]. Here's what I've figured out so far."

**Example C - The Expert:**
> "Based on extensive research and analysis, the evidence on [topic] points to three key factors."

**Ask:** "Which feels closest? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 2: Reader Relationship

**Ask:** "How do you want readers to feel when reading your work?"

Generate 3 examples in the author's topic area showing different reader relationships:

**Example A - Challenged:**
> "You're probably doing [common thing in their topic] wrong. Most people are. Here's why that matters."

**Example B - Understood:**
> "If you've ever felt like you're the only one struggling with [common frustration in their topic], you're not. Here's what's actually happening."

**Example C - Informed:**
> "There are three approaches to [problem in their topic]. Each has trade-offs worth understanding."

**Ask:** "Which resonates? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 3: Confidence Style

**Ask:** "How do you handle uncertainty in your writing?"

Generate 3 examples in the author's topic area showing different confidence styles:

**Example A - Direct claims:**
> "[Advice relevant to their topic]. I've seen it work dozens of times. Do this."

**Example B - Transparent basis:**
> "I've tested [approach in their topic] maybe twenty times. It worked in most cases, though I haven't tried it in [relevant edge case]."

**Example C - Hedged:**
> "This approach to [their topic] might be worth considering, depending on your specific situation and constraints."

**Ask:** "Which matches how you want to come across? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 4: Opening Style

**Ask:** "How do you like to start a piece?"

Generate 3 examples in the author's topic area showing different opening styles:

**Example A - Drop into action:**
> "[Vivid, specific moment relevant to their topic that creates immediate tension.]"

**Example B - Provocative claim:**
> "Everything you've been told about [aspect of their topic] is backwards."

**Example C - Scene setting:**
> "Last [time], I watched [person relevant to their audience] make the same mistake I made [years] ago."

**Ask:** "Which opening style feels natural to you? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 5: Rhetorical Moves

**Ask:** "What techniques do you naturally use when making a point?"

Generate 3 examples in the author's topic area showing different rhetorical moves:

**Example A - Counter-setup:**
> "The obvious answer is [conventional wisdom in their topic]. But here's the uncomfortable truth: [the break]."

**Example B - Pattern naming:**
> "I call this the [Memorable Name]. [Explanation of the phenomenon in their topic area]."

**Example C - Direct instruction:**
> "Stop [common mistake in their topic]. Start [better approach]. Here's exactly how."

**Ask:** "Which feels most like your natural style? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 6: Closing Style

**Ask:** "How do you like to end a piece?"

Generate 3 examples in the author's topic area showing different closing styles:

**Example A - Call to action:**
> "Start with [one small action in their topic]. [Second small action]. See what happens."

**Example B - Reframe:**
> "The question isn't [surface question in their topic]. It's [deeper question]."

**Example C - Understatement:**
> "[Understated reflection on a failure or lesson learned in their topic area]."

**Ask:** "Which ending style matches your voice? Feel free to combine options, describe something different, or explain what feels off about all three."

#### Question 7: What You're NOT

**Ask:** "What kind of writing makes you cringe? What do you never want to sound like?"

Let the author describe in their own words. Common responses:
- "Corporate/consultant speak"
- "Preachy or self-important"
- "Wishy-washy hedging"
- "Trying too hard to be clever"
- "Motivational poster quotes"

Document these as "Who You Are NOT" in voice.md.

#### Discovery Complete

After Step 3, you should have:
- Writing samples (Step 1)
- Stated intent: habits they want to change (Step 1, question 4)
- Topic and audience context (Questions A-B)
- Clear persona (Question 1)
- Reader relationship stance (Question 2)
- Confidence/certainty style (Question 3)
- Opening pattern preference (Question 4)
- Signature rhetorical moves (Question 5)
- Closing style (Question 6)
- Anti-patterns to avoid (Question 7)

### Step 4: Writing Sample Analysis

Analyze the samples provided in Step 1, filtering against intent captured throughout discovery.

#### 4a: Validate Against Discovery

Compare samples to discovery answers:
- Do samples match the persona they described?
- Do samples use the rhetorical moves they preferred?
- Do samples avoid what they said they hate?
- Do samples contain the habits they flagged wanting to change (from Step 1, question 4)?

**When intent and samples conflict:** Discovery answers and stated intent always win. Samples reveal what they DO; discovery reveals what they WANT.

#### 4b: Extract Additional Patterns

Look for patterns not covered in discovery:
- Specific sentence rhythm tendencies
- Characteristic phrase structures
- How they handle transitions
- Specific credibility markers they use

#### 4c: Filter Against AGENTS.md

**Discard from samples:**
- Patterns that violate AGENTS.md prohibitions
- AI-signature vocabulary or phrases (even if author used them)
- Hedging that doesn't add scope information
- Passive voice constructions
- Throat-clearing or meta-commentary

**Keep from samples:**
- Distinctive patterns that match discovery intent
- Voice-specific implementations of good craft

### Step 5: Build voice.md

#### Pattern Count Guidance

**Target: 4-6 voice-specific patterns.**

Fewer than 4: Voice may be too generic, not distinctive enough.
More than 6: Likely duplicating AGENTS.md or over-engineering.

The patterns should cover:
1. Opening mechanics (how THIS author starts)
2. Sentence rhythm (THIS author's variation style)
3. 2-3 signature rhetorical moves (counter-setup, pattern naming, etc.)
4. Closing style (how THIS author ends)

Supporting sections (not counted as patterns):
- Who You Are / Who You Are NOT
- Core Stance
- Person Switching
- Transparent Certainty
- Credibility Killers

#### Create Testable Patterns

Convert discovery answers into testable patterns.

**Bad (not testable):**
- "Write engagingly"
- "Sound confident"
- "Be direct"

**Good (testable):**
- "First sentence must contain action, tension, or claim. Zero context-setting."
- "Test: No three consecutive sentences within 5 words of each other in length."
- "Test: If you name a pattern without explaining the mechanism, you're decorating, not teaching."

Each pattern should have:
1. **What to do** (the rule)
2. **Test** (how to verify compliance)
3. **Example structure** (truncated, showing pattern not copyable text)
4. **Why it works** (mechanism explanation)
5. **Anti-pattern** (what AI gets wrong)

#### Add Examples Carefully

Examples provide few-shot learning value but risk parroting.

**Rules for examples:**
- Truncate examples to show STRUCTURE, not provide copyable text
- Use `...` to indicate removed text
- Include "Why it works" for each example
- Add anti-patterns showing what AI typically does wrong
- Never include full paragraphs that could be copied verbatim

**Anti-parroting safeguards:**
- Add explicit warning: "CRITICAL: Study patterns, never copy phrases"
- Add framing: "The patterns transfer; the words don't"
- Add usage note: "Use 2-3 per piece where they fit. Don't force all patterns."
- Include verification check: "Uses none of the exact phrases from examples above"

#### Structure voice.md

Follow this structure:

```
# Voice and Persona

[Header explaining two-file system and context priority]

## Writing Context
[Topics and audience from Questions A and B - guidance, not rules]

## Voice Anchor
[One-sentence anchor to return to when prose drifts]

## Who You Are
[Positive identity - from Question 1]

## Who You Are NOT
[Negative identity - from Question 7]

## Core Stance
[3-5 principles from Questions 2-3]

## Testable Voice Patterns
[Warning about studying patterns, not copying phrases]
[Note: "Use 2-3 per piece where they fit. Don't force all patterns."]

### [Pattern 1: Opening Mechanics]
[From Question 4 + samples]

### [Pattern 2: Sentence Architecture]
[From samples or general preference]

### [Pattern 3-5: Signature Moves]
[From Question 5 - counter-setup, pattern naming, etc.]

### [Pattern 6: Closings]
[From Question 6]

## Credibility Killers
[What destroys this specific voice - inverse of Questions 1-3]

## Person Switching
[When to use first vs third person for THIS voice]

## Transparent Certainty
[From Question 3 - how THIS author handles uncertainty]

## Diagnosis: AI vs. This Voice
[Table comparing this voice to AI-typical output]

## Voice Verification
[Checklist including anti-parroting checks]
```

#### Validate Against AGENTS.md

Before finalizing, verify:

- [ ] No content duplicates AGENTS.md (Bridge Check, concrete grounding, etc.)
- [ ] All patterns are testable, not vague descriptions
- [ ] Examples are truncated, not copyable
- [ ] Anti-parroting warnings are prominent
- [ ] Voice.md references AGENTS.md where appropriate (e.g., "Does Bridge Check pass?")
- [ ] Header correctly states two-file system
- [ ] 4-6 voice-specific patterns (not more, not fewer)

### Step 6: Test and Iterate

#### Initial Test

1. Load AGENTS.md and the new voice.md
2. Generate a short piece of content on a topic the author would write about
3. Ask: "Does this sound like you? What feels right? What feels off?"

#### Evaluate

- Does it sound like the persona from Question 1?
- Does it use the rhetorical moves from Question 5?
- Does it avoid what they hate from Question 7?
- Does it pass AGENTS.md checks?

#### How Users Give Feedback

Tell the author to be specific about what's off:

> "This is not on voice for me because [specific reason]."

Good feedback examples:
- "This is not on voice for me because it's too formal. I'm more conversational."
- "This is not on voice for me because the opening is too soft. I lead with stronger claims."
- "This is not on voice for me because it sounds preachy. I'm more peer-to-peer."

Bad feedback (not actionable):
- "It doesn't sound like me" (too vague)
- "Make it better" (no direction)

#### Iterate Based on Feedback

**If voice is wrong:**
1. Identify which voice.md pattern needs adjustment
2. Update the specific pattern based on feedback
3. Re-generate and re-test

**If craft is wrong (awkward sentences, weak structure):**
- Check AGENTS.md compliance
- Voice.md shouldn't need to change for craft issues

Expect 1-2 iterations to get voice right. This is normal. Each iteration refines the voice.md file.

## Common Mistakes

**Duplicating AGENTS.md content:**
Don't include causal chains, concrete grounding, or opening/closing basics in voice.md. AGENTS.md already covers these.

**Using only samples OR only questions:**
Samples alone miss intent. Questions alone miss natural patterns. Always use both.

**Skipping the intent check:**
Before analyzing samples, ask what habits they want to change. Otherwise you'll encode patterns they're trying to escape.

**Vague pattern descriptions:**
"Write with confidence" is useless. "Test: Does your qualifier add information about scope, or just weaken your confidence?" is actionable.

**Copyable examples:**
Full sentences or paragraphs will be parroted. Truncate with `...` and focus on structure.

**Including bad patterns from samples:**
Even good authors sometimes use AI-signature phrases or hedge unnecessarily. Filter these out.

**Over-engineering:**
4-6 patterns is sufficient. More than 6 usually means you're duplicating AGENTS.md.

**Under-engineering:**
Fewer than 4 patterns produces generic output. If you can't find 4 distinctive patterns, dig deeper in discovery.

## File Checklist

When complete, `memory/tools/Content Author/` should contain:

```
memory/tools/Content Author/
├── voice.md (required - the voice file you created)
└── Writing Samples/ (optional - keep for future reference)
    └── [author's writing samples if provided]
```

The system is ready when:
- [ ] voice.md exists and follows the structure above
- [ ] voice.md contains 4-6 voice-specific patterns
- [ ] voice.md works WITH AGENTS.md, not independently
- [ ] Test content sounds like the target author
- [ ] No AGENTS.md violations in test content
- [ ] Author confirms voice feels right (if available for feedback)
