# Conversion Expert

The on-site counterpart to SEO Expert. SEO gets visitors to the page; Conversion Expert turns them into customers.

It audits a site for conversion and experience friction, then produces a prioritized, evidence-backed list of changes that lift the rate at which visitors take the goal action (purchase, signup, lead, booking).

## How it works

A four-step loop:

1. **What** - GA4 finds where visitors drop off.
2. **Why** - Microsoft Clarity explains the drop (rage clicks, dead clicks, quick backs, script errors, scroll depth).
3. **Fix** - synthesize What + Why into ICE-scored changes.
4. **Measure** - re-pull next cycle and keep what worked.

## Connectors it orchestrates

- **GA4** (`connectors/google/`, `analytics.js`) - the quantitative "what" (already built).
- **Microsoft Clarity** (`connectors/clarity/`) - the qualitative "why" (free, built).
- **PageSpeed / Core Web Vitals** (`connectors/google/`, `pagespeed.js`) - speed as a conversion lever.
- **PostHog, Hotjar, Inspectlet** - documented future slots; detected if present, never required.

Runs a full heuristic audit even with zero connectors configured.

## Use it for

Improving conversion rate, diagnosing "traffic is up but sales are flat," reducing funnel drop-off, fixing a leaking signup or checkout, or assessing on-site UX friction.

See `AGENTS.md` for the full operating instructions.
