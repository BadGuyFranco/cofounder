import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Refunds Script - Manage Stripe refunds

Usage: node scripts/refunds.js <command> [options]

Commands:
  list                        List refunds
  get <id>                    Get refund by ID
  create                      Create a refund
  update <id>                 Update refund metadata
  cancel <id>                 Cancel a pending refund
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --payment-intent <id>       Filter or target payment intent
  --charge <id>               Filter or target charge
  --amount <cents>            Partial refund amount in cents (create only)
  --reason <value>            duplicate | fraudulent | requested_by_customer (create only)
  --limit <n>                 Max results for list (default: all)
  --metadata <json>           JSON object of metadata keys (update only)

Examples:
  node scripts/refunds.js list
  node scripts/refunds.js list --payment-intent pi_abc123
  node scripts/refunds.js list --charge ch_abc123 --limit 10
  node scripts/refunds.js get re_abc123
  node scripts/refunds.js create --payment-intent pi_abc123
  node scripts/refunds.js create --charge ch_abc123 --amount 500 --reason requested_by_customer
  node scripts/refunds.js update re_abc123 --metadata '{"order_id":"123"}'
  node scripts/refunds.js cancel re_abc123
  node scripts/refunds.js list --account business --mode live
`);
}

async function list(args, cfg) {
  const params = {};
  if (args['payment-intent']) params.payment_intent = args['payment-intent'];
  if (args.charge) params.charge = args.charge;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/refunds', { params }, cfg);
    output(data.data);
  } else {
    const refunds = await paginate('/refunds', params, cfg);
    output(refunds);
  }
}

async function get(id, cfg) {
  if (!id) throw new Error('Refund ID required. Usage: get <id>');
  const data = await apiRequest(`/refunds/${id}`, {}, cfg);
  output(data);
}

async function create(args, cfg) {
  const pi = args['payment-intent'];
  const charge = args.charge;
  if (!pi && !charge) throw new Error('Either --payment-intent or --charge is required');
  if (pi && charge) throw new Error('Provide only one of --payment-intent or --charge');

  const body = {};
  if (pi) body.payment_intent = pi;
  if (charge) body.charge = charge;
  if (args.amount !== undefined) {
    const n = parseInt(String(args.amount), 10);
    if (Number.isNaN(n) || n < 1) throw new Error('--amount must be a positive integer (cents)');
    body.amount = n;
  }
  if (args.reason) {
    const allowed = ['duplicate', 'fraudulent', 'requested_by_customer'];
    if (!allowed.includes(args.reason)) {
      throw new Error(`--reason must be one of: ${allowed.join(', ')}`);
    }
    body.reason = args.reason;
  }

  const data = await apiRequest('/refunds', { method: 'POST', body }, cfg);
  console.log(`Refund created: ${data.id} ($${(data.amount / 100).toFixed(2)} ${data.currency})`);
  output(data);
}

async function update(id, args, cfg) {
  if (!id) throw new Error('Refund ID required. Usage: update <id>');
  if (!args.metadata) throw new Error('--metadata required as JSON object, e.g. \'{"key":"value"}\'');

  let meta;
  try {
    meta = JSON.parse(args.metadata);
  } catch (e) {
    throw new Error(`Invalid JSON for --metadata: ${e.message}`);
  }
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    throw new Error('--metadata must be a JSON object');
  }

  const data = await apiRequest(`/refunds/${id}`, { method: 'POST', body: { metadata: meta } }, cfg);
  console.log(`Refund updated: ${data.id}`);
  output(data);
}

async function cancel(id, cfg) {
  if (!id) throw new Error('Refund ID required. Usage: cancel <id>');
  const data = await apiRequest(`/refunds/${id}/cancel`, { method: 'POST' }, cfg);
  console.log(`Refund canceled: ${data.id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list': await list(args, cfg); break;
      case 'get': await get(args._[1], cfg); break;
      case 'create': await create(args, cfg); break;
      case 'update': await update(args._[1], args, cfg); break;
      case 'cancel': await cancel(args._[1], cfg); break;
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
