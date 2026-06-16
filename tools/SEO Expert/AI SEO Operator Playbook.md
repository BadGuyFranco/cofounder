# AI SEO Operator Playbook

## Purpose

Upgrade `SEO Expert` from an audit-heavy tool into an SEO operating system that can diagnose, plan, monitor, and run repeatable SEO workflows.

Every workflow in this playbook is triggered by the operator. `SEO Expert` does not schedule itself, run in the background, or fire on a timer. "Monthly" and "recurring" describe a cadence the operator chooses to run, not automation the tool performs. The tool tracks cadence only by reading the dates on saved snapshot files and offering a run when one is due.

This playbook integrates five practical AI SEO workflows:

- Competitor sitemap gap analysis
- Monthly competitor publishing tracker
- SERP-based content brief generation
- Digital PR pattern mining
- Central SEO dashboard

These workflows should be integrated into the existing `SEO Expert` phases rather than treated as a separate tool. The current `Audit`, `Generate`, `Execute`, and `Plan` layers already provide the right structure.

## Source Insight

The workflows were inspired by a public X thread about AI SEO workflows that work in 2026. Treat the thread as workflow inspiration, not authoritative SEO doctrine.

The useful insight is not "prompt better." It is that SEO tools should behave like operators:

- Pull live data from sitemaps, SERPs, GSC, DataForSEO, Ahrefs, CMSs, and crawlers.
- Compare the target site against competitors.
- Produce specific roadmaps, briefs, assets, and repeatable monitoring runs the operator triggers.
- Keep state across sessions.
- Ask for approval before publishing or changing client sites.

## Integration Strategy

Add these workflows inside the existing `SEO Expert` phase model:

| Existing Area | New Capability |
|---|---|
| Phase 0: Plan State Detection | Detect and load saved competitive, roadmap, PR, and dashboard state so workflows resume across runs |
| Phase 2: Tool Detection and Intake | Detect whether competitive workflows can run live or must run in manual mode |
| Phase 5: Content Audit | Add sitemap-based competitor gap analysis and SERP-derived content briefs |
| Phase 7: Backlinks and Authority | Add digital PR pattern mining from link-winning competitor content |
| Phase 9: Analytics and Tracking | Feed GSC, GA4, and ranking data into dashboard snapshots |
| Phase 10: GEO - LLM Findability | Run Workflow 6: entity clarity, citation-worthy assets, schema, and an operator-triggered GEO refresh loop |
| Phase 12: Generate | Generate roadmaps, briefs, PR ideas, tracker reports, and dashboard snapshots |
| Phase 13: Execute | Run connector actions or scheduled workflows only after explicit confirmation |

Do not create a new standalone SEO automation tool unless these workflows outgrow `SEO Expert`.

## Directory Additions

Extend the per-site `seo/` directory with these optional folders:

```text
seo/
  competitive/
    sitemap-gap-YYYY-MM-DD.md
    monthly/
      YYYY-MM.md
    snapshots/
      competitor-domain-YYYY-MM-DD.json
  roadmaps/
    content-roadmap-YYYY-MM-DD.md
  pr/
    swipe-file-YYYY-MM-DD.md
    campaign-ideas-YYYY-MM-DD.md
  dashboard.md
  dashboard/
    snapshots/
      YYYY-MM-DD.md
```

Do not change the existing `history.md` schema. It is fixed. Store richer dashboard and competitor tracker data in the new files above.

## State Loading (Phase 0 and Continue Mode)

The new files above are only useful if `SEO Expert` finds and loads them when a run starts. The current `Phase 0: Plan State Detection` looks only for `plans/`, `todos.md`, and `history.md`, so competitive, roadmap, PR, and dashboard state would be written but never re-read on a later run. That breaks the goal of continuing from saved state.

When integrating, extend `Phase 0` and Continue Mode as follows:

1. In `Phase 0` Step 1 (Locate the SEO directory), also detect:
   - `seo/competitive/` and the latest `seo/competitive/snapshots/*.json`
   - the latest `seo/competitive/monthly/*.md` report
   - the latest `seo/roadmaps/*.md`
   - the latest `seo/pr/swipe-file-*.md` and `seo/pr/campaign-ideas-*.md`
   - `seo/dashboard.md` and the latest `seo/dashboard/snapshots/*.md`
