import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Payment Intents Script - Manage Stripe payment intents

Usage: node scripts/payment-intents.js <command> [options]

Commands:
  list                        List payment intents
  get <id>                    Get payment intent by ID
  create                      Create a payment intent
  confirm <id>                Confirm a payment intent
  capture <id>                Capture a payment intent
  cancel <id>                 Cancel a payment intent
  update <id>                 Update a payment intent
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --amount <cents>            Amount in cents (create; capture: amount_to_capture)
  --currency <code>           Currency code (default: usd)
  --customer <id>             Customer ID
  --payment-method <id>       Payment method ID
  --description <text>        Description
  --confirm                   Confirm immediately on create
  --automatic-payment-methods Enable automatic payment methods on create
  --limit <n>                 Max results for list (default: all)
  --created-gte <unix>        List: created on or after this Unix timestamp
  --created-lte <unix>        List: created on or before this Unix timestamp
  --cancellation-reason       Cancel: abandoned, duplicate, fraudulent, requested_by_customer

Examples:
  node scripts/payment-intents.js list
  node scripts/payment-intents.js list --customer cus_abc123 --limit 10
  node scripts/payment-intents.js get pi_abc123
  node scripts/payment-intents.js create --amount 2000 --currency usd --customer cus_abc
  node scripts/payment-intents.js create --amount 500 --confirm --automatic-payment-methods
  node scripts/payment-intents.js confirm pi_abc123
  node scripts/payment-intents.js capture pi_abc123
  node scripts/payment-intents.js capture pi_abc123 --amount 1000
  node scripts/payment-intents.js cancel pi_abc123 --cancellation-reason requested_by_customer
  node scripts/payment-intents.js update pi_abc123 --description "Updated"
  node scripts/payment-intents.js list --account business --mode live
`);
}

async function listPaymentIntents(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.limit) params.limit = args.limit;
  const created = {};
  if (args['created-gte'] != null) created.gte = args['created-gte'];
  if (args['created-lte'] != null) created.lte = args['created-lte'];
  if (Object.keys(created).length) params.created = created;

  if (args.limit) {
    const data = await apiRequest('/payment_intents', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/payment_intents', params, cfg);
    output(items);
  }
}

async function getPaymentIntent(id, cfg) {
  if (!id) throw new Error('Payment intent ID required. Usage: get <id>');
  const data = await apiRequest(`/payment_intents/${id}`, {}, cfg);
  output(data);
}

async function createPaymentIntent(args, cfg) {
  if (args.amount == null) throw new Error('--amount required (cents)');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 1) throw new Error('--amount must be a positive integer (cents)');

  const currency = (args.currency || 'usd').toLowerCase();
  const body = { amount, currency };
  if (args.customer) body.customer = args.customer;
  if (args['payment-method']) body.payment_method = args['payment-method'];
  if (args.description) body.description = args.description;
  if (args.confirm) body.confirm = 'true';
  if (args['automatic-payment-methods']) {
    body.automatic_payment_methods = { enabled: true };
  }

  const data = await apiRequest('/payment_intents', { method: 'POST', body }, cfg);
  console.log(`Payment intent created: ${data.id} (${data.amount} ${data.currency})`);
  output(data);
}

async function confirmPaymentIntent(id, args, cfg) {
  if (!id) throw new Error('Payment intent ID required. Usage: confirm <id>');
  const body = {};
  if (args['payment-method']) body.payment_method = args['payment-method'];

  const data = await apiRequest(`/payment_intents/${id}/confirm`, { method: 'POST', body }, cfg);
  console.log(`Payment intent confirmed: ${id}`);
  output(data);
}

async function capturePaymentIntent(id, args, cfg) {
  if (!id) throw new Error('Payment intent ID required. Usage: capture <id>');
  const body = {};
  if (args.amount != null) {
    const n = parseInt(String(args.amount), 10);
    if (Number.isNaN(n) || n < 1) throw new Error('--amount must be a positive integer (cents)');
    body.amount_to_capture = n;
  }

  const data = await apiRequest(`/payment_intents/${id}/capture`, { method: 'POST', body }, cfg);
  console.log(`Payment intent captured: ${id}`);
  output(data);
}

async function cancelPaymentIntent(id, args, cfg) {
  if (!id) throw new Error('Payment intent ID required. Usage: cancel <id>');
  const body = {};
  if (args['cancellation-reason']) body.cancellation_reason = args['cancellation-reason'];

  const data = await apiRequest(`/payment_intents/${id}/cancel`, { method: 'POST', body }, cfg);
  console.log(`Payment intent canceled: ${id}`);
  output(data);
}

async function updatePaymentIntent(id, args, cfg) {
  if (!id) throw new Error('Payment intent ID required. Usage: update <id>');
  const body = {};
  if (args.description !== undefined) body.description = args.description;
  if (args.customer) body.customer = args.customer;
  if (args['payment-method']) body.payment_method = args['payment-method'];

  const data = await apiRequest(`/payment_intents/${id}`, { method: 'POST', body }, cfg);
  console.log(`Payment intent updated: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listPaymentIntents(args, cfg);
        break;
      case 'get':
        await getPaymentIntent(args._[1], cfg);
        break;
      case 'create':
        await createPaymentIntent(args, cfg);
        break;
      case 'confirm':
        await confirmPaymentIntent(args._[1], args, cfg);
        break;
      case 'capture':
        await capturePaymentIntent(args._[1], args, cfg);
        break;
      case 'cancel':
        await cancelPaymentIntent(args._[1], args, cfg);
        break;
      case 'update':
        await updatePaymentIntent(args._[1], args, cfg);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
