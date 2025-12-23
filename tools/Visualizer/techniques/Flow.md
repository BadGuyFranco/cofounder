# Flow Diagram

Visualizes sequential processes, procedures, and decision logic as step-by-step paths.

## Cognitive Purpose

Activates sequential processing and procedural memory. Viewers understand what happens first, what happens next, and how decisions create different paths.

## When to Use

**Structure signals:**
- Steps must happen in order
- Decisions branch the path
- Cause leads to effect in sequence
- Process has a start and end

**Best for:**
- Procedures and workflows
- Decision trees with if-then logic
- Troubleshooting guides
- User journeys
- Algorithms

**Not for:**
- Concepts without sequence (use Concept Map)
- Hierarchy without flow (use Hierarchy)
- Comparing options (use Matrix)

## Layout Principles

**Direction:**
- **Top-to-bottom:** Default for most processes
- **Left-to-right:** Good when steps have substantial text
- Consistent direction throughout (don't mix)

**Node shapes (standard conventions):**
- **Rectangles:** Process steps (actions)
- **Diamonds:** Decision points (yes/no, conditions)
- **Rounded rectangles/ovals:** Start and end points
- **Parallelograms:** Input/output (optional, for technical flows)

**Connections:**
- Arrows showing direction of flow
- Labels on decision branches (Yes/No, or condition)
- Merge points clearly indicated

**Spacing:**
- Equal vertical spacing between sequential steps
- Decision branches spread horizontally
- Avoid crossing lines when possible

## Required Labels

**Every step must have an action label.** Use verb phrases:
- "Check inventory"
- "Send notification"
- "Wait for response"

**Every decision branch must be labeled:**
- "Yes" / "No"
- Specific conditions: "Amount > $500" / "Amount ≤ $500"

## Complexity Management

**Threshold:** 15-20 nodes maximum in a single flow

**Above threshold:**
- Break into sub-processes
- Use "sub-process" nodes that link to detail
- Show overview flow, click to expand sections

**Parallel paths:**
- Use swimlanes for different actors/systems
- Clearly show synchronization points

**Progressive disclosure:**
- Level 1: Main process steps
- Level 2: Sub-process details (on click)
- Never show everything at once for complex flows

## Interactivity (HTML)

**Required:**
- Click sub-process to expand details
- Hover on step: Show full description/context
- Clear visual path highlighting

**Recommended:**
- Animate flow direction on hover
- Highlight current path through decision points
- "Where am I?" indicator for complex flows

## Common Mistakes

**Too many decision branches:** More than 2-3 branches from a single decision creates confusion. Break complex decisions into sequential checks.

**Missing labels on decisions:** Every branch must say what condition leads there.

**Crossing lines:** Indicates the flow is too complex or poorly laid out. Reorganize or split.

**No clear start/end:** Viewer doesn't know where to begin reading.

**Mixing sequence with network:** If steps don't have a clear order, this isn't a flow—use Concept Map.

## Example Structure

```
    [Start]
        ↓
    [Step 1: Action]
        ↓
    <Decision?>
      /     \
   Yes       No
    ↓         ↓
[Step 2A]  [Step 2B]
    \        /
     ↓      ↓
    [Step 3: Merge]
        ↓
      [End]
```

Visual encoding:
- Rectangles: Actions
- Diamond: Decision
- Ovals: Start/End
- Arrows: Direction
- Labels: On every branch

