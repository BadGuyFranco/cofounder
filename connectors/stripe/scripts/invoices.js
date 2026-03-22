import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Invoices Script - Manage Stripe invoices and invoice items

Usage: node scripts/invoices.js <command> [args] [options]

Commands:
  list                        List invoices
  get <id>                    Get invoice by ID
  create                      Create a draft invoice
  update <id>                 Update a draft invoice
  finalize <id>               Finalize a draft invoice
  pay <id>                    Pay an invoice
  void <id>                   Void an invoice
  delete <id>                 Delete a draft invoice
  send <id>                   Email invoice to customer
  upcoming                    Retrieve upcoming invoice preview
  add-item                    Create an invoice line item
  list-items                  List invoice items
  get-item <id>               Get invoice item by ID
  delete-item <id>            Delete an invoice item
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Customer ID (list, create, upcoming, invoice items)
  --status <status>           Filter invoices by status
  --subscription <id>         Subscription ID (list, upcoming)
  --description <text>        Description (invoice create/update, invoice item)
  --amount <cents>            Amount in smallest currency unit (add-item)
  --currency <code>           Currency code (add-item, default from account)
  --invoice <id>              Invoice ID (add-item, list-items)
  --days-until-due <n>        Days until due (send_invoice collection)
  --collection-method <m>     charge_automatically or send_invoice
  --auto-advance [true|false] Auto-finalize draft when ready
  --limit <n>                 Max results for list or list-items

Examples:
  node scripts/invoices.js list --customer cus_xxx
  node scripts/invoices.js get in_xxx
  node scripts/invoices.js create --customer cus_xxx --collection-method send_invoice
  node scripts/invoices.js upcoming --customer cus_xxx
  node scripts/invoices.js add-item --customer cus_xxx --amount 1000 --currency usd
  node scripts/invoices.js add-item --invoice in_xxx --amount 500 --currency usd
`);
}

function invoiceBodyFromArgs(args) {
  const body = {};
  if (args.customer) body.customer = args.customer;
  if (args.description) body.description = args.description;
  if (args['collection-method']) body.collection_method = args['collection-method'];
  if (args['days-until-due'] !== undefined) body.days_until_due = args['days-until-due'];
  if (args['auto-advance'] !== undefined) {
    const v = args['auto-advance'];
    body.auto_advance = v === true || String(v).toLowerCase() === 'true' ? 'true' : 'false';
  }
  return body;
}

async function listInvoices(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.status) params.status = args.status;
  if (args.subscription) params.subscription = args.subscription;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/invoices', { params }, cfg);
    output(data.data);
  } else {
    const rows = await paginate('/invoices', params, cfg);
    output(rows);
  }
}

async function getInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: get <id>');
  const data = await apiRequest(`/invoices/${id}`, {}, cfg);
  output(data);
}

async function createInvoice(args, cfg) {
  const body = invoiceBodyFromArgs(args);
  const data = await apiRequest('/invoices', { method: 'POST', body }, cfg);
  console.log(`Invoice created: ${data.id}`);
  output(data);
}

async function updateInvoice(id, args, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: update <id>');
  const body = invoiceBodyFromArgs(args);
  const data = await apiRequest(`/invoices/${id}`, { method: 'POST', body }, cfg);
  console.log(`Invoice updated: ${data.id}`);
  output(data);
}

async function finalizeInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: finalize <id>');
  const data = await apiRequest(`/invoices/${id}/finalize`, { method: 'POST' }, cfg);
  console.log(`Invoice finalized: ${data.id}`);
  output(data);
}

async function payInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: pay <id>');
  const data = await apiRequest(`/invoices/${id}/pay`, { method: 'POST' }, cfg);
  console.log(`Invoice paid: ${data.id}`);
  output(data);
}

async function voidInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: void <id>');
  const data = await apiRequest(`/invoices/${id}/void`, { method: 'POST' }, cfg);
  console.log(`Invoice voided: ${data.id}`);
  output(data);
}

async function deleteInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: delete <id>');
  const data = await apiRequest(`/invoices/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Invoice deleted: ${id}`);
  output(data);
}

async function sendInvoice(id, cfg) {
  if (!id) throw new Error('Invoice ID required. Usage: send <id>');
  const data = await apiRequest(`/invoices/${id}/send`, { method: 'POST' }, cfg);
  console.log(`Invoice sent: ${data.id}`);
  output(data);
}

async function upcoming(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args.subscription) params.subscription = args.subscription;
  if (!params.customer && !params.subscription) {
    throw new Error('--customer and/or --subscription required for upcoming');
  }
  const data = await apiRequest('/invoices/upcoming', { params }, cfg);
  output(data);
}

async function addItem(args, cfg) {
  const body = {};
  if (args.customer) body.customer = args.customer;
  if (args.invoice) body.invoice = args.invoice;
  if (!args.customer && !args.invoice) throw new Error('--customer or --invoice required');
  if (args.amount === undefined) throw new Error('--amount required');
  body.amount = String(args.amount);
  if (args.currency) body.currency = args.currency;
  if (args.description) body.description = args.description;
  const data = await apiRequest('/invoiceitems', { method: 'POST', body }, cfg);
  console.log(`Invoice item created: ${data.id}`);
  output(data);
}

async function listItems(args, cfg) {
  const params = {};
  if (args.invoice) params.invoice = args.invoice;
  if (args.customer) params.customer = args.customer;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/invoiceitems', { params }, cfg);
    output(data.data);
  } else {
    const rows = await paginate('/invoiceitems', params, cfg);
    output(rows);
  }
}

async function getItem(id, cfg) {
  if (!id) throw new Error('Invoice item ID required. Usage: get-item <id>');
  const data = await apiRequest(`/invoiceitems/${id}`, {}, cfg);
  output(data);
}

async function deleteItem(id, cfg) {
  if (!id) throw new Error('Invoice item ID required. Usage: delete-item <id>');
  const data = await apiRequest(`/invoiceitems/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Invoice item deleted: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':
        await listInvoices(args, cfg);
        break;
      case 'get':
        await getInvoice(args._[1], cfg);
        break;
      case 'create':
        await createInvoice(args, cfg);
        break;
      case 'update':
        await updateInvoice(args._[1], args, cfg);
        break;
      case 'finalize':
        await finalizeInvoice(args._[1], cfg);
        break;
      case 'pay':
        await payInvoice(args._[1], cfg);
        break;
      case 'void':
        await voidInvoice(args._[1], cfg);
        break;
      case 'delete':
        await deleteInvoice(args._[1], cfg);
        break;
      case 'send':
        await sendInvoice(args._[1], cfg);
        break;
      case 'upcoming':
        await upcoming(args, cfg);
        break;
      case 'add-item':
        await addItem(args, cfg);
        break;
      case 'list-items':
        await listItems(args, cfg);
        break;
      case 'get-item':
        await getItem(args._[1], cfg);
        break;
      case 'delete-item':
        await deleteItem(args._[1], cfg);
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
