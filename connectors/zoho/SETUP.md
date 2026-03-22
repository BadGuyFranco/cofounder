# Zoho CRM Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- Zoho CRM account (any edition)
- Access to Zoho API Console (api-console.zoho.com)

## Step 1: Open Zoho API Console

Go to: https://api-console.zoho.com/

Sign in with your Zoho account if prompted.

**Tell the AI when done.**

## Step 2: Create a Server-based Application

1. Click **Add Client**
2. Select **Server-based Applications**

**Tell the AI when done.**

## Step 3: Enter Client Name

In the **Client Name** field, enter:

```
CoFounder CRM Connector
```

**Tell the AI when done.**

## Step 4: Enter Homepage URL

In the **Homepage URL** field, enter:

```
http://localhost:8080
```

**Tell the AI when done.**

## Step 5: Enter Authorized Redirect URI

In the **Authorized Redirect URIs** field, enter:

```
http://localhost:8080/callback
```

**Tell the AI when done.**

## Step 6: Create the Client

Click **Create** to generate your client credentials.

**Tell the AI when done.**

## Step 7: Copy Client Credentials

On the confirmation page, you'll see:
- **Client ID** - This is your ZOHO_CLIENT_ID
- **Client Secret** - This is your ZOHO_CLIENT_SECRET

**Provide both values to the AI.** The AI will create your configuration file.

## Step 8: Configure Organization

The AI will run:

```bash
node scripts/auth.js setup --org <name> --region <region> --edition <edition>
```

This creates the organization configuration. Common regions:
- `us` - United States
- `eu` - Europe
- `in` - India
- `au` - Australia

Common CRM editions:
- `standard`
- `professional`
- `enterprise`
- `ultimate`

**Tell the AI your preferred organization name, region, and CRM edition.**

## Step 9: Run OAuth Flow

The AI will run:

```bash
node scripts/auth.js flow --org <name>
```

This will:
1. Open your browser to Zoho's authorization page
2. Ask you to grant permissions
3. Automatically capture the tokens

**Click "Accept" in your browser, then tell the AI when you see "Authorization Successful!"**

## Verify Setup

The AI will run:

```bash
node scripts/auth.js test --org <name>
```

Expected output: Your Zoho organization name and details.

## Multi-Organization Setup

To add another Zoho organization, repeat Steps 8-9 with a different `--org` name:

```bash
node scripts/auth.js setup --org subsidiary --region eu --edition professional
node scripts/auth.js flow --org subsidiary
```

## Troubleshooting

**"Invalid redirect URI":**
- Make sure `http://localhost:8080/callback` is in your Authorized Redirect URIs
- No trailing slash

**"User denied access":**
- Click "Accept" on the authorization page
- Ensure you have admin access to the Zoho organization

**"Token exchange failed":**
- Client ID and Client Secret may be incorrect
- Verify they match what's shown in Zoho API Console

**Browser doesn't open automatically:**
- Copy the URL from the terminal
- Paste it into your browser manually

## Adding Mail and Calendar Access

The default OAuth flow requests CRM scopes only. To also access Zoho Mail and Calendar, re-run the flow with additional scopes:

```bash
node scripts/auth.js flow --org <name> --scopes "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.org.ALL,ZohoCRM.users.ALL,ZohoCRM.bulk.ALL,ZohoCRM.coql.READ,ZohoMail.messages.ALL,ZohoMail.folders.READ,ZohoMail.accounts.READ,ZohoCalendar.calendar.ALL,ZohoCalendar.event.ALL"
```

This replaces the existing token with one that has access to all three products. The refresh token will also cover the new scopes going forward.

**Note:** The Zoho API Console client must have the correct scopes allowed. If you get a scope error, edit the client in api-console.zoho.com and add the required scopes.

## Notes

- Access tokens expire after 60 minutes but auto-refresh
- Refresh tokens do not expire
- Each Zoho organization requires separate authentication
- Client ID/Secret are shared; tokens are per-organization
- Edition is stored per organization and used to guide available tooling
- CRM, Mail, and Calendar share the same OAuth token when scopes are combined