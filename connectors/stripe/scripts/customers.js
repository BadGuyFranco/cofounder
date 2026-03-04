import { loadConfig, apiRequest, paginate, parseArgs, output, outputError } from './utils.js';

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
  help                        Show this help

Options:
  --email <email>             Customer email
  --name <name>               Customer name
  --description <text>        Customer description
  --phone <phone>             Customer phone
  --limit <n>                 Max results for list (default: all)

Examples:
  node scripts/customers.js list
  node scripts/customers.js get cus_abc123
  node scripts/customers.js get --email user@example.com
  node scripts/customers.js create --email user@example.com --name "Jane Doe"
  node scripts/customers.js update cus_abc123 --name "Jane Smith"
  node scripts/customers.js delete cus_abc123
`);
}

async function list(flags, cfg) {
  const params = {};
  if (flags.email) params.email = flags.email;
  if (flags.limit) params.limit = flags.limit;

  if (flags.limit) {
    const data = await apiRequest('/customers', { params }, cfg);
    output(data.data);
  } else {
    const customers = await paginate('/customers', params, cfg);
    output(customers);
  }
}

async function get(idOrFlags, flags, cfg) {
  if (flags.email) {
    const data = await apiRequest('/customers', { params: { email: flags.email, limit: 1 } }, cfg);
    const customer = data.data[0];
    if (!customer) throw new Error(`No customer found with email: ${flags.email}`);
    output(customer);
  } else {
    if (!idOrFlags) throw new Error('Customer ID required. Usage: get <id>');
    const data = await apiRequest(`/customers/${idOrFlags}`, {}, cfg);
    output(data);
  }
}

async function create(flags, cfg) {
  if (!flags.email) throw new Error('--email required');
  const body = {};
  if (flags.email) body.email = flags.email;
  if (flags.name) body.name = flags.name;
  if (flags.description) body.description = flags.description;
  if (flags.phone) body.phone = flags.phone;

  const data = await apiRequest('/customers', { method: 'POST', body }, cfg);
  console.log(`✓ Customer created: ${data.id}`);
  output(data);
}

async function update(id, flags, cfg) {
  if (!id) throw new Error('Customer ID required. Usage: update <id>');
  const body = {};
  if (flags.email) body.email = flags.email;
  if (flags.name) body.name = flags.name;
  if (flags.description) body.description = flags.description;
  if (flags.phone) body.phone = flags.phone;

  const data = await apiRequest(`/customers/${id}`, { method: 'POST', body }, cfg);
  console.log(`✓ Customer updated: ${data.id}`);
  output(data);
}

async function del(id, cfg) {
  if (!id) throw new Error('Customer ID required. Usage: delete <id>');
  const data = await apiRequest(`/customers/${id}`, { method: 'DELETE' }, cfg);
  console.log(`✓ Customer deleted: ${id}`);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help') { showHelp(); return; }

  const cfg = loadConfig();

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
