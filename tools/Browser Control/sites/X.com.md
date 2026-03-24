# X.com (Twitter)

Site-specific patterns for automating X.com interactions via Browser Control.

**Base URL patterns:** `x.com/*`, `twitter.com/*` (redirects to x.com)

## Capabilities

| Action | Supported |
|--------|-----------|
| Navigate to user profiles | Yes |
| Read timeline posts (text, links) | Yes (browser_snapshot) |
| Read post timestamps | Yes (visible in snapshot) |
| Identify post IDs from URLs | Yes (hover/inspect links) |
| Detect quote tweets vs original posts | Yes (visual structure) |
| Browse who an account quotes/reposts | Yes |
| Follow/unfollow (requires auth) | Yes |
| Post tweets (requires auth) | Yes |
| Read without authentication | Limited (top posts only, paywalled threads) |
| Read with persistent session | Yes (full timeline, chronological) |

## Authentication

X.com requires a logged-in session to read full timelines in chronological order.
Browser Control maintains a persistent Chromium profile — log in once and the session persists.

**Login:** Navigate to `https://x.com/login`, authenticate manually, then the session is cached.
**Session check:** If redirected to login page, session has expired — notify user.

## Reading a User Timeline

Goal: get recent posts from a specific account, newest first.

```
1. browser_navigate to https://x.com/{handle}
2. browser_snapshot — read visible timeline
3. Scan for posts newer than last_seen_id (compare post URLs: x.com/{handle}/status/{id})
4. If more posts exist (scroll indicator or "Show more"), browser_scroll down
5. browser_snapshot again — extract additional posts
6. Stop when encountering a post ID ≤ last_seen_id
```

**Post URL format:** `https://x.com/{handle}/status/{tweet_id}` — tweet_id is the last_seen_id value.

**Timestamp format:** Posts show relative time ("2h", "Mar 21") or exact time on hover. Use post ID ordering (higher = newer) rather than parsing timestamps.

## Identifying Post Content

From a browser_snapshot, each post contains:
- **Text content** — the post body
- **Embedded link** — if the post links to an external article (look for card previews)
- **Post URL** — `x.com/{handle}/status/{id}` — extract the id
- **Interaction counts** — likes, reposts, quotes (visible in post footer)
- **Post type indicators:**
  - Original post: no prefix header
  - Repost: shows "Reposted" label above content with original author
  - Quote tweet: shows the quoted post embedded below original content
  - Reply: shows "Replying to @handle" above content

## Newsworthy Post Detection

After reading a post snapshot, evaluate using this criteria:

**NEWSWORTHY (log to news-log.md):**
- Mentions a specific AI model name + capability/release/update
- Contains a link to a research paper (arxiv.org, papers.with*, etc.)
- References a specific company announcement with concrete details (funding $, product name, launch date)
- Cites a government action, law, regulation, or policy about AI
- Shows a benchmark result with specific numbers
- Reports a safety incident or AI failure with verifiable specifics

**SLOP (skip, increment slop_posts):**
- Engagement bait: "RT if", "Agree?", polls, "Hot take:"
- Generic opinion: "AI will change everything" without concrete anchor
- Self-promotion: "I wrote a thread", "My course", "Subscribe to"
- Giveaways, affiliate links, promotional content
- Reposts of old news (the post's linked article is clearly >7 days old)
- Motivational content using AI as a metaphor

**BORDERLINE (log with low-confidence flag):**
- Opinion with some factual content but no primary source
- Analysis of existing news (not the news itself)

## Account Discovery

When scanning a high-quality account (score ≥ 7.0), identify candidate new accounts:

```
1. browser_navigate to https://x.com/{handle}
2. browser_snapshot — read timeline
3. For each quote tweet found:
   - Extract the quoted account handle
   - Note: this is a NOMINATION, not endorsement (account may be being criticized)
4. For each repost:
   - Extract the original author handle
   - This is a stronger quality signal than quote tweets
5. Exclude:
   - Accounts already in accounts.json
   - Reply targets (outbound replies to others — not a quality signal)
   - Handles that appear only once across all seed accounts
```

**Validation before adding:**
- Navigate to candidate's profile
- Check: follower count (>500), recent activity (<7 days), bio mentions AI/tech
- Spot-check 3 recent posts for content type

## Canary Check Pattern

Before every full scan run, verify the browser session and X.com availability:

```
1. Select 5 accounts from canary.json (manually curated known-daily posters)
2. For each canary account:
   - browser_navigate to https://x.com/{handle}
   - browser_snapshot
   - Check: does the timeline show any posts from the last 24 hours?
   - Record: pass (fresh posts found) or fail (no posts / login wall)
3. Count passes:
   - ≥ 3/5 passes → proceed with full scan
   - < 3/5 passes → abort, do NOT advance any last_seen_id, log failure, Telegram alert
```

## Known Quirks

- **Rate limiting:** X.com may slow navigation after rapid successive requests. Add a 2–3 second pause between accounts.
- **Login wall:** Unauthenticated users get a "Sign in to see more" wall after a few posts. Ensure session is active.
- **DOM changes:** X.com frequently changes its DOM structure. If `browser_snapshot` returns unexpected content, pause and notify.
- **Reposts vs original:** A repost appears in the account's timeline but the content belongs to another account. Only attribute reposts to the source author for quality scoring purposes, but count them in the seed account's discovery score.
- **Pinned posts:** The first post in a timeline is often pinned (old). Check timestamp before logging as new.
- **Thread expansion:** Long threads collapse after the first tweet. Click "Show this thread" to expand if needed for full context. For news detection, the first tweet is usually sufficient.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Login redirect on navigate | Session expired | Re-authenticate manually, session will persist |
| Empty timeline snapshot | Rate limited or DOM change | Pause 60s, retry once; if still empty, flag as canary failure |
| Post IDs not visible | URL format changed | Hover over post timestamp to find permalink URL |
| Infinite scroll not loading | JavaScript timeout | Use browser_scroll + brief wait, then browser_snapshot |
| "Something went wrong" | X.com server error | Treat as canary failure for this account, skip and continue |
