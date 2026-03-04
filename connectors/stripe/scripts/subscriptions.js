import { loadConfig, apiRequest, paginate, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Subscriptions Script - Manage Stripe subscriptions

Usage: node scripts/subscriptions.js <command> [options]

Commands:
  list                        List all subscriptions
  get <id>                    Get subscription by ID
  cancel <id>                 Cancel a subscription
  update <id>                 Update a subscription
  help                        Show this help

Options:
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

async function list(flags, cfg) {
  const params = {};
  if (flags.customer) params.customer = flags.customer;
  if (flags.status) params.status = flags.status;
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

async function cancel(id, flags, cfg) {
  if (!id) throw new Error('Subscription ID required. Usage: cancel <id>');

  if (flags['cancel-at-period-end']) {
    const data = await apiRequest(`/subscriptions/${id}`, {
      method: 'POST',
      body: { cancel_at_period_end: 'true' },
    }, cfg);
    console.log(`✓ Subscription set to cancel at period end: ${id}`);
    output(data);
  } else {
    const data = await apiRequest(`/subscriptions/${id}`, { method: 'DELETE' }, cfg);
    console.log(`✓ Subscription canceled: ${id}`);
    output(data);
  }
}

async function update(id, flags, cfg) {
  if (!id) throw new Error('Subscription ID required. Usage: update <id>');
  const body = {};

  if (flags.price) {
    const sub = await apiRequest(`/subscriptions/${id}`, {}, cfg);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) throw new Error('Could not find subscription item to update');
    body[`items[0][id]`] = itemId;
    body[`items[0][price]`] = flags.price;
    body['proration_behavior'] = 'create_prorations';
  }

  if (flags['cancel-at-period-end'] !== undefined) {
    body.cancel_at_period_end = flags['cancel-at-period-end'] ? 'true' : 'false';
  }

  const data = await apiRequest(`/subscriptions/${id}`, { method: 'POST', body }, cfg);
  console.log(`✓ Subscription updated: ${id}`);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help') { showHelp(); return; }

  const cfg = loadConfig();

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
