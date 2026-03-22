import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Stripe Issuing Script - Cardholders, cards, authorizations, transactions

Usage: node scripts/issuing.js <command> [options]

Commands:
  list-cardholders            List cardholders
  get-cardholder <id>         Get cardholder
  create-cardholder           Create cardholder
  update-cardholder <id>      Update cardholder
  list-cards                  List cards
  get-card <id>               Get card
  create-card                 Create card
  update-card <id>            Update card
  list-auths                  List authorizations
  get-auth <id>               Get authorization
  approve-auth <id>           Approve authorization
  decline-auth <id>           Decline authorization
  list-transactions           List issuing transactions
  get-transaction <id>        Get transaction
  accounts                    List configured Stripe credential profiles
  help                        Show this help

Options:
  --account <name>            Credential profile
  --mode <test|live>          Test or live keys (default: test)
  --name <name>
  --email <email>
  --phone <number>            Maps to phone_number
  --cardholder-type <individual|company>   Cardholder type (create/update)
  --status <status>
  --cardholder <id>           Filter by cardholder
  --card-type <virtual|physical>   Card type (create/update)
  --currency <code>
  --card <id>                 Filter by card
  --limit <n>                 Max list results (default: paginate all)
`);
}

async function listCardholders(args, cfg) {
  const params = {};
  if (args.status) params.status = args.status;
  if (args['cardholder-type']) params.type = args['cardholder-type'];
  if (args.email) params.email = args.email;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/issuing/cardholders', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/issuing/cardholders', params, cfg);
    output(items);
  }
}

async function getCardholder(id, cfg) {
  if (!id) throw new Error('Cardholder id required. Usage: get-cardholder <id>');
  const data = await apiRequest(`/issuing/cardholders/${id}`, {}, cfg);
  output(data);
}

async function createCardholder(args, cfg) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.email) body.email = args.email;
  if (args.phone) body.phone_number = args.phone;
  if (args.status) body.status = args.status;
  if (args['cardholder-type']) body.type = args['cardholder-type'];
  const data = await apiRequest('/issuing/cardholders', { method: 'POST', body }, cfg);
  console.log(`Cardholder created: ${data.id}`);
  output(data);
}

async function updateCardholder(id, args, cfg) {
  if (!id) throw new Error('Cardholder id required. Usage: update-cardholder <id>');
  const body = {};
  if (args.name) body.name = args.name;
  if (args.email) body.email = args.email;
  if (args.phone) body.phone_number = args.phone;
  if (args.status) body.status = args.status;
  if (args['cardholder-type']) body.type = args['cardholder-type'];
  const data = await apiRequest(`/issuing/cardholders/${id}`, { method: 'POST', body }, cfg);
  console.log(`Cardholder updated: ${data.id}`);
  output(data);
}

async function listCards(args, cfg) {
  const params = {};
  if (args.cardholder) params.cardholder = args.cardholder;
  if (args.status) params.status = args.status;
  if (args['card-type']) params.type = args['card-type'];
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/issuing/cards', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/issuing/cards', params, cfg);
    output(items);
  }
}

async function getCard(id, cfg) {
  if (!id) throw new Error('Card id required. Usage: get-card <id>');
  const data = await apiRequest(`/issuing/cards/${id}`, {}, cfg);
  output(data);
}

async function createCard(args, cfg) {
  if (!args.cardholder) throw new Error('--cardholder required');
  const body = { cardholder: args.cardholder };
  if (args['card-type']) body.type = args['card-type'];
  if (args.currency) body.currency = args.currency;
  if (args.status) body.status = args.status;
  const data = await apiRequest('/issuing/cards', { method: 'POST', body }, cfg);
  console.log(`Card created: ${data.id}`);
  output(data);
}

async function updateCard(id, args, cfg) {
  if (!id) throw new Error('Card id required. Usage: update-card <id>');
  const body = {};
  if (args.status) body.status = args.status;
  const data = await apiRequest(`/issuing/cards/${id}`, { method: 'POST', body }, cfg);
  console.log(`Card updated: ${data.id}`);
  output(data);
}

async function listAuths(args, cfg) {
  const params = {};
  if (args.card) params.card = args.card;
  if (args.cardholder) params.cardholder = args.cardholder;
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/issuing/authorizations', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/issuing/authorizations', params, cfg);
    output(items);
  }
}

async function getAuth(id, cfg) {
  if (!id) throw new Error('Authorization id required. Usage: get-auth <id>');
  const data = await apiRequest(`/issuing/authorizations/${id}`, {}, cfg);
  output(data);
}

async function approveAuth(id, cfg) {
  if (!id) throw new Error('Authorization id required. Usage: approve-auth <id>');
  const data = await apiRequest(`/issuing/authorizations/${id}/approve`, { method: 'POST', body: {} }, cfg);
  console.log(`Authorization approved: ${id}`);
  output(data);
}

async function declineAuth(id, cfg) {
  if (!id) throw new Error('Authorization id required. Usage: decline-auth <id>');
  const data = await apiRequest(`/issuing/authorizations/${id}/decline`, { method: 'POST', body: {} }, cfg);
  console.log(`Authorization declined: ${id}`);
  output(data);
}

async function listTransactions(args, cfg) {
  const params = {};
  if (args.card) params.card = args.card;
  if (args.cardholder) params.cardholder = args.cardholder;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/issuing/transactions', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/issuing/transactions', params, cfg);
    output(items);
  }
}

async function getTransaction(id, cfg) {
  if (!id) throw new Error('Transaction id required. Usage: get-transaction <id>');
  const data = await apiRequest(`/issuing/transactions/${id}`, {}, cfg);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list-cardholders':
        await listCardholders(args, cfg);
        break;
      case 'get-cardholder':
        await getCardholder(args._[1], cfg);
        break;
      case 'create-cardholder':
        await createCardholder(args, cfg);
        break;
      case 'update-cardholder':
        await updateCardholder(args._[1], args, cfg);
        break;
      case 'list-cards':
        await listCards(args, cfg);
        break;
      case 'get-card':
        await getCard(args._[1], cfg);
        break;
      case 'create-card':
        await createCard(args, cfg);
        break;
      case 'update-card':
        await updateCard(args._[1], args, cfg);
        break;
      case 'list-auths':
        await listAuths(args, cfg);
        break;
      case 'get-auth':
        await getAuth(args._[1], cfg);
        break;
      case 'approve-auth':
        await approveAuth(args._[1], cfg);
        break;
      case 'decline-auth':
        await declineAuth(args._[1], cfg);
        break;
      case 'list-transactions':
        await listTransactions(args, cfg);
        break;
      case 'get-transaction':
        await getTransaction(args._[1], cfg);
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
