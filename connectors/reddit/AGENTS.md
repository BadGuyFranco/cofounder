# Reddit Connector

Read Reddit posts, comments, subreddits, search results, and saved content via the official Reddit Data API.

## API Documentation

https://reddit.com/dev/api

## Quick Start

```bash
node scripts/auth.js flow
node scripts/me.js me
node scripts/subreddits.js posts startups --limit 10
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and limits |

## Configuration

**Credentials:** `/memory/connectors/reddit/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REDIRECT_URI=http://localhost:3000/callback
REDDIT_USER_AGENT=script:cofounder-reddit:v1.0.0 (by /u/your_username)
REDDIT_ACCESS_TOKEN=your_access_token
REDDIT_REFRESH_TOKEN=your_refresh_token
```

## Scripts

| Script | Purpose |
|--------|---------|
| `auth.js` | OAuth URL, token exchange, refresh, and status |
| `me.js` | Current user, karma, own posts, own comments |
| `subreddits.js` | Subreddit metadata, listings, subreddit search |
| `posts.js` | Post lookup, user submissions, duplicate posts |
| `comments.js` | Post comments and user comments |
| `search.js` | Reddit-wide and subreddit post search |
| `saved.js` | Authenticated user's saved content |

## Terms of Service Guardrails

**Push back on requests that involve:**
- Scraping at scale or bypassing API limits
- Commercial use without Reddit approval
- AI training on Reddit user content without rightsholder permission
- Retaining content after it is deleted from Reddit
- Spam, harassment, impersonation, or fake engagement

**Acceptable automation:**
- Reading API-accessible public content within rate limits
- Pulling your own saved, submitted, or commented content
- Research and content organization that honors Reddit's Data API Terms

Deleted Reddit user content must be removed from your possession. For stored datasets, build deletion refresh workflows before relying on the data long term.

## Troubleshooting

**"REDDIT_CLIENT_ID not found":** Create `/memory/connectors/reddit/.env` and follow `SETUP.md`.

**"REDDIT_ACCESS_TOKEN not found":** Run `node scripts/auth.js flow`.

**"401 Unauthorized":** Refresh the token with `node scripts/auth.js refresh`, or rerun the OAuth flow.

**"403 Forbidden":** Missing scopes, private content, or API policy restrictions.

**"429 Too Many Requests":** Respect `x-ratelimit-*` headers and wait for reset.
