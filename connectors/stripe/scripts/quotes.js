import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function parseExpiresAt(raw) {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`Invalid --expires-at: ${raw}`);
  return Math.floor(ms / 1000);
}

function showHelp() {
  console.log(`
Quotes - Manage Stripe quotes

Usage: node scripts/quotes.js <command> [options]

Commands:
  list                        List quotes
  get <id>                    Get a quote by ID
  create                      Create a quote
  update <id>                 Update a quote
  finalize <id>               Finalize a quote
  accept <id>                 Accept a quote
  cancel <id>                 Cancel a quote
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Customer ID (list, create)
  --price <id>                Price ID (create)
  --quantity <n>              Line item quantity (default: 1)
  --description <text>        Quote description (create, update)
  --expires-at <unix|iso>     Expiration time (create, update)
  --status <status>           Filter list by status
  --limit <n>                 Max results for list

Examples:
  node scripts/quotes.js list --customer cus_xxx
  node scripts/quotes.js create --customer cus_xxx --price price_xxx
  node scripts/quotes.js finalize qt_xxx
`);
}

function lineItemsFromArgs(args) {
  if (!args.price) throw new Error('--price required');
  const qty = args.quantity != null ? parseInt(String(args.quantity), 10) : 1;
  if (Number.isNaN(qty) || qty < 1) throw new Error('--quantity must be a positive integer');
  return [{ price: args.price, quantity: qty }];
}

async function listQuotes(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/quotes', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/quotes', params, cfg);
    output(rows);
  }
}

async function getQuote(id, cfg) {
  if (!id) throw new Error('Quote ID required. Usage: get <id>');
  const data = await apiRequest(`/quotes/${id}`, {}, cfg);
  output(data);
}

async function createQuote(args, cfg) {
  if (!args.customer) throw new Error('--customer required');
  const body = {
    customer: args.customer,
    line_items: lineItemsFromArgs(args),
  };
  if (args.description) body.description = args.description;
  const exp = parseExpiresAt(args['expires-at']);
  if (exp !== undefined) body.expires_at = exp;

  const data = await apiRequest('/quotes', { method: 'POST', body }, cfg);
  console.log(`Quote created: ${data.id}`);
  output(data);
}

async function updateQuote(id, args, cfg) {
  if (!id) throw new Error('Quote ID required. Usage: update <id>');
  const body = {};
  if (args.description !== undefined) body.description = args.description;
  const exp = parseExpiresAt(args['expires-at']);
  if (exp !== undefined) body.expires_at = exp;
  if (Object.keys(body).length === 0) {
    throw new Error('Provide --description and/or --expires-at for update');
  }
  const data = await apiRequest(`/quotes/${id}`, { method: 'POST', body }, cfg);
  console.log(`Quote updated: ${id}`);
  output(data);
}

async function finalizeQuote(id, cfg) {
  if (!id) throw new Error('Quote ID required. Usage: finalize <id>');
  const data = await apiRequest(`/quotes/${id}/finalize`, { method: 'POST', body: {} }, cfg);
  console.log(`Quote finalized: ${id}`);
  output(data);
}

async function acceptQuote(id, cfg) {
  if (!id) throw new Error('Quote ID required. Usage: accept <id>');
  const data = await apiRequest(`/quotes/${id}/accept`, { method: 'POST', body: {} }, cfg);
  console.log(`Quote accepted: ${id}`);
  output(data);
}

async function cancelQuote(id, cfg) {
  if (!id) throw new Error('Quote ID required. Usage: cancel <id>');
  const data = await apiRequest(`/quotes/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Quote canceled: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list': await listQuotes(args, cfg); break;
      case 'get': await getQuote(args._[1], cfg); break;
      case 'create': await createQuote(args, cfg); break;
      case 'update': await updateQuote(args._[1], args, cfg); break;
      case 'finalize': await finalizeQuote(args._[1], cfg); break;
      case 'accept': await acceptQuote(args._[1], cfg); break;
      case 'cancel': await cancelQuote(args._[1], cfg); break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) { outputError(error); }
}
main();
