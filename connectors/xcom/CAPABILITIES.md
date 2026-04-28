# X.com Connector Capabilities

What this connector can do for you.

## Content

- Post tweets (text, images, videos)
- Create tweet threads
- Reply to tweets
- Quote tweets
- Retweet and unretweet
- Delete your tweets

## Engagement

- Like and unlike tweets
- Bookmark and unbookmark tweets
- Follow and unfollow users
- Mute and unmute users
- Block and unblock users

## Messaging

- Send direct messages
- View conversations
- Read message history

## Discovery

- Search recent tweets (last 7 days)
- Search the full tweet archive (back to 2010, via Bearer auth)
- Tweet volume counts over time (full-archive, day/hour/minute granularity)
- Get trending topics (requires Basic+ tier)
- Find live Spaces (audio rooms)
- Get quote tweets of a tweet

## Reading

- View your timeline
- View your mentions
- Get user profiles
- Look up users by username

## Lists

- Create and manage X Lists
- Add/remove members from lists

## Account

- Check API usage and rate limits
- Manage multiple X accounts

## Limitations

- Trends require Basic tier or higher
- Streaming/firehose requires Enterprise
- Full-archive search and counts work with API credits, but rate limits on `/tweets/search/all` and `/tweets/counts/all` are very tight (a handful of requests per 15-minute window). Use them deliberately.
- Engagement operators like `min_faves:` and `min_retweets:` are Enterprise-only and will be rejected even on archive search.
- 1,500 tweets/month on Free tier (requires $5 credit purchase)
