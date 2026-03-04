import { loadConfig, apiRequest, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Webhooks Script - Manage Stripe webhook endpoints

Usage: node scripts/webhooks.js <command> [options]

Commands:
  list                        List all webhook endpoints
  get <id>                    Get webhook endpoint by ID
  create                      Create a webhook endpoint
  update <id>                 Update a webhook endpoint
  delete <id>                 Delete a webhook endpoint
  help                        Show this help

Options:
  --url <url>                 Endpoint URL (required for create)
  --events <list>             Comma-separated event types (required for create)
  --description <text>        Endpoint description

Common event types:
  customer.subscription.created
  customer.subscription.updated
  customer.subscription.deleted
  invoice.payment_succeeded
  invoice.payment_failed
  checkout.session.completed
  payment_intent.succeeded
  payment_intent.payment_failed

Examples:
  node scripts/webhooks.js list
  node scripts/webhooks.js create --url https://api.cobuilder.app/webhooks/stripe --events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed"
  node scripts/webhooks.js get we_abc123
  node scripts/webhooks.js delete we_abc123
`);
}

async function list(cfg) {
  const data = await apiRequest('/webhook_endpoints', { params: { limit: 100 } }, cfg);
  const endpoints = (data.data || []).map(w => ({
    id: w.id,
    url: w.url,
    status: w.status,
    events: w.enabled_events,
    description: w.description,
    created: new Date(w.created * 1000).toISOString(),
  }));
  output(endpoints);
}

async function get(id, cfg) {
  if (!id) throw new Error('Webhook ID required. Usage: get <id>');
  const data = await apiRequest(`/webhook_endpoints/${id}`, {}, cfg);
  output(data);
}

async function create(flags, cfg) {
  if (!flags.url) throw new Error('--url required');
  if (!flags.events) throw new Error('--events required (comma-separated event types)');

  const events = flags.events.split(',').map(e => e.trim());
  const body = { url: flags.url };

  events.forEach((event, i) => {
    body[`enabled_events[${i}]`] = event;
  });

  if (flags.description) body.description = flags.description;

  const data = await apiRequest('/webhook_endpoints', { method: 'POST', body }, cfg);
  console.log(`✓ Webhook created: ${data.id}`);
  console.log(`  URL: ${data.url}`);
  console.log(`  Secret: ${data.secret}`);
  console.log(`\n  ⚠  Save the webhook secret — it will not be shown again.`);
  console.log(`  Add to .env as: STRIPE_WEBHOOK_SECRET=${data.secret}`);
  output(data);
}

async function update(id, flags, cfg) {
  if (!id) throw new Error('Webhook ID required. Usage: update <id>');
  const body = {};

  if (flags.url) body.url = flags.url;
  if (flags.description) body.description = flags.description;

  if (flags.events) {
    const events = flags.events.split(',').map(e => e.trim());
    events.forEach((event, i) => {
      body[`enabled_events[${i}]`] = event;
    });
  }

  const data = await apiRequest(`/webhook_endpoints/${id}`, { method: 'POST', body }, cfg);
  console.log(`✓ Webhook updated: ${id}`);
  output(data);
}

async function del(id, cfg) {
  if (!id) throw new Error('Webhook ID required. Usage: delete <id>');
  const data = await apiRequest(`/webhook_endpoints/${id}`, { method: 'DELETE' }, cfg);
  console.log(`✓ Webhook deleted: ${id}`);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help') { showHelp(); return; }

  const cfg = loadConfig();

  try {
    switch (command) {
      case 'list':   await list(cfg); break;
      case 'get':    await get(args._[1], cfg); break;
      case 'create': await create(args, cfg); break;
      case 'update': await update(args._[1], args, cfg); break;
      case 'delete': await del(args._[1], cfg); break;
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
