# Mermaid Tool

Renders simple visualizations using Mermaid text-based diagram syntax.

## Overview

Mermaid is a lightweight alternative to HTML for simple diagrams. Write text, get diagrams.

**Use when:**
- Quick, simple diagram needed
- Output will embed in markdown documentation
- Diagram has < 10 elements
- Minimal interactivity is acceptable

**Don't use when:**
- Complex layout required
- Interactivity (expand/collapse, zoom) needed
- Fine-grained styling control required
- Concept maps with many cross-connections

## Supported Techniques

| Technique | Mermaid Support | Notes |
|-----------|-----------------|-------|
| Flow | Excellent | Primary use case |
| Hierarchy | Good | Use graph TD |
| Timeline | Good | Use timeline syntax |
| Concept Map | Limited | Cross-connections difficult |
| Mind Map | Limited | Use mindmap syntax (newer) |
| Matrix | Not supported | Use HTML |
| Fishbone | Not supported | Use HTML |

## Output Format

Mermaid code in a markdown code block:

````markdown
```mermaid
graph TD
    A[Start] --> B[Step 1]
    B --> C{Decision}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
```
````

## Syntax Reference

### Flow Diagrams

**Direction options:**
- `TB` or `TD`: Top to bottom
- `BT`: Bottom to top
- `LR`: Left to right
- `RL`: Right to left

**Node shapes:**
```mermaid
graph LR
    A[Rectangle]
    B(Rounded)
    C([Stadium])
    D[[Subroutine]]
    E[(Database)]
    F((Circle))
    G{Diamond}
    H{{Hexagon}}
```

**Connection types:**
```mermaid
graph LR
    A --> B  %% Arrow
    A --- B  %% Line
    A -.-> B %% Dotted arrow
    A ==> B  %% Thick arrow
    A -->|label| B %% Labeled
```

**Example flow:**
```mermaid
graph TD
    Start([Start]) --> Input[/Get Input/]
    Input --> Check{Valid?}
    Check -->|Yes| Process[Process Data]
    Check -->|No| Error[Show Error]
    Error --> Input
    Process --> Output[/Display Result/]
    Output --> End([End])
```

### Hierarchy (as Graph)

```mermaid
graph TD
    Root[Company]
    Root --> Dept1[Engineering]
    Root --> Dept2[Marketing]
    Root --> Dept3[Sales]
    Dept1 --> Team1[Frontend]
    Dept1 --> Team2[Backend]
    Dept2 --> Team3[Content]
    Dept2 --> Team4[SEO]
```

### Timeline

```mermaid
timeline
    title Project Timeline
    2023 : Planning Phase
         : Requirements gathered
         : Team assembled
    2024 : Development Phase
         : MVP launched
         : User testing
    2025 : Growth Phase
         : Scale operations
```

### Mind Map (newer syntax)

```mermaid
mindmap
    root((Central Idea))
        Branch1
            Leaf1a
            Leaf1b
        Branch2
            Leaf2a
            Leaf2b
            Leaf2c
        Branch3
            Leaf3a
```

### Concept Map (limited)

Use subgraphs for grouping, but cross-connections become messy:

```mermaid
graph LR
    subgraph Group1[Category A]
        A1[Concept 1]
        A2[Concept 2]
    end
    subgraph Group2[Category B]
        B1[Concept 3]
        B2[Concept 4]
    end
    A1 -->|enables| B1
    A2 -->|requires| B2
```

## Styling in Mermaid

**Node styling:**
```mermaid
graph LR
    A[Default]
    B[Styled]
    style B fill:#f9f,stroke:#333,stroke-width:2px
```

**Class-based styling:**
```mermaid
graph LR
    A[Node A]:::important
    B[Node B]:::warning
    classDef important fill:#10b981,color:white
    classDef warning fill:#f59e0b,color:white
```

**Link styling:**
```mermaid
graph LR
    A --> B
    linkStyle 0 stroke:#ff0000,stroke-width:2px
```

## Limitations

**No interactivity:** Mermaid diagrams are static. No expand/collapse, no hover details, no zoom.

**Limited layout control:** Mermaid auto-layouts. You can't precisely position elements.

**Complex diagrams break:** More than 15-20 nodes with many connections becomes unreadable.

**Concept maps difficult:** Cross-connections create visual chaos. Use HTML for true concept maps.

**No matrix support:** 2x2 matrices and comparison tables require HTML.

**No fishbone support:** The fishbone structure isn't a native Mermaid diagram type.

## When to Recommend HTML Instead

If any of these apply, use HTML tool:
- User needs interactivity
- Diagram has > 15 elements
- Layout precision matters
- Technique is Matrix or Fishbone
- Concept map has many cross-connections
- Fine-grained styling required

## Rendering

Mermaid diagrams render in:
- GitHub markdown
- GitLab markdown
- Notion
- Obsidian
- VS Code with Mermaid extension
- Any markdown renderer with Mermaid support

For standalone use, wrap in HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="mermaid">
        graph TD
            A --> B
    </div>
    <script>mermaid.initialize({startOnLoad: true});</script>
</body>
</html>
```

## Troubleshooting

**Diagram not rendering:** Check syntax carefully. Missing arrows or brackets break parsing.

**Layout is wrong:** Mermaid auto-layouts. Try changing direction (TD vs LR) or restructuring connections.

**Labels cut off:** Keep labels short. Long text breaks layout.

**Colors not showing:** Verify style/classDef syntax is correct.

