# Stripe Connector

Payments infrastructure — customers, products, prices, subscriptions, webhooks.

## Quick Start

```bash
node scripts/products.js list
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available commands and workflows |

## Configuration

**Credentials:** `/memory/connectors/stripe/.env`

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Use `sk_test_...` / `pk_test_...` keys for development. Switch to live keys for production.

## Scripts

| Script | Purpose |
|--------|---------|
| `customers.js` | Create, get, list, update, delete customers |
| `products.js` | Create products and prices, manage plans |
| `subscriptions.js` | List, get, cancel, upgrade subscriptions |
| `webhooks.js` | Create and manage webhook endpoints |

Run any script with `help` for full command syntax:
```bash
node scripts/products.js help
node scripts/webhooks.js help
```

## Key Concepts

- **Product** — a plan (e.g. "Pro Plan"). One product, multiple prices.
- **Price** — a billing config on a product (e.g. $20/month). Use `lookup_key` for stable references.
- **Subscription** — a customer attached to a price.
- **Webhook secret** — revealed once at creation. Store as `STRIPE_WEBHOOK_SECRET`.

## CoBuilder Plans

CoBuilder products and prices are tracked in `/memory/connectors/stripe/cobuilder-products.json` after setup. Check this file before creating new products.

## Troubleshooting

**"No such [resource]":** Wrong ID or wrong mode (test vs live keys).

**"This API call cannot be made with a publishable API key":** Using wrong key — use `STRIPE_SECRET_KEY`.

**"Amount must be a positive integer":** Amount is in cents. $20 = `2000`.

**Webhook signature verification fails:** Check that `STRIPE_WEBHOOK_SECRET` matches the endpoint's secret (from `webhooks create` output).

**Test vs Live:** Test keys (`sk_test_`) and live keys (`sk_live_`) are completely separate — products/customers created in test mode don't appear in live mode.

## API Documentation

https://stripe.com/docs/api
