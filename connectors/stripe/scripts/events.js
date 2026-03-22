import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Events Script - List and retrieve Stripe events

Usage: node scripts/events.js <command> [options]

Commands:
  list                        List events
  get <id>                    Get event by ID
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --type <type>               Filter by event type (e.g. payment_intent.succeeded)
  --limit <n>                 Max results for list (default: all)
  --created-gte <unix>        List: created on or after this Unix timestamp
  --created-lte <unix>        List: created on or before this Unix timestamp

Examples:
  node scripts/events.js list
  node scripts/events.js list --type payment_intent.succeeded --limit 20
  node scripts/events.js list --created-gte 1700000000 --created-lte 1700086400
  node scripts/events.js get evt_abc123
  node scripts/events.js list --account business --mode live
`);
}

async function listEvents(args, cfg) {
  const params = {};
  if (args.type) params.type = args.type;
  if (args.limit) params.limit = args.limit;
  const created = {};
  if (args['created-gte'] != null) created.gte = args['created-gte'];
  if (args['created-lte'] != null) created.lte = args['created-lte'];
  if (Object.keys(created).length) params.created = created;

  if (args.limit) {
    const data = await apiRequest('/events', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/events', params, cfg);
    output(items);
  }
}

async function getEvent(id, cfg) {
  if (!id) throw new Error('Event ID required. Usage: get <id>');
  const data = await apiRequest(`/events/${id}`, {}, cfg);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listEvents(args, cfg);
        break;
      case 'get':
        await getEvent(args._[1], cfg);
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
