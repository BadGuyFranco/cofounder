import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Billing Meters - Manage Stripe billing meters and meter events

Usage: node scripts/meters.js <command> [options]

Commands:
  list                        List meters
  get <id>                    Get a meter by ID
  create                      Create a meter
  update <id>                 Update a meter (display name)
  deactivate <id>             Deactivate a meter
  record-event                Send a meter event
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --display-name <text>       Meter display name (create, update)
  --event-name <string>       Event name (create, record-event)
  --formula <sum|count>       default_aggregation formula (create, default: sum)
  --customer <id>             Customer ID for meter event payload (record-event)
  --value <n>                 Numeric value for meter event (record-event)
  --timestamp <unix>          Optional event timestamp (record-event)
  --status <status>           Filter list by meter status
  --limit <n>                 Max results for list

Examples:
  node scripts/meters.js create --display-name "API calls" --event-name api_calls --formula sum
  node scripts/meters.js record-event --event-name api_calls --customer cus_xxx --value 42
`);
}

async function listMeters(args, cfg) {
  const params = {};
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/billing/meters', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/billing/meters', params, cfg);
    output(rows);
  }
}

async function getMeter(id, cfg) {
  if (!id) throw new Error('Meter ID required. Usage: get <id>');
  const data = await apiRequest(`/billing/meters/${id}`, {}, cfg);
  output(data);
}

async function createMeter(args, cfg) {
  if (!args['display-name']) throw new Error('--display-name required');
  if (!args['event-name']) throw new Error('--event-name required');
  const formula = args.formula ? String(args.formula).toLowerCase() : 'sum';
  if (!['sum', 'count'].includes(formula)) {
    throw new Error('--formula must be sum or count');
  }
  const body = {
    display_name: args['display-name'],
    event_name: args['event-name'],
    default_aggregation: { formula },
  };
  const data = await apiRequest('/billing/meters', { method: 'POST', body }, cfg);
  console.log(`Meter created: ${data.id}`);
  output(data);
}

async function updateMeter(id, args, cfg) {
  if (!id) throw new Error('Meter ID required. Usage: update <id>');
  if (!args['display-name']) throw new Error('--display-name required');
  const body = { display_name: args['display-name'] };
  const data = await apiRequest(`/billing/meters/${id}`, { method: 'POST', body }, cfg);
  console.log(`Meter updated: ${id}`);
  output(data);
}

async function deactivateMeter(id, cfg) {
  if (!id) throw new Error('Meter ID required. Usage: deactivate <id>');
  const data = await apiRequest(`/billing/meters/${id}/deactivate`, { method: 'POST', body: {} }, cfg);
  console.log(`Meter deactivated: ${id}`);
  output(data);
}

async function recordEvent(args, cfg) {
  if (!args['event-name']) throw new Error('--event-name required');
  if (!args.customer) throw new Error('--customer required');
  if (args.value === undefined || args.value === null) throw new Error('--value required');

  const body = {
    event_name: args['event-name'],
    payload: {
      stripe_customer_id: args.customer,
      value: String(args.value),
    },
  };
  if (args.timestamp !== undefined) {
    const ts = parseInt(String(args.timestamp), 10);
    if (Number.isNaN(ts)) throw new Error('--timestamp must be a Unix integer');
    body.timestamp = ts;
  }

  const data = await apiRequest('/billing/meter_events', { method: 'POST', body }, cfg);
  console.log('Meter event recorded');
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list': await listMeters(args, cfg); break;
      case 'get': await getMeter(args._[1], cfg); break;
      case 'create': await createMeter(args, cfg); break;
      case 'update': await updateMeter(args._[1], args, cfg); break;
      case 'deactivate': await deactivateMeter(args._[1], cfg); break;
      case 'record-event': await recordEvent(args, cfg); break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) { outputError(error); }
}
main();
