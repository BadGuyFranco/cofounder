# Visualization Library Scripts

Reusable JavaScript templates for generating high-quality visualizations using proven libraries.

## Structure

Each script is a self-contained HTML file that includes:
- Library loaded via CDN (no installation required)
- Template for the specific visualization technique
- Clear data structure for populating the visualization
- Styled output matching Visualizer design principles

## Library Selection by Technique

| Technique | Library | Rationale | Status |
|-----------|---------|-----------|--------|
| Concept Map | Cytoscape.js | Best network visualization, automatic layouts, clean API | ✅ Complete |
| Flow Diagram | Dagre + D3 | Automatic hierarchical layout, perfect for DAGs | ✅ Complete |
| Hierarchy | D3.js | Industry standard for tree layouts | ✅ Complete |
| Mind Map | D3.js | Radial tree layout built-in | ✅ Complete |
| Timeline | vis.js Timeline | Purpose-built, handles complex timelines | ✅ Complete |
| Fishbone | D3.js | Custom layout requires full control | ✅ Complete |
| Matrix | Pure CSS/HTML | No library needed, Grid works perfectly | N/A (no script needed) |

## Available Templates

✅ **concept-map-cytoscape.html** - Network graphs with automatic force-directed layout
✅ **flow-diagram-dagre.html** - Sequential processes with automatic hierarchical positioning
✅ **hierarchy-d3.html** - Tree structures with vertical, horizontal, and radial options
✅ **mindmap-d3.html** - Radial layouts for single central concepts
✅ **timeline-vis.html** - Interactive timelines with zoom, groups, and ranges
✅ **fishbone-d3.html** - Root cause analysis diagrams (Ishikawa)

## Usage

1. Copy the appropriate script template
2. Populate the data structure at the top of the file
3. Save as .html file
4. Open in browser

All scripts are self-contained with no external dependencies beyond CDN-loaded libraries.

## Philosophy

These scripts prioritize:
1. **Correctness** - Automatic layout eliminates positioning errors
2. **Clarity** - Clean, readable code that can be modified
3. **Portability** - Single HTML files, no build process
4. **Interactivity** - Hover, zoom, pan where appropriate
5. **Cognitive fit** - Visual structure matches conceptual structure