2. In the session summary, report what competitive and dashboard state exists and its age, for example: "Last competitor snapshot: 2026-04-01 (62 days old). Last dashboard: 2026-05-01."
3. If the latest competitor snapshot is older than 28 days, offer to run Workflow 2 (Monthly Competitor Tracker). Do not run it automatically.
4. On Continue Mode, load the latest roadmap and dashboard so roadmap progress and GEO status reflect saved state rather than a blank slate.

## Helper Scripts (Required, Not Deferred)

Sitemap fetching, normalization, and month-over-month diffing must be script-backed, not done by reading XML in the prompt. A model-eyeballed diff of a large `sitemap_index` is the single highest fabrication risk in this playbook and conflicts directly with the "Never fabricate competitor data" guardrail. These scripts ship as part of the integration, not as a later optimization.

Add under `tools/SEO Expert/scripts/`:

- `sitemap-fetch.js`
  - Input: one or more sitemap or sitemap-index URLs.
  - Behavior: follow index files, fetch all child sitemaps, parse `<loc>` and `<lastmod>`, deduplicate, and emit a normalized snapshot.
  - Output: snapshot JSON written to `seo/competitive/snapshots/[domain]-YYYY-MM-DD.json` with shape:

```json
{
  "domain": "competitor.com",
  "fetchedAt": "YYYY-MM-DD",
  "sitemaps": ["https://competitor.com/sitemap.xml"],
  "urls": [
    { "loc": "https://competitor.com/guide/x", "lastmod": "YYYY-MM-DD", "path": "/guide/x", "slug": "x", "segment": "guide" }
  ],
  "count": 1234,
  "truncated": false
}
```

  - On failure (missing sitemap, gzip, robots block), exit cleanly with a labeled note. Never block the run.

- `sitemap-diff.js`
  - Input: two snapshot JSON paths (previous, current) for the same domain.
  - Output: a deterministic diff object with `addedUrls`, `removedUrls`, `changedLastmod`, `newPathSegments`, and counts. This is the authoritative source for Workflow 2. The model interprets the diff but never computes it by hand.

Prompt-only fallback (no Node available) is allowed only for sitemaps under 200 URLs, and the report must be labeled "Estimated: manual review" per the Snapshot Rule. Above that threshold, the scripts are required.

## Workflow 1: Competitor Sitemap Gap Analysis

### Purpose

Turn competitor site structure into a practical content roadmap.

### Inputs

- Target domain
- Top 3 to 5 competitors, provided by the user or discovered via DataForSEO
- Target sitemap and competitor sitemaps
- GSC data if available
- DataForSEO or Ahrefs data if available

### Process

1. Fetch the target sitemap and competitor sitemaps using `scripts/sitemap-fetch.js`, which writes a normalized snapshot per domain.
2. Normalize all URLs by path, slug, title if available, content type, and likely search intent.
3. Infer likely target keyword from URL slug, title tag, H1, and SERP data when available.
4. Group competitor URLs into topic clusters.
5. Compare competitor clusters against the target site's existing URLs.
6. Classify gaps by asset type:
   - Homepage or service page
   - Comparison page
   - Landing page
   - Article or guide
   - Glossary page
   - FAQ page
   - Tool or calculator
   - Data asset or research report
7. Prioritize gaps using:
   - Business relevance
   - Search intent fit
   - Estimated keyword value
   - Ranking difficulty
   - Current topical authority
   - Internal linking opportunity
8. Produce a 6-month content roadmap.

### Outputs

- `seo/competitive/sitemap-gap-YYYY-MM-DD.md`
- `seo/roadmaps/content-roadmap-YYYY-MM-DD.md`
- Optional briefs in `seo/content/briefs/`

### Output Requirements

Each roadmap item must include:

- Month
- Page or asset type
- Target topic
- Likely target keyword
- Search intent
- Competitor examples
- Why this matters
- Required brief or next action
- Effort estimate
- Confidence level

## Workflow 2: Monthly Competitor Tracker

### Purpose

Detect competitor publishing patterns before the client falls behind.

### Process

