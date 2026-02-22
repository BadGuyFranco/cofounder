# SEO Expert

Comprehensive SEO tool that audits any website, generates ready-to-use assets, and executes actions to improve search rankings and LLM findability.

**Use when:** A website URL is provided and the goal is to audit SEO, improve rankings, diagnose a traffic drop, prepare a site for launch, or assess LLM/AI search visibility.
**Don't use when:** The user asks a general SEO question (answer it directly), or the request is limited to one specific element like fixing a single meta tag.

## Objective

Produce a prioritized, site-specific todo list that an owner or developer can act on immediately. Every item names the exact problem, explains the ranking or traffic cost, specifies the fix, and estimates effort. No generic advice.

## SEO Directory Structure

Every site audited by the SEO Expert maintains a persistent `seo/` directory. On the first run for a new site, create this structure if code access is available. If code access is not available, skip creation and note it.

```
seo/
  plans/
    plan-YYYY-MM-DD/     (one folder per audit cycle)
      plan.md            (self-tracking checklist; mark [x] as steps complete)
      assets/            (all generated files: schema JSON-LD, robots.txt, llms.txt, disavow.txt, etc.)
  content/
    pages/               (net-new SEO landing pages)
    articles/            (long-form blog/article content)
    briefs/              (keyword and content research briefs)
  todos.md               (cross-plan long-term items with priority and source)
  history.md             (one row per audit; fixed schema; never freeform)
  AGENTS.md              (instructions for running subsequent audits on this site)
```

**Plan self-tracking rule:** The `plan.md` file is the single source of truth. Check off `[x]` as steps complete. There is no `deployed.md` because the plan tracks its own state.

**history.md schema (fixed, never change column order):**

```markdown
| Date | Mobile Score | Desktop Score | LCP Mobile | LCP Desktop | TBT | Indexed Pages | GSC Impressions | GSC Clicks | DR | Referring Domains | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

**todos.md schema:**

```markdown
## P1 - Do in next plan

- [ ] [Item] | Source: plan-YYYY-MM-DD | Blocked by: [reason or "nothing"]

## P2 - Do when bandwidth allows

- [ ] [Item] | Source: plan-YYYY-MM-DD

## P3 - Watch / deferred

