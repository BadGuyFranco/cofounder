# Ahrefs

Site-specific patterns for automating Ahrefs data extraction via browser.

**Base URL patterns:** `ahrefs.com/*`, `app.ahrefs.com/*`

## Capabilities

| Task | Supported |
|------|-----------|
| Navigate to Site Explorer | Yes |
| Read Domain Rating (DR) | Yes (snapshot) |
| Read referring domains count + trend | Yes (snapshot) |
| Read total backlinks | Yes (snapshot) |
| Read broken backlinks (404 pages) | Yes (snapshot + navigation) |
| Read anchor text distribution | Yes (snapshot + navigation) |
| Read competing domains | Yes (snapshot + navigation) |
| Run Content Gap analysis | Yes (snapshot + navigation) |
| Read ranked keywords | Yes (snapshot + navigation) |
| Export data as CSV | Not recommended (use snapshot extraction) |

## Authentication

Ahrefs requires login. Credentials are stored in `/memory/tools/browser-control/sites/ahrefs.env`.

**Credential file format:**
```
AHREFS_EMAIL=user@example.com
AHREFS_PASSWORD=yourpassword
```

### Login Flow

**Step 1: Check if already logged in**

1. `browser_navigate` to `https://app.ahrefs.com/`
2. `browser_snapshot`
3. If the snapshot shows a dashboard or Site Explorer search bar, you are logged in. Skip to the target workflow.
4. If the snapshot shows a login form, proceed to Step 2.

**Step 2: Log in**

1. Read credentials from `/memory/tools/browser-control/sites/ahrefs.env`
2. `browser_click` the email input field ref
3. `browser_type` the email address
4. `browser_click` the password input field ref
5. `browser_type` the password
6. `browser_click` the Sign In / Log In button ref
7. `browser_snapshot` to verify login succeeded

**If 2FA is required:** STOP and tell the user: "Ahrefs requires two-factor authentication. Please complete the 2FA prompt in the browser window." Wait for confirmation before continuing.

**If CAPTCHA appears:** STOP and tell the user: "Ahrefs is showing a CAPTCHA. Please solve it in the browser window." Wait for confirmation.

**If login fails:** Report the error message from the snapshot. Do not retry with the same credentials. Ask the user to verify their credentials in `/memory/tools/browser-control/sites/ahrefs.env`.

## Site Explorer Overview

The primary starting point for SEO data extraction.

### Navigate to Site Explorer for a Domain

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/overview/v2/subdomains/live?target=[domain]`
2. `browser_snapshot` to read the overview

**URL patterns by mode:**
- Subdomains (default): `/site-explorer/overview/v2/subdomains/live?target=[domain]`
- Exact URL: `/site-explorer/overview/v2/exact/live?target=[url]`
- Prefix: `/site-explorer/overview/v2/prefix/live?target=[domain]/path`

### Extract Overview Data

From the overview snapshot, extract:

| Data Point | Where to Find |
|------------|---------------|
| Domain Rating (DR) | Large number near "Domain Rating" label |
| Referring domains | Number near "Referring domains" label, with trend arrow (up/down) |
| Total backlinks | Number near "Backlinks" label |
| Organic keywords | Number near "Organic keywords" label |
| Organic traffic | Number near "Organic traffic" label |
| Traffic value | Dollar amount near "Traffic value" label |

If values are not visible in the snapshot, scroll down and re-snapshot.

## Backlink Workflows

### Broken Backlinks (404 Pages with Inbound Links)

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/best-by-links/subdomains/live?target=[domain]&http_code=404`
   (Best by Links page, filtered to 404 responses)
2. `browser_snapshot` to read the results
3. Extract: URL path, referring domains count, total backlinks count for each row
4. If no results with the filter, try: `https://app.ahrefs.com/site-explorer/pages/broken-backlinks/subdomains/live?target=[domain]`

**Alternative path via navigation:**
1. Navigate to Site Explorer overview for the domain
2. `browser_snapshot` to find the "Pages" or "Best by links" section in the left sidebar
3. `browser_click` the "Best by links" link ref
4. Look for an HTTP code filter. `browser_click` the filter, select "404 not found"
5. `browser_snapshot` to read filtered results

### Anchor Text Distribution

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/anchors/subdomains/live?target=[domain]`
2. `browser_snapshot` to read anchor text entries
3. Extract: anchor text, referring domains count, percentage of total
4. Classify each anchor as: branded, generic, exact-match keyword, partial-match, or naked URL

### Referring Domains

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/referring-domains/subdomains/live?target=[domain]`
2. `browser_snapshot` to read the domain list
3. Extract: domain name, DR, linked domains (dofollow/nofollow), first seen date
4. Sort by DR to identify highest-value linking domains

## Competitor Analysis

