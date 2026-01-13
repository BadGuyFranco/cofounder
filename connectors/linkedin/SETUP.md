# LinkedIn Connector Setup

Complete guide to setting up LinkedIn API access for the connector.

## Prerequisites

- LinkedIn account
- LinkedIn Company Page (if posting to company pages)

## Step 1: Create LinkedIn Developer Account

1. Go to https://www.linkedin.com/developers/
2. Sign in with your LinkedIn account
3. You now have access to the Developer Portal

## Step 2: Create a LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click **"Create app"**
3. Fill in the required fields:
   - **App name:** Your application name (e.g., "My LinkedIn Connector")
   - **LinkedIn Page:** Select an existing company page or create one
   - **Privacy policy URL:** Can use your website or a placeholder
   - **App logo:** Upload a logo (required)
4. Check the legal agreement box
5. Click **"Create app"**

## Step 3: Get Client Credentials

1. In your new app, go to the **"Auth"** tab
2. Note your **Client ID** and **Client Secret**
3. Under **OAuth 2.0 settings**, add an authorized redirect URL:
   ```
   http://localhost:3000/callback
   ```

## Step 4: Request API Products

LinkedIn requires specific products to be enabled for API access:

1. In your app, go to the **"Products"** tab
2. Request access to:
   - **Share on LinkedIn** (required for posting)
   - **Sign In with LinkedIn using OpenID Connect** (required for authentication)

3. For company page access, also request:
   - **Marketing Developer Platform** (for organization APIs)

4. Some products require a review process and may take days to approve

**Note:** Without "Share on LinkedIn", you cannot create posts via the API.

## Step 5: Provide Client Credentials

Once you have your Client ID and Secret, provide them to the AI. The AI will create the initial configuration file.

**Required credentials:**
- `LINKEDIN_CLIENT_ID` - Your app's Client ID
- `LINKEDIN_CLIENT_SECRET` - Your app's Client Secret

**File location:** `/memory/Connectors/linkedin/.env`

## Step 6: Get Access Token

The AI will run the OAuth flow which:
1. Opens your browser to LinkedIn's authorization page
2. Asks you to grant permissions to your app
3. Captures the authorization code
4. Exchanges it for an access token
5. Updates the .env file with the token

**After authorization, the AI will add:**
- `LINKEDIN_ACCESS_TOKEN` - Your access token (expires after 60 days)

## Step 7: Verify Setup

Test your connection:

```bash
node scripts/profile.js me
```

You should see your LinkedIn profile information.

## Step 8: For Company Page Access (Optional)

To post on behalf of company pages:

1. Ensure "Marketing Developer Platform" product is approved
2. Re-authenticate with additional scopes:
   ```bash
   node scripts/auth.js flow --scopes "openid,profile,email,w_member_social,r_organization_social,w_organization_social"
   ```
3. List your organizations:
   ```bash
   node scripts/organizations.js list
   ```

## Token Lifecycle

- **Access tokens expire after 60 days**
- When expired, run `node scripts/auth.js flow` again
- Some accounts get refresh tokens (60-day expiry on those too)

To check token status:
```bash
node scripts/auth.js status
```

## OAuth Scopes Reference

| Scope | Purpose | Required For |
|-------|---------|--------------|
| `openid` | OpenID Connect | Authentication |
| `profile` | Basic profile info | All operations |
| `email` | Email address | Optional |
| `w_member_social` | Create/delete posts | Personal posting |
| `r_organization_social` | Read org posts | Company page access |
| `w_organization_social` | Create org posts | Company page posting |

**Minimum for personal posting:** `openid,profile,w_member_social`

**Full access:** `openid,profile,email,w_member_social,r_organization_social,w_organization_social`

## Troubleshooting

### "Application is not authorized for this action"

Your app doesn't have the required products enabled.
1. Go to https://www.linkedin.com/developers/apps
2. Select your app > Products tab
3. Ensure "Share on LinkedIn" is approved

### "Invalid redirect_uri"

The redirect URI in your auth request doesn't match what's configured.
1. Go to your app > Auth tab
2. Add `http://localhost:3000/callback` to Authorized redirect URLs

### "Access to this resource is denied"

Missing required scopes. Re-authenticate with the scopes you need:
```bash
node scripts/auth.js flow --scopes "openid,profile,w_member_social"
```

### "Invalid access token"

Token is expired or invalid.
```bash
node scripts/auth.js status  # Check status
node scripts/auth.js flow    # Get new token
```

### "Organization access denied"

You need admin access to the company page in LinkedIn.

### "Rate limit exceeded"

LinkedIn has strict rate limits. Wait and try again later.
- Typical limit: 100 calls/day per user
- Posting may have additional restrictions

## Security Best Practices

1. **Never commit `.env` files** - They're gitignored by default
2. **Rotate tokens** if you suspect compromise
3. **Use minimal scopes** - Only request what you need
4. **Monitor usage** in the LinkedIn Developer Portal

## Quick Reference

```bash
# Install dependencies
cd "/cofounder/connectors/linkedin" && npm install

# Get access token
node scripts/auth.js flow

# Check token status
node scripts/auth.js status

# View profile
node scripts/profile.js me

# Create a post
node scripts/posts.js create --text "Hello LinkedIn!"

# List organizations
node scripts/organizations.js list
```
