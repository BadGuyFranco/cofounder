import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Credit Notes Script - Manage Stripe credit notes

Usage: node scripts/credit-notes.js <command> [args] [options]

Commands:
  list                        List credit notes
  get <id>                    Get credit note by ID
  create                      Create a credit note
  void <id>                   Void a credit note
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --invoice <id>              Invoice ID (required for create; filter list)
  --amount <cents>            Amount in smallest currency unit (create)
  --reason <string>           duplicate, fraudulent, order_change, product_unsatisfactory (create)
  --memo <string>             Memo (create)
  --out-of-band-amount <cents> Out-of-band amount (create)
  --customer <id>             Filter list by customer
  --limit <n>                 Max results for list

Examples:
  node scripts/credit-notes.js list --invoice in_xxx
  node scripts/credit-notes.js create --invoice in_xxx --amount 1000 --reason order_change
  node scripts/credit-notes.js get cn_xxx
  node scripts/credit-notes.js void cn_xxx
`);
}

async function listNotes(args, cfg) {
  const params = {};
  if (args.invoice) params.invoice = args.invoice;
  if (args.customer) params.customer = args.customer;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/credit_notes', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/credit_notes', params, cfg);
    output(rows);
  }
}

async function getNote(id, cfg) {
  if (!id) throw new Error('Credit note ID required. Usage: get <id>');
  const data = await apiRequest(`/credit_notes/${id}`, {}, cfg);
  output(data);
}

async function createNote(args, cfg) {
  if (!args.invoice) throw new Error('--invoice required for create');
  const body = { invoice: args.invoice };
  if (args.amount !== undefined) body.amount = String(args.amount);
  if (args.reason) body.reason = args.reason;
  if (args.memo) body.memo = args.memo;
  if (args['out-of-band-amount'] !== undefined) {
    body.out_of_band_amount = String(args['out-of-band-amount']);
  }
  const data = await apiRequest('/credit_notes', { method: 'POST', body }, cfg);
  console.log(`Credit note created: ${data.id}`);
  output(data);
}

async function voidNote(id, cfg) {
  if (!id) throw new Error('Credit note ID required. Usage: void <id>');
  const data = await apiRequest(`/credit_notes/${id}/void`, { method: 'POST' }, cfg);
  console.log(`Credit note voided: ${data.id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listNotes(args, cfg);
        break;
      case 'get':
        await getNote(args._[1], cfg);
        break;
      case 'create':
        await createNote(args, cfg);
        break;
      case 'void':
        await voidNote(args._[1], cfg);
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
