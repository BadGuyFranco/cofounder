# Design Audit

## Purpose

Technical quality check across all design dimensions. Produces a structured report of specific issues with specific fixes. An audit is objective: it checks against defined standards, not subjective preference.

## When to Use

- Before shipping a feature or page
- When reviewing existing UI for quality improvement
- After major design changes to verify nothing regressed
- When asked to "audit," "check," or "review quality" of a design

## Workflow

### Step 1: Identify Scope

Determine what's being audited. Options:
- A single component
- A full page
- A user flow (multiple pages/states)
- An entire application

**Ask if unclear:** "Should I audit just this component, the full page, or the entire flow?"

### Step 2: Run Checks

Walk through each dimension. For each, note PASS or flag specific issues with specific fixes.

**Hierarchy**
- [ ] Primary, secondary, tertiary elements are visually distinct
- [ ] Squint Test passes (hierarchy visible when blurred)
- [ ] No competing elements at the same visual weight

**Typography**
- [ ] No more than 2-3 font families
- [ ] Clear size hierarchy with sufficient contrast between levels
- [ ] Body text is 16px minimum
- [ ] Line length is 55-75 characters
- [ ] No prohibited fonts (Inter, Roboto, Arial, Open Sans as primary)

**Color**
- [ ] Palette roles are defined (primary, neutral, semantic, surface)
- [ ] Neutrals are tinted, not pure gray
- [ ] No pure black (#000) or pure white (#fff)
- [ ] 60-30-10 distribution is approximately followed
- [ ] No gray text on colored backgrounds

**Spacing**
- [ ] Spacing has rhythm (not uniform everywhere)
- [ ] Related elements grouped tightly; unrelated elements separated
- [ ] Section margins larger than within-section margins
- [ ] Uses a consistent spacing scale

**Accessibility**
- [ ] Body text contrast ratio meets 4.5:1 (WCAG AA)
- [ ] Large text/UI components meet 3:1
- [ ] All interactive elements have visible focus indicators
- [ ] Touch targets are 44px minimum
- [ ] No information conveyed by color alone

**Interaction** (if applicable)
- [ ] Interactive elements have distinct states (hover, focus, active, disabled)
- [ ] Loading states use skeleton screens, not just spinners
- [ ] Error states provide what happened, why, and how to fix
- [ ] Empty states guide users toward action
- [ ] Button labels use verb + object pattern

**Motion** (if applicable)
- [ ] Only transform and opacity are animated
- [ ] Durations match use case (100ms feedback, 200-300ms state changes)
- [ ] No bounce or elastic easing
- [ ] Reduced motion alternative provided

**Responsive** (if applicable)
- [ ] Mobile-first CSS (min-width queries)
- [ ] Content adapts meaningfully (not just shrunk)
- [ ] Critical functionality accessible on all screen sizes
- [ ] Touch vs pointer input handled appropriately

### Step 3: Report

Present findings as a table:

| Dimension | Status | Issue | Fix |
|-----------|--------|-------|-----|
| [dimension] | PASS / FAIL | [specific issue] | [specific fix] |

Group by severity:
1. **Critical:** Accessibility failures, broken interaction states, illegible text
2. **Major:** Anti-pattern violations, missing states, hierarchy problems
3. **Minor:** Spacing inconsistencies, suboptimal font choices, polish items

### Step 4: Summary

Count passes vs failures. State overall assessment:
- **Ship-ready:** No critical or major issues
- **Needs work:** Critical or major issues present; list the top 3 priorities
- **Significant revision:** Multiple critical issues across dimensions
