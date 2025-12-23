# Matrix

Visualizes comparisons across two dimensions, revealing patterns and positioning items in conceptual space.

## Cognitive Purpose

Activates dimensional comparison and pattern detection. Viewers understand how items differ across criteria, see clusters and outliers, and grasp interaction effects between dimensions.

## When to Use

**Structure signals:**
- Items can be compared on two independent dimensions
- Positioning matters (high/low, more/less)
- Patterns emerge from seeing many items at once
- Trade-offs exist between dimensions

**Best for:**
- Strategic positioning (BCG matrix, Eisenhower matrix)
- Feature comparison tables
- Decision matrices
- SWOT-style analysis
- Risk assessment (probability × impact)

**Not for:**
- More than 2 primary dimensions (requires other techniques)
- Sequential relationships (use Flow)
- Hierarchical relationships (use Hierarchy)

## Layout Principles

**2×2 Matrix (quadrant):**
- Two dimensions, each split into high/low
- Creates 4 distinct quadrants
- Each quadrant has a meaning (label it)
- Items placed within quadrants by their values

**Comparison Matrix (table-style):**
- Rows = items being compared
- Columns = criteria
- Cells = assessment on that criterion
- Good for 3+ items, 3+ criteria

**Positioning Matrix (scatter-style):**
- Two continuous dimensions (not just high/low)
- Items placed at specific positions
- Shows relative positioning
- Good for seeing clusters and gaps

**Axis principles:**
- Dimensions must be independent (orthogonal)
- Clear labels on each axis
- Direction indicated (what does up/right mean?)
- Consider what each quadrant/region means

## Required Labels

**Axes:** Both dimensions must be labeled with what they measure

**Quadrants (for 2×2):** Each quadrant should have a name that conveys its meaning:
- Example: "Stars" (high growth, high share), "Cash Cows" (low growth, high share)

**Items:** Each item in the matrix must be identifiable

**Cells (for comparison tables):** Rating scale or values must be clear

## Complexity Management

**Threshold for items:** 15-20 items visible at once

**Threshold for dimensions:** 2 primary dimensions (use color or size for a 3rd if needed)

**Above thresholds:**
- Filter by category
- Zoom into regions
- Use tabs or filters to show subsets
- Split into multiple matrices

**For comparison tables:**
- Keep columns to 5-7 criteria
- Group related criteria
- Use visual indicators (icons, colors) not just text

## Interactivity (HTML)

**Required:**
- Hover on item: Show full details
- For comparison tables: Highlight row/column on hover
- Clear axis labels visible at all zoom levels

**Recommended:**
- Click item to see detail panel
- Filter by category or criteria
- Sort comparison tables by column
- Zoom and pan for dense positioning matrices

## Common Mistakes

**Redundant dimensions:** If the two axes measure similar things (cost and price), the matrix adds no insight. Dimensions must be independent.

**Unlabeled quadrants:** For 2×2 matrices, each quadrant should have a meaningful name. Otherwise viewers don't know what positioning means.

**Too many items without grouping:** A dense matrix with 50+ items and no clustering is noise. Group, filter, or split.

**Inconsistent scale:** If "up" means "good" on one axis but "bad" on another, the matrix misleads. Be consistent or very explicit.

**Missing comparison logic:** For decision matrices, explain what high/low scores mean for the decision.

## Example Structures

**2×2 Quadrant:**
```
                High [Dimension Y]
                      │
    ┌─────────────────┼─────────────────┐
    │   Quadrant A    │   Quadrant B    │
    │   (meaning)     │   (meaning)     │
    │      • Item 1   │      • Item 3   │
    │      • Item 2   │                 │
Low ├─────────────────┼─────────────────┤ High
[Dim│   Quadrant C    │   Quadrant D    │[Dimension X]
 X] │   (meaning)     │   (meaning)     │
    │                 │      • Item 4   │
    │      • Item 5   │      • Item 6   │
    └─────────────────┼─────────────────┘
                      │
                Low [Dimension Y]
```

**Comparison Table:**
```
┌──────────────┬────────┬────────┬────────┐
│    Item      │ Crit.1 │ Crit.2 │ Crit.3 │
├──────────────┼────────┼────────┼────────┤
│ Option A     │   ★★★  │   ★★   │   ★    │
│ Option B     │   ★★   │   ★★★  │   ★★★  │
│ Option C     │   ★    │   ★★   │   ★★   │
└──────────────┴────────┴────────┴────────┘
```

Visual encoding:
- Position = meaning (quadrants, rows, columns)
- Color = category or rating
- Size = importance (optional)
- Icons/ratings = assessment

