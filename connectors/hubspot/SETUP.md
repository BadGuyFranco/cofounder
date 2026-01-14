# HubSpot Connector Setup

## Prerequisites

- HubSpot account (free tier works)
- Node.js 18+

## Step 1: Create a Private App

1. Log into HubSpot
2. Go to **Settings** (gear icon, top right)
3. Navigate to **Integrations** → **Legacy Apps** (or "Private Apps")
4. Click **Create a private app**

## Step 2: Configure App Settings

**Basic Info:**
- Name: `Cofounder Connector`
- Description: (optional)

**Scopes (under Scopes tab):**

For full CRM access, enable these scopes:

| Scope | Purpose |
|-------|---------|
| `crm.objects.contacts.read` | Read contacts |
| `crm.objects.contacts.write` | Create/update/delete contacts |
| `crm.objects.companies.read` | Read companies |
| `crm.objects.companies.write` | Create/update/delete companies |
| `crm.objects.deals.read` | Read deals |
| `crm.objects.deals.write` | Create/update/delete deals |
| `crm.objects.owners.read` | Read user/owner info |

Or select "All scopes" for maximum flexibility.

## Step 3: Create App and Copy Token

1. Click **Create app**
2. Review the confirmation
3. Click **Continue creating**
4. Copy the **Access token** (starts with `pat-...`)

## Step 4: Provide Credentials

Once you have your Access Token, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `HUBSPOT_ACCESS_TOKEN` - Your Private App access token (starts with `pat-`)

**File location:** `/memory/connectors/hubspot/.env`

## Step 5: Verify Setup

The AI will install dependencies and run the verification. You should see a list of contacts (or "Found 0 contacts" if your account is empty).

## Troubleshooting

**"Invalid API key":** Double-check the token was copied correctly. It should start with `pat-`.

**"Insufficient permissions":** Go back to your Private App settings and add the required scopes.

**"Cannot find module":** Run `npm install` in the hubspot directory.

## Token Refresh

HubSpot Private App tokens don't expire, but they can be revoked. If you regenerate the token in HubSpot, update your `.env` file.

## Multiple Portals

Unlike GHL, HubSpot tokens are per-portal. If you need to access multiple HubSpot portals, you'll need separate tokens and a way to switch between them (not currently implemented).
