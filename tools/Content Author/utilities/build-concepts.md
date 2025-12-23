# Build Concepts: Concept Development Utility

## Purpose

This utility develops structured, novel concepts before format execution. It handles two scenarios:
1. **From source:** Extract insights from existing material (transcripts, notes, recordings)
2. **From scratch:** Build concepts from topics, angles, or ideas

**Output:** Structured concepts ready to pass to any content format (long-form, blog post, social media, etc.)

**When to use:** Before calling format files. One concept development can feed multiple formats.

## Why This Exists

Content formats focus on HOW to write (structure, workflow, platform needs). This utility focuses on WHAT to write (insights, angles, novelty). Separating these prevents:
- Duplicating concept work across formats
- Inconsistent concepts when creating multi-format content from one source
- Weak conceptual rigor hidden by strong formatting
- Confusion about whether to extract or create

## Input Types

### Scenario A: From Source Material

**Source types:**
- Transcripts (voice, video, podcast)
- Notes (meeting notes, research notes, brainstorms)
- Recordings (audio, video to be transcribed)
- Existing content (articles, posts to be transformed)
- Raw data (survey results, research findings)

**Starting point:** You have material but unclear what the insight is or if it's novel.

### Scenario B: From Scratch

**Starting points:**
- Topic (e.g., "team communication")
- Angle (e.g., "why async communication fails at scale")
- Idea (e.g., "companies optimize for coordination, not execution")
- Question (e.g., "why do experienced founders still fail at delegation?")

**Starting point:** You have direction but no developed concepts or supporting material.

## Output Format

Concept development produces these elements:

1. **Core Insight** - The single idea readers should remember (1-2 sentences)
2. **Novelty Test Result** - What's fresh vs. obvious (with supporting evidence)
3. **Supporting Angles** - 3-5 perspectives that develop the core insight
4. **Specific Details** - Concrete examples, data, stories, observations
5. **Scope Boundaries** - Where this applies and where it doesn't
6. **Format Recommendations** - Which formats suit this concept best

## Workflow: From Source Material

Use when extracting concepts from transcripts, notes, recordings, or existing content.

### Step 1: Extract Raw Insights

**Purpose:** Pull potential insights from source without judgment

