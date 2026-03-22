# Stripe Connector Capabilities

What this connector can do for you.

## Multi-Account Support

- Connect multiple Stripe accounts (personal, business, etc.)
- Switch between test and live mode per command
- List all configured accounts

## Payments

- Create and manage payment intents (the modern payment flow)
- List, get, confirm, capture, and cancel payments
- Attach and detach payment methods to customers
- Create setup intents to save payment methods without charging
- List and capture legacy charges
- Create and manage refunds (full or partial)

## Products and Pricing

- Create and manage products
- Add monthly, annual, or one-time pricing to any product
- Archive old products and prices
- Use lookup keys for stable price references

## Customers

- List all customers
- Look up customers by email or ID
- Create, update, and delete customers

## Subscriptions

- List subscriptions by status or customer
- Cancel immediately or at period end
- Upgrade or downgrade to a different price
- Create subscription schedules for phased changes

## Invoices

- Create, finalize, pay, void, send, and delete invoices
- Add and manage invoice line items
- Preview upcoming invoices
- Create and void credit notes

## Checkout

- Create Stripe-hosted checkout sessions (payment, subscription, or setup mode)
- Create shareable payment links
- List and expire checkout sessions

## Coupons and Promotions

- Create percent-off or amount-off coupons
- Set duration (once, repeating, forever)
- Generate customer-facing promotion codes
- Control redemption limits and expiration

## Balance and Payouts

- Check current account balance
- List balance transactions by type
- Create, list, and cancel payouts
- Reverse payouts

## Billing Portal

- Create customer portal sessions for self-service billing
- Configure portal appearance and features

## Quotes

- Create, finalize, accept, and cancel quotes

## Usage-Based Billing

- Create and manage billing meters
- Record meter events for usage tracking

## Webhooks

- Create webhook endpoints scoped to specific events
- List, update, and delete endpoints

## Disputes

- List and view dispute details
- Submit evidence (customer info, product description, free text)
- Close (accept) disputes

## Events

- List and retrieve Stripe events
- Filter by event type and date range

## Files

- Upload files (dispute evidence, identity documents, etc.)
- Create temporary file links

## Tax Rates

- Create and manage tax rates
- Set inclusive/exclusive, jurisdiction, percentage

## Shipping Rates

- Create and manage shipping rate options

## Stripe Connect (Platform)

- Create and manage connected accounts (Standard, Express, Custom)
- Generate account onboarding links
- Create transfers between accounts
- List and refund application fees

## Issuing (Card Issuance)

- Create and manage cardholders
- Issue virtual and physical cards
- List and manage authorizations (approve/decline)
- View issuing transactions

## Terminal (In-Person Payments)

- Register and manage card readers
- Create and manage locations
- Manage terminal configurations
- Generate connection tokens

## Treasury (Financial Accounts)

- Create and manage financial accounts
- Inbound and outbound transfers
- Outbound payments
- Cancel pending transfers and payments

## Identity (Verification)

- Create document and ID number verification sessions
- List and retrieve verification reports
- Cancel and redact sessions

## Limitations

- Card input still requires client-side Stripe.js (this connector handles the server-side API)
- Webhook signatures must be verified in your application
- Rate limit: 100 read/100 write requests per second (live mode)
- Test and live mode are completely separate environments
- Connect, Issuing, Terminal, Treasury, and Identity require feature activation in your Stripe dashboard
