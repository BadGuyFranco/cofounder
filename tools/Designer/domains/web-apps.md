# Domain: Web Apps

## Purpose and Scope

Design guidance for SaaS applications, dashboards, admin panels, internal tools, and data-heavy interfaces. These are functional environments where the interface should disappear behind the task. Users spend hours here; the design must be efficient, scannable, and fatigue-resistant.

This domain extends the universal principles in AGENTS.md with application-specific techniques. Load AGENTS.md first; this file adds to it.

## Target Specifications

**Stack:** HTML, CSS, JavaScript/TypeScript, React, Tailwind CSS (adapt to project stack)
**Rendering context:** Browsers on desktop (primary), tablet (secondary), mobile (tertiary for most apps)
**Audience context:** Repeat users performing tasks. They know the product; they need speed, not onboarding.

## Visual Intensity

**Personality:** Low to medium. The tool should disappear behind the task.
**Typography:** Functional, clean, highly readable. Smaller scale ratios (1.125-1.200).
**Color:** Restrained palette. Semantic colors carry more weight than brand colors.
**Motion:** Minimal, functional transitions only (100-200ms state changes).
**Layout:** Dense information hierarchy, clear scanning patterns.

## Layout Patterns

### Shell Structure

Most web apps use a shell: fixed navigation wrapping dynamic content.

**Common shells:**

| Pattern | When | Structure |
|---------|------|-----------|
| Sidebar + content | Many navigation items, deep hierarchy | Left sidebar (240-280px), top header, main content |
| Top nav + content | Few navigation items, flat hierarchy | Top nav bar, main content |
| Sidebar + top nav + content | Complex apps with both global and contextual nav | Left sidebar (global), top bar (contextual/breadcrumbs), main content |

**Sidebar rules:**
- Collapsible (icon-only mode at 64px wide)
- Current page clearly indicated (background highlight, not just text color)
- Group navigation items by category with subtle section labels
- Don't nest more than 2 levels deep in the sidebar

### Content Areas

**Data tables:** The dominant content pattern in web apps.
- Align numbers and dates right; align text left
- Sortable columns with directional indicators
- Row hover highlighting (subtle background shift)
- Pagination or infinite scroll with count indicator
- Filter bar above the table, not in a modal
- Empty state with guidance when no results

**Card grids:** For visual items (projects, files, media).
- Don't make all cards identical (vary if content warrants it)
- Show the most important metadata on the card surface
- Click target is the entire card
- Loading state uses skeleton cards, not spinners

**Detail views:** Single-item focus.
- Key information above the fold
- Related data in tabs or collapsible sections
- Actions (edit, delete, share) in a consistent location (top-right or action bar)

### Density

Web apps need higher density than marketing pages.

| Spacing Context | Token |
|----------------|-------|
| Within form fields | space-2 to space-3 |
| Between form fields | space-4 |
| Between card grid items | space-4 to space-6 |
| Between page sections | space-8 to space-12 |
| Page padding | space-6 to space-8 |

**Don't over-pad.** Enterprise users working in dense data environments find generous whitespace wasteful. Balance readability with information density.

## Typography

### Scale for Apps

Use a tighter scale ratio (1.125 Major Second or 1.200 Minor Third).

| Role | Size | Use |
|------|------|-----|
| Micro | 0.6875rem (11px) | Table metadata, timestamps, badge text |
| Caption | 0.75rem (12px) | Labels, helper text, secondary metadata |
| Body small | 0.875rem (14px) | Table cells, sidebar items, compact content |
| Body | 1rem (16px) | Primary content, form inputs |
| Subheading | 1.125-1.25rem | Section headers, card titles |
| Heading | 1.5rem | Page titles |

**Note:** 14px body text is acceptable in dense web apps where users are on desktop. Never below 14px for primary reading content.

### Font Recommendations

System fonts work well for apps (fast loading, native feel):
```css
--font-app: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

If loading a custom font, pick one that works at small sizes with clear character differentiation: Instrument Sans, Figtree, DM Sans.

Monospace for code, IDs, and technical values: `"JetBrains Mono", "Fira Code", ui-monospace, monospace`.

## Color

### Palette Allocation

In web apps, semantic colors do more work than brand colors.

- **Primary:** Use for CTAs, active states, selected items, links. Appears sparingly.
- **Neutral:** Dominates. Text, backgrounds, borders, dividers. 80%+ of the interface.
- **Semantic:** Success (green), error (red), warning (amber), info (blue). Used for status indicators, alerts, badges, form validation.

### Status Indicators

Standardize how status appears:

| Status | Color | Icon | Text |
|--------|-------|------|------|
| Active / Success | Green | Filled circle / checkmark | "Active", "Complete", "Paid" |
| Warning / Pending | Amber | Triangle / clock | "Pending", "Expiring", "At risk" |
| Error / Failed | Red | X circle / alert | "Failed", "Overdue", "Error" |
| Inactive / Neutral | Gray | Empty circle / dash | "Draft", "Paused", "N/A" |

Never convey status by color alone. Always pair with icon, text, or both.

### Dark Mode Considerations

Many web apps offer dark mode. Design for it from the start:
- Surface hierarchy reverses (darker = further back, lighter = raised)
- Reduce chroma by 10-15% (saturated colors are harsh on dark backgrounds)
- Borders become more important for defining boundaries (shadows disappear against dark)
- Use neutral-800 to neutral-900 for base surfaces, not pure black

## Interaction

### Common App Patterns

**Command palette / search:** Cmd+K access. Flat list of actions and navigation. Filter as you type.

**Toasts / notifications:** Bottom-right or top-right. Auto-dismiss after 5s for success; persist for errors. Include dismiss button.

**Inline editing:** Prefer inline editing over modal forms where possible. Click to edit, Enter to save, Escape to cancel.

**Bulk actions:** Checkbox selection in tables. Floating action bar appears when items selected. Show count of selected items.

**Loading states:**
- Initial load: skeleton screens matching the content shape
- Data refresh: subtle spinner in the header or a thin progress bar
- Button actions: loading spinner replaces button label; disable the button
- Never block the entire page for a partial data load

### Form Design

- Labels above inputs (not floating or placeholder-only)
- Error messages below the field in error color, with specific guidance
- Group related fields in fieldsets with legend
- Primary action (submit) on the right or full-width; secondary (cancel) on the left
- Validation on blur for individual fields; on submit for cross-field rules

## Quality Gates

**Mandatory checks (from AGENTS.md):**
- [ ] Squint Test passes
- [ ] Prohibited Defaults scan passes
- [ ] Spacing has rhythm
- [ ] Color palette has defined roles
- [ ] Typography limited to 2-3 families

**Domain-specific checks:**
- [ ] Navigation shell has clear current-page indicator
- [ ] Data tables have sort, filter, and empty state
- [ ] Loading states defined (skeleton, spinner, or progress)
- [ ] Form validation shows specific error messages below fields
- [ ] Status indicators use color + icon/text (never color alone)
- [ ] Density is appropriate for the audience (not over-padded)
- [ ] Keyboard shortcuts documented for power-user actions

## Common Failure Modes

**Dashboard syndrome:** Cramming metrics, charts, and tables onto one page with no hierarchy. Fix: identify the 3-5 most important data points and make them visually dominant. Everything else is secondary.

**Modal overuse:** Opening modals for every action. Fix: use inline editing, slide-over panels, or expandable rows. Reserve modals for destructive confirmations and complex multi-step flows.

**Notification noise:** Showing alerts for everything. Fix: only toast for actions the user initiated. Use badges and counters for background updates. Never interrupt the current task for low-priority information.
