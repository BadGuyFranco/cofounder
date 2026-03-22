# Stripe Connector Setup

## Prerequisites

Verify Node.js is installed:
```bash
node --version
```
If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

You need a Stripe account. Sign up at https://stripe.com if needed.

## Step 1: Open Your Stripe Dashboard

Go to https://dashboard.stripe.com

**Tell the AI when done.**

## Step 2: Get Your Test API Keys

1. Toggle **Test mode** on (top right of the dashboard)
2. Click **Developers** in the left sidebar
3. Click **API keys**
4. Copy both keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`; click "Reveal" if needed)

**Provide both test keys to the AI.**

## Step 3: Get Your Live API Keys

1. Toggle **Test mode** off (top right)
2. Same location: **Developers > API keys**
3. Copy both live keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

**Provide both live keys to the AI.**

## Step 4: The AI Creates Your .env File

The AI will create `/memory/connectors/stripe/.env` with all four keys.

Your .env will look like:

```
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_DEFAULT_MODE=test
```

## Step 5: Verify Setup

The AI will run:
```bash
node scripts/products.js list
```

Expected output: `[]` (empty array if no products yet).

## Adding Multiple Accounts

To connect additional Stripe accounts (e.g., separate business accounts):

1. Repeat Steps 1-3 for the other Stripe account
2. The AI creates a subdirectory: `/memory/connectors/stripe/<account-name>/.env`
3. Use `--account <name>` on any command to target that account

Example structure:

```
/memory/connectors/stripe/
  .env                  # Default account
  business/.env         # "business" account
  client-project/.env   # "client-project" account
```

## Switching Between Test and Live

Use `--mode` on any command:

```bash
node scripts/products.js list                    # Uses test (default)
node scripts/products.js list --mode live        # Uses live
node scripts/customers.js list --account business --mode live
```

Or change the default in your .env:

```
STRIPE_DEFAULT_MODE=live
```

## Webhook Setup (When Backend is Ready)

Once your backend is deployed:

```bash
node scripts/webhooks.js create --url https://your-domain.com/webhooks/stripe --events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed"
```

The webhook secret will be shown once. Add it to `.env` as `STRIPE_WEBHOOK_SECRET`.

## Optional Platform Features

These features require activation in your Stripe dashboard:

- **Connect** (marketplace/platform): Settings > Connect
- **Identity** (verification): Settings > Identity
- **Issuing** (card issuance): https://dashboard.stripe.com/issuing/overview (requires application)
- **Terminal** (in-person): https://dashboard.stripe.com/terminal
- **Treasury** (financial accounts): https://dashboard.stripe.com/treasury (requires application)

Enable these as needed. The connector scripts will work once activated.