1. When the operator triggers a tracker run, re-fetch the same competitor sitemaps with `scripts/sitemap-fetch.js`. Cadence is operator-chosen; the tool checks snapshot dates to suggest when a run is due (see State Loading) but never runs itself.
2. Compare the new snapshot against the previous one with `scripts/sitemap-diff.js`. Use the script's diff output as the authoritative list of changes; do not derive changes by reading the XML directly.
3. Report:
   - New URLs
   - Removed URLs
   - Changed URL patterns
   - New topic clusters
   - Competitors increasing publishing velocity
4. Flag moves that should create or update plan items.
5. Score each finding by competitive Significance (High, Medium, Low) inside the tracker file. Do not write directly into `seo/todos.md` (see Competitive Significance vs todos.md Priority below).

### Outputs

- `seo/competitive/monthly/YYYY-MM.md`
- `seo/competitive/snapshots/domain-YYYY-MM-DD.json`
- Promoted items in `seo/todos.md`, added only after operator triage (see Promoting findings into todos.md)

### Competitive Significance vs todos.md Priority

Score each tracked change inside `seo/competitive/monthly/YYYY-MM.md` on its own Significance axis. This axis is separate from the `todos.md` P1/P2/P3 axis, which means "when to schedule," not "how competitively important."

- Significance High: Competitor launched content in a commercially important topic where the target has no page.
- Significance Medium: Competitor is expanding a relevant informational cluster.
- Significance Low: Competitor activity is interesting but not aligned with current goals.

### Promoting findings into todos.md

`todos.md` has a fixed meaning: P1 = do in next plan, P2 = do when bandwidth allows, P3 = watch. Competitive Significance is a different axis and must not overwrite it.

- Never auto-write competitive findings into `todos.md`. Present High-significance findings to the operator and ask which to promote.
- When the operator promotes one, write it to `todos.md` on the existing P-axis and tag it: `Type: competitive | Source: monthly-YYYY-MM`.
- Phase 0.5 auto-carries P1 items into the new plan as High Priority. Add one exception: items tagged `Type: competitive` are surfaced but still require operator confirmation before entering a plan, so competitor activity never silently injects work into every audit.

## Workflow 3: SERP-Based Content Brief Generation

### Purpose

Replace generic AI blog generation with research-first content briefs.

### Process

1. For each selected keyword, pull top 10 SERP results through DataForSEO when available.
2. If DataForSEO is not configured, use manual SERP review or browser analysis.
3. Filter out low-quality or mismatched results unless they dominate the SERP:
   - Forums
   - Q&A pages
   - Thin affiliate pages
   - Low-quality AI content
   - Irrelevant result formats
4. Extract from ranking pages:
   - H1
   - H2 and H3 structure
   - Content type
   - Search intent
   - Schema usage
   - Word count estimate
   - Freshness signals
   - Unique angle
5. Identify table stakes: information every serious ranking page covers.
6. Identify value adds: information competitors have not covered but readers would value.
7. Create a content outline for approval before drafting.
8. Include internal links, schema recommendations, E-E-A-T requirements, and LLM citation opportunities.

### Outputs

- Enhanced `seo/content/briefs/keyword-slug.md`
- Optional article draft only after user approval

### Brief Requirements

Each brief must include:

- Target keyword
- Secondary keywords
- Search intent
- Audience
- Recommended format
- Recommended length, based on ranking pages
- Competitor pages analyzed
- Table stakes
- Value adds
- Proposed H1
- Draft meta description
- Outline
- Questions to answer
- Internal linking plan
- Schema recommendation
- E-E-A-T requirements
- LLM citation opportunities

## Workflow 4: Digital PR Pattern Mining

### Purpose

Generate link-worthy campaign ideas from proven link-winning content, not from generic brainstorming.

### Process

1. Identify 10 to 20 sites in the niche that reliably earn editorial links.
2. Pull their top-linked pages via Ahrefs Browser Control or DataForSEO where available.
3. Classify link-winning patterns:
   - Data study
   - Calculator or interactive tool
   - Benchmark report
   - Rankings
   - Survey
   - Controversial analysis
   - Map or visual asset
   - Template
   - Original dataset
