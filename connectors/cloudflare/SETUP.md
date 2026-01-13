# Cloudflare Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

- Cloudflare account (free tier works)
- At least one domain added to Cloudflare

## Step 1: Go to API Tokens

1. Log in to Cloudflare at https://dash.cloudflare.com
2. Click your profile icon (top-right)
3. Select "My Profile"
4. Click "API Tokens" in the left sidebar

Or go directly to: https://dash.cloudflare.com/profile/api-tokens

**Tell the AI when done.**

## Step 2: Create a Custom Token

1. Click "Create Token"
2. Click "Get started" next to "Create Custom Token"

**Tell the AI when done.**

## Step 3: Token Name

In the **Token name** field, enter:

```
Cofounder Connector
```

**Tell the AI when done.**

## Step 4: Add Zone Permissions

Under **Permissions**, configure the first row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **Zone**
3. Third dropdown: Select **Read**

Click "+ Add more" to add another permission row.

**Tell the AI when done.**

## Step 5: Add DNS Permissions

In the new permission row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **DNS**
3. Third dropdown: Select **Edit**

Click "+ Add more" to add another permission row.

**Tell the AI when done.**

## Step 6: Add Page Rules Permissions

In the new permission row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **Page Rules**
3. Third dropdown: Select **Edit**

Click "+ Add more" to add another permission row.

**Tell the AI when done.**

## Step 7: Add Cache Permissions

In the new permission row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **Cache Purge**
3. Third dropdown: Select **Purge**

Click "+ Add more" to add another permission row.

**Tell the AI when done.**

## Step 8: Add SSL Permissions

In the new permission row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **SSL and Certificates**
3. Third dropdown: Select **Edit**

Click "+ Add more" to add another permission row.

**Tell the AI when done.**

## Step 9: Add Firewall Permissions

In the new permission row:

1. First dropdown: Select **Zone**
2. Second dropdown: Select **Firewall Services**
3. Third dropdown: Select **Edit**

**Tell the AI when done.**

## Step 10: Configure Zone Resources

Under **Zone Resources**, configure access:

- **Include**: Select **All zones** (or specific zones if preferred)

**Tell the AI when done.**

## Step 11: Create Token

1. Click "Continue to summary"
2. Review permissions
3. Click "Create Token"

**Tell the AI when done.**

## Step 12: Provide Token

On the confirmation page, you'll see your API Token displayed once.

**Copy the token and provide it to the AI.** The AI will create your configuration file.

**Important:** This token is shown only once. If you lose it, you'll need to create a new one.

## Verify Setup

The AI will run: `node scripts/zones.js list`

Expected output: List of your Cloudflare zones (domains).

## Optional: Account-Level Permissions (Workers, KV, R2, D1)

If you plan to use Workers, KV, R2, or D1, add Account-level permissions to your token:

1. Edit your existing token (or create a new one)
2. Add permissions:
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
   - Account > Workers R2 Storage > Edit
   - Account > D1 > Edit
3. Under Account Resources: Include your account

These are required for the CoFounder deployment infrastructure (R2 for file storage, D1 for subscriber database).

## Token Permissions Reference

| Permission | Level | Access | Purpose |
|------------|-------|--------|---------|
| Zone | Zone | Read | List zones |
| DNS | Zone | Edit | Manage DNS records |
| Page Rules | Zone | Edit | Manage redirects |
| Cache Purge | Zone | Purge | Clear cache |
| SSL and Certificates | Zone | Edit | SSL settings |
| Firewall Services | Zone | Edit | Firewall rules |
| Workers Scripts | Account | Edit | Deploy workers |
| Workers KV Storage | Account | Edit | KV namespaces |
| Workers R2 Storage | Account | Edit | R2 buckets |
| D1 | Account | Edit | D1 databases |

## Regenerating Tokens

If your token is compromised:

1. Go to API Tokens page
2. Find the token
3. Click "..." menu > "Roll" (regenerates) or "Delete"
4. Create new token if deleted
5. Update `/memory/Connectors/cloudflare/.env`

## Troubleshooting

**"Create Token" button not visible:** Scroll down on the API Tokens page.

**Permission dropdown missing option:** Some permissions require specific plans (e.g., Enterprise).

**"Access denied" after setup:** Token needs zone access. Edit token and check Zone Resources.

**"Unknown zone":** Domain not in your account. Verify domain is added to Cloudflare.