**Execute:**
- Read/listen through entire source once (don't extract yet)
- Second pass: Mark moments where something interesting is said
  - Unexpected observations
  - Specific examples or stories
  - Contradictions to conventional wisdom
  - Patterns across multiple mentions
  - Concrete details (numbers, names, specifics)
- List 10-20 raw insights (fragments OK, no filtering yet)
- Note which insights get repeated or emphasized in source

**Output:** List of 10-20 raw insights with source timestamps/references

### Step 2: Test for Novelty

**Purpose:** Separate fresh insights from obvious ones

**Execute:**
- For each raw insight, ask: "Would an experienced practitioner already know this?"
- Novelty tests:
  - **Unexpected test:** Does this challenge conventional wisdom?
  - **Specificity test:** Is this concrete enough to be falsifiable?
  - **Practitioner test:** Would someone doing this work learn something?
  - **Synthesis test:** Does this connect ideas in a new way?
- Rank insights by novelty (high/medium/low)
- Keep only high/medium novelty insights
- If everything is low novelty: The source lacks teachable content OR you need to extract the synthesis, not just the statements

**Output:** 3-7 novel insights ranked by strength

### Step 3: Identify Core Insight

**Purpose:** Find the single idea that organizes everything else

**Execute:**
- Review novel insights list
- Test each as potential core insight:
  - Does it subsume multiple other insights?
  - Can other insights serve as supporting evidence for this one?
  - Is it substantial enough to anchor content?
  - Is it specific enough to be actionable?
- Write core insight as 1-2 clear sentences
- Test: Can you state why this matters in one sentence?
- If no single insight emerges: You may have multiple unrelated concepts OR need more synthesis work

**Output:** Core insight (1-2 sentences) + why it matters (1 sentence)

### Step 4: Structure Supporting Angles

**Purpose:** Organize remaining insights as supporting evidence

**Execute:**
- Group remaining novel insights by theme or relationship to core
- Identify 3-5 supporting angles that develop the core insight
- For each angle:
  - State the angle (1 sentence)
  - Note what specific details from source support it
  - Identify if causally connected to other angles (creates sequence)
- Order angles by dependency logic (foundational → dependent)
- Cut angles that don't clearly develop the core insight

**Output:** 3-5 supporting angles with supporting details from source

### Step 5: Gather Specifics

**Purpose:** Collect concrete details that ground abstract claims

**Execute:**
- For each supporting angle, extract from source:
  - Specific examples (named, concrete, real)
  - Numbers or data points
  - Stories or anecdotes
  - Observable moments (what you saw/experienced)
  - Unexpected details (facts that make points memorable)
- Mark which details are from source vs. inferred
- Note any gaps where you need to add constructed examples
- Apply voice.md authenticity constraints (don't fabricate)

**Output:** Specific details mapped to each supporting angle

### Step 6: Define Boundaries

**Purpose:** Establish where this insight applies and where it doesn't

**Execute:**
- Ask: Where does this insight break down?
- Identify:
  - Contexts where this applies
  - Contexts where this doesn't apply (explicitly)
  - Sample size or experience base (if relevant)
  - Known failure modes or exceptions
- Write boundaries clearly (see voice.md: Transparent Certainty)
- Test: Does this prevent overgeneralization without hedging?

**Output:** Clear scope boundaries (2-3 sentences)

### Step 7: Package for Format Selection

**Purpose:** Prepare concept output for format files

**Execute:**
- Compile concept package:
  - Core insight + why it matters
  - 3-5 supporting angles (ordered by logic)
  - Specific details for each angle
  - Scope boundaries
  - Source attribution notes
- Recommend formats:
  - Multiple angles + depth = long-form or blog post
  - Single sharp angle = LinkedIn or social media
  - Narrative arc + stories = script or speaking notes
  - Can one concept feed multiple formats? (usually yes)
- Note any format-specific adaptations needed

**Output:** Complete concept package ready for format execution

## Workflow: From Scratch

Use when building concepts from topics, angles, ideas, or questions.

### Step 1: Clarify Starting Point

**Purpose:** Understand what you're building from

**Execute:**
- State what you have:
  - Topic? (broad area like "remote work")
  - Angle? (specific take like "why remote fails at decision speed")
  - Idea? (claim like "remote teams over-communicate")
  - Question? (puzzle like "why do experienced founders resist remote?")
- Identify what you DON'T have yet:
  - Supporting evidence?
  - Specific examples?
  - Novel angle?
  - Clear boundaries?
- Note any domain knowledge or experience relevant to this

**Output:** Clear starting point + gaps to fill

### Step 2: Develop Core Insight

**Purpose:** Build from starting point to specific, novel claim

**Execute:**
- If starting with topic: Find the specific angle
  - What's misunderstood about this?
  - What do practitioners get wrong?
  - What surprised you when you encountered this?
- If starting with angle: Sharpen to falsifiable claim
  - Make it specific enough to be wrong
  - Ground in observable behavior
  - Connect to consequences that matter
- If starting with idea: Test and support
  - Why is this true? (mechanism)
  - When does it break? (boundaries)
  - Why does it matter? (consequences)
- If starting with question: Propose answer
  - Based on what evidence or pattern?
  - What makes this explanation better than alternatives?
  - What would disprove this?
- Write core insight (1-2 sentences)
- Test novelty (see Novelty Tests from source workflow)

**Output:** Core insight (1-2 sentences) + novelty validation

### Step 3: Generate Supporting Angles

**Purpose:** Develop perspectives that prove or develop core insight

**Execute:**
- Brainstorm how to support core insight:
  - What causes this? (mechanism)
  - What are the consequences? (outcomes)
  - How does this work in practice? (application)
  - What's the contrasting view? (why others disagree)
  - What are the prerequisites? (what must be true first)
- Select 3-5 strongest angles
- Order by dependency logic (build from foundation)
- For each angle:
  - State it clearly (1 sentence)
  - Note how it connects to core insight
  - Identify what kind of evidence would support it

**Output:** 3-5 supporting angles ordered logically

### Step 4: Identify Required Specifics

**Purpose:** Determine what concrete details you need

**Execute:**
- For each supporting angle, identify what would make it concrete:
  - Example needed? (what kind?)
  - Data point needed? (what metric?)
  - Story needed? (what moment?)
  - Comparison needed? (what contrast?)
- Mark which specifics you have from experience/knowledge
- Mark which specifics you need to:
  - Research (find real examples/data)
  - Construct (hypothetical but representative)
  - Acknowledge gaps (admit what you don't know)
- Apply voice.md authenticity constraints
- Note: It's OK to have "need to research" gaps at this stage

**Output:** Required specifics mapped to angles + what you have vs. need

### Step 5: Define Boundaries

**Purpose:** Establish where insight applies

**Execute:**
- Ask: When does this core insight NOT apply?
- Identify:
  - Contexts where this works
  - Contexts where this breaks
  - Conditions that must be true
  - Known exceptions or edge cases
- Write boundaries (2-3 sentences)
- Apply voice.md transparent certainty (boundaries are information, not hedging)

**Output:** Clear scope boundaries

### Step 6: Research Gaps (if needed)

**Purpose:** Fill critical specificity gaps before format execution

**Execute:**
- Review "need to research" items from Step 4
- Prioritize: Which gaps would make content generic without filling?
- For high-priority gaps:
  - Find real examples (search, recall experience, ask sources)
  - Find data points (research, studies, public info)
  - Construct representative examples if real ones unavailable (mark as constructed)
- Update specifics list with findings
- Accept some gaps (acknowledge in boundaries rather than fabricate)

**Output:** Updated specifics with research findings

### Step 7: Package for Format Selection

**Purpose:** Prepare concept output for format files

**Execute:**
- Compile concept package:
  - Core insight + why it matters
  - 3-5 supporting angles (ordered)
  - Specific details (real, constructed, or gaps noted)
  - Scope boundaries
  - Research notes/sources
- Recommend formats based on:
  - Concept depth (deep = long-form, compressed = social)
  - Supporting evidence (stories = script, logic = blog post)
  - Audience (practitioners = long-form, general = blog)
- Note if concept can feed multiple formats

**Output:** Complete concept package ready for format execution

## Quality Checks

Before passing concepts to format files:

**Novelty Check:**
- [ ] Core insight would teach experienced practitioners something
- [ ] Supporting angles aren't obvious elaborations
- [ ] Specific details ground abstractions in reality

**Coherence Check:**
- [ ] Supporting angles clearly develop core insight
- [ ] Angles connect logically (not just listed)
- [ ] Specific details map to angles appropriately

**Authenticity Check (from voice.md):**
- [ ] Examples are real OR marked as constructed
- [ ] Claims grounded in stated experience/research
- [ ] Boundaries honest about what you don't know
- [ ] No fabricated anecdotes or data

**Completeness Check:**
- [ ] Core insight stated clearly
- [ ] 3-5 supporting angles identified
- [ ] Specific details available (or gaps noted)
- [ ] Scope boundaries defined
- [ ] Format recommendations made

## Passing to Format Files

Once concepts are developed:

1. **Select format(s)** based on recommendations and user needs
2. **Load appropriate format file** (long-form.md, blog-post.md, etc.)
3. **Skip format's concept development steps** (you've done this already)
4. **Start format workflow** at structure/drafting steps
5. **Reference concept package** throughout format execution

**Note to format files:** If a user arrives with pre-developed concepts, skip your concept development steps and proceed to structure/execution.

## Common Scenarios

**Scenario: Podcast transcript → blog post + social posts**
1. Run "From Source" workflow on transcript
2. Extract core insight + supporting angles
3. Pass concept package to blog-post.md (full development)
4. Pass SAME package to social-media.md (compressed hook)
5. Result: Consistent message across formats

**Scenario: Book chapter from interview transcript**
1. Run "From Source" workflow on transcript
2. Extract concepts (may be multiple for chapter)
3. Pass to long-form.md with target: 3,000-5,000 words
4. Format handles chapter-specific structure

**Scenario: Topic idea → multiple formats**
1. Run "From Scratch" workflow from topic
2. Develop core insight + angles
3. Pass to multiple formats simultaneously
4. Each format adapts concept to platform needs

## When Concepts Aren't Ready

**Warning signs:**
- Core insight is vague or generic
- Supporting angles are obvious elaborations
- No concrete specifics available
- Novelty tests fail (nothing fresh)
- Boundaries are "everywhere" or "nowhere"

**If this happens:**
- Don't force it to format files yet
- Return to source material (if applicable) and dig deeper
- Or: Acknowledge concept isn't strong enough to publish
- Better to stop at weak concepts than produce generic content

**The test:** Would you personally share this? If you're not excited about the core insight, readers won't be either.