4. Build a swipe file.
5. Generate campaign ideas that require real data, useful assets, or strong editorial hooks.
6. Score each idea by:
   - Linkability
   - Production effort
   - Brand fit
   - Data availability
   - Outreach audience clarity

### Outputs

- `seo/pr/swipe-file-YYYY-MM-DD.md`
- `seo/pr/campaign-ideas-YYYY-MM-DD.md`
- Promote selected campaign ideas into `seo/todos.md` only after operator triage, tagged `Type: pr | Source: pr-YYYY-MM-DD`

### Campaign Idea Requirements

Each campaign idea must include:

- Working title
- Core angle
- Data source
- Why it could earn links
- Target publications or site types
- Production steps
- Estimated effort
- Risks or caveats

## Workflow 5: Central SEO Dashboard

### Purpose

Give each site one operational view of SEO status without overloading `history.md`.

### Files

- `seo/dashboard.md`
- `seo/dashboard/snapshots/YYYY-MM-DD.md`

### Dashboard Contents

Include:

- Active plan and completion status
- P1 items from `seo/todos.md`
- GSC impressions, clicks, CTR opportunities, and top pages
- PageSpeed mobile and desktop status
- Indexed pages and sitemap status
- DataForSEO ranked keywords
- Quick-win keywords in positions 11 to 20
- Backlink health
- Referring domains
- Link gap opportunities
- Broken backlinks
- Competitor publishing changes
- Content roadmap progress
- GEO and LLM findability status
- Next recommended action

### Snapshot Rule

Every dashboard snapshot must label unavailable data clearly. Never fabricate missing metrics.

Use:

- `N/A: connector not configured`
- `N/A: account limit reached`
- `Estimated: manual review`
- `Unverified: requires user confirmation`

## Workflow 6: GEO Entity and Citation Refresh

### Purpose

Strengthen how LLMs represent and cite the site, and re-check that representation on each triggered run. This is the operator-run refresh loop the integration table promises for Phase 10. It does not run on a timer.

### Inputs

- Brand name, product names, key people
- Phase 10 findings (robots LLM directives, llms.txt, entity consistency, GBP, Knowledge Panel)
- Existing assets that could earn citations (original data, comparisons, tools, definitions)
- Previous GEO snapshot if one exists

### Process

1. Re-run the Phase 10 presence tests: search the brand and primary category on Perplexity and ChatGPT. Record what each says verbatim and flag inaccuracies.
2. Diff the current LLM representation against the previous GEO snapshot if one exists. Note new inaccuracies, corrected facts, or lost citations.
3. Check entity consistency across About page, LinkedIn, Crunchbase, Wikipedia, and press. Flag mismatches in name, founding year, category, or description.
4. Inventory citation-worthy assets. For each high-value query, identify whether the site offers a directly citable answer (a plain "What is X" statement, a comparison table, an original statistic). Flag missing ones.
5. Verify the technical GEO surface: `/llms.txt` present and accurate, LLM crawler directives in `robots.txt` deliberate, Organization and FAQ schema present on the homepage.
6. Produce refresh tasks: what to add, correct, or restate so the next crawl improves representation.

### Outputs

- GEO status block in `seo/dashboard.md` (representation accuracy, entity consistency, citable-asset coverage)
- Refresh tasks promoted into `seo/todos.md` only after operator triage, tagged `Type: geo`
- Optional updated `llms.txt` generated via Phase 12.4

### Output Requirements

Each GEO finding must include:

- Surface checked (Perplexity, ChatGPT, llms.txt, schema, entity source)
- Current state, quoted or described
- Specific inaccuracy or gap
- Recommended fix
- Whether a re-check is needed next run
- Confidence level

### Re-check Note

LLM citation measurement is not standardized. Presence tests are qualitative and must be labeled "Unverified: requires user confirmation" in the dashboard, consistent with the Snapshot Rule.

## Connector Behavior

### DataForSEO

Use for:

- Domain overview
- Ranked keywords
- Competitor discovery
- Keyword gap
- Search volume
- Rank checks
- SERP analysis
- Backlink summary
- Referring domains
- Link gap

### Google Search Console

Use for:

- Queries
- Pages
- CTR opportunities
- Sitemap status
- URL inspection
- Indexing signals

### GA4

Use for:

