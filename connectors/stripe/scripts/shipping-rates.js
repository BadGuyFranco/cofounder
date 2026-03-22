import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function parseBoolFlag(val) {
  if (val === true) return true;
  if (val === false) return false;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

function parseMetadataJson(raw) {
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON for --metadata: ${e.message}`);
  }
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    throw new Error('--metadata must be a JSON object');
  }
  return meta;
}

function showHelp() {
  console.log(`
Shipping Rates - Manage Stripe shipping rates

Usage: node scripts/shipping-rates.js <command> [options]

Commands:
  list                        List shipping rates
  get <id>                    Get a shipping rate by ID
  create                      Create a fixed-amount shipping rate
  update <id>                 Update a shipping rate (active, metadata)
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --display-name <text>       Display name (create)
  --amount <cents>            Fixed amount in smallest currency unit (create)
  --currency <code>           ISO currency (default: usd)
  --active <true|false>       Filter list or set on update
  --metadata <json>           JSON object (update)
  --limit <n>                 Max results for list

Examples:
  node scripts/shipping-rates.js create --display-name "Standard" --amount 500
  node scripts/shipping-rates.js list --active true
  node scripts/shipping-rates.js update shr_xxx --active false
`);
}

async function listRates(args, cfg) {
  const params = {};
  const active = parseBoolFlag(args.active);
  if (active !== undefined) params.active = active ? 'true' : 'false';
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/shipping_rates', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/shipping_rates', params, cfg);
    output(rows);
  }
}

async function getRate(id, cfg) {
  if (!id) throw new Error('Shipping rate ID required. Usage: get <id>');
  const data = await apiRequest(`/shipping_rates/${id}`, {}, cfg);
  output(data);
}

async function createRate(args, cfg) {
  if (!args['display-name']) throw new Error('--display-name required');
  if (args.amount === undefined || args.amount === null) throw new Error('--amount required');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 0) throw new Error('--amount must be a non-negative integer (cents)');
  const currency = (args.currency || 'usd').toLowerCase();
  const body = {
    display_name: args['display-name'],
    type: 'fixed_amount',
    fixed_amount: { amount, currency },
  };
  const data = await apiRequest('/shipping_rates', { method: 'POST', body }, cfg);
  console.log(`Shipping rate created: ${data.id}`);
  output(data);
}

async function updateRate(id, args, cfg) {
  if (!id) throw new Error('Shipping rate ID required. Usage: update <id>');
  const body = {};
  const active = parseBoolFlag(args.active);
  if (active !== undefined) body.active = active ? 'true' : 'false';
  if (args.metadata !== undefined) body.metadata = parseMetadataJson(args.metadata);
  if (Object.keys(body).length === 0) {
    throw new Error('Provide --active and/or --metadata for update');
  }
  const data = await apiRequest(`/shipping_rates/${id}`, { method: 'POST', body }, cfg);
  console.log(`Shipping rate updated: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list': await listRates(args, cfg); break;
      case 'get': await getRate(args._[1], cfg); break;
      case 'create': await createRate(args, cfg); break;
      case 'update': await updateRate(args._[1], args, cfg); break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) { outputError(error); }
}
main();
