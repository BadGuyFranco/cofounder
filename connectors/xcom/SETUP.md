# X.com Connector Setup

Complete guide to setting up your X.com API credentials.

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue below.

**Account requirements:**
- X.com account
- X Developer account (https://developer.x.com)

## Step 1: Create Developer Account

1. Go to https://developer.x.com
2. Sign in with your X account
3. Complete the developer application:
   - Describe your use case (see below for sample text)
   - Agree to developer terms
4. Wait for approval (usually instant for Free tier)

**Sample use case description:**
```
I am building a personal automation tool to manage my X.com account programmatically. 
The tool will be used for posting tweets, reading my timeline, and managing my account.
This is for personal use only, not a product or service for others.
```

## Step 2: Create a Project and App

1. Go to https://developer.x.com/en/portal/dashboard
2. Click **"+ Create Project"**
3. Name your project (e.g., "My Automation")
4. Select use case: **"Making a bot"** or **"Exploring the API"**
5. Describe your project briefly
6. When asked for environment, choose **"Production"** (required for full API access)
7. Name your App (e.g., "My Connector")

You'll receive your first set of credentials:
- **API Key** (Consumer Key)
- **API Key Secret** (Consumer Secret)
- **Bearer Token**

**Save these immediately. They're only shown once.**

## Step 3: Configure User Authentication (Critical)

This step is required before you can generate Access Tokens.

1. In your App, click **"Set up"** under User Authentication Settings
   - Or go to App Settings > User authentication settings > Set up

2. **App permissions:** Select **"Read and write and Direct message"** for full access
   - "Read and write" is minimum for posting tweets
   - "Direct message" needed if you want DM access

3. **Type of App:** Select **"Web App, Automated App or Bot"**
   - Do NOT choose "Native App" (that's for mobile apps)

4. **App info (required fields):**
   | Field | What to Enter |
   |-------|---------------|
   | Callback URI | `http://localhost:3000/callback` |
   | Website URL | Your website or `https://example.com` |

5. **Optional fields (leave blank for personal use):**
   - Organization name
   - Organization URL
   - Terms of Service
   - Privacy Policy

6. Click **Save**

## Step 4: Generate Access Token and Secret

After completing User Authentication setup:

1. Go back to your App's **"Keys and tokens"** tab
2. Find the **"OAuth 1.0 Keys"** section
3. You'll see:
   - Consumer Key (already generated)
   - **Access Token** with your @username and a **"Generate"** button
4. Click **"Generate"** next to Access Token
5. Save both values:
   - **Access Token** (looks like: `16263434-ME1pzSflHircs5E7h9i8JIpCslnHkkoDC4pELPDjC`)
   - **Access Token Secret** (looks like: `rrf6ATN7Up1FnLtF3Iuasac5r15TD6UniEvNCEZLmgw48`)

**Important:** If you don't see the Generate button, go back and complete Step 3 first.

## Step 5: Provide Credentials

Once you have all credentials, provide them to the AI. The AI will create the configuration file.

**Required credentials (all 5):**
- `X_API_KEY` - API Key (Consumer Key)
- `X_API_SECRET` - API Key Secret (Consumer Secret)
- `X_ACCESS_TOKEN` - Access Token
- `X_ACCESS_TOKEN_SECRET` - Access Token Secret
- `X_BEARER_TOKEN` - Bearer Token

**File location:** `/memory/connectors/xcom/.env`

### Multiple Account Setup

For multiple X accounts, tell the AI the account name (e.g., "personal", "business"). The AI will create credentials in subdirectories:

```
/memory/connectors/xcom/
  personal/.env    <- Credentials for @your_personal_handle
  business/.env    <- Credentials for @your_business_handle
```

**Each account needs its own X Developer App** with its own API keys and tokens.

## Step 6: Verify Setup

Test that everything works:

```bash
node scripts/user.js me
```

You should see your account information (name, username, follower count, etc.).

## Credential Summary

You need **5 credentials** for full functionality:

| Credential | Where to Find | Purpose |
|------------|---------------|---------|
| API Key (Consumer Key) | Keys and tokens > OAuth 1.0 Keys | App identifier |
| API Key Secret | Keys and tokens > OAuth 1.0 Keys | App authentication |
| Access Token | Keys and tokens > OAuth 1.0 Keys > Generate | Your user identity |
| Access Token Secret | Keys and tokens > OAuth 1.0 Keys > Generate | Your user authentication |
| Bearer Token | Keys and tokens > App-Only Authentication | Read-only app access |

**OAuth 1.0a** (all 4 keys) is required for:
- Creating/deleting tweets
- Liking/unliking
- Following/unfollowing
- Any action on behalf of a user

**Bearer Token alone** only allows read-only operations.

## API Billing (Required)

**X API now requires purchasing credits before you can post tweets.**

### Adding Credits

1. Go to https://developer.x.com/en/portal/dashboard
2. Click **"Billing"** in the left sidebar
3. Add a payment method
4. Purchase credits (**$5 minimum per account**)

Credits are consumed per API call, not a monthly subscription. Each app/account needs its own credits.

**Without credits, you'll see this error:**
```
Error: Your enrolled account does not have any credits to fulfill this request.
Status: 402
```

### API Tiers

| Tier | Cost | Tweet Writes | Tweet Reads |
|------|------|--------------|-------------|
| Free | $0/month + credits | 1,500/month | 1,500/month |
| Basic | $200/month | 3,000/month | 10,000/month |
| Pro | $5,000/month | 300,000/month | 1,000,000/month |

The Free tier still has monthly limits, but now requires credit purchases for actual API usage.

## Troubleshooting

### "node: command not found" or "npm: command not found"

Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section.

Quick fix: Run `conda activate` first, then retry the command.

### "Generate" button not visible for Access Token
You haven't completed User Authentication setup (Step 3). Go to App Settings > User authentication settings > Set up.

### "401 Unauthorized"
- Credentials are incorrect
- Tokens were generated before setting "Read and write" permissions
- **Fix:** Regenerate ALL tokens after changing permissions

### "403 Forbidden"
- App permissions don't include write access
- **Fix:** Go to User authentication settings, change to "Read and write", then regenerate tokens

### "Could not authenticate you"
- Tokens may be revoked or expired
- **Fix:** Regenerate tokens in developer portal

### "You are not permitted to perform this action"
- Monthly quota exceeded, or feature not available on your tier
- **Fix:** Check usage in developer portal, wait for reset, or upgrade tier

### "Rate limit exceeded"
- Too many requests in 15-minute window
- **Fix:** Wait 15 minutes

## Regenerating Tokens

If credentials are compromised or after changing permissions:

1. Go to your App's "Keys and tokens" tab
2. Click "Regenerate" for Consumer Keys
3. Click "Regenerate" for Access Token and Secret
4. Update your `.env` file with new values
5. Test with `node scripts/user.js me`

## Security Best Practices

- Never commit `.env` files to version control
- Never share API credentials
- Regenerate tokens if compromised
- Regenerate tokens after sharing them (even in private chat)

## Links

- Developer Portal: https://developer.x.com/en/portal/dashboard
- API Documentation: https://developer.x.com/en/docs/twitter-api
- Rate Limits: https://developer.x.com/en/docs/twitter-api/rate-limits
- API Pricing: https://developer.x.com/en/products/twitter-api