- [ ] [Item] | Source: plan-YYYY-MM-DD | Deferred because: [reason]
```

## Code Access Rule

The SEO Expert may not have access to the site's codebase. Apply these rules:

- **With code access:** Create the `seo/` directory structure on first run. Save plan files and assets directly.
- **Without code access:** Skip directory creation. Deliver the plan and assets as chat output. Note: "No code access detected. Save these files manually to your `seo/` directory."
- Never error or halt because code access is missing. Continue the audit in full.

## Site Repo Safety Rule

**If a site repository is provided or accessible, treat every file edit as a surgical procedure requiring explicit consent.**

- Never modify more than one file per confirmation. Show the exact change (what line, what it becomes) and wait for approval before writing it.
- Never batch changes across files even when they are related (e.g., adding canonical to five pages is five separate confirmations, not one).
- Before any edit: state the file path, the current value, and the proposed value. Ask "Make this change?" explicitly.
- After each confirmed change: report what was done, then pause before proposing the next change.
- If a step involves both a code change and a connector action (e.g., edit `layout.tsx` then submit sitemap), treat them as separate steps with separate confirmations.
- Never infer consent from prior approval. Each change requires its own yes.

This rule applies regardless of how many changes are pending or how small each one is.

## Operational Layers

This tool operates across four layers depending on what the user needs:

**Audit** - Systematic inspection across eight dimensions. Always runs on a fresh site.
**Generate** - Produce ready-to-use assets: schema markup, title tags, meta descriptions, `llms.txt`, redirect maps, content briefs. Runs after the audit or on request.
**Execute** - Submit sitemaps, request indexing, validate schema. Runs when the user confirms.
**Plan** - Save the full audit output as a self-contained, executable plan file. The plan knows which tool and connectors to call, tracks completion with checkboxes, and can be resumed in any future session without re-auditing.

## Impact Measurement

SEO Expert outputs should:
- Identify issues the user did not already know about
- Assign priorities based on actual ranking impact, not theory
- Give specific, executable instructions for every item, not vague directives
- Cover all eight audit dimensions without leaving gaps
- Deliver a todo list that can be worked through sequentially

## Quality Checks

Before delivering the final todo list:
- [ ] Every item has a specific problem, impact statement, fix, and effort estimate
- [ ] Priorities reflect real-world impact (technical blockers ranked Critical; cosmetic issues ranked Low)
- [ ] No generic SEO advice that applies to every site equally
- [ ] GEO/LLM dimension has been audited, not skipped
- [ ] E-E-A-T signals assessed relative to the site's topic sensitivity
- [ ] PageSpeed Insights has been run on at least the homepage
- [ ] Quick wins are separated from long-term investments

## Graceful Failure Rules

Every connector is optional. The audit never stops or errors because a connector is not configured. Apply these rules consistently:

1. **Detect silently.** Check for connector credentials or cache files in Phase 2 without asking the user about setup.
2. **Use what is available.** Pull live data where connectors are configured. Fall back to manual instructions where they are not.
3. **Never block the audit.** If a script fails or a connector is not configured, continue the audit and note what data is missing.
4. **Offer setup once, at the end.** If a connector would have materially improved the audit (e.g., DataForSEO missing for a site with no GSC data), add a single item at the bottom of the todo list: "Optional: set up [connector] for live [data type] data. See `connectors/[name]/SETUP.md`." Do not interrupt the audit flow.
5. **Never fabricate data.** If live data is not available, use manual instructions and label the finding as estimated or unverified.

| Connector missing | Behavior |
|---|---|
| PageSpeed Insights quota exceeded | Note the quota limit, add API key setup as a Low priority todo item, continue with whatever data returned |
| GSC not configured | Run audit in manual mode; include what to check in each GSC section |
| DataForSEO not configured | Skip rank tracking, backlink, and keyword gap commands; use manual Ahrefs/Semrush instructions |
| Bing not configured | Skip Bing crawl commands; ask user to check Bing Webmaster Tools dashboard manually |
| WordPress not configured | Provide CMS instructions for manual implementation of title tags, meta, schema |
| Cloudflare not configured | Provide manual redirect and robots.txt implementation instructions |

---

## XML Boundaries

<user_request>
{URL and any context the user provides}
</user_request>

<site_analysis>
{Content and signals gathered from visiting the site}
</site_analysis>

<user_response>
{Answers to the intake questions}
</user_response>

## Process Overview

0. **Phase 0: Plan State Detection** - Check if a plan file exists for this site. If yes, enter Continue Mode. If no, run fresh.
1. **Phase 1: Site Analysis** - Visit the site, auto-detect purpose and current state
2. **Phase 2: Tool Detection + Intake** - Silently check for GSC, ask two questions
3. **Phases 3-10: Eight Audit Dimensions** - Systematic inspection, pulling live data where available
4. **Phase 11: Todo List + Save Plan** - Synthesized output, prioritized by impact, saved as a self-contained plan file
5. **Phase 12: Generate (optional)** - Produce ready-to-use assets for flagged issues
6. **Phase 13: Execute (optional)** - Submit sitemaps, resubmit for indexing, validate schema, update plan checkboxes

Work through each phase completely before moving to the next. Do not rush to the todo list.

---

## Phase 0: Plan State Detection

Run this before anything else.

### Step 1: Locate the SEO directory

Check for a `seo/` directory in the current project context (open files, @mentioned path, or visible workspace). If found, check for:
- `seo/plans/` containing one or more `plan-YYYY-MM-DD/plan.md` files
- `seo/todos.md`
- `seo/history.md`

### Step 2: Determine mode

**Continuing an existing plan:**
If a `plan.md` is visible or @mentioned:
1. Read the file. Identify `[x]` (complete) and `[ ]` (pending) items.
2. Report: "Found existing SEO plan for [domain]. X of Y steps complete. Next pending: [step title]."
3. Ask: continue in order, jump to a specific step, or run a fresh audit?
4. If continuing: skip Phases 1-11. Proceed to the next pending step.
5. After each completed step: mark `[x]`, update `Last updated` in the header, remove connectors from the Required Connectors table when their last step is done.

**Running a new audit (no plan exists or user requests fresh):**
Proceed to Phase 0.5, then Phase 1.

**First run for this site (no `seo/` directory):**
If code access is available, create the directory structure defined in the SEO Directory Structure section before running the audit. If no code access, skip and note it at the end.

---

## Phase 0.5: History and Todos (every run)

Run this at the start of every session, whether continuing a plan or starting fresh.

### History update

1. Run PageSpeed Insights on the homepage (mobile and desktop).
2. If GSC is connected, pull impressions and clicks for the past 28 days.
3. Append one row to `seo/history.md` using the fixed schema. Use "N/A" for any data not available (GSC not connected, Ahrefs not checked, etc.).
4. Compare the new row to the most recent previous row. Report any changes: score improvements, LCP regressions, indexed page count changes, traffic deltas.
5. If a metric has degraded since the last audit, flag it as a priority item in the new plan.

### Todos check

1. Read `seo/todos.md`.
2. Surface all P1 items at the top of the session summary.
3. Carry uncompleted P1 items into the new plan automatically as High Priority items.
4. Ask the user to confirm any P2 items before including them.
5. P3 items: mention them but do not include in the plan unless the user requests it.

---

## Phase 1: Site Analysis

Visit the provided URL. Read the homepage, About page, navigation structure, and a sample of 3-5 inner pages including one blog or resource page if present.

Detect and document:
- Site type: e-commerce, local business, SaaS/software, professional services, informational/blog, portfolio, marketplace, nonprofit, or media
- Industry and niche
- Target audience (consumer vs. business, geographic scope)
- Geographic focus: local, national, or international
- Primary value proposition
- Apparent target keywords (from title tags, headings, and copy)
- Approximate content volume: small (under 30 pages), medium (30-200), large (200+)
- CMS signals: WordPress, Shopify, Webflow, custom, or unknown

Present a brief site profile to the user, then proceed to Phase 2.

---

## Phase 2: Tool Detection and Intake

### Silent Connector Detection
Before asking anything, silently check which connectors are available for this site. Do not report this to the user - just note which data sources will be live vs. manual.

| Connector | How to detect | What it enables |
|---|---|---|
| Google Search Console | `/memory/connectors/google/search-console-sites.json` contains the domain | Live GSC data (queries, impressions, CTR, sitemap status, URL inspection) |
| DataForSEO | `/memory/connectors/dataforseo/.env` exists | Live rank tracking, backlink data, domain overview, keyword gap, search volume |
| Bing Webmaster Tools | `/memory/connectors/bing/sites.json` contains the domain | Live Bing crawl stats, issues, sitemaps |
| PageSpeed Insights | Always available (anonymous quota or API key in `/memory/connectors/google/.env`) | Core Web Vitals and performance score |

If GSC is detected, tell the user: "I have live Search Console data for this site." If DataForSEO is configured, also tell the user: "I have live rank tracking and backlink data via DataForSEO."

If a connector is not configured and its data would materially improve the audit, note it once at the end of the todo list as an optional setup item - do not interrupt the audit flow to ask for setup.

### Two Intake Questions
Ask both in a single message. Do not ask anything else.

1. **Audit goals** (select all that apply):
   - Rank for new keywords
   - Recover a traffic drop
   - Pre-launch review
   - Ongoing maintenance check
   - Competitive analysis

2. **Tool access** (check all that apply):
   - Google Analytics 4
   - Ahrefs, Semrush, or Moz
   - Screaming Frog
   - None of the above

Do not ask about Google Search Console (auto-detected above), DataForSEO (auto-detected above), or PageSpeed Insights (always runs automatically).

---

## Phase 3: Technical SEO

### Crawlability and Indexation
- Fetch `/robots.txt`. Is Googlebot allowed on all important pages? Any key directories accidentally blocked?
- Fetch `/sitemap.xml` or `/sitemap_index.xml`. Does it exist? Does it include all important pages?
- Run `site:domain.com` in Google. How many pages are indexed vs. actual page count? Over-indexation (thin/duplicate pages) and under-indexation (key pages missing) are both problems.

**If GSC connected:** Run `sitemaps` and `url-inspect` (homepage) commands now. Canonical issues, indexation blocks, and sitemap gaps surface immediately.

**If GSC not available:** Ask the user to check the Coverage report in Search Console for indexation errors and any gap between submitted and indexed pages in the Sitemaps section.

### HTTPS and Security
- Is the entire site served over HTTPS? Does HTTP redirect to HTTPS?
- Any mixed content warnings (HTTP resources on HTTPS pages)?

### Redirect Health
- Any redirect chains longer than one hop (A to B to C)? Each hop loses link equity.
- Any redirect loops?
- All permanent redirects using 301, not 302?

### Duplicate Content and Canonicals
- Does `www.domain.com` redirect to `domain.com` (or vice versa) rather than serve duplicate content?
- Do trailing slash variants redirect to one canonical version?
- Are canonical tags present and correct on key pages?
- Are URL parameters creating duplicate pages (`?ref=`, `?sort=`, `?page=`)?

### Mobile Usability
- Is the site mobile-responsive?
- Viewport configured correctly?
- Tap targets appropriately sized?
- Font size readable without zooming?

### Core Web Vitals
Run PageSpeed Insights automatically using the Google connector:

```
node connectors/google/scripts/pagespeed.js --url https://[domain] --strategy both
```

Also run on one key inner page (top landing page or main service page).

Assess and flag:
- **LCP (Largest Contentful Paint):** Target under 2.5s. Common causes: unoptimized hero images, slow server TTFB, render-blocking resources.
- **INP (Interaction to Next Paint):** Target under 200ms (field data). TBT in lab data is the proxy. Common cause: heavy third-party JavaScript.
- **CLS (Cumulative Layout Shift):** Target under 0.1. Common causes: images without explicit dimensions, late-loading fonts, dynamically injected content.
- **TTFB:** Target under 800ms. Cause: slow hosting, no CDN, unoptimized server.

For every opportunity listed in the PageSpeed output, include it in the todo list.

### Site Architecture
- How many clicks to reach important pages from the homepage? Pages more than 3 clicks deep receive less PageRank and are harder to discover.
- Are there orphaned pages (no internal links pointing to them)?
- Is navigation logical and hierarchical?

### International SEO (if applicable)
- Hreflang tags implemented correctly for multilingual/multi-region sites?
- Separate URLs per locale?

---

## Phase 4: On-Page SEO

Inspect the homepage, top 3-5 landing or service pages, and top 3-5 blog/content pages.

### Title Tags
- Present on all pages?
- Unique across pages?
- 50-60 characters?
- Primary keyword near the front?
- Written as copy that earns a click, not just a keyword string?

### Meta Descriptions
- Present on all pages?
- Unique across pages?
- 120-160 characters?
- Includes a value proposition or call to action?

### Heading Structure
- Exactly one H1 per page?
- H1 contains primary keyword naturally?
- H2/H3 used for logical sub-sections, not styling?

### Keyword Placement
- Primary keyword in the first 100 words?
- Primary keyword in at least one H2?
- No keyword stuffing?

### Content Quality and Length
- Does content depth match what Google is already ranking? Check the top 3 results for the primary keyword. If they are 2,000-word guides and this page is 300 words, that is a gap.
- Does the page match the user's likely search intent (informational, transactional, navigational, commercial)?

### Images
- Descriptive alt text on all meaningful images?
- Decorative images marked with empty alt?
- Images sized appropriately (not a 3000px image displayed at 300px)?
- Modern formats (WebP preferred)?

### Internal Linking
- Pages link to topically related pages with descriptive anchor text?
- No generic anchors ("click here", "learn more", "read more")?
- High-value pages receiving internal links from related content?

### URL Structure
- Clean, readable URLs?
- Primary keyword in URL?
- Hyphens as word separators, not underscores?

### Social Meta Tags (Open Graph)
- `og:title`, `og:description`, `og:image`, `og:url` present on all key pages?
- `og:image` is at least 1200x630px and not the site logo (use a page-specific featured image)?
- `twitter:card` set to `summary_large_image`?
- Missing OG tags mean link previews on LinkedIn, Slack, and iMessage show as blank or generic. For B2B sites where prospects validate via LinkedIn, this is a high-priority fix.

---

## Phase 5: Content Audit

### Thin Content
Identify pages with low word count and no unique value:
- Boilerplate or auto-generated pages (tag archives, empty category pages, author pages with no posts)
- Pages duplicating information better covered elsewhere on the site

**Semrush Content Audit thresholds (use as calibration, not hard rules):**
- Under 200 words with no unique media, data, or interactive elements: strong thin content candidate
- 200-500 words with no backlinks and no GSC impressions in the past 90 days: low-value, consolidation candidate
- Word count alone is not the signal. A 100-word comparison table that directly answers a transactional query can outrank a 2,000-word essay. Judge by whether the page delivers unique value a user cannot get from competing results.

Action: consolidate, expand with genuine depth, or add `noindex`. Never delete a page that has inbound backlinks without setting a 301 redirect first.

### Keyword Cannibalization
Multiple pages targeting the same primary keyword split ranking signals - both rank lower than one strong page would.

**Detection methodology (Ahrefs approach):**
1. Export all pages from GSC (or use `site:domain.com`) and their top-ranking keywords
2. Group pages by overlapping primary keyword intent
3. A cannibalization conflict exists when two or more pages receive impressions for the same query AND neither ranks in the top 5 consistently
4. Confirm via GSC: filter Search Analytics by the keyword and check if multiple pages appear in the results for that query

Check shortcut: `site:domain.com [keyword]`. If multiple pages appear prominently, cannibalization is likely.

**Severity scoring:**
- Critical: Two pages competing for a high-volume, high-commercial-value keyword, both ranking positions 6-20 (neither converts, both dilute)
- High: Same as above with medium-volume keywords
- Medium: Informational cannibalization (two blog posts covering the same topic)

Action: designate one page as the canonical target, 301 the other, and consolidate content. Update all internal links to point to the winner. Re-submit the winner to GSC.

### Search Intent Alignment
For each target keyword, check what format Google is ranking on page one (product pages, how-to guides, list posts, tools, forum threads). The page format must match that intent to compete.

**The four intent types (Semrush framework):**
- Informational: User wants to learn. Ranking format: guides, how-tos, listicles, definitions.
- Navigational: User wants a specific site. Ranking format: branded homepages, login pages.
- Commercial Investigation: User is comparing options before buying. Ranking format: reviews, comparisons, best-of lists.
- Transactional: User is ready to act. Ranking format: product pages, pricing pages, sign-up pages.

Common mismatch patterns:
- Blog post targeting a transactional keyword (user wants to buy, page tries to educate)
- Product page targeting an informational keyword (user wants to learn, page tries to sell)
- Guide targeting a navigational keyword (user wants a specific brand, page is generic)

Each mismatch is a content restructuring opportunity, not just a writing problem.

### Topic Cluster Structure
Is content organized into pillar pages (broad topic overview) supported by cluster pages (deep subtopic dives linking back to the pillar)?

**Ahrefs topical authority model:**
- A pillar page covers the broadest version of a topic at a depth that can rank for the head term (e.g., "content marketing")
- Cluster pages cover specific subtopics (e.g., "content marketing for B2B SaaS") and link back to the pillar with the same anchor text as the pillar's target keyword
- The pillar links out to each cluster in its outline or table of contents
- Without this bidirectional linking, Google cannot identify the authoritative page for the head term

Gaps to flag:
- Cluster content exists but does not link back to a pillar
- Pillar page exists but has no supporting cluster content
- Multiple shallow pages on related topics with no pillar consolidating them

### Content Freshness
- Key pages showing outdated dates, references to old years, or superseded statistics?
- High-value pages should be reviewed annually at minimum and re-submitted to GSC after updates
- **Semrush freshness signal:** Google's Freshness algorithm applies most strongly to: breaking news, recurring events, regularly updated information (e.g., "best [X] in [year]"). For evergreen content, freshness matters less than depth and backlinks. Prioritize freshness updates on pages where the query has a strong recency signal (news, seasonal, annual comparisons).

### Content Gaps

**If DataForSEO configured:**

First, get a domain overview and ranked keywords to understand what the site already ranks for:
```
node connectors/dataforseo/scripts/labs.js domain-overview --domain [domain]
node connectors/dataforseo/scripts/labs.js ranked-keywords --domain [domain] --limit 200 --min-volume 50
```

Then find competitor domains and run keyword gap analysis:
```
node connectors/dataforseo/scripts/labs.js competitors --domain [domain] --limit 5
node connectors/dataforseo/scripts/labs.js keyword-gap --domain [domain] --competitor [top-competitor] --limit 100 --min-volume 100
```

**If Labs commands return "No domain data available":** The domain is below DataForSEO's traffic threshold for their Labs index. This is common for smaller or newer sites. Fall back to the GSC data from Phase 9 (top queries and top pages give the same ranked keywords picture), and use the SERP rank-check command to verify specific keyword positions manually:
```
node connectors/dataforseo/scripts/serp.js rank-check --domain [domain] --keywords "[keyword1],[keyword2]" --depth 100
```
Note in the audit: "DataForSEO Labs has insufficient data for this domain. Keyword analysis based on GSC data and manual SERP checks."

Use the ranked keywords output to identify:
- Keywords ranking positions 11-20: these are "quick win" content improvement opportunities (the page exists and almost ranks - optimization can push it into top 10 within weeks)
- Keywords ranking positions 21-100: longer-term targets for new or expanded content
- High-volume keywords where the competitor ranks top 5 but the site has nothing: new content opportunities

**If DataForSEO not configured:**
- Topics competitors rank for that this site has no content on (manual: search the competitor's top pages in their GSC or Ahrefs/Semrush if available)
- Prioritize gaps where: (1) the site already has topical authority in a related cluster, (2) the keyword has commercial or informational value aligned with the site's goals, and (3) the competitor ranking for it has a Domain Rating the site could realistically match within 6 months
- **Ahrefs content gap workflow:** Enter the site's domain and up to 3 competitor domains. Filter to keywords all competitors rank for but the site does not. Sort by keyword difficulty ascending to find quick wins. Filter by search volume to prioritize.

---

## Phase 6: E-E-A-T and Authority Signals

**YMYL check first:** Is this site in health, finance, legal, or safety topics? If yes, E-E-A-T deficiencies are Critical, not Medium.

### Expertise
- Author bylines on content?
- Bylines linking to author bio pages?
- Bios include credentials and demonstrated expertise?
- About page explains who runs the site and their qualifications?

### Authoritativeness
- Press mentions, media coverage, or citations from authoritative sites?
- Industry awards, certifications, or association memberships displayed?
- Content cites authoritative external sources?

### Trust
- Contact information visible (address, phone, email)?
- Privacy policy and terms of service in footer?
- For e-commerce: return policy, shipping policy, secure checkout signals?
- Real customer reviews or testimonials, ideally with schema markup?
- Site free of intrusive pop-ups, aggressive ads, deceptive UX?

---

## Phase 7: Backlinks and Authority

### With DataForSEO (auto-runs if configured)

Pull backlink data automatically:
```
node connectors/dataforseo/scripts/backlinks.js summary --domain [domain]
node connectors/dataforseo/scripts/backlinks.js referring-domains --domain [domain] --limit 50
```

If competitors were identified in Phase 5, also run link gap:
```
node connectors/dataforseo/scripts/backlinks.js link-gap --domain [domain] --competitor [top-competitor] --limit 50
```

From the summary, flag:
- Domain Rank below 20 for a site older than 2 years: link building is a strategic priority
- Broken backlinks: run link-gap on the 404 data and flag for redirect reclaim
- Anchor text concentration: if exact-match keyword anchors exceed 20% of total, flag as Medium risk

### With Ahrefs, Semrush, or Moz (if user confirmed access in intake)

**Domain authority benchmarks:**
Pull the site's Domain Rating (Ahrefs) or Domain Authority (Moz) and contextualize it against what's competing:

| DR/DA Range | Typical Profile |
|---|---|
| 0-20 | New site or very limited link building. Competing on long-tail and local. |
| 21-40 | Some traction. Can compete for mid-tail keywords in a non-competitive niche. |
| 41-60 | Established site with a real link profile. Can compete for most non-YMYL keywords. |
| 61-80 | Strong authority. Competitive for most verticals. |
| 80+ | Publisher, media, or dominant brand. |

Flag if the site's DR is more than 15 points below the median DR of the top 3 competitors for its primary keywords. That gap represents months to years of link building and should be noted as a Long-Term Investment, not a quick fix.

**Anchor text analysis (Ahrefs methodology):**
- Branded anchors (domain name, brand name): healthy natural profile has 40-60% branded
- Generic anchors ("click here," "learn more," "website"): acceptable in small quantity, not dominant
- Exact-match keyword anchors: above 15-20% of total anchors is an unnatural signal and a Penguin risk
- Partial-match anchors: healthy and natural
- Naked URLs: common for citations, acceptable

Flag for disavow consideration: exact-match anchor concentration above 20%, combined with links from low-DR (under 10) irrelevant sites.

**Toxic link criteria (Semrush Toxicity Score framework):**
A backlink is toxic if two or more of the following apply:
- Source domain has a Toxicity Score of 60+ in Semrush, or DR under 5 in Ahrefs with no traffic
- Link is from a completely irrelevant industry with no editorial rationale
- Site hosts links to gambling, pharma, adult, or payday loan content with no other focus
- Anchor text is exact-match keyword, especially for a high-value money keyword
- Link appears in a footer, site-wide widget, or link directory with hundreds of other outbound links
- Domain was recently registered (under 1 year) and has no organic traffic

**Competitor link gap (Ahrefs Content Gap / Link Intersect):**
1. Enter the site's domain and the top 3 organic competitors
2. Filter to referring domains that link to all 3 competitors but NOT to this site
3. These are validated link opportunities: the site has been editorially accepted in this niche
4. Sort by DR descending; prioritize DR 40+ domains
5. Cross-reference: what content or resource on those domains earned the link? Can the site create something comparable or better?

**Broken inbound links:**
- External sites linking to pages that now 404 represent lost ranking signals
- Ahrefs: Site Explorer > Pages > Best by Links > filter by 404
- Each 404 with inbound links should receive a 301 to the closest topically relevant live page
- Reclaiming just 5-10 high-DR inbound links this way can produce measurable ranking improvements

**Unlinked brand mentions:**
- Ahrefs Alerts or Semrush Brand Monitoring: set up alerts for the brand name, product names, and key people associated with the site
- When a mention is found without a link, reach out to request attribution
- Priority targets: DR 40+ sites that already know and reference the brand

### Without DataForSEO Backlinks Subscription

**Primary manual path: Ahrefs Webmaster Tools (free for verified site owners)**

Ahrefs Webmaster Tools is completely free for sites you own. It provides the same backlink data as the paid Ahrefs product, limited to your own verified domains. Setup takes 15-20 minutes per site.

**Setup (if not already done):**
1. Go to `https://ahrefs.com/webmaster-tools` and sign in with a Google account
2. Click "Add a website" and enter the domain
3. Verify ownership via DNS TXT record (preferred), HTML file upload, or meta tag
4. Repeat for each site

