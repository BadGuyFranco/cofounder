import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Stripe Connect Script - Platform accounts, links, transfers, application fees

Usage: node scripts/connect.js <command> [options]

Commands:
  list-accounts               List connected accounts
  get-account <id>            Get connected account
  create-account              Create connected account
  update-account <id>         Update connected account
  delete-account <id>         Delete connected account
  create-link <acct_id>       Create account link (onboarding or update)
  create-transfer             Create a transfer
  list-transfers              List transfers
  get-transfer <id>           Get transfer
  reverse-transfer <id>       Create transfer reversal
  list-fees                   List application fees
  get-fee <id>                Get application fee
  refund-fee <id>             Refund application fee
  accounts                    List configured Stripe credential profiles
  help                        Show this help

Options:
  --account <name>            Credential profile (not Connect account id)
  --mode <test|live>          Test or live keys (default: test)
  --type <standard|express|custom>   Account type (create-account)
  --email <email>
  --country <code>
  --business-type <type>
  --refresh-url <url>         Account link
  --return-url <url>
  --link-type <account_onboarding|account_update>
  --amount <cents>            Transfer, reversal, or fee refund
  --currency <code>
  --destination <acct_id>     Transfer destination
  --charge <id>             Filter application fees by charge
  --limit <n>                 Max list results (default: paginate all)
`);
}

async function listAccounts(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/accounts', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/accounts', params, cfg);
    output(items);
  }
}

async function getAccount(id, cfg) {
  if (!id) throw new Error('Account id required. Usage: get-account <id>');
  const data = await apiRequest(`/accounts/${id}`, {}, cfg);
  output(data);
}

async function createAccount(args, cfg) {
  const body = {};
  if (args.type) body.type = args.type;
  if (args.email) body.email = args.email;
  if (args.country) body.country = args.country;
  if (args['business-type']) body.business_type = args['business-type'];
  const data = await apiRequest('/accounts', { method: 'POST', body }, cfg);
  console.log(`Account created: ${data.id}`);
  output(data);
}

async function updateAccount(id, args, cfg) {
  if (!id) throw new Error('Account id required. Usage: update-account <id>');
  const body = {};
  if (args.type) body.type = args.type;
  if (args.email) body.email = args.email;
  if (args.country) body.country = args.country;
  if (args['business-type']) body.business_type = args['business-type'];
  const data = await apiRequest(`/accounts/${id}`, { method: 'POST', body }, cfg);
  console.log(`Account updated: ${data.id}`);
  output(data);
}

async function deleteAccount(id, cfg) {
  if (!id) throw new Error('Account id required. Usage: delete-account <id>');
  const data = await apiRequest(`/accounts/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Account deleted: ${id}`);
  output(data);
}

async function createLink(acctId, args, cfg) {
  if (!acctId) throw new Error('Connect account id required. Usage: create-link <acct_id>');
  if (!args['refresh-url']) throw new Error('--refresh-url required');
  if (!args['return-url']) throw new Error('--return-url required');
  if (!args['link-type']) throw new Error('--link-type required (account_onboarding or account_update)');
  const body = {
    account: acctId,
    refresh_url: args['refresh-url'],
    return_url: args['return-url'],
    type: args['link-type'],
  };
  const data = await apiRequest('/account_links', { method: 'POST', body }, cfg);
  console.log('Account link created');
  output(data);
}

async function createTransfer(args, cfg) {
  if (args.amount == null) throw new Error('--amount required (cents)');
  if (!args.currency) throw new Error('--currency required');
  if (!args.destination) throw new Error('--destination required (connected account id)');
  const amount = parseInt(String(args.amount), 10);
  if (Number.isNaN(amount) || amount < 1) throw new Error('--amount must be a positive integer (cents)');
  const body = { amount, currency: args.currency, destination: args.destination };
  const data = await apiRequest('/transfers', { method: 'POST', body }, cfg);
  console.log(`Transfer created: ${data.id}`);
  output(data);
}

async function listTransfers(args, cfg) {
  const params = {};
  if (args.destination) params.destination = args.destination;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/transfers', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/transfers', params, cfg);
    output(items);
  }
}

async function getTransfer(id, cfg) {
  if (!id) throw new Error('Transfer id required. Usage: get-transfer <id>');
  const data = await apiRequest(`/transfers/${id}`, {}, cfg);
  output(data);
}

async function reverseTransfer(id, args, cfg) {
  if (!id) throw new Error('Transfer id required. Usage: reverse-transfer <id>');
  const body = {};
  if (args.amount != null) {
    const n = parseInt(String(args.amount), 10);
    if (Number.isNaN(n) || n < 1) throw new Error('--amount must be a positive integer (cents)');
    body.amount = n;
  }
  const data = await apiRequest(`/transfers/${id}/reversals`, { method: 'POST', body }, cfg);
  console.log(`Reversal created for transfer ${id}`);
  output(data);
}

async function listFees(args, cfg) {
  const params = {};
  if (args.charge) params.charge = args.charge;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/application_fees', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/application_fees', params, cfg);
    output(items);
  }
}

async function getFee(id, cfg) {
  if (!id) throw new Error('Application fee id required. Usage: get-fee <id>');
  const data = await apiRequest(`/application_fees/${id}`, {}, cfg);
  output(data);
}

async function refundFee(id, args, cfg) {
  if (!id) throw new Error('Application fee id required. Usage: refund-fee <id>');
  const body = {};
  if (args.amount != null) {
    const n = parseInt(String(args.amount), 10);
    if (Number.isNaN(n) || n < 1) throw new Error('--amount must be a positive integer (cents)');
    body.amount = n;
  }
  const data = await apiRequest(`/application_fees/${id}/refunds`, { method: 'POST', body }, cfg);
  console.log(`Application fee refund created for ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list-accounts':
        await listAccounts(args, cfg);
        break;
      case 'get-account':
        await getAccount(args._[1], cfg);
        break;
      case 'create-account':
        await createAccount(args, cfg);
        break;
      case 'update-account':
        await updateAccount(args._[1], args, cfg);
        break;
      case 'delete-account':
        await deleteAccount(args._[1], cfg);
        break;
      case 'create-link':
        await createLink(args._[1], args, cfg);
        break;
      case 'create-transfer':
        await createTransfer(args, cfg);
        break;
      case 'list-transfers':
        await listTransfers(args, cfg);
        break;
      case 'get-transfer':
        await getTransfer(args._[1], cfg);
        break;
      case 'reverse-transfer':
        await reverseTransfer(args._[1], args, cfg);
        break;
      case 'list-fees':
        await listFees(args, cfg);
        break;
      case 'get-fee':
        await getFee(args._[1], cfg);
        break;
      case 'refund-fee':
        await refundFee(args._[1], args, cfg);
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
