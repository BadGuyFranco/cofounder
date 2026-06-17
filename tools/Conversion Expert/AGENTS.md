# Conversion Expert

Audits any website for conversion and on-site experience, then produces a prioritized, evidence-backed list of changes that lift the rate at which visitors take the goal action. The on-site counterpart to SEO Expert: SEO gets visitors to the page, Conversion Expert turns them into customers.

**Use when:** A website URL is provided and the goal is to improve conversion rate, diagnose why traffic is not converting, reduce funnel drop-off, fix a leaking signup or checkout, or assess on-site UX friction.
**Don't use when:** The user asks a general CRO question (answer it directly), the request is purely about rankings or traffic acquisition (use SEO Expert), or it is a single isolated tweak like changing one button color.

## Objective

A prioritized, site-specific todo list an owner or developer can act on immediately. Every item names the exact friction, cites the evidence behind it (GA4 drop-off, Clarity friction signal, heuristic), states the change, predicts the conversion impact, and scores effort. No generic "add social proof" advice; every item is grounded in this site's data.

## The Core Loop

Conversion improvement is a loop, not a one-shot audit. The tool runs it:

1. **What** (quantitative): GA4 finds where visitors drop off (pages, steps, sources, devices).
2. **Why** (qualitative): Clarity explains the drop (rage clicks, dead clicks, quick backs, script errors, scroll depth); a human watches the flagged replays.
3. **Fix** (prioritized): synthesize What + Why into scored changes.
4. **Measure**: re-pull next cycle, compare, keep what worked.

The Conversion Expert owns this loop and the connectors that feed it.

## CRO Directory Structure

Every site maintains a persistent `cro/` directory. Create it on first run if code access is available; if not, skip creation and deliver output in chat with a note to save manually.

```
cro/
  plans/
    plan-YYYY-MM-DD/        (one folder per cycle)
      plan.md               (self-tracking checklist; mark [x] as steps complete)
      assets/               (generated copy variants, A/B test specs, form redesigns)
  experiments/              (one file per A/B test: hypothesis, variants, result)
  snapshots/                (dated GA4 + Clarity pulls; the trend record the APIs do not keep)
  funnel.md                 (the defined conversion funnel and primary goal event)
  todos.md                  (cross-plan items with priority and source)
  history.md                (one row per audit; fixed schema; never freeform)
  AGENTS.md                 (instructions for running subsequent audits on this site)
```

**Plan self-tracking rule:** `plan.md` is the single source of truth. Check off `[x]` as steps complete.

**history.md schema (fixed, never change column order):**

```markdown
| Date | Primary Goal | Conv Rate | Sessions | Top Leak Page | Top Leak Drop % | Mobile CWV | Rage Clicks | Dead Clicks | Notes |
|---|---|---|---|---|---|---|---|---|---|
```

**Snapshot rule:** Clarity only returns the last 1 to 3 days and GA4 quota is finite, so the trend lives in `cro/snapshots/`. Pull on a cadence; never claim a trend the stored snapshots do not support.

## Code Access Rule

The tool may not have access to the site's codebase.

- **With code access:** Create `cro/` on first run; save plan files and assets directly.
- **Without code access:** Skip directory creation; deliver the plan and assets as chat output with "No code access detected. Save these to your `cro/` directory."
- Never halt because code access is missing. Continue the audit in full.

## Site Repo Safety Rule

**If a site repository is accessible, treat every file edit as a surgical procedure requiring explicit consent.**

- One file per confirmation. Show the exact change (line, before, after) and wait for approval.
- Never batch changes across files, even related ones.
- Conversion changes are often live-revenue paths (checkout, signup). Default to proposing an A/B test or a staged change over an unguarded edit; state the rollback.
- Never infer consent from prior approval. Each change requires its own yes.

## Operational Layers

**Audit** - Systematic inspection across the dimensions below. Always runs on a fresh site.
**Generate** - Produce ready-to-use assets: rewritten CTA and headline copy, form redesigns, trust-signal blocks, A/B test specs. Runs after the audit or on request.
**Execute** - Set up experiments, hand fixes to `tools/Designer/` and the `standards/Web Apps/` standard, re-pull metrics. Runs when the user confirms.
**Plan** - Save the audit as a self-contained, resumable plan file that knows which connectors to call and tracks its own completion.

## Connector Detection (silent, Phase 1)

Before asking the user to set anything up, silently detect what is available. Use what is present; never block on what is missing.

| Connector | How to detect | What it enables |
|---|---|---|
| GA4 (the "what") | `/memory/connectors/google/.env` exists and a GA4 property is accessible (`node connectors/google/scripts/analytics.js list-summaries --account <email>` lists accounts and properties; reporting shortcuts then take `--property <id>`) | Funnel drop-off, top pages, sources, conversions, device/source splits |
| Clarity (the "why") | `/memory/connectors/clarity/.env` exists | Friction signals: dead/rage/error clicks, quick backs, excessive scroll, script errors, scroll depth |
| PageSpeed / Core Web Vitals | Always available (anonymous quota, or key in `/memory/connectors/google/.env`) | Speed as a conversion lever (`node connectors/google/scripts/pagespeed.js`) |
| Cloudflare | `/memory/connectors/cloudflare/.env` exists | Traffic, bot, and threat analytics |
| PostHog (future) | `/memory/connectors/posthog/.env` exists | Product funnels, session replay, feature flags, native A/B tests |
| Hotjar / Inspectlet (future, paid) | `/memory/connectors/{hotjar,inspectlet}/.env` exists | Replay and heatmaps (thin export APIs; mostly human-reviewed in their UI) |

With zero connectors configured, the tool still runs a full heuristic audit (Phase 5) from the rendered pages, and offers connector setup once at the end as a low-priority todo.