**During the audit: pause and ask the user for this data**

When Phase 7 is reached, send this exact request to the user before continuing:

---
"To complete the backlink analysis, open **Ahrefs Webmaster Tools** (`ahrefs.com/webmaster-tools`) for [domain] and pull the following - it takes about 3-4 minutes:

**Overview tab:**
- Domain Rating (DR)
- Total referring domains - and is the trend arrow pointing up or down?
- Total backlinks

**Pages tab** (filter: 404 not found, sort by: Referring domains, descending):
- Are there any 404 pages with 3 or more referring domains? If yes, list the URLs and referring domain count.

**Anchors tab:**
- What are the top 5 anchor texts?
- Roughly what percentage looks branded (company name, domain) vs. exact-match keywords?

**Competitors tab:**
- What are the top 3 competing domains listed?"
---

Wait for the user's response before writing any backlink findings. Incorporate all reported data using the thresholds below.

**Thresholds to apply to reported data:**

| Data Point | Where to Find It | What to Flag |
|---|---|---|
| Domain Rating | Overview tab | DR under 20 for a site over 2 years old: Low priority. Under 10 after 3+ years: Critical. |
| Referring domains | Overview tab | Trend direction matters as much as count. Declining = link loss problem. |
| Total backlinks | Overview tab | Backlinks-to-referring-domains ratio over 500:1 = sitewide or footer links, low value. |
| Broken backlinks | Pages tab > filter 404 > sort by Referring domains | Any 404 with 3+ referring domains: reclaim with 301 redirect. Flag as Quick Win. |
| Anchor text | Anchors tab | Exact-match keyword anchors over 20% of total: flag as Penguin risk, Medium priority. |
| Top referring domains | Backlinks tab > filter Dofollow > sort by DR | DR under 5 with exact-match anchor: toxic link candidate. |

