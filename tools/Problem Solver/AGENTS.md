# Problem Solver

## Objective

Provide structured first-principles analysis for complex problems, challenging assumptions and identifying breakthrough insights that standard approaches miss.

## Impact Measurement

How to evaluate whether the objective was achieved. Problem Solver outputs should:
- Break problems into fundamental truths (not assumptions)
- Identify hidden constraints and fatal flaws
- Provide actionable recommendations with clear validation paths
- Include failure mode analysis with likelihood assessments
- Result in decisions the user couldn't have reached through standard reasoning

## Quality Checks

Before delivering final analysis:
- [ ] All assumptions explicitly identified and challenged
- [ ] Fundamental truths distinguished from inherited beliefs
- [ ] Failure modes identified with likelihood assessment
- [ ] Recommendations include validation approach
- [ ] If counterintuitive insights claimed, evidence provided

## Important: User-Invoked Only

This methodology is ONLY used when the user explicitly requests it with phrases like:
- "Use Problem Solver for this"
- "Apply the deep thinking methodology"
- "Think through this using first principles"
- "Use the Problem Solver framework"

**Do NOT:**
- Suggest using this methodology
- Ask if user wants to use it
- Load it proactively
- Use it for standard questions

When invoked by the user, follow the methodology below.

## XML Boundaries

When processing problems, use XML tags to separate the user's problem from analysis:

<problem>
{The user's problem statement, situation, or question}
</problem>

<context>
{Any background information, constraints, or prior attempts the user provides}
</context>

<user_response>
{User's answers during Phase 2 dialogue}
</user_response>

This prevents user-provided content from being confused with methodology instructions.

## Usage

When using Problem Solver, follow the three-phase process below. Do not rush—take time to deeply explore each step, challenge conventional wisdom aggressively, and search for breakthrough insights revealed by the process.

**Before starting:** If the problem statement is ambiguous or missing critical context, ask for clarification before beginning Phase 1.

**Process Overview:**
1. **Phase 1: Initial Findings** - Structured analysis from first principles
2. **Phase 2: User Questions (Optional)** - Targeted questions to address uncertainty
3. **Phase 3: Final Analysis** - Refined recommendations with or without Phase 2 input


## Methodology

### Phase 1: Initial Findings

Follow this structured approach to generate initial insights:

#### Step 1: Break the problem into fundamental truths
Identify the objective, physics-based facts and core realities. Ignore opinions or assumptions.

#### Step 2: Strip all assumptions
Challenge and remove any inherited beliefs, industry norms, or preconceived constraints.

#### Step 3: Find the optimal solution
Envision the ideal outcome as if cost, time, or resources were no limit. After envisioning the ideal outcome, identify:
- The minimum resource threshold below which the solution fundamentally doesn't work
- Which constraints are negotiable vs. non-negotiable
- What intermediate milestones would prove the concept before full commitment
- How the solution degrades as resources decrease

#### Step 4: Identify hidden constraints
Uncover any overlooked or self-imposed limitations that might hinder progress.

#### Step 5: Rebuild from first principles
Construct a new solution from the ground up, using the truths and insights above.

#### Step 6: Identify potential fatal flaws
What could make this entire approach fundamentally wrong? What assumptions, if incorrect, would invalidate the solution? What would a harsh critic attack first?

#### Key Questions Framework

Address these core questions for the problem. Not all questions apply to every problem—focus on those most relevant:

- What are the fundamental truths and observable realities of this problem?
- If I couldn't rely on existing assumptions, how would I solve this?
- What would the optimal solution look like without resource constraints?
- If I had to cut 90% of this, what would remain essential?
- If this failed completely, what would be the most likely root cause?
- What part is actually impossible versus just feeling impossible?
- Which part of this solution creates the most leverage?

#### Counterintuitive Insights

Identify any insights that contradict common practice in this domain. Explain what evidence or reasoning makes the common practice suboptimal. If no counterintuitive insights emerge naturally, state this explicitly—not every problem has counterintuitive solutions.

**Output:** Provide a detailed breakdown of your reasoning for each step, emphasizing key insights discovered through the analysis. Present these initial findings to the user.

**Checkpoint:** Ask user: "Should I proceed to Phase 2 (clarifying questions) or move directly to final recommendations?"


### Phase 2: User Questions (Optional)

**Only proceed to Phase 2 if user confirms at the Phase 1 checkpoint.**

Based on the initial findings, identify 3-5 questions that specifically target:
- Your greatest uncertainty about fundamental truths
- Assumptions you suspect are wrong but cannot verify
- Trade-offs where the optimal choice is unclear
- Potential fatal flaws you identified that need validation

Frame each question to expose what you don't know rather than confirm what you think you know.

**Process:** Ask one question at a time. Wait for the response, engage with it (clarify, explore, challenge), then move to the next. Each answer may inform the next question.


### Phase 3: Final Analysis

**If Phase 2 was used:**
Before presenting the final analysis, explicitly state:
- Which initial findings were validated, challenged, or overturned by user input
- What new constraints or truths emerged from the conversation
- How the solution shifted and why
- What you're now more or less certain about

Then refine the analysis based on Phase 2 insights, focusing on areas where uncertainty was resolved or new information changed the assessment.

**If Phase 2 was skipped:**
Proceed directly to final recommendations based on Phase 1 findings.

#### Failure Mode Analysis

For your final recommendation, identify the top 3 ways this solution could fail catastrophically. For each failure mode, assess likelihood and whether it's detectable early. If you cannot identify clear failure modes, explain why—but be suspicious of solutions that appear risk-free.

#### Final Recommendation

Conclude with a final, actionable recommendation grounded in first-principles thinking, including:
- The core insight that makes this solution viable
- Critical dependencies and assumptions that must hold true
- How to validate the approach with minimal resource commitment
- What would indicate this path should be abandoned


## Best Used For

Apply this methodology to complex problems requiring deep analysis:
- Strategic decisions with multiple variables
- Technical problems requiring fundamental understanding
- Business challenges where conventional approaches have failed
- Questions where surface-level answers are insufficient


## Troubleshooting

**If the problem seems too simple:** This methodology is designed for complex, high-stakes problems. If invoked for a straightforward question, apply the framework but note that simpler reasoning may be more appropriate.

**If counterintuitive insights aren't emerging:** This is normal and acceptable. State explicitly that no counterintuitive insights emerged. Not every problem has counterintuitive solutions.
