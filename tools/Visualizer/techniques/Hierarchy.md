# Hierarchy

Visualizes parent-child relationships, levels of abstraction, and part-whole structures as tree diagrams.

## Cognitive Purpose

Activates categorical thinking and part-whole reasoning. Viewers understand what belongs to what, levels of abstraction, and how components compose larger wholes.

## When to Use

**Structure signals:**
- Clear parent-child relationships
- Levels of abstraction (general → specific)
- Components within larger systems
- Classifications or taxonomies

**Best for:**
- Organizational structures
- Taxonomies (categories containing subcategories)
- Document or content outlines
- Feature breakdowns (system → subsystem → component)
- Decision trees with clear branching

**Not for:**
- Cross-connections between branches (use Concept Map)
- Sequential processes (use Flow)
- Comparisons across dimensions (use Matrix)

## Layout Principles

**Orientation options:**
- **Top-down:** Root at top, children below (default, most intuitive)
- **Left-right:** Root at left, children to right (good for text-heavy nodes)
- **Radial:** Root at center, children radiating outward (compact but harder to read)

**Spatial rules:**
- Vertical position = level of abstraction
- Horizontal position = siblings (same level)
- Equal spacing between siblings at same level
- Clear visual distinction between levels

**Connections:**
- Lines from parent to child
- No labels needed (relationship is implicit: "contains" or "is parent of")
- Consistent line style within diagram

**Nodes:**
- Consistent shape per level (e.g., rectangles for all)
- Size can decrease at lower levels
- Limit label length; details in tooltips

## Required Labels

**Every node must have a label.** The label is the name of that element.

**Level indicators (optional but helpful):**
- Visual differentiation between levels (color, size, font weight)
- Or explicit level names in the structure

## Complexity Management

**Width threshold:** 7±2 children per parent

**Depth threshold:** 4-5 levels visible at once

**Above thresholds:**
- Collapse branches by default
- Show expand/collapse controls
- Use "..." or count indicators for collapsed content
- Consider splitting into multiple diagrams if tree is very large

**Progressive disclosure:**
- Level 1: Top 2 levels visible
- Expand: Click to reveal children
- Never show all levels fully expanded if tree is large

## Interactivity (HTML)

**Required:**
- Click to expand/collapse branches
- Visual indicator of collapsed state (arrow, +/-)
- Hover on node: Show full description

**Recommended:**
- Expand all / Collapse all controls
- Breadcrumb showing current path when deep
- Highlight path to root on selection

## Common Mistakes

**Too wide:** More than 7-8 children at one level creates scanning problems. Group into intermediate categories.

**Too deep without collapse:** Showing 6+ levels at once overwhelms. Use progressive disclosure.

**Inconsistent levels:** If some branches go 5 levels deep and others only 2, the structure feels unbalanced. Consider whether all content is at the right level of abstraction.

**Cross-connections:** If items at different branches need to connect, a hierarchy is the wrong technique. Use Concept Map.

## Example Structure

```
[Root Concept]
    ├── [Category A]
    │       ├── [Item A1]
    │       ├── [Item A2]
    │       └── [Item A3]
    ├── [Category B]
    │       ├── [Item B1]
    │       └── [Item B2]
    └── [Category C]
            ├── [Item C1]
            └── [Item C2]
```

Visual encoding:
- Root: Largest, boldest
- Categories: Medium size
- Items: Smallest
- Lines: Connect parent to children
- Indentation: Shows nesting level