**For competitor link gap without paid tools:**
1. In Ahrefs Webmaster Tools, go to Competitors > Competing Domains (limited but directional)
2. Alternatively, take the top 3 Google competitors for the main keyword and check `ahrefs.com/backlink-checker` (free version shows top 100 backlinks for any domain)
3. Note any DR 40+ domains in the competitor's top 100 that do not appear in your own backlink list

**If the site is not yet verified in Ahrefs Webmaster Tools:**
Tell the user: "To complete the backlink dimension, verify this site at `https://ahrefs.com/webmaster-tools` (free). The setup takes 15 minutes and gives you permanent access to your full backlink profile. I've noted the specific data points to collect once you're set up." Then flag backlink analysis as Deferred pending Ahrefs setup, not as skipped.

**Fallback if Ahrefs Webmaster Tools is unavailable (competitor sites or unverified domains):**
- `site:domain.com` in Google gives a rough indexed page count but no link data
- Search the brand name in quotes to surface unlinked mentions
- Check if the site appears in relevant industry directories, associations, or chamber of commerce listings (these are legitimate, DR-boosting links)
- Assess the site's visible link-earning assets: original research, free tools, data studies, comprehensive guides. If none exist, organic link acquisition will be slow regardless of outreach.

### Link Velocity
- A sudden spike in links (from a press mention, viral content, or a link campaign) is healthy if the links are from diverse, relevant domains
- A sudden drop in referring domains indicates link loss (site went down, content removed, or manual disavow by a referring site); requires investigation
- Gradual, consistent link growth is the healthiest signal
- If the user reports a traffic drop, explicitly ask: did a disavow file change, a link campaign end, or a large referring site remove links in the 30 days prior?

---

## Phase 8: Structured Data

### Sitewide (Every Site)
- **Organization:** Name, URL, logo, social profiles, contact info. Enables accurate Knowledge Panel.
- **WebSite:** Enables sitelinks search box for branded queries.
- **BreadcrumbList:** All inner pages. Improves SERP display and hierarchy signals.

### Page-Type Schema

