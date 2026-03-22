# Stripe Connector

Full Stripe API coverage: payments, billing, checkout, balance, connect, issuing, terminal, treasury, identity.

## Quick Start

```bash
node scripts/products.js list
node scripts/customers.js list --mode live
node scripts/payment-intents.js list --account business
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup (single and multi-account) |
| `CAPABILITIES.md` | Available commands and workflows |

## Configuration

**Credentials:** `/memory/connectors/stripe/.env`

### Single Account

```
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_DEFAULT_MODE=test
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Multiple Accounts

```
/memory/connectors/stripe/
  .env                  # Default account (optional)
  personal/.env         # Named account
  business/.env         # Named account
```

Select with `--account <name>`. List with `node scripts/customers.js accounts`.

### Mode Switching

All scripts accept `--mode test|live` (defaults to test or `STRIPE_DEFAULT_MODE`).

Legacy single-key format (`STRIPE_SECRET_KEY`) still works as fallback.

## Scripts

| Script | Domain |
|--------|--------|
| `customers.js` | Customers: list, get, create, update, delete |
| `products.js` | Products and prices: list, create, archive, manage pricing |
| `subscriptions.js` | Subscriptions: list, get, cancel, update |
| `webhooks.js` | Webhook endpoints: list, create, update, delete |
| `payment-intents.js` | Payment intents: create, confirm, capture, cancel |
| `payment-methods.js` | Payment methods and setup intents |
| `refunds.js` | Refunds: create, list, cancel |
| `invoices.js` | Invoices and invoice items: create, finalize, pay, void, send |
| `checkout.js` | Checkout sessions and payment links |
| `balance.js` | Balance, transactions, and payouts |
| `coupons.js` | Coupons and promotion codes |
| `charges.js` | Charges: list, get, capture |
| `disputes.js` | Disputes: list, get, submit evidence, close |
| `events.js` | Events: list, get |
| `files.js` | File uploads and file links |
| `credit-notes.js` | Credit notes: create, void |
| `tax-rates.js` | Tax rates: create, list, update |
| `subscription-schedules.js` | Subscription schedules: phased changes |
| `quotes.js` | Quotes: create, finalize, accept, cancel |
| `meters.js` | Billing meters and usage events |
| `shipping-rates.js` | Shipping rates |
| `portal.js` | Customer portal sessions and configurations |
| `connect.js` | Connect: accounts, transfers, application fees |
| `issuing.js` | Issuing: cardholders, cards, authorizations |
| `terminal.js` | Terminal: readers, locations, configurations |
| `treasury.js` | Treasury: financial accounts, transfers, payments |
| `identity.js` | Identity: verification sessions and reports |

Run any script with `help` for full command syntax:

```bash
node scripts/payment-intents.js help
node scripts/invoices.js help
```

## Global Flags

Every script supports:

- `--account <name>` - select a named account
- `--mode test|live` - select test or live keys
- `accounts` command - list configured accounts
- `help` command - show script usage

## Troubleshooting

**"No secret key found for test mode":** Your .env uses old key names. Rename `STRIPE_SECRET_KEY` to `STRIPE_TEST_SECRET_KEY` (or `STRIPE_LIVE_SECRET_KEY` for live).

**"Multiple accounts found":** Use `--account <name>` to select one. Run `accounts` to see available names.

**"No such [resource]":** Wrong ID or wrong mode (test vs live keys point to separate environments).

**"This API call cannot be made with a publishable API key":** Using wrong key. The connector uses the secret key automatically.

**"Amount must be a positive integer":** Amount is in cents. $20 = `2000`.

**Feature not enabled:** Connect, Issuing, Terminal, Treasury, and Identity require activation in your Stripe dashboard. The API returns clear errors when a feature is not enabled.

**Test vs Live:** Test keys (`sk_test_`) and live keys (`sk_live_`) are completely separate. Products, customers, and data created in test mode don't appear in live mode.

## API Documentation

https://stripe.com/docs/api
