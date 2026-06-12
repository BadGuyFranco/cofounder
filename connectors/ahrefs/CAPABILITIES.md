# Ahrefs Connector Capabilities

What this connector can do for you.

## Domain Authority (free, no account needed)

- Look up the Domain Rating (DR) of any domain
- Compare your DR against a list of competitors in one command
- These run on Ahrefs' free public endpoint: no API key, no account, no usage cost

## Deeper Data (requires a paid Ahrefs API key)

- Pull a full snapshot for a domain: DR, referring domains, total backlinks, organic traffic, organic keywords, and estimated traffic value

## Backlink Profile

- List the top referring domains pointing at a site, ranked by Domain Rating
- See the anchor text distribution (branded vs. exact-match vs. generic)

## Organic Keywords

- List the keywords a domain ranks for, with position, search volume, difficulty, and the ranking URL
- Isolate quick wins by filtering to a position range (for example positions 11 to 20)

## Account

- Check how many API units you have left this billing period

## Limitations

- Domain Rating lookups are free and need no account.
- Everything else (referring domains, anchors, organic keywords, full snapshot) requires a paid Ahrefs plan with API v3 access. Those requests consume API units (minimum 50 per request).
- Rate limit: about 60 requests per minute (applies to free and paid).
- Free DR data is subject to Ahrefs' Domain Rating License: attribution required if you display or publish it, and you cannot resell it as a competing service. Internal use is fine.
- Broken-backlink reclaim, Content Gap, and Link Intersect are not in this connector. Use the Browser Control Ahrefs guide for those.
- For sites you own, Ahrefs Webmaster Tools (free) is an alternative data source via Browser Control.