| Page Type | Schema |
|---|---|
| Blog post or article | Article or BlogPosting (author, datePublished, dateModified, image) |
| Product page | Product (name, price, availability, AggregateRating) |
| Local business | LocalBusiness (address, hours, phone, geo coordinates) |
| Service page | Service (name, description, provider, areaServed) |
| FAQ section | FAQPage (expands SERP real estate significantly) |
| How-to guide | HowTo (steps, tools, total time) |
| Author page | Person (name, credentials, social profiles) |
| Event | Event (name, date, location, organizer) |
| Book or published work | Book (name, author, publisher, ISBN, url) |

### Validation
Run key pages through Google's Rich Results Test (`search.google.com/test/rich-results`). Errors prevent rich results entirely. Warnings reduce eligibility. Both are high-priority fixes.

---

## Phase 9: Analytics and Tracking

### Google Search Console

**If GSC connected:**

Run these commands and incorporate results directly into the audit:

```
node connectors/google/scripts/search-console.js sitemaps --site [domain] --account [email]
node connectors/google/scripts/search-console.js ctr-opportunities --site [domain] --rows 200 --min-impressions 50 --account [email]
node connectors/google/scripts/search-console.js top-queries --site [domain] --rows 25 --account [email]
node connectors/google/scripts/search-console.js top-pages --site [domain] --rows 25 --account [email]
node connectors/google/scripts/search-console.js url-inspect --site [domain] --url [homepage URL] --account [email]
```

Flag from results:
- Sitemaps: submitted vs. indexed gap (e.g., 500 submitted, 120 indexed - investigate why)
- Sitemap last downloaded more than 2 weeks ago: resubmit
- CTR opportunities: queries with 100+ impressions and under 3% CTR are title/meta description fixes
- URL inspection: canonical mismatches, indexing blocked, mobile usability failures
- Queries ranked for without dedicated content pages: expansion opportunities

**If GSC not available:**

Ask the user to check in their Search Console dashboard (`search.google.com/search-console`):
- Sitemaps: submitted vs. indexed count per sitemap
- Coverage: pages with errors or excluded status that should be indexed
- Core Web Vitals: URL groups marked Poor or Needs Improvement
- Performance: Impressions descending, look for queries with high impressions and CTR under 3%
- Security and Manual Actions: confirm no penalties are active

### Google Analytics 4 (manual mode)

If the user confirmed GA4 access:
- GA4 firing on all pages, not just the homepage (use Realtime report to verify)
- Key conversion events tracked (form submissions, purchases, sign-ups, phone clicks)
- GA4 property linked to Search Console (Admin > Property > Search Console Links)
- No double-counting from multiple GA4 implementations (check Tag Assistant or page source)

If the user does not have GA4: flag as Medium priority - install GA4 with conversion tracking.

### Bing Webmaster Tools

**If Bing connector configured** (`/memory/connectors/bing/sites.json` exists or `BING_WEBMASTER_API_KEY` is set):

Check `sites.json` first to see if the site is already verified. If verified, run:

```
node connectors/bing/scripts/webmaster.js sitemaps --site [domain]
node connectors/bing/scripts/webmaster.js crawl-stats --site [domain]
node connectors/bing/scripts/webmaster.js crawl-issues --site [domain]
```

Flag from results:
- No sitemap submitted: submit immediately
- Crawl errors in `crawl-issues`: categorize and add to the audit todo list
- Low crawl volume (under 10 pages/day for a 100+ page site): Bingbot may be blocked or rate-limited

**If Bing connector not configured:**

Ask the user to check in their Bing Webmaster Tools dashboard (`bing.com/webmasters`):
- Site verified?
- Sitemap submitted?
- Any active crawl errors?

Note: Bing Webmaster Tools setup takes 10 minutes and is free. If not set up, flag as High Priority for any site targeting LLM findability (Bing indexes feed ChatGPT browse mode). Guide through `connectors/bing/SETUP.md`.

This is directly tied to ChatGPT visibility. Treat as a non-negotiable setup item for any site that wants LLM findability.

---

## Phase 10: GEO - LLM Findability

### LLM Crawler Permissions
Fetch `/robots.txt` and check for explicit Allow or Disallow directives for:

| Crawler | Bot Name |
|---|---|
| ChatGPT | GPTBot |
| Google Gemini training | Google-Extended |
| Perplexity | PerplexityBot |
| Claude | ClaudeBot |
| Apple | Applebot-Extended |
| Common Crawl | CCBot |

Most sites have no directives - each bot follows its own default. A deliberate strategy is needed.

### llms.txt
- Does `/llms.txt` exist?
- If yes: is it a clear, well-structured markdown summary with site description, purpose, key pages, and usage guidance?
- If no: flag as a quick win. Reference standard: `llmstxt.org`

### Answer-Formatted Content
LLMs extract and cite content with direct, attributable statements:
- FAQ sections with clear question headings and direct answers?
- How-to pages with numbered steps and explicit outcomes?
- Factual claims stated plainly, not buried in persuasion copy?
- A concise "What is [brand/product]?" statement on the site?
- **Homepage is the highest priority page for FAQ content.** It receives the most crawl attention, the most backlinks, and is the most likely page to be cited in AI-generated answers. If only one page gets an FAQ section, it should be the homepage.

### Brand Entity Consistency
Check for consistency across: About page, LinkedIn company page, Crunchbase (if applicable), Wikipedia (if applicable), press coverage. Inconsistencies confuse LLMs and result in incorrect or absent brand representation in AI answers.

### Google Business Profile
- Does the brand have a Google Business Profile (`business.google.com`)?
- If yes: is information accurate (name, URL, description, category)?
- If no: flag as High Priority for any professional services or B2B site. A verified GBP produces a Knowledge Panel on branded searches and directly addresses low branded-query rankings. Setup takes 20 minutes and is free.

### Knowledge Panel
- Search brand name on Google. Is there a Knowledge Panel?
- If yes: is information accurate? Claim and verify via Search Console.
- If no: build entity signals through Organization schema, GBP, consistent NAP data, and mentions on authoritative sites.

### Perplexity and ChatGPT Presence Test
- Search brand name and primary service category on Perplexity.ai. Accurately represented?
- Search the same on ChatGPT. What does it say?
- Note any inaccuracies - these indicate missing or inconsistent entity signals.

---

## Phase 11: Synthesize and Output the Todo List

**Prioritization rules:**
- **Critical:** Technical issues actively blocking indexing or rankings (robots.txt blocking Googlebot, no HTTPS, manual action, site not indexed)
- **High:** Direct, significant ranking impact (Core Web Vitals failures, keyword cannibalization, missing title tags, thin content on key pages, broken schema)
- **Medium:** Meaningful improvements that compound over time (content gaps, E-E-A-T gaps, internal linking, meta description optimization)
- **Quick Wins:** Low effort, immediate improvement (FAQ schema on existing FAQ content, fixing redirect chains, alt text, submitting to Bing Webmaster Tools, adding llms.txt)
- **Long-Term:** High impact, sustained effort (link building, topic cluster buildout, content depth expansion, entity authority building)

Sort each tier by impact within the tier.

### Output Format

```
## SEO Audit: [domain.com]
Audited: [date]
Site Type: [detected]
Industry: [detected]
Audit Goal: [stated]
GSC Connected: Yes / No

---

## Summary
[2-3 sentences: overall assessment, biggest opportunity, most urgent problem]

X critical | X high | X medium | X quick wins | X long-term

---

## Critical - Fix First

### [#] [Issue Title]
**Problem:** [Specific description of what is wrong and where]
**Impact:** [What this is costing in rankings, traffic, or indexation]
**Fix:** [Step-by-step instructions]
**Effort:** [e.g., 30 minutes / half day / 1 day]
**Tool:** [GSC / PageSpeed / code access / etc.]

---

## High Priority

[Same format]

---

## Medium Priority

[Same format]

---

## Quick Wins

[Same format]

---

## Long-Term Investments

[Same format]

---

## Dimension Coverage

| Dimension | Items Found | Top Issue |
|---|---|---|
| Technical SEO | X | [brief] |
| On-Page | X | [brief] |
| Content | X | [brief] |
| E-E-A-T | X | [brief] |
| Backlinks | X | [brief] |
| Structured Data | X | [brief] |
| Analytics | X | [brief] |
| LLM Findability | X | [brief] |
```