### Competing Domains

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/competing-domains/subdomains/live?target=[domain]`
2. `browser_snapshot` to read competitor list
3. Extract: competitor domain, common keywords count, competitor keywords, competitor traffic

### Content Gap (Keyword Gap)

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/content-gap/subdomains/live?target=[domain]`
2. `browser_snapshot` to see the input form
3. The form has fields for competitor domains. `browser_click` the first competitor input and `browser_type` the competitor domain.
4. Add up to 3 competitor domains in the input fields.
5. `browser_click` the "Show keywords" button ref
6. `browser_snapshot` to read the gap results
7. Extract: keyword, search volume, keyword difficulty, traffic potential

**Pagination:** If there are more results, look for a "Next" or page number link in the snapshot. Click to load more pages. Extract data from each page.

## Keyword Data

### Ranked Keywords (Organic Keywords)

1. `browser_navigate` to `https://app.ahrefs.com/site-explorer/organic-keywords/subdomains/live?target=[domain]`
2. `browser_snapshot` to read keyword list
3. Extract: keyword, position, search volume, traffic, URL ranking for it, keyword difficulty

**Filtering for quick wins (positions 11-20):**
1. Look for position filter controls in the snapshot
2. Set min position to 11, max position to 20
3. `browser_snapshot` to read filtered results

### Keyword Overview (Single Keyword)

1. `browser_navigate` to `https://app.ahrefs.com/keywords-explorer?keyword=[keyword]`
2. `browser_snapshot` to read keyword data
3. Extract: search volume, keyword difficulty, CPC, SERP features, top-ranking pages

## Data Extraction Best Practices

**Snapshot first, always.** Ahrefs loads data dynamically. Always snapshot before trying to extract. If data appears incomplete, wait 2-3 seconds and re-snapshot.

**Scroll for more data.** Tables may not render all rows in the initial viewport. Use `browser_run_code` with `window.scrollBy(0, 500)` to reveal more rows, then re-snapshot.

**Large datasets.** For tables with many rows, extract data page by page. Ahrefs shows 10-100 rows per page depending on the view. Use pagination controls visible in the snapshot.

**Number formatting.** Ahrefs abbreviates large numbers (e.g., "1.2K" for 1,200, "3.4M" for 3,400,000). Report these as-is; the SEO Expert can interpret them.

## Known Quirks

**Dynamic loading.** Many sections load data asynchronously. If a snapshot shows loading spinners or empty tables, wait and re-snapshot.

**URL structure changes.** Ahrefs occasionally updates URL paths. If a direct URL returns a 404 or redirect, fall back to navigating through the UI: go to Site Explorer, enter the domain, then use sidebar navigation.

**Session persistence.** Ahrefs login persists in the browser profile. Once logged in, subsequent sessions should not require re-authentication unless the session expires (typically after several days).

**Rate limits.** Ahrefs may throttle or temporarily block excessive automated requests. If you encounter a "please wait" or throttle page, pause for 30 seconds before retrying. Do not loop more than 3 times.

**Free vs. paid accounts.** Ahrefs Webmaster Tools (free) only shows data for verified sites. Full Site Explorer access requires a paid subscription. If the user has a free account, certain pages (competitor analysis, content gap) will not be accessible. Note which data was unavailable and explain why.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Login form reappears after login | Incorrect credentials or 2FA required | Verify credentials; handle 2FA |
| "No data" on overview | Domain not in Ahrefs index | Site is too new or too small; note as unavailable |
| Empty table after filter | No results match filter criteria | Remove filter and report full dataset |
| Snapshot shows loading state | Data still loading | Wait 3 seconds, re-snapshot |
| URL redirects to different page | Ahrefs URL structure changed | Navigate through UI sidebar instead |
| "Limit reached" message | Account usage limit hit | Report to user; cannot proceed until limit resets |
| 2FA prompt | Account has 2FA enabled | Ask user to complete in browser |

## SEO Expert Integration

When the SEO Expert tool triggers Ahrefs data collection during Phase 7:

### Minimum Data Pull (Overview)

Collects the essential data points for backlink analysis:

1. Navigate to Site Explorer overview for the target domain
2. Extract: DR, referring domains (count + trend), total backlinks
3. Return data to SEO Expert

### Standard Data Pull (Overview + Broken + Anchors + Competitors)

Full Phase 7 dataset:

1. **Overview:** DR, referring domains, total backlinks, organic keywords, organic traffic
2. **Broken backlinks:** All 404 pages with 3+ referring domains
3. **Anchor text:** Top 20 anchors with classification (branded/generic/exact-match)
4. **Competing domains:** Top 5 competitors by common keywords
5. Return all data to SEO Expert

### Extended Data Pull (Standard + Content Gap + Keywords)

For Phase 5 content gap analysis:

1. Everything from Standard Data Pull
2. **Content gap:** Keywords competitors rank for that the target does not (using top 3 competitors)
3. **Quick-win keywords:** Keywords ranking positions 11-20 with search volume
4. Return all data to SEO Expert
