# Microsoft Clarity Connector Capabilities

What this connector can do for you.

## Friction signals (the "why" behind a leaking page)

- Dead clicks: users clicking elements that do nothing
- Rage clicks: rapid repeated clicks signalling frustration
- Quick backs: users bouncing straight back off a page
- Excessive scrolling: users hunting for something they cannot find
- Script errors and error clicks: JavaScript breaking the experience
- All available site-wide, or broken down per page (`--by URL`)

## Engagement and traffic

- Traffic: total sessions, bot sessions, distinct users, pages per session
- Scroll depth: how far down the page users actually get
- Engagement time: active time on page
- Break any of these down by Browser, Device, Country, OS, Source, Medium, Campaign, Channel, or URL (up to 3 at once)

## How it is used

- The Conversion Expert pulls a friction digest, cross-references GA4 drop-off pages, and turns the combination into a prioritized fix list
- Flags which specific pages and sessions are worth watching in the Clarity UI

## Limitations

- **Aggregated data only.** Session recordings and heatmap images are NOT exportable via API; watch those in the Clarity dashboard.
- **10 API requests per project per day.** Calls are planned, not looped.
- **Last 1 to 3 days only.** No historical range; trends require pulling on a cadence and storing snapshots.
- **Max 3 dimensions per request**, up to 1,000 rows, no pagination.
- One token covers one Clarity project (one site). Analyzing another site needs its own token.
- Requires the Clarity tracking tag to be installed and collecting on the site.