### Save the Plan File

After delivering the todo list, save it as `seo/plans/plan-[YYYY-MM-DD]/plan.md` where the date is today's date. Also create `seo/plans/plan-[YYYY-MM-DD]/assets/` as an empty directory (assets are placed here during Phase 12).

If code access is not available, output the plan as a chat artifact and instruct the user to save it manually.

After saving, update `seo/todos.md`: move any items from the new plan that are long-term or intentionally deferred into the appropriate P1/P2/P3 bucket with the source plan date.

The plan file is self-contained. A future session must be able to open it and continue executing steps without re-running the audit. Follow this format exactly:

```markdown
# SEO Plan: [domain]

**Tool:** `tools/SEO Expert/`
**Audited:** [date]
**Last updated:** [date]
**Site type:** [detected type]
**Audit goal:** [stated goals]

> To continue: open this file and tell the SEO Expert (`tools/SEO Expert/`) to continue the plan.

### Required Connectors

List only connectors needed for steps that are still pending. Remove a connector from this table once all steps requiring it are marked `[x]`.

| Connector | Path | Needed for |
|---|---|---|
| Google Search Console | `connectors/google/` | [step titles] |
| Bing Webmaster Tools | `connectors/bing/` | [step titles] |
| DataForSEO | `connectors/dataforseo/` | [step titles] |

---

## Checklist

### Critical
- [ ] [Step title] — [one-line fix summary] | [file or "off-site"]

### High Priority
- [ ] [Step title] — [one-line fix summary] | [file or "off-site"]

### Medium Priority
- [ ] [Step title] — [one-line fix summary] | [file or "off-site"]

### Quick Wins
- [ ] [Step title] — [one-line fix summary] | [file or "off-site"]

### Long-Term
- [ ] [Step title] — [one-line fix summary] | [file or "off-site"]

---

## Step Details

Full implementation instructions for each step. Collapse or remove a section once its checkbox is marked `[x]`.

### [Step title]
**Problem:** ...
**Impact:** ...
**Fix:** ...
**Effort:** ...
**Connector needed:** [connector name or "none"]
```

Omit connectors from the Required Connectors table that are not needed for any step in this plan.

---

## Phase 12: Generate (On Request)

After delivering the todo list, proactively offer to generate ready-to-use assets. Open with:

> "I can generate any of the following ready-to-use assets based on this audit. What would you like first?"

Then list only the asset types that are relevant to flagged issues. Do not list assets that are not applicable to this site. Generate one category at a time unless the user asks for multiple.

**Save all generated assets to `seo/plans/plan-[YYYY-MM-DD]/assets/`.** Use descriptive filenames: `schema-organization.json`, `robots.txt`, `llms.txt`, `redirect-map.md`, `disavow.txt`. Content briefs go to `seo/content/briefs/[keyword-slug].md`.

---

### 12.1 Schema Markup (JSON-LD)

Generate complete, valid, paste-ready JSON-LD for every page type flagged in Phase 8. Include all required and recommended properties; do not omit optional properties that improve rich result eligibility.

**Quality standards:**
- All string values must be populated with actual site content, never placeholder text
- `@context` must be `https://schema.org`
- Include `dateModified` whenever `datePublished` is present
- Use absolute URLs for all `url`, `image`, `logo`, and `sameAs` values
- For `logo`: use the actual logo URL. Recommended dimensions: 600x60px minimum, 1:1 to 16:1 aspect ratio
- Output one `<script type="application/ld+json">` block per schema type; do not nest unrelated types inside each other
- After generation, tell the user to validate at `search.google.com/test/rich-results` before deploying

**Templates by type:**

Organization (place in `<head>` sitewide):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Business Name]",
  "url": "https://[domain.com]",
  "logo": "https://[domain.com]/path/to/logo.png",
  "description": "[One sentence describing the organization]",
  "foundingDate": "[YYYY]",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "[contact@email.com]",
    "telephone": "[+1-xxx-xxx-xxxx]",
    "availableLanguage": "English"
  },
  "sameAs": [
    "https://www.linkedin.com/company/[handle]",
    "https://twitter.com/[handle]",
    "https://www.facebook.com/[handle]",
    "https://www.instagram.com/[handle]"
  ]
}
```

WebSite (place in `<head>` on homepage only):
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "[Site Name]",
  "url": "https://[domain.com]",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://[domain.com]/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```
Note: only include `potentialAction` if the site has a functional search box.

Article / BlogPosting (on each blog post or article):
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Article Title - must match H1, max 110 characters]",
  "description": "[2-3 sentence article summary]",
  "image": {
    "@type": "ImageObject",
    "url": "https://[domain.com]/path/to/featured-image.jpg",
    "width": 1200,
    "height": 630
  },
  "author": {
    "@type": "Person",
    "name": "[Author Full Name]",
    "url": "https://[domain.com]/author/[slug]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "[Publisher Name]",
    "logo": {
      "@type": "ImageObject",
      "url": "https://[domain.com]/path/to/logo.png"
    }
  },
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://[domain.com]/[article-slug]"
  }
}
```

FAQPage (on pages with Q&A sections; significantly expands SERP real estate):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Question text exactly as written on page]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Full answer text. May include HTML. Should match visible page content exactly.]"
      }
    },
    {
      "@type": "Question",
      "name": "[Second question]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Second answer]"
      }
    }
  ]
}
```

LocalBusiness (for businesses with a physical location):
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "image": "https://[domain.com]/path/to/storefront.jpg",
  "url": "https://[domain.com]",
  "telephone": "[+1-xxx-xxx-xxxx]",
  "priceRange": "[$$ / $$$ / etc.]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Street Address]",
    "addressLocality": "[City]",
    "addressRegion": "[State/Province]",
    "postalCode": "[Zip]",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": [lat],
    "longitude": [lng]
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "sameAs": [
    "https://www.google.com/maps/place/[business-name]",
    "https://www.yelp.com/biz/[slug]"
  ]
}
```

Product (e-commerce product pages):
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Product Name]",
  "image": [
    "https://[domain.com]/path/to/product-image-1.jpg",
    "https://[domain.com]/path/to/product-image-2.jpg"
  ],
  "description": "[Product description]",
  "sku": "[SKU or model number]",
  "brand": {
    "@type": "Brand",
    "name": "[Brand Name]"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://[domain.com]/[product-slug]",
    "priceCurrency": "USD",
    "price": "[price]",
    "priceValidUntil": "[YYYY-MM-DD]",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[4.8]",
    "reviewCount": "[127]"
  }
}
```
Note: only include `aggregateRating` if the site actually displays reviews. Fabricating review data is a manual action violation.

HowTo (for step-by-step instructional content):
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "[How to Do X]",
  "description": "[Brief description of what the guide accomplishes]",
  "totalTime": "PT[N]M",
  "tool": [
    { "@type": "HowToTool", "name": "[Tool 1]" },
    { "@type": "HowToTool", "name": "[Tool 2]" }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "[Step 1 heading]",
      "text": "[Full step 1 instructions]",
      "image": "https://[domain.com]/path/to/step-1-image.jpg",
      "url": "https://[domain.com]/[guide-slug]#step-1"
    },
    {
      "@type": "HowToStep",
      "name": "[Step 2 heading]",
      "text": "[Full step 2 instructions]"
    }
  ]
}
```

Book (on any page featuring a published book; helps Google build entity associations between the site and the work):
```json
{
  "@context": "https://schema.org",
  "@type": "Book",
  "name": "[Book Title]",
  "author": {
    "@type": "Person",
    "name": "[Author Full Name]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "[Publisher Name]"
  },
  "datePublished": "[YYYY]",
  "isbn": "[ISBN-13 if known]",
  "url": "https://[domain.com]/[book-page]",
  "description": "[2-3 sentence description of the book]"
}
```

BreadcrumbList (on every inner page; improves SERP breadcrumb display):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://[domain.com]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Category Name]",
      "item": "https://[domain.com]/[category]/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Page Title]",
      "item": "https://[domain.com]/[category]/[page-slug]"
    }
  ]
}
```

