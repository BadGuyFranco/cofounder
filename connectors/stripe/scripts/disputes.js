import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Disputes Script - Manage Stripe disputes

Usage: node scripts/disputes.js <command> [options]

Commands:
  list                        List disputes
  get <id>                    Get dispute by ID
  update <id>                 Submit or update dispute evidence
  close <id>                  Close dispute (accept loss)
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --charge <id>               Filter list by charge ID
  --payment-intent <id>       Filter list by payment intent ID
  --limit <n>                 Max results for list (default: all)
  --evidence-text <text>      Maps to evidence.uncategorized_text (update)
  --customer-email <email>    Maps to evidence.customer_email_address (update)
  --customer-name <name>      Maps to evidence.customer_name (update)
  --product-description <t>   Maps to evidence.product_description (update)

Examples:
  node scripts/disputes.js list
  node scripts/disputes.js list --charge ch_abc123 --limit 10
  node scripts/disputes.js get dp_abc123
  node scripts/disputes.js update dp_abc123 --evidence-text "Details..." --customer-email user@example.com
  node scripts/disputes.js close dp_abc123
  node scripts/disputes.js list --account business --mode live
`);
}

async function listDisputes(args, cfg) {
  const params = {};
  if (args.charge) params.charge = args.charge;
  if (args['payment-intent']) params.payment_intent = args['payment-intent'];
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/disputes', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/disputes', params, cfg);
    output(items);
  }
}

async function getDispute(id, cfg) {
  if (!id) throw new Error('Dispute ID required. Usage: get <id>');
  const data = await apiRequest(`/disputes/${id}`, {}, cfg);
  output(data);
}

function buildEvidenceFromArgs(args) {
  const evidence = {};
  if (args['evidence-text'] != null) evidence.uncategorized_text = String(args['evidence-text']);
  if (args['customer-email'] != null) evidence.customer_email_address = String(args['customer-email']);
  if (args['customer-name'] != null) evidence.customer_name = String(args['customer-name']);
  if (args['product-description'] != null) {
    evidence.product_description = String(args['product-description']);
  }
  return evidence;
}

async function updateDispute(id, args, cfg) {
  if (!id) throw new Error('Dispute ID required. Usage: update <id>');
  const evidence = buildEvidenceFromArgs(args);
  if (!Object.keys(evidence).length) {
    throw new Error('Provide at least one of: --evidence-text, --customer-email, --customer-name, --product-description');
  }
  const data = await apiRequest(`/disputes/${id}`, { method: 'POST', body: { evidence } }, cfg);
  console.log(`Dispute updated: ${id}`);
  output(data);
}

async function closeDispute(id, cfg) {
  if (!id) throw new Error('Dispute ID required. Usage: close <id>');
  const data = await apiRequest(`/disputes/${id}/close`, { method: 'POST' }, cfg);
  console.log(`Dispute closed: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listDisputes(args, cfg);
        break;
      case 'get':
        await getDispute(args._[1], cfg);
        break;
      case 'update':
        await updateDispute(args._[1], args, cfg);
        break;
      case 'close':
        await closeDispute(args._[1], cfg);
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