## Verified Connector Commands

Exact, verified syntax. Use these rather than guessing. All paths are relative to the cofounder root. GA4 commands require `--account <email>` on every call; get the property ID from `list-summaries` first.

```bash
# GA4 (connectors/google) - the quantitative "what". Find the property, then pull.
node connectors/google/scripts/analytics.js list-summaries --account user@example.com
node connectors/google/scripts/analytics.js top-pages   --property 123456789 --account user@example.com --start 28d
node connectors/google/scripts/analytics.js top-sources --property 123456789 --account user@example.com --start 28d
node connectors/google/scripts/analytics.js overview    --property 123456789 --account user@example.com --start 28d
node connectors/google/scripts/analytics.js conversions --property 123456789 --account user@example.com --start 28d
# Custom funnel / drop-off (any dimensions + metrics):
node connectors/google/scripts/analytics.js run --property 123456789 --account user@example.com \
  --dimensions pagePath --metrics screenPageViews,sessions,conversions --order-by conversions --desc --start 28d

# PageSpeed / Core Web Vitals (connectors/google) - no account; anonymous quota or PAGESPEED_API_KEY.
node connectors/google/scripts/pagespeed.js --url https://example.com/pricing --strategy both

# Microsoft Clarity (connectors/clarity) - the qualitative "why". Token-scoped to one site.
node connectors/clarity/scripts/insights.js signals --days 3 --by URL
node connectors/clarity/scripts/insights.js insights --days 1 --dimensions URL,Device

# Cloudflare (connectors/cloudflare) - optional traffic/threat analytics.
node connectors/cloudflare/scripts/analytics.js dashboard example.com
node connectors/cloudflare/scripts/analytics.js threats   example.com --since -7d
```

Date flags accept `YYYY-MM-DD` or shorthand (`7d`, `28d`, `90d`, `12m`, `yesterday`). Clarity's window is fixed at the last 1 to 3 days.

## Audit Dimensions

Run each dimension. Label any unavailable data: `N/A: connector not configured`, `N/A: quota reached`, `Estimated: manual review`, or `Unverified: requires user confirmation`. Never fabricate a metric.

1. **Goal and funnel definition.** Establish the primary conversion (purchase, signup, lead, booking) and the steps to it. Save to `cro/funnel.md`. Everything downstream is measured against this. If the user has not stated the goal, ask before proceeding.
2. **Quantitative drop-off (GA4).** Top pages by entries and exits, conversion events and rate, traffic sources by converting vs non-converting, device and source splits. Identify the highest-traffic, highest-drop pages: the leaks worth fixing first.
3. **Speed (PageSpeed / CWV).** Core Web Vitals for the key conversion pages on mobile and desktop. Slow LCP and layout shift are direct conversion costs; quantify them.
4. **Behavior and friction (Clarity).** Pull `signals --by URL` for the leak pages. Map each leak from Phase 2 to its friction signal: rage clicks on a non-interactive element, dead clicks on a fake button, quick backs off a thin page, script errors on the form, shallow scroll past the CTA. Flag the specific pages and sessions a human should watch in the Clarity UI.
5. **On-page conversion heuristics.** Read the actual page: value proposition clarity above the fold, single obvious primary CTA, form length and field friction, trust signals (proof, guarantees, security), mobile tap targets and layout, cognitive load, and friction in the path to the goal. This dimension runs even with zero connectors.
6. **Message and intent match.** Does the landing page deliver what the traffic source promised (ad, search query, email)? Mismatch is a top silent killer of conversion rate.

## Phase 7: Synthesize and Prioritize

Produce the todo list. Score every item with **ICE**:

- **Impact** (1-10): predicted lift on the primary conversion, justified by the evidence.
- **Confidence** (1-10): strength of the evidence (live GA4 + Clarity agreement is high; heuristic-only is lower).
- **Ease** (1-10): inverse of effort to ship.

Sort by ICE score. Each item, fixed format:

```markdown
### [Title] | ICE: [I]/[C]/[E] = [avg]
- **Where:** [page / funnel step]
- **Friction:** [the exact problem]
- **Evidence:** [GA4 drop %, Clarity signal + count, or "Heuristic: manual review"]
- **Change:** [specific, executable fix]
- **Predicted impact:** [what moves and roughly how much]
- **Test:** [A/B hypothesis, or "ship direct" for low-risk]
- **Effort:** [S / M / L]
```

## Phase 8 and 9 (optional)

- **Generate:** CTA and headline rewrites, shortened-form specs, trust-block copy, A/B test specs written to `cro/plans/.../assets/`.
- **Execute:** record experiments in `cro/experiments/`, route build work to `tools/Designer/` and `standards/Web Apps/`, then schedule the next-cycle re-pull. Respect the Site Repo Safety Rule on any live edit.

## Relationship to SEO Expert

They are two halves of one funnel and share the `cro/` ↔ `seo/` split deliberately. SEO Expert owns acquisition (findability, rankings, traffic). Conversion Expert owns what happens after arrival (behavior, friction, conversion). When a user says "traffic is up but sales are flat," that is Conversion Expert. When "no one is finding us," that is SEO Expert. Hand off between them rather than duplicating.

## Success Criteria

- Surfaces conversion leaks the user did not already know about, each tied to this site's data.
- Every item is evidence-backed (GA4 + Clarity), not theory; heuristic-only items are labeled as such.
- Priorities reflect predicted revenue impact via ICE, not gut feel.
- Output is a list that can be worked through top to bottom.
- The loop closes: each cycle measures the last cycle's changes against stored snapshots.

If the request is ambiguous (no clear conversion goal, unclear which site, no funnel), ask before proceeding.