---

### 12.2 Optimized Title Tags

Generate rewritten title tags for every page flagged in Phase 4.

**Quality standards:**
- 50 to 60 characters. Google begins truncating around 600px wide; most fonts hit that at 60 characters. Confirm the count before outputting.
- Primary keyword in the first 30 characters where the sentence naturally allows it. Do not force keyword placement at the expense of readability.
- Brand name at the end, separated by ` | ` or ` - `. Omit brand name if the title would exceed 60 characters; brand signals in the domain are sufficient.
- Never keyword-stuff. One primary keyword per title. A natural secondary variation is acceptable if it reads like a sentence.
- Written as compelling copy that matches search intent, not a metadata dump.
- Unique across all pages. Flag any proposed titles that are too similar to existing titles on the site.
- Sentence case preferred for readability; title case acceptable if it matches the brand's existing style.

**By page type:**

| Page Type | Formula | Example |
|---|---|---|
| Homepage | [Primary value prop] \| [Brand] | SEO Software for Small Businesses \| BrightRank |
| Service page | [Service] in [Location] \| [Brand] | Web Design Services in Austin \| Studio X |
| Blog post | [Topic or question answered] - [Brand] | How to Fix Crawl Errors in Google Search Console - BrightRank |
| Product page | [Product Name] - [Key attribute] \| [Brand] | Noise-Canceling Headphones - Wireless, 40hr Battery \| SoundCo |
| Category page | [Category] [Products/Services]: [Differentiator] \| [Brand] | Men's Running Shoes: Lightweight & Cushioned \| RunShop |
| About page | About [Brand]: [Mission in 4-6 words] | About BrightRank: Built for Entrepreneurs |
| Contact page | Contact [Brand] - [Response expectation] | Contact SoundCo - Replies Within 24 Hours |

Output as a table:

| Page URL | Current Title | New Title | Character Count |
|---|---|---|---|
| /[path] | [current] | [proposed] | [count] |

Flag any page where the current title is already strong and does not need a rewrite.

---

### 12.3 Meta Descriptions

Generate rewritten meta descriptions for every page flagged in Phase 4.

**Quality standards:**
- 120 to 160 characters. Below 120 is too short; Google often rewrites short descriptions. Above 160 gets truncated in mobile SERPs.
- Include the primary keyword naturally in the first sentence. Do not force it.
- End with a clear, specific CTA: "Learn how," "Get a free quote," "See all [X] options," "Start your free trial." Generic CTAs like "Click here" or "Find out more" are not acceptable.
- Match the search intent of the page: informational pages should promise an answer; transactional pages should highlight a benefit or offer.
- Active voice. Write directly to the reader using "you" where natural.
- Unique across all pages. Never duplicate a meta description.
- Do not make claims the page does not deliver (misleads users, increases bounce rate).

Output as a table:

| Page URL | New Meta Description | Character Count |
|---|---|---|
| /[path] | [proposed description] | [count] |

---

### 12.4 llms.txt File

Generate a complete, production-ready `llms.txt` file following the emerging standard at `llmstxt.org`. This file is placed at `https://[domain.com]/llms.txt` (root level, not in a subfolder).

**Purpose:** `llms.txt` tells AI crawlers and LLM indexers what the site is about, which pages matter, and how to represent the brand accurately. It increases the likelihood the site is cited correctly in AI-generated answers.

**Quality standards:**
- The `# [Site Name]` heading must match the `<title>` of the homepage exactly (or at minimum the brand name as it appears in structured data).
- The description block (`>`) must be 2 to 4 sentences: what the site does, who it is for, and what makes it authoritative or distinctive. This is what an LLM will use when summarizing the site. Write it accordingly.
- List only canonical, indexable, high-value pages. Do not list staging URLs, admin paths, redirect chains, or utility pages.
- Each page entry must include a one-sentence description of its specific purpose. "Our blog" is not acceptable; "In-depth tutorials on crawl budget optimization, Core Web Vitals, and technical SEO" is.
- Sections should reflect the site's actual content architecture: do not invent sections that do not map to real content areas.
- The `## About` section must include the entity's full legal or brand name, founding year if known, industry, and mission statement.

**Template:**

```
# [Brand Name]

> [2-4 sentence description of what the site does, who it is for, and why it is credible. Written as a factual summary an LLM would use to introduce the site in a generated answer.]

## Core Pages
- [Page Title]: [https://domain.com/page]
  [One sentence: exactly what this page covers and who it is for]
- [Page Title]: [https://domain.com/page]
  [One sentence description]

## [Content Category, e.g., "Services" or "Products"]
- [Page Title]: [https://domain.com/page]
  [One sentence description]

## [Second Content Category]
- [Page Title]: [https://domain.com/page]
  [One sentence description]

## Blog / Resources
- [Most important article]: [https://domain.com/article]
  [One sentence description]
- [Second most important article]: [https://domain.com/article]
  [One sentence description]

## About
[Brand Name] is [description: type of business, founding year if known, location if relevant, primary audience, core mission or differentiator].

## Contact
[Contact URL or email]: [https://domain.com/contact]
```

After generating, tell the user:
1. Upload the file to the root of the domain at `https://[domain.com]/llms.txt`
2. Verify it is accessible (not blocked by robots.txt, not returning a redirect)
3. Optionally submit the URL to Perplexity via their site submission form if available

---

### 12.5 Redirect Map

Generate a complete redirect map for every broken inbound link, renamed URL, or structural change identified during the audit.

**Quality standards:**
- All redirects should be 301 (permanent) unless there is a documented reason for temporary (302)
- Old URL must be the exact path, including trailing slash, query string, or fragment if applicable
- New URL must be the closest topically relevant live page. Do not redirect everything to the homepage.
- Flag any redirect chains (A > B > C) and collapse them to direct redirects (A > C)
- Flag any redirect loops
- If a broken inbound link has no suitable target page, note it as "No replacement - consider creating content"

**Output format:**

| Old URL | New URL | Status | Notes |
|---|---|---|---|
| /[old-path] | /[new-path] | 301 | [reason or blank] |
| /[broken-path] | (none) | - | No replacement - consider creating [topic] content |

