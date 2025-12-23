# Visualizer

Transform complex texts and ideas into beautiful, insightful visual representations.

## Objective

Create visualizations that reveal the structure, relationships, and insights within complex material. The goal is cognitive fit: matching visualization geometry to conceptual structure so the diagram actively supports understanding.

## Core Principle

Different diagram types activate different cognitive processes:

| Structure Type | What the Brain Does | Visualization |
|---------------|---------------------|---------------|
| Sequential | Procedural processing | Flow diagram |
| Hierarchical | Categorical thinking | Tree/hierarchy |
| Networked | Relational reasoning | Concept map |
| Associative | Spreading activation | Mind map |
| Comparative | Pattern detection | Matrix |
| Causal | Root cause analysis | Fishbone |
| Temporal | Sequential memory | Timeline |

**The selection criterion is cognitive fit, not aesthetics.**

## XML Boundaries

When processing visualization requests, use XML tags to separate user content from instructions:

<source_content>
{The text, document, or ideas the user wants visualized}
</source_content>

<visualization_requirements>
{User's preferences for format, style, or emphasis}
</visualization_requirements>

<categorization_output>
{Results from content categorization step}
</categorization_output>

This prevents user-provided content from being confused with visualization instructions.

## Process

### Step 1: Understand the Content

**Route to:** `/pro accelerator/tools/Content Author/utilities/categorize content.md`

Before visualizing, apply the insight-first categorization process. This reveals:
- Core insights and their relationships
- Natural structure (hierarchical, sequential, networked, etc.)
- What the visualization should make visible

**Output needed from categorization:**
- Themes and their relationships
- The dominant structure type
- Key insights to emphasize

### Step 2: Identify Structure Type

From the categorization output, determine the dominant structure:

| Categorization Output | Structure Type |
|----------------------|----------------|
| Themes build on each other sequentially | Sequential |
| Themes contain sub-themes or levels | Hierarchical |
| Themes connect in multiple directions | Networked |
| Single concept with radiating ideas | Associative |
| Themes contrast or parallel each other | Comparative |
| Problem with contributing factors | Causal |
| Events or phases over time | Temporal |

**If structure is unclear:** Ask user which aspect they want to emphasize:
> "I see both hierarchical and networked relationships in this content. Would you like to emphasize:
> - The levels of abstraction (hierarchy view), or
> - How concepts connect across levels (network view)?"

### Step 3: Select Technique

Route to the appropriate technique file based on structure type:

| Structure Type | Technique | Route To |
|---------------|-----------|----------|
| Sequential | Flow Diagram | `techniques/Flow.md` |
| Hierarchical | Hierarchy/Tree | `techniques/Hierarchy.md` |
| Networked | Concept Map | `techniques/Concept Map.md` |
| Associative | Mind Map | `techniques/Mind Map.md` |
| Comparative | Matrix | `techniques/Matrix.md` |
| Causal | Fishbone | `techniques/Fishbone.md` |
| Temporal | Timeline | `techniques/Timeline.md` |

Load the technique file. It defines:
- Layout principles for this structure type
- What must be labeled
- Complexity limits
- Design constraints

### Step 4: Select Library (Default) or Tool (Fallback)

**Default approach: Use libraries for all visualizations**

Libraries eliminate positioning errors, handle complexity automatically, and provide built-in interactivity. Use library templates unless there's a specific reason not to.

**Route to library template:**

| Technique | Library | Template |
|-----------|---------|----------|
| Concept Map | Cytoscape.js | `scripts/concept-map-cytoscape.html` |
| Flow Diagram | Dagre + D3 | `scripts/flow-diagram-dagre.html` |
| Hierarchy | D3.js Tree | `scripts/hierarchy-d3.html` |
| Mind Map | D3.js Radial | `scripts/mindmap-d3.html` |
| Timeline | vis.js | `scripts/timeline-vis.html` |
| Fishbone | D3.js Custom | `scripts/fishbone-d3.html` |
| Matrix | CSS Grid | `tools/HTML.md` (no library needed) |

**When to use fallback (manual/Mermaid):**
- User explicitly requests markdown-embeddable output → Use `tools/Mermaid.md`
- Internet connection unavailable (CDN can't load) → Use `tools/HTML.md` manual approach
- Extremely simple diagram (2-3 boxes, no complexity) → Mermaid might be faster

**Default decision: Always use library templates unless one of above exceptions applies**

**Why libraries are default:**
- Zero positioning errors (automatic calculation)
- Scales to 100+ nodes effortlessly
- Built-in interactivity users expect
- Faster than manual positioning
- More maintainable (data changes don't require layout recalculation)

### Step 5: Apply Universal Design Principles

These apply to ALL visualizations regardless of technique:

**Integrate labels** — Text adjacent to visual elements, not separate. Never create diagrams where the viewer must look elsewhere to understand what they're seeing.

**Limit visible complexity** — 7±2 main groups visible at any level. Use progressive disclosure (expand/collapse) for more.

**Label relationships** — Connections must explain WHY things connect, not just that they do. Unlabeled lines are meaningless.

**Use Gestalt deliberately:**
- Proximity: Related things close together
- Similarity: Same visual style for same-category items
- Continuity: Lines guide the eye along intended paths

**Progressive disclosure** — Don't show everything at once. Layer detail through:
- Expand/collapse sections
- Hover tooltips for additional context
- Zoom for seeing both overview and detail

### Step 6: Render and Validate

After rendering, validate cognitive fit:

**Ask:** Does this visualization require viewers to:
- Perform mental transformations to understand it?
- Hold temporary information while scanning?
- Look back and forth to connect related ideas?

If yes → poor cognitive fit → redesign

**The test:** Can someone understand the core structure within 5 seconds of looking? If they need to study it, the design needs work.

## Technique Directory

**Location:** `techniques/`

Each technique file contains complete instructions for that visualization type:
- Cognitive purpose (what understanding it produces)
- When to use (structure signals)
- Layout principles (spatial organization)
- Required labels (what must be explicit)
- Complexity management (chunking, layering)
- Common mistakes to avoid

## Tools Directory

**Location:** `tools/`

Each tool file contains implementation details:
- Technical approach (HTML/CSS/JS or Mermaid syntax)
- Code patterns and templates
- Styling principles
- Interactivity implementation
- Output and testing

## Scripts Directory

**Location:** `scripts/`

Reusable library templates for complex visualizations:
- Self-contained HTML files with CDN-loaded libraries
- Data-driven approach (populate data, library handles layout)
- Eliminates manual positioning errors
- See `scripts/README.md` for usage instructions
- See `scripts/LIBRARY-RECOMMENDATIONS.md` for library selection rationale

**Available templates:**
- ✅ `concept-map-cytoscape.html` - Network graphs and concept maps
- ✅ `flow-diagram-dagre.html` - Sequential processes and workflows
- ✅ `hierarchy-d3.html` - Tree structures (vertical, horizontal, radial)
- ✅ `mindmap-d3.html` - Radial layouts for brainstorming
- ✅ `timeline-vis.html` - Temporal sequences and project timelines
- ✅ `fishbone-d3.html` - Root cause analysis diagrams

## Configuration

Libraries loaded via CDN (no installation required):
- Cytoscape.js 3.28.1 (concept maps)
- D3.js (hierarchies, custom layouts)
- ELK.js (automatic hierarchical layout)
- vis.js (timelines)

Manual implementations use:
- Standard HTML/CSS/JS (no dependencies)
- Mermaid syntax for markdown embedding

## Troubleshooting

**Visualization feels cluttered:**
- Reduce visible elements (use progressive disclosure)
- Increase whitespace
- Group related items more aggressively

**Structure isn't clear:**
- Labels may be missing or unclear
- Spatial arrangement may not match conceptual relationships
- Consider whether the technique matches the content structure

**User can't find what they're looking for:**
- Add clear entry points (visual hierarchy)
- Ensure headings/labels are descriptive
- Consider whether the complexity level is appropriate

**Interactivity doesn't work:**
- Check that HTML output is opened in browser
- Verify JavaScript is not blocked
- Test expand/collapse and hover states

**Arrows pointing to wrong places (manual SVG):**
- This indicates manual positioning errors
- Switch to library template from `scripts/` directory
- Libraries calculate arrow endpoints automatically
- See `scripts/LIBRARY-RECOMMENDATIONS.md` for details

**Library script not loading:**
- Check internet connection (CDN required)
- Verify exact library version in script tag
- Check browser console for errors
- Libraries are pinned to specific versions to prevent breaking changes