- Landing page performance
- Conversion events
- Organic traffic trends
- Content quality signals when available

### Ahrefs Browser Control

Use when configured for:

- Backlink profile
- Broken backlinks
- Competing domains
- Organic keywords
- Content gap
- Top-linked competitor pages

### Screaming Frog

Use when available for:

- Crawl exports
- Orphan page checks
- Title and meta audits
- Canonical checks
- Redirect chain checks

### CMS Connectors

Use only after explicit confirmation for:

- Publishing drafts
- Updating titles
- Updating slugs
- Updating metadata
- Adding redirects
- Submitting new content for indexing

## Generate Layer Additions

Add these generate options after an audit when relevant:

- Competitor sitemap gap report
- 6-month content roadmap
- SERP-based content brief
- Monthly competitor tracker report
- Digital PR swipe file
- Digital PR campaign ideas
- SEO dashboard snapshot

Offer only the options that match the audit findings. Do not list irrelevant asset types.

## Execute Layer Additions

Run only after explicit user confirmation:

- Submit updated sitemap
- Request indexing for newly published pages
- Create CMS drafts
- Update existing CMS metadata
- Add redirect rules
- Run the competitor tracker on demand (operator-triggered; never scheduled)
- Refresh dashboard snapshots

Never infer permission from prior approvals. Each site change or external action requires a separate confirmation.

## Quality Standards

Every finding or generated action must include:

- Specific problem or opportunity
- Evidence source
- Impact
- Recommended fix or next action
- Effort estimate
- Connector used
- Confidence level

## Guardrails

- Treat social media workflow ideas as inspiration, not SEO truth.
- Never fabricate keyword, traffic, backlink, or competitor data.
- Every workflow is operator-triggered. Never describe a workflow as scheduled, automated, or running in the background; the tool runs only when the operator invokes it.
- Never compute a sitemap diff by reading XML in the prompt for sets over 200 URLs. Use `scripts/sitemap-diff.js` and label any prompt-only fallback as estimated.
- Do not publish, edit, or submit anything without explicit confirmation.
- Prefer original data, entity clarity, structured content, and refresh loops over prompt tricks.
- Preserve the existing `SEO Expert` plan and history model.
- Keep outputs specific enough that a developer, founder, or SEO operator can act immediately.

## Recommended Implementation Sequence

1. Add the directory conventions, state-loading rules, and workflow summaries to `tools/SEO Expert/AGENTS.md`.
2. Extend `Phase 0: Plan State Detection` and Continue Mode to detect and load the new competitive, roadmap, PR, and dashboard state.
3. Build the helper scripts (`scripts/sitemap-fetch.js`, `scripts/sitemap-diff.js`) and the snapshot JSON format. These are part of the feature-complete integration, not a later optimization.
4. Strengthen `Phase 5: Content Audit` with sitemap gap and SERP-based brief logic, wired to the helper scripts.
5. Strengthen `Phase 7: Backlinks and Authority` with digital PR pattern mining.
6. Add Workflow 6 (GEO Entity and Citation Refresh) to `Phase 10: GEO`.
7. Add dashboard generation to `Phase 12: Generate`.
8. Add operator-triggered tracker and dashboard refresh rules to `Phase 13: Execute`, with the todos.md promotion-and-triage rule.
9. Update `tools/SEO Expert/README.md` with the new operator workflows.

## Definition of Done

The integration is complete when `SEO Expert` can:

- Run a competitor sitemap gap analysis with live or manual data.
- Produce a 6-month content roadmap from competitor gaps.
- Generate SERP-based content briefs that separate table stakes from value adds.
- Produce a digital PR swipe file and campaign ideas from link-winning competitor assets.
- Run a GEO entity and citation refresh and record representation status in the dashboard.
- Maintain a dashboard snapshot for each audit cycle.
- Track competitor publishing changes between two snapshots on operator-triggered runs.
- Continue all of the above from saved `seo/` state in future sessions, loaded in Phase 0.

Because the monthly tracker diff cannot be demonstrated within a single session, ship a sample prior snapshot under `seo/competitive/snapshots/` so `scripts/sitemap-diff.js` and Workflow 2 can be validated immediately rather than after a real month passes.
