import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function paymentMethodId(args) {
  return args['payment-method'] || args._[1];
}

function setupIntentId(args) {
  return args._[1];
}

function showHelp() {
  console.log(`
Payment Methods Script - Manage Stripe payment methods and setup intents

Usage: node scripts/payment-methods.js <command> [options]

Commands:
  list                        List payment methods for a customer (--customer, --type)
  get <id>                    Get a payment method by ID (or --payment-method)
  attach                      Attach a payment method to a customer
  detach                      Detach a payment method from its customer
  create-setup                Create a setup intent
  list-setups                 List setup intents (optional --customer)
  get-setup <id>              Get a setup intent by ID
  confirm-setup <id>          Confirm a setup intent
  cancel-setup <id>           Cancel a setup intent
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Customer ID (list, attach, create-setup, list-setups)
  --type <type>               Payment method type for list (e.g. card); for create-setup, payment_method_types
  --payment-method <id>       Payment method ID (pm_...)
  --usage <usage>             Setup intent usage (e.g. off_session, on_session)
  --limit <n>                 Max results for list / list-setups (default: all pages)

Examples:
  node scripts/payment-methods.js list --customer cus_abc --type card
  node scripts/payment-methods.js get pm_abc123
  node scripts/payment-methods.js attach --payment-method pm_abc --customer cus_xyz
  node scripts/payment-methods.js detach pm_abc123
  node scripts/payment-methods.js create-setup --customer cus_xyz --type card --usage off_session
  node scripts/payment-methods.js list-setups --customer cus_xyz
  node scripts/payment-methods.js get-setup seti_abc123
  node scripts/payment-methods.js confirm-setup seti_abc123
  node scripts/payment-methods.js cancel-setup seti_abc123
  node scripts/payment-methods.js list --account business --mode live --customer cus_abc --type card
`);
}

async function listPaymentMethods(args, cfg) {
  if (!args.customer) throw new Error('--customer required');
  if (!args.type) throw new Error('--type required');
  const params = { customer: args.customer, type: args.type };
  if (args.limit) {
    params.limit = args.limit;
    const data = await apiRequest('/payment_methods', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/payment_methods', params, cfg);
    output(items);
  }
}

async function getPaymentMethod(args, cfg) {
  const id = paymentMethodId(args);
  if (!id) throw new Error('Payment method ID required. Usage: get <id> or --payment-method <id>');
  const data = await apiRequest(`/payment_methods/${id}`, {}, cfg);
  output(data);
}

async function attach(args, cfg) {
  const id = paymentMethodId(args);
  if (!id) throw new Error('--payment-method or payment method ID required');
  if (!args.customer) throw new Error('--customer required');
  const data = await apiRequest(`/payment_methods/${id}/attach`, {
    method: 'POST',
    body: { customer: args.customer },
  }, cfg);
  output(data);
}

async function detach(args, cfg) {
  const id = paymentMethodId(args);
  if (!id) throw new Error('--payment-method or payment method ID required');
  const data = await apiRequest(`/payment_methods/${id}/detach`, { method: 'POST', body: {} }, cfg);
  output(data);
}

async function createSetup(args, cfg) {
  const body = {};
  if (args.customer) body.customer = args.customer;
  if (!args.type) throw new Error('--type required (e.g. card)');
  const types = args.type.includes(',')
    ? args.type.split(',').map((t) => t.trim()).filter(Boolean)
    : [args.type];
  body.payment_method_types = types;
  if (args.usage) body.usage = args.usage;
  const data = await apiRequest('/setup_intents', { method: 'POST', body }, cfg);
  output(data);
}

async function listSetups(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.limit) {
    params.limit = args.limit;
    const data = await apiRequest('/setup_intents', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/setup_intents', params, cfg);
    output(items);
  }
}

async function getSetup(args, cfg) {
  const id = setupIntentId(args);
  if (!id) throw new Error('Setup intent ID required. Usage: get-setup <id>');
  const data = await apiRequest(`/setup_intents/${id}`, {}, cfg);
  output(data);
}

async function confirmSetup(args, cfg) {
  const id = setupIntentId(args);
  if (!id) throw new Error('Setup intent ID required. Usage: confirm-setup <id>');
  const data = await apiRequest(`/setup_intents/${id}/confirm`, { method: 'POST', body: {} }, cfg);
  output(data);
}

async function cancelSetup(args, cfg) {
  const id = setupIntentId(args);
  if (!id) throw new Error('Setup intent ID required. Usage: cancel-setup <id>');
  const data = await apiRequest(`/setup_intents/${id}/cancel`, { method: 'POST', body: {} }, cfg);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listPaymentMethods(args, cfg);
        break;
      case 'get':
        await getPaymentMethod(args, cfg);
        break;
      case 'attach':
        await attach(args, cfg);
        break;
      case 'detach':
        await detach(args, cfg);
        break;
      case 'create-setup':
        await createSetup(args, cfg);
        break;
      case 'list-setups':
        await listSetups(args, cfg);
        break;
      case 'get-setup':
        await getSetup(args, cfg);
        break;
      case 'confirm-setup':
        await confirmSetup(args, cfg);
        break;
      case 'cancel-setup':
        await cancelSetup(args, cfg);
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
