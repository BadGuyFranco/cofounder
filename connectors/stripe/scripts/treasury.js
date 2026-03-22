import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Stripe Treasury Script - Financial accounts, inbound/outbound transfers, outbound payments

Usage: node scripts/treasury.js <command> [options]

Commands:
  list-accounts               List financial accounts
  get-account <id>            Get financial account
  create-account              Create financial account
  update-account <id>         Update financial account
  create-inbound              Create inbound transfer
  list-inbound                List inbound transfers
  get-inbound <id>            Get inbound transfer
  cancel-inbound <id>         Cancel inbound transfer
  create-outbound             Create outbound transfer
  list-outbound               List outbound transfers
  get-outbound <id>           Get outbound transfer
  cancel-outbound <id>        Cancel outbound transfer
  create-payment              Create outbound payment
  list-payments               List outbound payments
  get-payment <id>            Get outbound payment
  cancel-payment <id>         Cancel outbound payment
  accounts                    List configured Stripe credential profiles
  help                        Show this help

Options:
  --account <name>            Credential profile
  --mode <test|live>          Test or live keys (default: test)
  --financial-account <id>    Treasury financial account id
  --amount <cents>
  --currency <code>
  --origin-payment-method <id>
  --destination-payment-method <id>
  --customer <id>
  --status <status>
  --limit <n>                 Max list results (default: paginate all)
