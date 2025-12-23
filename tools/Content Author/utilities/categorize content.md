# Thematic Categorization

Transforms complex material into insight-dense, actionable thematic structures.

**When to use:** User explicitly requests categorization of books, whitepapers, articles, transcripts, or multi-source material.

**What this produces:** A set of themes that reveal non-obvious insights about the material, expressed as specific actions practitioners can take.

## Core Principle

Categorization isn't about organizing text. It's about answering one question:

> **What does this material reveal that isn't obvious—and what should practitioners do about it?**

Insight comes first. Action is how insight gets expressed.

**The difference this makes:**
- Generic action: "Build measurement systems"
- Insightful action: "Measure what's changing before it shows up in outcomes"

Both tell you what to do. One reveals something non-obvious about how to think.

## Quality Standards

A successful categorization achieves three things, in this order:

1. **Insight density** — Themes reveal something non-obvious about the material
2. **Elegance** — The structure feels inevitable, not forced
3. **Completeness** — Nothing important is missing

All themes remain action-oriented. But the action carries the insight rather than stating the obvious.

## The Process

### Phase 1: Material Immersion

Read the entire source material with one question:

> **What would surprise someone who thinks they already understand this domain?**

Not "what does this cover?" but "what does this reveal?"

**For multi-source material:** Look for:
- Where sources agree unexpectedly
- Where they disagree productively
- What emerges from combining perspectives that neither source says alone

**Output:** Mental model of the material's non-obvious contributions.

### Phase 2: Insight Extraction

Identify the revelations in the material:

- Counterintuitive claims backed by evidence or reasoning
- Hidden connections between concepts that seem unrelated
- Reframings that change how you see familiar problems
- Mechanisms that explain WHY something works, not just what works
- Distinctions that seem subtle but change everything in practice

**The surprise test:** Would a smart practitioner be surprised by this? If a competent person in this domain would say "yes, obviously," it's not an insight—it's common knowledge wearing new clothes.

**Keep a running list of insights.** Don't organize yet. Just capture what the material reveals.

### Phase 3: Structural Compression

Find the minimal set of themes that captures all essential insights.

**The compression question:** "If I reduced this to N themes, what would I lose?"

Start with your full insight list. Group related insights. Keep reducing until further reduction loses something essential.

**Elegance test:** Does the structure feel inevitable? If you could easily imagine three different structures that work equally well, you haven't found the right one yet. The right structure makes alternatives feel wrong.

**Let the material dictate theme count.** Don't force a number. Some material naturally yields 4 themes; some yields 12. The constraint is quality, not quantity.

**Sequencing:** Arrange themes so earlier ones enable later ones. If there's no natural sequence, test whether the themes are at the right level of abstraction.

### Phase 4: Action Translation

For each theme, translate the insight into actionable form.

**The format that works:**

> When [specific situation], do [specific action] because [the insight that makes this non-obvious]

The action should be inseparable from the insight. If you can state the action without the insight, it's too generic.

**Specificity test:** Could someone execute this tomorrow? If they'd need to figure out "what this means for them," it's still too abstract.

**Theme titles should be action-oriented but insight-carrying:**
- Weak: "Improve team communication"
- Better: "Replace status updates with decision requests"
- Best: "Surface disagreements before they become defaults"

The title tells you what to do AND reframes how you think about the problem.

### Phase 5: Quality Verification

Two checks only. Both must pass.

**Completeness check:** "What important idea in the source material has no home in these themes?"

If something important is homeless:
- Add a theme (if distinct enough to warrant one)
- Expand an existing theme (if it belongs there)
- Acknowledge explicitly that it's secondary (if genuinely less important)

Don't force completeness by stuffing unrelated ideas into themes. That kills elegance.

**Elegance check:** "Does the structure feel inevitable?"

Test: Imagine explaining this categorization to someone. Would they say "yes, that's the obvious way to organize this"? If yes, the structure is probably right. If they'd say "why not organize it by X instead?"—and X seems equally valid—keep compressing.

### Phase 6: Output Construction

For each theme, provide:

**1. Title** — The insight expressed as action (what to do that reveals how to think)

**2. Stakes** — What happens when you do this well vs. skip it (2-3 sentences max). Show consequences, not importance claims.

**3. Key practices** — Specific how-tos that constitute doing it well. Each practice should be concrete enough to execute. Number of practices is material-driven (typically 3-7, but let content dictate).

**Format for key practices:**
- Specific techniques: "Use [method] to [achieve outcome]"
- Situational guidance: "When [context], do [action]"
- Design choices: "Build [feature] that enables [capability]"
- Decision rules: "Prioritize [X] over [Y] when [condition]"

## Output Format

**Default format** (use unless user specifies otherwise):

```markdown
# [Descriptive Title for the Categorization]

[One paragraph explaining what this categorization reveals about the source material—the meta-insight that ties themes together.]

## [Theme 1 Title: Action-Oriented, Insight-Carrying]

[Stakes: What happens when done well vs. skipped. 2-3 sentences.]

Key Practices:
- [Specific practice 1]
- [Specific practice 2]
- [Specific practice 3]

## [Theme 2 Title]

[Stakes]

Key Practices:
- [Specific practice 1]
- [Specific practice 2]
- [Specific practice 3]

[Continue for all themes]
```

**File naming:** `[Source Title] Themes.md` in same directory as source, unless user specifies otherwise.

## Common Failure Modes

**Insight theater**  
*Symptom:* "Insights" that could have been generated without reading the source material.  
*Fix:* For each insight, ask: "What specific part of the source material supports this?" If you can't point to it, it's not from the material.

**Generic action language**  
*Symptom:* Themes read like "Build systems that..." or "Establish practices for..." without specificity.  
*Fix:* Apply the specificity test. If someone couldn't start executing tomorrow, add detail until they could.

**Over-compression**  
*Symptom:* The categorization feels too clean. Important material seems to have vanished.  
*Fix:* Run the completeness check seriously. Keep a "cut list" during compression and review it at the end.

**Under-compression**  
*Symptom:* Themes overlap significantly. The structure feels arbitrary.  
*Fix:* Keep compressing until further reduction loses something essential. If two themes could merge without losing insight, merge them.

**Sequencing that doesn't matter**  
*Symptom:* Themes could be reordered without consequence.  
*Fix:* Either find the natural dependency sequence, or acknowledge the themes are parallel (equally foundational, no sequence).

## What This Process Does NOT Include

**Self-grading:** The user judges quality. The process focuses on producing insight, not scoring compliance.

**Configuration questions:** Infer from the material. Ask only if genuinely ambiguous about user intent.

**Multiple "canons" or parallel structures:** One excellent categorization. If user wants alternatives, they'll ask.

**Milestone announcements:** Just produce the output.

## Edge Cases

**Material lacks non-obvious insights:**  
Some source material is genuinely straightforward—no hidden connections, no counterintuitive claims. In this case:
1. State this explicitly: "This material is more instructional than revelatory"
2. Organize by natural action sequence rather than insight themes
3. Focus on clarity and completeness over insight density

**Material is too long for context:**  
For book-length works that exceed context limits:
1. Request chapter-by-chapter or section-by-section input
2. Build running insight list across sections
3. Synthesize themes after processing all sections
4. Note: This requires multiple passes and user coordination

**User wants specific format:**  
If user requests a particular output structure (numbered lists, specific headings, etc.), adapt the output format while preserving the insight-first process.

**Multiple sources with conflicting perspectives:**  
1. Note the disagreement as an insight itself ("Experts disagree on X; the disagreement reveals Y")
2. Don't force false consensus
3. If appropriate, let themes reflect the productive tension
