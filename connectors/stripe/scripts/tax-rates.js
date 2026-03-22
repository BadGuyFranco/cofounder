import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Tax Rates Script - Manage Stripe tax rates

Usage: node scripts/tax-rates.js <command> [args] [options]

Commands:
  list                        List tax rates
  get <id>                    Get tax rate by ID
  create                      Create a tax rate
  update <id>                 Update a tax rate
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --display-name <string>     Display name (create, update)
  --percentage <n>            Percentage (e.g. 10.5 for 10.5%) (create)
  --inclusive <true|false>    Tax included in price (create, list filter)
  --jurisdiction <string>     Jurisdiction (create)
  --description <string>      Description (create, update)
  --active <true|false>       Active state (list filter, update)
  --limit <n>                 Max results for list

Examples:
  node scripts/tax-rates.js list --active true --limit 20
  node scripts/tax-rates.js create --display-name "Sales Tax" --percentage 8.25 --inclusive false
  node scripts/tax-rates.js get txr_xxx
  node scripts/tax-rates.js update txr_xxx --active false
`);
}

function parseBoolFlag(val) {
  if (val === true) return true;
  if (val === false) return false;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

async function listRates(args, cfg) {
  const params = {};
  const active = parseBoolFlag(args.active);
  if (active !== undefined) params.active = active;
  const inclusive = parseBoolFlag(args.inclusive);
  if (inclusive !== undefined) params.inclusive = inclusive;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/tax_rates', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/tax_rates', params, cfg);
    output(rows);
  }
}

async function getRate(id, cfg) {
  if (!id) throw new Error('Tax rate ID required. Usage: get <id>');
  const data = await apiRequest(`/tax_rates/${id}`, {}, cfg);
  output(data);
}

async function createRate(args, cfg) {
  if (!args['display-name']) throw new Error('--display-name required for create');
  if (args.percentage === undefined) throw new Error('--percentage required for create');
  const body = {
    display_name: args['display-name'],
    percentage: String(args.percentage),
    inclusive: parseBoolFlag(args.inclusive) ?? false,
  };
  if (args.jurisdiction) body.jurisdiction = args.jurisdiction;
  if (args.description) body.description = args.description;
  const data = await apiRequest('/tax_rates', { method: 'POST', body }, cfg);
  console.log(`Tax rate created: ${data.id}`);
  output(data);
}

async function updateRate(id, args, cfg) {
  if (!id) throw new Error('Tax rate ID required. Usage: update <id>');
  const body = {};
  if (args['display-name'] !== undefined) body.display_name = args['display-name'];
  if (args.description !== undefined) body.description = args.description;
  const active = parseBoolFlag(args.active);
  if (active !== undefined) body.active = active;
  if (Object.keys(body).length === 0) {
    throw new Error('Nothing to update. Use --display-name, --description, and/or --active');
  }
  const data = await apiRequest(`/tax_rates/${id}`, { method: 'POST', body }, cfg);
  console.log(`Tax rate updated: ${data.id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listRates(args, cfg);
        break;
      case 'get':
        await getRate(args._[1], cfg);
        break;
      case 'create':
        await createRate(args, cfg);
        break;
      case 'update':
        await updateRate(args._[1], args, cfg);
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
