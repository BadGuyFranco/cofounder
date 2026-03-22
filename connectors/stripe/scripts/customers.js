import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Customers Script - Manage Stripe customers

Usage: node scripts/customers.js <command> [options]

Commands:
  list                        List all customers
  get <id>                    Get customer by ID or email
  create                      Create a new customer
  update <id>                 Update a customer
  delete <id>                 Delete a customer
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --email <email>             Customer email
  --name <name>               Customer name
  --description <text>        Customer description
  --phone <phone>             Customer phone
  --limit <n>                 Max results for list (default: all)

Examples:
  node scripts/customers.js list
  node scripts/customers.js list --mode live
  node scripts/customers.js get cus_abc123
  node scripts/customers.js get --email user@example.com
  node scripts/customers.js create --email user@example.com --name "Jane Doe"
  node scripts/customers.js update cus_abc123 --name "Jane Smith"
  node scripts/customers.js delete cus_abc123
  node scripts/customers.js list --account business --mode live
`);
}

async function list(args, cfg) {
  const params = {};
  if (args.email) params.email = args.email;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/customers', { params }, cfg);
    output(data.data);
  } else {
    const customers = await paginate('/customers', params, cfg);
    output(customers);
  }
}

async function get(id, args, cfg) {
  if (args.email) {
    const data = await apiRequest('/customers', { params: { email: args.email, limit: 1 } }, cfg);
    const customer = data.data[0];
    if (!customer) throw new Error(`No customer found with email: ${args.email}`);
    output(customer);
  } else {
    if (!id) throw new Error('Customer ID required. Usage: get <id>');
    const data = await apiRequest(`/customers/${id}`, {}, cfg);
    output(data);
  }
}

async function create(args, cfg) {
  if (!args.email) throw new Error('--email required');
  const body = {};
  if (args.email) body.email = args.email;
  if (args.name) body.name = args.name;
  if (args.description) body.description = args.description;
  if (args.phone) body.phone = args.phone;

  const data = await apiRequest('/customers', { method: 'POST', body }, cfg);
  console.log(`Customer created: ${data.id}`);
  output(data);
}

async function update(id, args, cfg) {
  if (!id) throw new Error('Customer ID required. Usage: update <id>');
  const body = {};
  if (args.email) body.email = args.email;
  if (args.name) body.name = args.name;
  if (args.description) body.description = args.description;
  if (args.phone) body.phone = args.phone;

  const data = await apiRequest(`/customers/${id}`, { method: 'POST', body }, cfg);
  console.log(`Customer updated: ${data.id}`);
  output(data);
}

async function del(id, cfg) {
  if (!id) throw new Error('Customer ID required. Usage: delete <id>');
  const data = await apiRequest(`/customers/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Customer deleted: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;

  const { config: cfg, args, command } = init;

  try {
    switch (command) {
      case 'list':   await list(args, cfg); break;
      case 'get':    await get(args._[1], args, cfg); break;
      case 'create': await create(args, cfg); break;
      case 'update': await update(args._[1], args, cfg); break;
      case 'delete': await del(args._[1], cfg); break;
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
