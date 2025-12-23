# Concept Map

Visualizes networks of relationships between multiple concepts with explicitly labeled connections.

## Cognitive Purpose

Activates relational reasoning. Viewers understand how concepts connect, influence, and depend on each other through multiple pathways.

## When to Use

**Structure signals:**
- Multiple concepts that connect in various directions
- No single hierarchy dominates
- Understanding requires seeing how ideas relate to each other
- Cross-connections matter as much as groupings

**Best for:**
- Showing how theories or frameworks interrelate
- Teaching complex systems with multiple causal pathways
- Mapping domains where everything connects to everything
- Revealing hidden relationships between familiar concepts

**Not for:**
- Single central concept (use Mind Map)
- Clear hierarchy with levels (use Hierarchy)
- Sequential processes (use Flow)

## Layout Principles

**Spatial organization:**
- Related concepts closer together (proximity = relationship strength)
- Clusters for conceptual groups
- Central placement for most-connected concepts
- Peripheral placement for supporting concepts

**Connection lines:**
- Labeled with relationship type (causes, enables, requires, contradicts, etc.)
- Directional arrows when relationship has direction
- Line weight can indicate strength
- Curved lines to avoid crossing when possible

**Nodes (concepts):**
- Consistent shape for same-type concepts
- Size can indicate importance
- Color coding for categories (limit to 5-7 colors)
- Brief labels inside nodes; details in tooltips

## Required Labels

**Every connection must have a label.** This is non-negotiable.

The label answers: "What is the relationship between these concepts?"

Good labels:
- "enables"
- "requires"
- "contradicts"
- "leads to"
- "depends on"
- "is example of"

Bad labels:
- "relates to" (too vague)
- "connected" (meaningless)
- No label (viewer must guess)

## Complexity Management

**Threshold:** 15-20 nodes maximum in a single view

**Above threshold:**
- Group into clusters, show collapsed view
- Expand clusters on click
- Use zoom to navigate between overview and detail
- Consider splitting into linked diagrams

**Progressive disclosure:**
- Level 1: Main concepts and primary relationships
- Level 2: Supporting concepts within clusters
- Level 3: Full detail with all connections

## Interactivity (HTML)

**Required:**
- Hover on node: Show full description/definition
- Hover on connection: Highlight the relationship label
- Click cluster: Expand to show internal structure

**Recommended:**
- Zoom controls (overview ↔ detail)
- Highlight connected nodes on selection
- Filter by relationship type

## Common Mistakes

**Unlabeled connections:** The most common failure. A line without a label is meaningless.

**Too many connections visible:** If everything connects to everything, nothing is clear. Show primary relationships; put secondary in tooltips or collapsed view.

**Poor spatial arrangement:** Concepts should be close to their most important connections. Random placement forces mental work.

**Inconsistent visual encoding:** If blue means one thing in one area and something else elsewhere, the diagram fails.

**Manual positioning errors:** Arrows pointing to wrong places, connections misaligned. This signals you should use the Cytoscape.js template instead of manual SVG.

## Implementation Recommendation

**For 10+ nodes or cross-connections:** Use `scripts/concept-map-cytoscape.html`

The Cytoscape.js library template eliminates manual positioning errors by:
- Calculating arrow endpoints automatically
- Providing 7+ layout algorithms (force-directed, hierarchical, circular, etc.)
- Handling complex networks with 100+ nodes
- Built-in interactivity (zoom, pan, node dragging)

**How to use the template:**
1. Copy `scripts/concept-map-cytoscape.html`
2. Modify the `nodes` and `edges` arrays at the top
3. Library automatically positions everything
4. Try different layouts to find best fit

**For simple diagrams (< 10 nodes):** Manual HTML/SVG from `tools/HTML.md` is acceptable

## Example Structure

```
[Concept A] --enables--> [Concept B]
     |                        |
     | requires               | leads to
     v                        v
[Concept C] <--contradicts-- [Concept D]
```

Each node: Brief label, full description in tooltip  
Each connection: Explicit relationship verb  
Spatial: Related concepts clustered, cross-connections visible

