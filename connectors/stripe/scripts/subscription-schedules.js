import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Subscription Schedules - Manage Stripe subscription schedules

Usage: node scripts/subscription-schedules.js <command> [options]

Commands:
  list                        List subscription schedules
  get <id>                    Get a schedule by ID
  create                      Create a schedule (single phase, one price)
  update <id>                 Update a schedule
  release <id>                Release a schedule
  cancel <id>                 Cancel a schedule
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Customer ID (list, create)
  --start-date <now|unix>     Schedule start (create)
  --end-behavior <release|cancel>   End behavior (create, update)
  --price <id>                Price ID for the single phase item (create)
  --limit <n>                 Max results for list

Examples:
  node scripts/subscription-schedules.js list --customer cus_xxx
  node scripts/subscription-schedules.js create --customer cus_xxx --price price_xxx
  node scripts/subscription-schedules.js get sub_sched_xxx
  node scripts/subscription-schedules.js release sub_sched_xxx
`);
}

async function listSchedules(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/subscription_schedules', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/subscription_schedules', params, cfg);
    output(rows);
  }
}

async function getSchedule(id, cfg) {
  if (!id) throw new Error('Schedule ID required. Usage: get <id>');
  const data = await apiRequest(`/subscription_schedules/${id}`, {}, cfg);
  output(data);
}

async function createSchedule(args, cfg) {
  if (!args.customer) throw new Error('--customer required');
  if (!args.price) throw new Error('--price required');

  const body = {
    customer: args.customer,
    phases: [{ items: [{ price: args.price, quantity: 1 }] }],
  };

  if (args['start-date'] !== undefined) {
    const sd = args['start-date'];
    body.start_date = /^\d+$/.test(String(sd)) ? parseInt(String(sd), 10) : sd;
  }
  if (args['end-behavior']) {
    const eb = String(args['end-behavior']).toLowerCase();
    if (!['release', 'cancel'].includes(eb)) {
      throw new Error('--end-behavior must be release or cancel');
    }
    body.end_behavior = eb;
  }

  const data = await apiRequest('/subscription_schedules', { method: 'POST', body }, cfg);
  console.log(`Subscription schedule created: ${data.id}`);
  output(data);
}

async function updateSchedule(id, args, cfg) {
  if (!id) throw new Error('Schedule ID required. Usage: update <id>');
  const body = {};
  if (args['end-behavior']) {
    const eb = String(args['end-behavior']).toLowerCase();
    if (!['release', 'cancel'].includes(eb)) {
      throw new Error('--end-behavior must be release or cancel');
    }
    body.end_behavior = eb;
  }
  if (Object.keys(body).length === 0) {
    throw new Error('Provide at least --end-behavior for update');
  }
  const data = await apiRequest(`/subscription_schedules/${id}`, { method: 'POST', body }, cfg);
  console.log(`Subscription schedule updated: ${id}`);
  output(data);
}

async function releaseSchedule(id, cfg) {
  if (!id) throw new Error('Schedule ID required. Usage: release <id>');
  const data = await apiRequest(`/subscription_schedules/${id}/release`, { method: 'POST', body: {} }, cfg);
  console.log(`Subscription schedule released: ${id}`);
  output(data);
}

async function cancelSchedule(id, cfg) {
  if (!id) throw new Error('Schedule ID required. Usage: cancel <id>');
  const data = await apiRequest(`/subscription_schedules/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Subscription schedule canceled: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list': await listSchedules(args, cfg); break;
      case 'get': await getSchedule(args._[1], cfg); break;
      case 'create': await createSchedule(args, cfg); break;
      case 'update': await updateSchedule(args._[1], args, cfg); break;
      case 'release': await releaseSchedule(args._[1], cfg); break;
      case 'cancel': await cancelSchedule(args._[1], cfg); break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) { outputError(error); }
}
main();
