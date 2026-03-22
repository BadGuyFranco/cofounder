import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Checkout Script - Checkout Sessions and Payment Links

Usage: node scripts/checkout.js <command> [options]

Commands:
  create-session              Create a Checkout Session
  list-sessions               List Checkout Sessions
  get-session <id>            Get a Checkout Session
  expire-session <id>         Expire a Checkout Session
  create-link                 Create a Payment Link
  list-links                  List Payment Links
  get-link <id>               Get a Payment Link
  update-link <id>            Update a Payment Link (active)
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --session-mode <payment|subscription|setup>   Checkout mode (create-session)
  --success-url <url>         Success redirect URL (create-session)
  --cancel-url <url>          Cancel redirect URL (create-session)
  --price <id>                Stripe Price ID (create-session, create-link)
  --quantity <n>              Line item quantity (default: 1)
  --customer <id>             Customer ID (create-session, list-sessions)
  --customer-email <email>    Customer email (create-session)
  --payment-intent <id>       Filter sessions by PaymentIntent (list-sessions)
  --subscription <id>         Filter sessions by Subscription (list-sessions)
  --limit <n>                 Max results for list commands
  --active <true|false>       Filter or set active state (list-links, update-link)

Examples:
  node scripts/checkout.js create-session --session-mode payment --price price_xxx \\
    --success-url https://example.com/success --cancel-url https://example.com/cancel
  node scripts/checkout.js list-sessions --customer cus_xxx
  node scripts/checkout.js get-session cs_xxx
  node scripts/checkout.js expire-session cs_xxx
  node scripts/checkout.js create-link --price price_xxx --quantity 2
  node scripts/checkout.js list-links --active true
  node scripts/checkout.js update-link pl_xxx --active false
`);
}

function lineItemsFromArgs(args) {
  if (!args.price) throw new Error('--price required');
  const qty = args.quantity != null ? parseInt(String(args.quantity), 10) : 1;
  if (Number.isNaN(qty) || qty < 1) throw new Error('--quantity must be a positive integer');
  return [{ price: args.price, quantity: qty }];
}

async function createSession(args, cfg) {
  const mode = args['session-mode'] || 'payment';
  if (!['payment', 'subscription', 'setup'].includes(mode)) {
    throw new Error('--session-mode must be payment, subscription, or setup');
  }
  if (!args['success-url'] || !args['cancel-url']) {
    throw new Error('--success-url and --cancel-url required');
  }
  const body = {
    mode,
    success_url: args['success-url'],
    cancel_url: args['cancel-url'],
    line_items: lineItemsFromArgs(args),
  };
  if (args.customer) body.customer = args.customer;
  if (args['customer-email']) body.customer_email = args['customer-email'];

  const data = await apiRequest('/checkout/sessions', { method: 'POST', body }, cfg);
  console.log(`Checkout session created: ${data.id}`);
  output(data);
}

async function listSessions(args, cfg) {
  const params = {};
  if (args.customer) params.customer = args.customer;
  if (args['payment-intent']) params.payment_intent = args['payment-intent'];
  if (args.subscription) params.subscription = args.subscription;
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/checkout/sessions', { params }, cfg);
    output(data.data);
  } else {
    const sessions = await paginate('/checkout/sessions', params, cfg);
    output(sessions);
  }
}

async function getSession(id, cfg) {
  if (!id) throw new Error('Session ID required. Usage: get-session <id>');
  const data = await apiRequest(`/checkout/sessions/${id}`, {}, cfg);
  output(data);
}

async function expireSession(id, cfg) {
  if (!id) throw new Error('Session ID required. Usage: expire-session <id>');
  const data = await apiRequest(`/checkout/sessions/${id}/expire`, { method: 'POST', body: {} }, cfg);
  console.log(`Checkout session expired: ${id}`);
  output(data);
}

async function createLink(args, cfg) {
  const body = { line_items: lineItemsFromArgs(args) };
  const data = await apiRequest('/payment_links', { method: 'POST', body }, cfg);
  console.log(`Payment link created: ${data.id}`);
  output(data);
}

async function listLinks(args, cfg) {
  const params = {};
  if (args.active !== undefined) {
    if (args.active === true) params.active = 'true';
    else if (args.active === false) params.active = 'false';
    else {
      const v = String(args.active).toLowerCase();
      if (v === 'true' || v === 'false') params.active = v;
    }
  }
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/payment_links', { params }, cfg);
    output(data.data);
  } else {
    const links = await paginate('/payment_links', params, cfg);
    output(links);
  }
}

async function getLink(id, cfg) {
  if (!id) throw new Error('Payment Link ID required. Usage: get-link <id>');
  const data = await apiRequest(`/payment_links/${id}`, {}, cfg);
  output(data);
}

async function updateLink(id, args, cfg) {
  if (!id) throw new Error('Payment Link ID required. Usage: update-link <id>');
  if (args.active === undefined) {
    throw new Error('--active true or --active false required');
  }
  let activeVal;
  if (args.active === true) activeVal = 'true';
  else if (args.active === false) activeVal = 'false';
  else {
    const v = String(args.active).toLowerCase();
    if (v !== 'true' && v !== 'false') throw new Error('--active must be true or false');
    activeVal = v;
  }
  const body = { active: activeVal };
  const data = await apiRequest(`/payment_links/${id}`, { method: 'POST', body }, cfg);
  console.log(`Payment link updated: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'create-session':
        await createSession(args, cfg);
        break;
      case 'list-sessions':
        await listSessions(args, cfg);
        break;
      case 'get-session':
        await getSession(args._[1], cfg);
        break;
      case 'expire-session':
        await expireSession(args._[1], cfg);
        break;
      case 'create-link':
        await createLink(args, cfg);
        break;
      case 'list-links':
        await listLinks(args, cfg);
        break;
      case 'get-link':
        await getLink(args._[1], cfg);
        break;
      case 'update-link':
        await updateLink(args._[1], args, cfg);
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
