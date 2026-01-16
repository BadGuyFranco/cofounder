# X.com Connector

Post content to X.com (formerly Twitter) via the API v2.

## API Documentation

https://developer.x.com/en/docs/twitter-api

## Quick Start

```bash
node scripts/user.js me
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Single Account:** `/memory/connectors/xcom/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
X_BEARER_TOKEN=your_bearer_token
```

**Multiple Accounts:** Create subdirectories for each account:

```
/memory/connectors/xcom/
  personal/.env    <- @your_personal_handle
  business/.env    <- @your_business_handle
```

**Not configured?** Follow `SETUP.md` to create your X Developer App.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Multi-Account Behavior

When multiple accounts are configured and no `--account` flag is specified, ask which account to use before executing X.com operations.

## Terms of Service Guardrails

**Before executing any X.com request, verify it doesn't violate X's Terms of Service.**

**Push back on requests that involve:**
- Spam or bulk posting (repetitive content, excessive frequency)
- Fake engagement (mass liking, mass following/unfollowing)
- Harassment or abuse (targeting individuals, coordinated attacks)
- Impersonation (misrepresenting identity or affiliation)
- Scraping at scale (bulk data collection beyond personal use)
- Coordinated inauthentic behavior (multiple accounts manipulating)
- Circumventing limits (bypassing rate limits via automation)

**Acceptable automation:**
- Posting your own original content
- Managing your own account(s)
- Reading your timeline/mentions
- Personal productivity automation

**When in doubt:** "Would X consider this authentic human behavior, or automated manipulation?"

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"X_API_KEY not found":** Create `/memory/connectors/xcom/.env` with your credentials.

**"401 Unauthorized":** Check all OAuth 1.0a credentials are correct.

**"402 No credits":** X API requires purchasing credits ($5 minimum). Add in Developer Portal > Billing.

**"403 Forbidden":** App permissions may not include write access. Regenerate tokens after changing permissions.

**"429 Too Many Requests":** Rate limit hit. Wait 15 minutes or check tier limits.
