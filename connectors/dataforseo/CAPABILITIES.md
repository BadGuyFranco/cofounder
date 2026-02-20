# DataForSEO - Capabilities

## Rank Tracking (SERP API)

- Check exact Google ranking position for any keyword, for any domain
- Pull the full top-10 (or top-100) SERP for any keyword in any country
- Supports all major markets: US, UK, CA, AU, DE, FR, ES, IT, and more
- Results reflect real user SERPs (not personalized)

## Domain Intelligence (DataForSEO Labs API)

- **Domain overview:** total organic keywords, estimated monthly traffic, traffic value, position distribution (top 3 / top 10 / top 20 / positions 21-100)
- **Ranked keywords:** every keyword a domain ranks for, with position, search volume, and keyword difficulty
- **Competitor discovery:** find competing domains by shared keyword overlap
- **Keyword gap:** keywords a competitor ranks for that your domain does not - highest-value content opportunities

## Keyword Research (Keyword Data API + Labs API)

- Monthly search volume for any list of keywords
- CPC (cost per click) and competition level
- Keyword ideas based on a domain's existing content
- Related keywords and suggestions

## Backlink Analysis (Backlinks API)

- **Backlink summary:** total backlinks, referring domains, referring IPs, domain rank, broken backlinks, dofollow/nofollow split, anchor text distribution
- **Referring domains:** ranked list of every domain linking to a target, sorted by domain rank
- **Link gap:** domains that link to a competitor but not to your domain - validated outreach list

## Subscription Notes

**Backlinks API** requires a separate paid subscription at `app.dataforseo.com/backlinks-subscription`. It is not included in the standard pay-as-you-go credits. Without this subscription, `backlinks.js` commands will return an access denied error.

**Labs API (domain overview, ranked keywords, keyword gap)** requires sufficient traffic history in DataForSEO's index. Smaller or newer domains with limited organic traffic may return no data. Coverage improves over time as the domain builds traffic. The SERP API (rank-check, serp) works for all domains regardless of size.

## What This Connector Does NOT Do

- It does not track keyword positions over time automatically (no scheduled monitoring - run rank-check manually to check a point in time)
- It does not access Google Search Console data (use the Google connector for GSC)
- It does not provide page-level technical SEO crawling (use PageSpeed Insights and manual checks)
- It does not provide social media data

## Coverage

All SERP and Labs data is sourced from Google. Bing data is available via the DataForSEO API but is not implemented in the current scripts.

## Cost

Pay-as-you-go. Credits never expire. Minimum $50 deposit.
Typical full audit: $0.15-0.50 total.
See `AGENTS.md` for per-operation cost reference.
