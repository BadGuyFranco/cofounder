# Content Author Unit Test

## Purpose

Validate the Content Author library through two-layered testing:

**Layer 1: Instruction Quality** - Are the instructions clear, complete, actionable?  
**Layer 2: Output Quality** - Does following the instructions produce quality writing?

**Voice Adaptability:** This test calibrates to the current voice.md, making it functional regardless of voice changes. Phase 0 extracts voice characteristics and adapts test criteria accordingly.

## Critical Constraints

### Do Not Modify Source Documents

This test evaluates the Content Author library. Don't modify any files in `/cofounder/tools/Content Author/` during testing.

Save all recommendations for Phase 5. Only modify source documents if explicitly instructed as a separate task.

### First Do No Harm

**You are NOT required to provide recommendations.**

Before suggesting any change, answer honestly:
1. **Is this a Content Author problem or an LLM limitation?** (Don't blame the instructions for inherent LLM writing challenges)
2. **Would this change make outcomes better or just different?** (Different ≠ Better)
3. **Would this add complexity that makes the system harder to use?** (Simplicity has value)
4. **Do you have evidence from test execution that this change would help?** ("I think it might help" is not evidence)

If you can't confidently answer "yes" to questions 2 and 4, don't recommend it.

An empty recommendations section means success, not failure.


## Test Protocol Overview

This test follows a six-phase process:

0. **Phase 0: Voice Calibration** - Extract voice characteristics to adapt test
1. **Phase 1: Inventory** - Read all Content Author files
2. **Phase 2: Instruction Quality** - Review each file using Play Author methodology
3. **Phase 3: Create Content** - Generate sample content following Content Author instructions
4. **Phase 4: Output Quality** - Evaluate sample content using Content Author's quality checks
5. **Phase 5: Final Assessment** - Synthesize findings and provide recommendations

**Critical:** Load `/cofounder/tools/Play Author/AGENTS.md` before starting Phase 2. Follow its **Prompt Review Process** systematically for each file.


## Test Protocol

### Phase 0: Voice Calibration

Before starting the test, read `voice.md` and extract key characteristics that will calibrate the test:

**Extract and document:**

1. **Core Persona** - What is the primary authorial stance?
   - Examples: Builder/operator, creative professional, executive/strategist, educator, researcher
   - Document: [Extracted persona]

2. **Credibility Source** - Where does authority come from?
   - Examples: Hands-on experience, creative mastery, strategic insight, research/analysis
   - Document: [Credibility source]

3. **Prohibited Elements** - What specific jargon, patterns, or language to avoid?
   - Extract from voice.md's prohibited/anti-pattern sections
   - Document: [List specific terms and patterns to check for]

4. **Voice Principles** - What are the 3-5 core voice principles?
   - Extract from voice.md's core principles section
   - Document: [List principles with brief description]

5. **Target Audience Characteristics** - Who is the reader?
   - Extract audience description from voice.md
   - Document: [Audience profile]

6. **Appropriate Topic Domains** - What subject matter fits this voice?
   - Based on persona and examples in voice.md
   - Document: [2-3 topic domains that would be on-brand]

**Calibration Complete:** Use these extracted characteristics throughout Phases 3-4 instead of hardcoded assumptions.

### Phase 1: Read All Content Author Files

Read the complete Content Author library:

**Core files:**
1. `AGENTS.md` (core writing standards)
2. `voice.md` (voice and tone principles)
3. `README.md` (human-facing overview)

**Utilities:**
4. `utilities/build-concepts.md`
5. `utilities/content-review.md`
6. `utilities/categorize content.md`

**Content types:**
7. `content types/spark.md` (opening hook framework)
8. `content types/long-form.md`
9. `content types/linkedin.md`
10. `content types/blog-post.md`
11. `content types/script.md`
12. `content types/social-media.md`
13. `content types/speaking-notes.md`
14. `content types/template-format.md`

**Inventory Check:**
- List all files read
- Note any files that couldn't be found
- Identify any unexpected files in the directory

### Phase 2: Evaluate Instruction Quality (Using Play Author)

**Reference:** Load `/cofounder/tools/Play Author/AGENTS.md` and follow its **Prompt Review Process**.

For each major instruction file in Content Author, conduct systematic review following Play Author methodology:

**Files to review:**
- `AGENTS.md`
- `voice.md`
- `utilities/build-concepts.md`
- `utilities/content-review.md`
- `utilities/categorize content.md`
- `content types/spark.md`
- One format file of your choice (e.g., `long-form.md`)

**Review Process (per Play Author):**
1. **Salvageability Assessment** - Can this be improved incrementally or needs rewrite?
2. **Prompt-Level Assessment** - Objective clarity, impact measurement, quality checks, completeness-conciseness balance
3. **Instruction-Level Assessment** - Clarity, actionability, logical order, specificity, consistency
4. **Line-Level Assessment** - Terminology, clarity, redundancy

**Document findings for each file:**
- File name
- Assessment level (Prompt/Instruction/Line)
- Observations (track but don't present yet)
- Priority level (High/Medium/Low per Play Author criteria)

**After completing all file reviews:**
- Compile prioritized observation list across all files
- Note: Do NOT present recommendations yet - save for Phase 5

### Phase 3: Create Sample Content

Using ONLY the Content Author library, create:

**Task A: Short-Form Principle**
- Topic: [Choose a topic from the appropriate topic domains identified in Phase 0 calibration]
- Follow principle structure: Consequence → Framing → Directive
- Apply voice principles from Phase 0 calibration
- Avoid prohibited elements from Phase 0 calibration
- 2-4 sentences, under 280 characters

**Task B: Blog Post**
- Topic: [Choose a topic from the appropriate topic domains identified in Phase 0 calibration]
- Length: 500-700 words
- Use SPARK framework for opening
- Target audience: [Use audience characteristics from Phase 0 calibration]
- Apply voice principles from Phase 0 calibration
- Ensure logical flow between sentences

### Phase 4: Evaluate Output Quality

For each piece created in Phase 3, run Content Author's own quality checks:

#### Enforcement Mechanisms (from AGENTS.md)

**Bridge Check:**
Pick 10-15 representative sentence pairs spanning the content (opening, middle, closing).

For each pair, insert "because," "which means," "therefore," or "but" between them:
- **PASS**: Connector works naturally (clear causal link)
- **FAIL**: Connector feels forced or nonsensical (ideas are listed, not connected)

Example PASS: "AI compounds errors before humans notice. [which means] Traditional monitoring fails at machine speed."
Example FAIL: "AI changes how we work. [because/which means/?] Companies need better processes." (No logical connection)

**Sentence pairs tested:** List them with PASS/FAIL
**Bridge test score:** __% passed
**If below 80%:** Content lists ideas instead of building argument

**Deletion Check:**
For 5-10 representative sentences, ask: "What breaks if I delete this?"
- If nothing breaks: mark as BLOAT
- If flow breaks: mark as BRIDGE (keep it)
- If substance breaks: mark as CONTENT (keep it)

**Sentences tested:** List with classification
**Bloat count:** __ sentences
**Pass/Fail:** All sentences justified?

#### Preflight Checks (from AGENTS.md)

1. **Clean prose** - Any hedging, meta-commentary, throat-clearing, or unnecessary words?
2. **Grounded claims** - Is it clear how you know what you claim? Evidence shown?
3. **Natural flow** - Do sections connect naturally or feel stacked?
4. **Fresh execution** - Any repetitive patterns in sentences or lists? Does this feel template-filled?
5. **Voice consistency** - Is person (first/third) consistent within each section?
6. **Human voice** - Does this sound like a real person wrote it, or like an algorithm checking boxes?

**Pass all checks?** Yes/No
**Failures:** List specific issues found

#### Read Aloud Test

Read each piece aloud at conversational pace.
- Any places where you stumble or pause unnaturally?
- Does it flow like natural speech?
- Score: 1-10

#### Voice-Specific Prohibited Elements Check (from voice.md via Phase 0)

Scan for prohibited elements identified in Phase 0 calibration:
- [List specific jargon and patterns from Phase 0]
- Any language inconsistent with the core persona from Phase 0

**Prohibited elements found:** List specific words/phrases (or "None")
**Does this sound authentic to the calibrated persona?** Yes/No
**Voice integrity:** Strong/Adequate/Weak

#### Voice Principles Check (from voice.md via Phase 0)

**Calibrated voice principles present:**
[For each principle identified in Phase 0 calibration, create a Yes/No check]

**Example format:**
- [Principle 1 from Phase 0]: [Brief test] - Yes/No
- [Principle 2 from Phase 0]: [Brief test] - Yes/No
- [Principle 3 from Phase 0]: [Brief test] - Yes/No
- [Principle 4 from Phase 0]: [Brief test] - Yes/No
- [Principle 5 from Phase 0]: [Brief test] - Yes/No

**Credibility source verification:**
- Does authority derive from the calibrated credibility source (Phase 0)? Yes/No

**Overall voice quality:** Strong/Adequate/Weak

#### Principle-Specific Checks (Task A Only)

**Three Tests:**
1. **Timelessness:** True beyond current technology/trends? Applicable across different scales and contexts? Pass/Fail
2. **Consequence Clarity:** Can target audience (from Phase 0) read once and understand what breaks? Pass/Fail
3. **Ambiguous Application:** Can multiple experts implement in different ways, all correctly? Pass/Fail

**Structure:**
- Follows Consequence → Framing → Directive? Yes/No
- Directive in **bold** and directional (not prescriptive)? Yes/No
- 2-4 sentences, under 280 characters? Yes/No

#### SPARK Check (Task B Only)

**Core Mechanics Present (from spark.md):**
- Specificity (concrete detail, number, or vivid image)? Yes/No
- Tension (emotional driver activated through situation)? Yes/No
- Incompleteness (open question or unresolved problem)? Yes/No

**Quality Checks (from spark.md):**
- Pull check: Does first line earn the second? Yes/No
- Uniqueness check: Specific to THIS topic? Yes/No
- Concrete check: Creates clear mental image or contains specific number? Yes/No
- Subtext check: Emotional driver clear but unnamed? Yes/No
- Connection check: Connects to what audience cares about? Yes/No

**Flow Check:**
- Can be delivered in one breath with natural emphasis? Yes/No
- Creates anticipation in the pause after? Yes/No

**Which emotional driver used:** _____________

### Phase 5: Final Assessment and Recommendations

Synthesize findings from Phase 2 (instruction quality) and Phase 4 (output quality).

#### Instruction Quality Summary (from Phase 2)

**Files reviewed:** List all files from Phase 2

**High-priority observations:** List observations that significantly impact instruction quality

**Medium-priority observations:** List moderate improvement opportunities

**Low-priority observations:** List minor refinements

**Overall instruction quality:** Excellent/Good/Adequate/Needs Work

#### Output Quality Summary (from Phase 4)

**Task A (Principle) performance:**
- Enforcement mechanisms: Pass/Fail
- Preflight checks: Pass/Fail
- Voice quality: Strong/Adequate/Weak
- Overall grade: A/B/C/D/F

**Task B (Blog Post) performance:**
- Enforcement mechanisms: Pass/Fail
- Preflight checks: Pass/Fail
- Voice quality: Strong/Adequate/Weak
- SPARK quality: Strong/Adequate/Weak
- Overall grade: A/B/C/D/F

**Pattern analysis:** What patterns emerged across both tasks?

#### System Architecture Assessment

**How well did the distributed system work?**

**Clarity of component relationships:**
- Was it clear which file to reference for each type of guidance?
- Did AGENTS.md effectively orchestrate voice.md, spark.md, and utilities?
- Were there conflicts or redundancies between files?

**Ease of use:**
- Could you navigate the system efficiently?
- Were references between files clear?
- Did the separation into multiple files help or hinder?

**Completeness:**
- Were there gaps where you needed guidance but couldn't find it?
- Were there areas with too much or conflicting guidance?

#### What Worked

List specific areas where Content Author guidance was clear and effective:
- 
- 

#### What Didn't Work

List specific moments where Content Author didn't provide clear direction:
- 
- 

#### Honest Limitations Assessment

**LLM Writing Limitations** (not Content Author problems):
List challenges inherent to LLM generation regardless of instructions:
- 
- 

**What Content Author Cannot Fix:**
Be honest about what no instruction set can solve:
- 
- 

#### Recommendations (Only If Justified)

**Before listing any recommendation:**
- Is this a Content Author problem or LLM limitation?
- Do you have evidence from test execution (Phase 2 or Phase 4) that this change would help?
- Would this make the system harder to apply?
- Did existing Content Author checks already catch this issue?

**If all answers don't support the change, write:** "None. Content Author guidance is sufficient."

**Instruction Quality Recommendations (from Phase 2):**

**High Priority** (critical gaps in instructions):
- [Observation from Phase 2]
- Evidence: [Specific instruction file and issue]
- Why existing guidance failed: [Explanation]
- Impact: [How this would improve instruction clarity/completeness]

**Medium Priority** (clarity improvements):

**Low Priority** (minor refinements):

**Output Quality Recommendations (from Phase 4):**

**High Priority** (critical gaps that impacted content quality):
- [Observation from Phase 4]
- Evidence: [Specific failure in Task A or B]
- Why existing guidance failed: [Explanation]
- Why this isn't LLM limitation: [Reasoning]
- Impact: [How this would improve output quality]

**Medium Priority** (quality improvements):

**Low Priority** (minor refinements):

**Cross-Layer Recommendations:**
Issues that connect instruction quality problems (Phase 2) with output quality problems (Phase 4):
- [If instruction clarity issues led to output failures, document here]


## Test Results

### Phase 0: Voice Calibration Results

**Extracted from voice.md:**

1. **Core Persona:** [Document extracted persona]

2. **Credibility Source:** [Document source of authority]

3. **Prohibited Elements:** [List specific jargon and patterns to avoid]

4. **Voice Principles:** [List 3-5 core principles]

5. **Target Audience Characteristics:** [Document audience profile]

6. **Appropriate Topic Domains:** [List 2-3 topic domains]

**Topics selected for test:**
- Task A: [Specific topic chosen]
- Task B: [Specific topic chosen]


### Phase 1: Inventory

**Files successfully read:**
[List all files from Phase 1]

**Files not found:**
[List any expected files missing]

**Unexpected files found:**
[List any files not in Phase 1 checklist]


### Phase 2: Instruction Quality Review

**Review methodology:** Following Play Author/AGENTS.md review process

#### File: AGENTS.md

**Salvageability:** [Salvageable/Needs Rewrite]

**Prompt-Level Assessment:**
- Objective clarity: [Assessment]
- Impact measurement: [Assessment]
- Quality checks: [Assessment]
- Completeness-conciseness: [Assessment]

**Instruction-Level Assessment:**
- Clarity: [Assessment]
- Actionability: [Assessment]
- Logical order: [Assessment]
- Specificity: [Assessment]
- Consistency: [Assessment]

**Line-Level Assessment:**
- Terminology: [Assessment]
- Clarity: [Assessment]
- Redundancy: [Assessment]

**Prioritized observations:**
[List observations with priority levels]

**Overall grade:** [A/B/C/D/F]

[Repeat above structure for each file reviewed in Phase 2:
- voice.md
- utilities/build-concepts.md
- utilities/content-review.md
- utilities/categorize content.md
- content types/spark.md
- One format file]

**Compiled Observation List (All Files):**
[Prioritized list of all observations across all reviewed files]


### Phase 3: Sample Content

#### Task A: Short-Form Principle

**Topic:** [Topic chosen in Phase 0]

**Principle:**
[Your content here]

#### Task B: Blog Post

**Topic:** [Topic chosen in Phase 0]

**Title:** [Your title here]

[Your content here]


### Phase 4: Output Quality Evaluation

#### Task A Evaluation

[Complete evaluation following Phase 4 structure:
- Enforcement Mechanisms (Bridge Check, Deletion Check)
- Preflight Checks
- Read Aloud Test
- Builder's Voice Check
- Voice Principles Check
- Principle-Specific Checks]

**Overall performance:** [Summary]

#### Task B Evaluation

[Complete evaluation following Phase 4 structure:
- Enforcement Mechanisms
- Preflight Checks
- Read Aloud Test
- Builder's Voice Check
- Voice Principles Check
- SPARK Check]

**Overall performance:** [Summary]


### Phase 5: Final Assessment

[Complete final assessment following Phase 5 structure:
- Instruction Quality Summary
- Output Quality Summary
- System Architecture Assessment
- What Worked
- What Didn't Work
- Honest Limitations Assessment
- Recommendations]