**Implementation instructions (include the applicable one based on the site's platform):**

Apache (.htaccess):
```apache
Redirect 301 /old-path /new-path
```

Nginx:
```nginx
rewrite ^/old-path$ /new-path permanent;
```

WordPress (with Redirection plugin or Yoast Premium):
- Go to SEO > Redirects (Yoast) or Tools > Redirection (plugin)
- Add source URL `/old-path` and target URL `/new-path`, type 301

Cloudflare (Rules > Redirect Rules):
- Match: URI Path equals `/old-path`
- Then: Static redirect to `/new-path`, 301

---

### 12.6 Content Briefs

Generate structured content briefs for every content gap or cannibalization fix identified in Phase 5.

**Quality standards:**
- Each brief is one document per target keyword cluster. Do not write a brief for a keyword with ambiguous search intent; resolve intent first.
- Word count recommendation should be based on what currently ranks, not a generic heuristic. Use GSC top-pages data and visible SERP analysis to calibrate.
- Every H2 in the outline must map to a specific search intent signal (a question from People Also Ask, a topic covered by competitors, or a known user task).
- Internal linking plan must name specific existing pages, not generic categories.

**Brief template:**

```
## Content Brief: [Target Title]

**Target Keyword:** [primary keyword]
**Secondary Keywords:** [comma-separated list]
**Search Intent:** [Informational / Commercial / Transactional / Navigational]
**Audience:** [Who is searching this and why]
**Recommended Format:** [Guide / Listicle / Comparison / Tool / Case Study / Landing Page]
**Recommended Length:** [X words] (based on: [competitor 1 Xk, competitor 2 Xk, competitor 3 Xk])
**CTA / Conversion Goal:** [What action should the reader take at the end]

---

### Proposed H1
[Proposed page title that matches primary keyword and intent]

### Meta Description (draft)
[Draft meta description, 120-160 characters]

---

### Outline

#### Introduction
[What the introduction should establish: the problem, the reader's situation, what they will learn]

#### H2: [Section heading]
[What this section covers, questions it answers, or data it presents]
- H3: [Sub-section]
- H3: [Sub-section]

#### H2: [Section heading]
[Description]

#### H2: [Section heading]
[Description]

#### Conclusion / CTA
[What action to drive and how to frame it]

---

### Questions to Answer
(From People Also Ask and related searches)
- [Question 1]
- [Question 2]
- [Question 3]

---

### Internal Linking Plan
| Link From | Anchor Text | Link To (this page) |
|---|---|---|
| [Existing page URL] | [anchor] | Yes |

| Link To | Anchor Text | From (this page) |
|---|---|---|
| [Existing page URL] | [anchor] | Yes |

---

### E-E-A-T Signals to Include
- [ ] Author bio with credentials relevant to this topic
- [ ] First-hand experience or data (original research, case study, personal example)
- [ ] External citations from authoritative sources (.gov, .edu, or recognized industry publications)
- [ ] Last updated date visible in byline

---

### Notes
[Any specific requirements, restrictions, brand voice notes, or competitor pages to differentiate from]
```

---

## Phase 13: Execute (On Confirmation)

After the user reviews the todo list, offer to execute available actions. Always confirm before running.

**Deploy first.** If any steps involved code changes to the site, confirm they have been deployed to production before executing any indexing actions. Submitting a sitemap or requesting indexing before deployment sends crawlers to stale content.

**Available execute actions:**

IndexNow (no connector required):

**Check if already in place before setting up:**
- Look for a UUID `.txt` file in `public/` and a reference to `api.indexnow.org` in a build script or `package.json` postbuild hook. If found, it is already automated — mark done and skip setup.

**Automated setup (Next.js / Vercel and other build-pipeline frameworks):**

1. Generate a UUID key (`node -e "const {randomUUID}=require('crypto');console.log(randomUUID())"`)
2. Create `public/[uuid].txt` with the UUID as its only content
3. Create `scripts/indexnow.js`:
```javascript
// Pings IndexNow after every build for fast indexing across Bing, Yandex, Naver, Seznam, and Yep.
// Google uses GSC sitemap submission instead (google.com/ping was deprecated Jan 2024).
// Add new URLs to URLS when new pages are added to the site.
const KEY = '[uuid]';
const HOST = '[domain.com]';
const URLS = [
  `https://${HOST}/`,
  // add all canonical pages here
];

fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: URLS }),
})
  .then(r => console.log(`IndexNow: ${URLS.length} URLs (status ${r.status})`))
  .catch(e => console.warn('IndexNow failed (non-fatal):', e.message));
```
4. Add `"postbuild": "node scripts/indexnow.js"` to `package.json` scripts
5. Deploy — IndexNow fires automatically on every production build going forward

**Manual one-time submission (non-framework sites or no build pipeline):**
```bash
# Key file must already be hosted at https://[domain]/[uuid].txt
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"host":"[domain.com]","key":"[uuid]","urlList":["https://[domain.com]/","https://[domain.com]/[page]"]}'
```

- IndexNow reaches Bing, Yandex, Naver, Seznam, and Yep within minutes to hours. Google does not participate.
- **For Google:** there is no equivalent public ping. Google's sitemap ping endpoint (`google.com/ping`) was deprecated January 2024. The correct path for Google is GSC sitemap submission (connector command below) and accurate `lastmod` in the sitemap. Both are free and have no rate limits.

Google Search Console (requires GSC connector configured):
- Resubmit sitemap to Google: `node connectors/google/scripts/search-console.js submit-sitemap --site [domain] --sitemap [url] --account [email]`
- Inspect URL indexing status: `node connectors/google/scripts/search-console.js url-inspect --site [domain] --url [url] --account [email]`

Bing Webmaster Tools (requires Bing connector configured):
- Submit sitemap to Bing: `node connectors/bing/scripts/webmaster.js add-sitemap --site [domain] --sitemap [url]`
- Submit new/updated URLs for Bing indexing: `node connectors/bing/scripts/webmaster.js submit-url --site [domain] --url [url]`
- Check current sitemaps: `node connectors/bing/scripts/webmaster.js sitemaps --site [domain]`

Schema validation:
- Direct the user to `search.google.com/test/rich-results` with the generated JSON-LD
- For full sitemap coverage check: `node connectors/google/scripts/search-console.js sitemaps --site [domain] --account [email]`

WordPress (requires WordPress connector configured at `/memory/connectors/wordpress/`):

Update page or post slugs and titles directly:
```bash
node connectors/wordpress/scripts/posts.js update [id] --title "[optimized title]" --slug "[url-slug]" --site [domain]
node connectors/wordpress/scripts/pages.js update [id] --title "[optimized title]" --slug "[url-slug]" --site [domain]
```

Before updating, list all posts/pages to get their IDs:
```bash
node connectors/wordpress/scripts/posts.js list --all --site [domain]
node connectors/wordpress/scripts/pages.js list --all --site [domain]
```

Note: Meta descriptions require a Yoast SEO or Rank Math plugin that exposes SEO fields via the REST API. If neither plugin is active, provide the meta description content and instruct the user to paste it into the plugin manually. Schema markup similarly requires plugin access or direct template editing.

Cloudflare (requires Cloudflare connector configured at `/memory/connectors/cloudflare/`):

Implement redirect map items directly as Cloudflare Page Rules:
```bash
node connectors/cloudflare/scripts/page-rules.js create [zone] --url "[old-path]" --destination "https://[domain][new-path]" --status 301
```

List existing redirect rules before adding new ones to avoid conflicts:
```bash
node connectors/cloudflare/scripts/page-rules.js list [zone]
```

Note: Cloudflare free plan is limited to 3 Page Rules. Users on free plan should implement redirects in WordPress (Redirection plugin) or server config instead. Check zone plan before using this path.

**Not in scope for execute (requires direct server or plugin access):**
- Adding schema markup to CMS templates (provide JSON-LD; user adds it)
- Updating robots.txt on the server (provide updated file content; user uploads it)
- Creating or uploading llms.txt (provide the file content; user uploads it)
- Meta descriptions when no SEO plugin is active (provide content; user pastes into plugin)

### After Every Completed Action

After the user confirms a step is done (deployed, validated, or manually completed):

1. Update the plan file: change `[ ]` to `[x]` for that step's checklist entry.
2. Update `Last updated` in the plan file header to today's date.
3. If the completed step was the last one requiring a given connector, remove that connector from the Required Connectors table.
4. Tell the user the updated status: "X of Y steps complete. Next up: [step title]."

This applies whether the action was executed by a connector script or completed manually by the user.

---

## Limitations

- Cannot access password-protected pages, staging environments, or pages requiring authentication
- Backlink analysis uses DataForSEO if configured (`/memory/connectors/dataforseo/.env`); falls back to manual instructions without it
- Core Web Vitals field data requires GSC; PageSpeed Insights lab data is used as a proxy
- Actual ranking positions require GSC or a rank tracker
- LLM citation measurement is not yet standardized; Perplexity and ChatGPT presence tests are qualitative
- Content gap and rank tracking use DataForSEO if configured; qualitative without it
- Execute layer is limited to sitemap submission; CMS modifications require direct access or a CMS-specific connector
- PageSpeed Insights uses the Google connector (`connectors/google/scripts/pagespeed.js`); add `PAGESPEED_API_KEY` to `memory/connectors/google/.env` for reliable quota
- Bing Webmaster Tools uses the Bing connector (`connectors/bing/scripts/webmaster.js`); add `BING_WEBMASTER_API_KEY` to `memory/connectors/bing/.env`. See `connectors/bing/SETUP.md`.
