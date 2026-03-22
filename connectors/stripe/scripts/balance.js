import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Balance Script - Stripe balance, balance transactions, and payouts

Usage: node scripts/balance.js <command> [options]

Commands:
  get                         Get current account balance
  transactions                List balance transactions
  get-transaction <id>        Get one balance transaction by ID
  create-payout               Create a payout
  list-payouts                List payouts
  get-payout <id>             Get payout by ID
  cancel-payout <id>          Cancel a payout
  reverse-payout <id>         Reverse a payout
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --amount <cents>            Payout amount in cents (create-payout)
  --currency <code>           Currency code (create-payout)
  --description <text>        Description (create-payout)
  --method <standard|instant> Payout method (create-payout)
  --status <status>           Payout status filter: paid, pending, in_transit, canceled, failed
  --limit <n>                 Max results for list commands (default: fetch all pages)
  --type <type>               Balance transaction type filter (transactions)
  --payout <id>               Filter balance transactions by payout ID
  --source <id>               Filter balance transactions by source ID

Examples:
  node scripts/balance.js get
  node scripts/balance.js transactions --limit 25
  node scripts/balance.js get-transaction txn_abc123
  node scripts/balance.js create-payout --amount 1000 --currency usd --method standard
  node scripts/balance.js list-payouts --status paid
  node scripts/balance.js get-payout po_abc123
  node scripts/balance.js cancel-payout po_abc123
  node scripts/balance.js reverse-payout po_abc123
  node scripts/balance.js get --account business --mode live
`);
}

function buildTransactionParams(args) {
  const params = {};
  if (args.type) params.type = args.type;
  if (args.payout) params.payout = args.payout;
  if (args.source) params.source = args.source;
  if (args.limit) params.limit = args.limit;
  return params;
}

function buildPayoutListParams(args) {
  const params = {};
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  return params;
}

async function getBalance(cfg) {
  const data = await apiRequest('/balance', {}, cfg);
  output(data);
}

async function listTransactions(args, cfg) {
  const params = buildTransactionParams(args);
  if (args.limit) {
    const data = await apiRequest('/balance_transactions', { params }, cfg);
    output(data.data);
  } else {
    const base = { ...params };
    delete base.limit;
    const items = await paginate('/balance_transactions', base, cfg);
    output(items);
  }
}

async function getTransaction(id, cfg) {
  if (!id) throw new Error('Balance transaction ID required. Usage: get-transaction <id>');
  const data = await apiRequest(`/balance_transactions/${id}`, {}, cfg);
  output(data);
}

async function createPayout(args, cfg) {
  if (!args.amount) throw new Error('--amount required (cents)');
  if (!args.currency) throw new Error('--currency required');
  const amount = parseInt(String(args.amount), 10);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('--amount must be a positive integer (cents)');
  const body = { amount: String(amount), currency: args.currency };
  if (args.description) body.description = args.description;
  if (args.method) {
    if (args.method !== 'standard' && args.method !== 'instant') {
      throw new Error('--method must be standard or instant');
    }
    body.method = args.method;
  }
  const data = await apiRequest('/payouts', { method: 'POST', body }, cfg);
  console.log(`Payout created: ${data.id}`);
  output(data);
}

async function listPayouts(args, cfg) {
  const params = buildPayoutListParams(args);
  if (args.limit) {
    const data = await apiRequest('/payouts', { params }, cfg);
    output(data.data);
  } else {
    const base = { ...params };
    delete base.limit;
    const items = await paginate('/payouts', base, cfg);
    output(items);
  }
}

async function getPayout(id, cfg) {
  if (!id) throw new Error('Payout ID required. Usage: get-payout <id>');
  const data = await apiRequest(`/payouts/${id}`, {}, cfg);
  output(data);
}

async function cancelPayout(id, cfg) {
  if (!id) throw new Error('Payout ID required. Usage: cancel-payout <id>');
  const data = await apiRequest(`/payouts/${id}/cancel`, { method: 'POST' }, cfg);
  console.log(`Payout canceled: ${id}`);
  output(data);
}

async function reversePayout(id, cfg) {
  if (!id) throw new Error('Payout ID required. Usage: reverse-payout <id>');
  const data = await apiRequest(`/payouts/${id}/reverse`, { method: 'POST' }, cfg);
  console.log(`Payout reversed: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'get':
        await getBalance(cfg);
        break;
      case 'transactions':
        await listTransactions(args, cfg);
        break;
      case 'get-transaction':
        await getTransaction(args._[1], cfg);
        break;
      case 'create-payout':
        await createPayout(args, cfg);
        break;
      case 'list-payouts':
        await listPayouts(args, cfg);
        break;
      case 'get-payout':
        await getPayout(args._[1], cfg);
        break;
      case 'cancel-payout':
        await cancelPayout(args._[1], cfg);
        break;
      case 'reverse-payout':
        await reversePayout(args._[1], cfg);
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
