import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Charges Script - Manage Stripe charges

Usage: node scripts/charges.js <command> [options]

Commands:
  list                        List charges
  get <id>                    Get charge by ID
  capture <id>                Capture an uncaptured charge
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Filter list by customer ID
  --payment-intent <id>       Filter list by payment intent ID
  --limit <n>                 Max results for list (default: all)
  --amount <cents>            Partial capture amount in cents (capture only)

Examples:
  node scripts/charges.js list
  node scripts/charges.js list --customer cus_abc123 --limit 10
  node scripts/charges.js list --payment-intent pi_abc123
  node scripts/charges.js get ch_abc123
  node scripts/charges.js capture ch_abc123
  node scripts/charges.js capture ch_abc123 --amount 1000
  node scripts/charges.js list --account business --mode live
`);
}

async function listCharges(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args['payment-intent']) params.payment_intent = args['payment-intent'];
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/charges', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/charges', params, cfg);
    output(items);
  }
}

async function getCharge(id, cfg) {
  if (!id) throw new Error('Charge ID required. Usage: get <id>');
  const data = await apiRequest(`/charges/${id}`, {}, cfg);
  output(data);
}

async function captureCharge(id, args, cfg) {
  if (!id) throw new Error('Charge ID required. Usage: capture <id>');
  const body = {};
  if (args.amount != null) {
    const n = parseInt(String(args.amount), 10);
    if (Number.isNaN(n) || n < 1) throw new Error('--amount must be a positive integer (cents)');
    body.amount = n;
  }
  const data = await apiRequest(`/charges/${id}/capture`, { method: 'POST', body }, cfg);
  console.log(`Charge captured: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listCharges(args, cfg);
        break;
      case 'get':
        await getCharge(args._[1], cfg);
        break;
      case 'capture':
        await captureCharge(args._[1], args, cfg);
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