`);
}

async function listFinancialAccounts(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/treasury/financial_accounts', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/treasury/financial_accounts', params, cfg);
    output(items);
  }
}

async function getFinancialAccount(id, cfg) {
  if (!id) throw new Error('Financial account id required. Usage: get-account <id>');
  const data = await apiRequest(`/treasury/financial_accounts/${id}`, {}, cfg);
  output(data);
}

async function createFinancialAccount(args, cfg) {
  if (!args.currency) throw new Error('--currency required (supported currency code, e.g. usd)');
  const body = { supported_currencies: [args.currency], features: {} };
  const data = await apiRequest('/treasury/financial_accounts', { method: 'POST', body }, cfg);
  console.log(`Financial account created: ${data.id}`);
  output(data);
}

async function updateFinancialAccount(id, cfg) {
  if (!id) throw new Error('Financial account id required. Usage: update-account <id>');
  const data = await apiRequest(`/treasury/financial_accounts/${id}`, { method: 'POST', body: {} }, cfg);
  console.log(`Financial account updated: ${data.id}`);
  output(data);
}

async function createInbound(args, cfg) {
  if (!args['financial-account']) throw new Error('--financial-account required');
  if (args.amount == null) throw new Error('--amount required (cents)');
  if (!args.currency) throw new Error('--currency required');
  if (!args['origin-payment-method']) throw new Error('--origin-payment-method required');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 1) throw new Error('--amount must be a positive integer (cents)');
  const body = {
    financial_account: args['financial-account'],
    amount,
    currency: args.currency,
    origin_payment_method: args['origin-payment-method'],
  };
  const data = await apiRequest('/treasury/inbound_transfers', { method: 'POST', body }, cfg);
  console.log(`Inbound transfer created: ${data.id}`);
  output(data);
}

async function listInbound(args, cfg) {
  const params = {};
  if (args['financial-account']) params.financial_account = args['financial-account'];
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/treasury/inbound_transfers', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/treasury/inbound_transfers', params, cfg);
    output(items);
  }
}

async function getInbound(id, cfg) {
  if (!id) throw new Error('Inbound transfer id required. Usage: get-inbound <id>');
  const data = await apiRequest(`/treasury/inbound_transfers/${id}`, {}, cfg);
  output(data);
}

async function cancelInbound(id, cfg) {
  if (!id) throw new Error('Inbound transfer id required. Usage: cancel-inbound <id>');
  const data = await apiRequest(`/treasury/inbound_transfers/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Inbound transfer canceled: ${id}`);
  output(data);
}

async function createOutbound(args, cfg) {
  if (!args['financial-account']) throw new Error('--financial-account required');
  if (args.amount == null) throw new Error('--amount required (cents)');
  if (!args.currency) throw new Error('--currency required');
  if (!args['destination-payment-method']) throw new Error('--destination-payment-method required');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 1) throw new Error('--amount must be a positive integer (cents)');
  const body = {
    financial_account: args['financial-account'],
    amount,
    currency: args.currency,
    destination_payment_method: args['destination-payment-method'],
  };
  const data = await apiRequest('/treasury/outbound_transfers', { method: 'POST', body }, cfg);
  console.log(`Outbound transfer created: ${data.id}`);
  output(data);
}

async function listOutbound(args, cfg) {
  const params = {};
  if (args['financial-account']) params.financial_account = args['financial-account'];
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/treasury/outbound_transfers', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/treasury/outbound_transfers', params, cfg);
    output(items);
  }
}

async function getOutbound(id, cfg) {
  if (!id) throw new Error('Outbound transfer id required. Usage: get-outbound <id>');
  const data = await apiRequest(`/treasury/outbound_transfers/${id}`, {}, cfg);
  output(data);
}

async function cancelOutbound(id, cfg) {
  if (!id) throw new Error('Outbound transfer id required. Usage: cancel-outbound <id>');
  const data = await apiRequest(`/treasury/outbound_transfers/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Outbound transfer canceled: ${id}`);
  output(data);
}

async function createPayment(args, cfg) {
  if (!args['financial-account']) throw new Error('--financial-account required');
  if (args.amount == null) throw new Error('--amount required (cents)');
  if (!args.currency) throw new Error('--currency required');
  if (!args.customer) throw new Error('--customer required');
  if (!args['destination-payment-method']) throw new Error('--destination-payment-method required');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 1) throw new Error('--amount must be a positive integer (cents)');
  const body = {
    financial_account: args['financial-account'],
    amount,
    currency: args.currency,
    customer: args.customer,
    destination_payment_method: args['destination-payment-method'],
  };
  const data = await apiRequest('/treasury/outbound_payments', { method: 'POST', body }, cfg);
  console.log(`Outbound payment created: ${data.id}`);
  output(data);
}

async function listPayments(args, cfg) {
  const params = {};
  if (args['financial-account']) params.financial_account = args['financial-account'];
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/treasury/outbound_payments', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/treasury/outbound_payments', params, cfg);
    output(items);
  }
}

async function getPayment(id, cfg) {
  if (!id) throw new Error('Outbound payment id required. Usage: get-payment <id>');
  const data = await apiRequest(`/treasury/outbound_payments/${id}`, {}, cfg);
  output(data);
}

async function cancelPayment(id, cfg) {
  if (!id) throw new Error('Outbound payment id required. Usage: cancel-payment <id>');
  const data = await apiRequest(`/treasury/outbound_payments/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  console.log(`Outbound payment canceled: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list-accounts':
        await listFinancialAccounts(args, cfg);
        break;
      case 'get-account':
        await getFinancialAccount(args._[1], cfg);
        break;
      case 'create-account':
        await createFinancialAccount(args, cfg);
        break;
      case 'update-account':
        await updateFinancialAccount(args._[1], cfg);
        break;
      case 'create-inbound':
        await createInbound(args, cfg);
        break;
      case 'list-inbound':
        await listInbound(args, cfg);
        break;
      case 'get-inbound':
        await getInbound(args._[1], cfg);
        break;
      case 'cancel-inbound':
        await cancelInbound(args._[1], cfg);
        break;
      case 'create-outbound':
        await createOutbound(args, cfg);
        break;
      case 'list-outbound':
        await listOutbound(args, cfg);
        break;
      case 'get-outbound':
        await getOutbound(args._[1], cfg);
        break;
      case 'cancel-outbound':
        await cancelOutbound(args._[1], cfg);
        break;
      case 'create-payment':
        await createPayment(args, cfg);
        break;
      case 'list-payments':
        await listPayments(args, cfg);
        break;
      case 'get-payment':
        await getPayment(args._[1], cfg);
        break;
      case 'cancel-payment':
        await cancelPayment(args._[1], cfg);
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
