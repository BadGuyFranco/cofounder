# Stripe Connector Setup

## Prerequisites

Verify Node.js is installed:
```bash
node --version
```
If "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

You need a Stripe account. Sign up at https://stripe.com if needed.

---

## Step 1: Open Your Stripe Dashboard

Go to https://dashboard.stripe.com

**Tell the AI when done.**

## Step 2: Get Your API Keys

1. Click **Developers** in the left sidebar
2. Click **API keys**
3. You'll see two keys:
   - **Publishable key** — starts with `pk_test_` or `pk_live_`
   - **Secret key** — starts with `sk_test_` or `sk_live_`

Start with **test mode** keys (toggle "Test mode" on in the top right if needed).

**Provide both keys to the AI.**

## Step 3: The AI Creates Your .env File

The AI will create `/memory/connectors/stripe/.env` with your keys.

## Step 4: Verify Setup

The AI will run:
```bash
node scripts/products.js list
```

Expected output: `[]` (empty array if no products yet) — that's correct.

## Step 5: Create CoBuilder Plans (Optional)

The AI can now create your subscription products and prices:
```bash
node scripts/products.js create --name "Free" --description "CoBuilder Free tier"
node scripts/products.js create --name "Pro" --description "CoBuilder Pro"
node scripts/products.js create --name "Business" --description "CoBuilder Business"
```

## Step 6: Set Up Webhook Endpoint (When Backend is Ready)

Once your CoBuilder backend is deployed:
```bash
node scripts/webhooks.js create --url https://api.cobuilder.app/webhooks/stripe \
  --events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed"
```

The webhook secret will be shown once — add it to `.env` as `STRIPE_WEBHOOK_SECRET`.

## Switching to Live Mode

Replace test keys with live keys in `/memory/connectors/stripe/.env`. Run through Steps 3-6 again in live mode to create live products and webhooks.
