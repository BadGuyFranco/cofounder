# Stripe Connector Capabilities

What this connector can do for you.

## Products & Plans

- List all products and prices
- Create new subscription plans (e.g. Free, Pro, Business)
- Add monthly or annual pricing to any plan
- Archive old products and prices

## Customers

- List all customers
- Look up a customer by email or ID
- Create customers manually
- Update customer details (name, email, phone)
- Delete customers

## Subscriptions

- List all subscriptions (filter by status or customer)
- Get full details of any subscription
- Cancel a subscription immediately or at period end
- Upgrade or downgrade a subscription to a new price

## Webhooks

- List all configured webhook endpoints
- Create a webhook endpoint scoped to specific events
- Update an existing webhook (URL, events)
- Delete a webhook endpoint

## Limitations

- Cannot process payments directly (requires client-side Stripe.js for card input)
- Cannot create checkout sessions with this connector (use Stripe.js or SDK)
- Cannot access Connect (marketplace) or Issuing (card) features
- Webhook signatures must be verified in your application using `STRIPE_WEBHOOK_SECRET`
- Rate limit: 100 read requests/second, 100 write requests/second (live mode)
- Test mode and live mode are completely separate — keys and data do not cross over
