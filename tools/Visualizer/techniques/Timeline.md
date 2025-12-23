# Timeline

Visualizes events, phases, or milestones in temporal sequence, showing duration and dependencies over time.

## Cognitive Purpose

Activates temporal reasoning and sequential memory. Viewers understand when things happened, how long they took, what overlapped, and how events relate across time.

## When to Use

**Structure signals:**
- Events have specific times or order
- Duration matters
- Temporal relationships reveal patterns
- History or planned sequence is the focus

**Best for:**
- Historical narratives
- Project planning with milestones
- Product roadmaps
- Process phases over time
- Event sequencing

**Not for:**
- Processes without time dimension (use Flow)
- Cause-effect relationships (use Fishbone or Concept Map)
- Comparisons (use Matrix)

## Layout Principles

**Orientation:**
- **Horizontal:** Time flows left-to-right (most intuitive for Western audiences)
- **Vertical:** Time flows top-to-bottom (good for long timelines in scrolling contexts)

**Time axis:**
- Clearly marked scale (years, months, days, hours)
- Consistent spacing = consistent time intervals
- Major tick marks for significant periods
- Today/now marker if relevant

**Events/milestones:**
- Points on the timeline for specific moments
- Bars/spans for durations
- Position = when
- Length = how long (for durations)
- Labels above or below timeline

**Parallel tracks (for multiple streams):**
- Separate horizontal lanes
- Show how different threads overlap
- Clear lane labels
- Connections between lanes for dependencies

## Required Labels

**Time scale:** What the intervals represent

**Events:** Name and date/time

**Durations:** Start, end, and what the period represents

**Dependencies (if shown):** What must happen before what

## Complexity Management

**Threshold:** 15-20 events visible at once

**Above threshold:**
- Zoom levels (decade → year → month)
- Filter by category or stream
- Collapse minor events, show major milestones
- Paginate or scroll for long timelines

**Progressive disclosure:**
- Level 1: Major milestones only
- Level 2: Expand to show detail within a period
- Level 3: Full detail on click

**Dense periods:**
- Stack events vertically when many occur close together
- Use callouts or pop-ups for detail
- Consider logarithmic scale if time distribution is uneven

## Interactivity (HTML)

**Required:**
- Hover on event: Show full details, description
- Zoom in/out on time scale
- Pan along timeline

**Recommended:**
- Filter by category (show only certain types of events)
- Click event to expand detail panel
- "Now" indicator for ongoing timelines
- Snap to major periods (decades, years)

## Common Mistakes

**Inconsistent scale:** If 1 inch = 1 year in one section and 1 month in another, viewers will be misled. Keep scale consistent or clearly mark transitions.

**Too many events without hierarchy:** 50 events all at the same visual weight creates noise. Distinguish major from minor.

**No time markers:** Viewers can't orient without knowing what time period they're looking at.

**Overcrowded dense periods:** If many events cluster, they become unreadable. Stack, callout, or provide zoom.

**Missing duration for long-running items:** If something lasted 5 years, show the span, don't just mark the start.

## Example Structures

**Simple horizontal timeline:**
```
2020        2021        2022        2023        2024
  │           │           │           │           │
  ●───────────────────────●───────────●           │
  Event A                 Event B     Event C     │
  (start)                (milestone) (end)        │
                                                  ▼
                                               [Now]
```

**With durations:**
```
2020        2021        2022        2023        2024
  │           │           │           │           │
  ├═══════════════════════┤                       │
  │      Phase 1          │                       │
  │                       ├═══════════════════════┤
  │                       │      Phase 2          │
  │           ●           │           ●           │
  │        Milestone A    │        Milestone B    │
```

**Multiple tracks:**
```
Track A: ───●───────────●─────────────●───────────
Track B: ─────────●─────────●───────────────●─────
Track C: ───────────────────●─────────●───────────
            2020    2021    2022    2023    2024
```

Visual encoding:
- Position = time
- Length = duration
- Points = specific events
- Bars = periods/phases
- Color = category or stream
- Connections = dependencies

