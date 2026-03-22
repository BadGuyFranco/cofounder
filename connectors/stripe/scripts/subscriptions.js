import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Subscriptions Script - Manage Stripe subscriptions

Usage: node scripts/subscriptions.js <command> [options]

Commands:
  list                        List all subscriptions
  get <id>                    Get subscription by ID
  cancel <id>                 Cancel a subscription
  update <id>                 Update a subscription
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Filter by customer ID
  --status <status>           Filter by status: active, past_due, canceled, trialing, all
  --price <id>                New price ID (for update)
  --cancel-at-period-end      Cancel at period end instead of immediately

Examples:
  node scripts/subscriptions.js list
  node scripts/subscriptions.js list --status active
  node scripts/subscriptions.js list --customer cus_abc123
  node scripts/subscriptions.js get sub_abc123
  node scripts/subscriptions.js cancel sub_abc123
  node scripts/subscriptions.js cancel sub_abc123 --cancel-at-period-end
  node scripts/subscriptions.js update sub_abc123 --price price_xyz
`);
}

async function list(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.status) params.status = args.status;
  else params.status = 'all';

  const subs = await paginate('/subscriptions', params, cfg);
  const simplified = subs.map(s => ({
    id: s.id,
    customer: s.customer,
    status: s.status,
    current_period_end: new Date(s.current_period_end * 1000).toISOString().split('T')[0],
    cancel_at_period_end: s.cancel_at_period_end,
    items: s.items?.data?.map(i => i.price?.id),
    created: new Date(s.created * 1000).toISOString().split('T')[0],
  }));
  output(simplified);
}

async function get(id, cfg) {
  if (!id) throw new Error('Subscription ID required. Usage: get <id>');
  const data = await apiRequest(`/subscriptions/${id}`, {}, cfg);
  output(data);
}

async function cancel(id, args, cfg) {
  if (!id) throw new Error('Subscription ID required. Usage: cancel <id>');

  if (args['cancel-at-period-end']) {
    const data = await apiRequest(`/subscriptions/${id}`, {
      method: 'POST',
      body: { cancel_at_period_end: 'true' },
    }, cfg);
    console.log(`Subscription set to cancel at period end: ${id}`);
    output(data);
  } else {
    const data = await apiRequest(`/subscriptions/${id}`, { method: 'DELETE' }, cfg);
    console.log(`Subscription canceled: ${id}`);
    output(data);
  }
}

async function update(id, args, cfg) {
  if (!id) throw new Error('Subscription ID required. Usage: update <id>');
  const body = {};

  if (args.price) {
    const sub = await apiRequest(`/subscriptions/${id}`, {}, cfg);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) throw new Error('Could not find subscription item to update');
    body['items[0][id]'] = itemId;
    body['items[0][price]'] = args.price;
    body['proration_behavior'] = 'create_prorations';
  }

  if (args['cancel-at-period-end'] !== undefined) {
    body.cancel_at_period_end = args['cancel-at-period-end'] ? 'true' : 'false';
  }

  const data = await apiRequest(`/subscriptions/${id}`, { method: 'POST', body }, cfg);
  console.log(`Subscription updated: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;

  const { config: cfg, args, command } = init;

  try {
    switch (command) {
      case 'list':   await list(args, cfg); break;
      case 'get':    await get(args._[1], cfg); break;
      case 'cancel': await cancel(args._[1], args, cfg); break;
      case 'update': await update(args._[1], args, cfg); break;
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
