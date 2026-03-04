import { loadConfig, apiRequest, paginate, parseArgs, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Products Script - Manage Stripe products and prices

Usage: node scripts/products.js <command> [options]

Commands:
  list                        List all active products
  get <id>                    Get product by ID
  create                      Create a new product
  update <id>                 Update a product
  archive <id>                Archive (deactivate) a product

  prices                      List all prices
  prices <product-id>         List prices for a product
  price <price-id>            Get a price by ID
  create-price                Create a price for a product
  archive-price <price-id>    Archive a price

  help                        Show this help

Options:
  --name <name>               Product name
  --description <text>        Product description
  --product <id>              Product ID (for create-price)
  --amount <cents>            Price amount in cents (e.g. 2000 = $20.00)
  --currency <code>           Currency code (default: usd)
  --interval <interval>       Billing interval: month, year (for recurring)
  --lookup-key <key>          Lookup key for the price
  --inactive                  Include inactive products/prices in list

Examples:
  node scripts/products.js list
  node scripts/products.js create --name "Pro Plan" --description "For professionals"
  node scripts/products.js prices
  node scripts/products.js create-price --product prod_abc --amount 2000 --interval month
  node scripts/products.js create-price --product prod_abc --amount 0 --lookup-key free
`);
}

async function listProducts(flags, cfg) {
  const params = { active: flags.inactive ? undefined : 'true' };
  const products = await paginate('/products', params, cfg);
  const simplified = products.map(p => ({
    id: p.id,
    name: p.name,
    active: p.active,
    description: p.description,
    created: new Date(p.created * 1000).toISOString(),
  }));
  output(simplified);
}

async function getProduct(id, cfg) {
  if (!id) throw new Error('Product ID required. Usage: get <id>');
  const data = await apiRequest(`/products/${id}`, {}, cfg);
  output(data);
}

async function createProduct(flags, cfg) {
  if (!flags.name) throw new Error('--name required');
  const body = { name: flags.name };
  if (flags.description) body.description = flags.description;

  const data = await apiRequest('/products', { method: 'POST', body }, cfg);
  console.log(`✓ Product created: ${data.id} (${data.name})`);
  output(data);
}

async function updateProduct(id, flags, cfg) {
  if (!id) throw new Error('Product ID required. Usage: update <id>');
  const body = {};
  if (flags.name) body.name = flags.name;
  if (flags.description) body.description = flags.description;

  const data = await apiRequest(`/products/${id}`, { method: 'POST', body }, cfg);
  console.log(`✓ Product updated: ${data.id}`);
  output(data);
}

async function archiveProduct(id, cfg) {
  if (!id) throw new Error('Product ID required. Usage: archive <id>');
  const data = await apiRequest(`/products/${id}`, { method: 'POST', body: { active: 'false' } }, cfg);
  console.log(`✓ Product archived: ${id}`);
  output(data);
}

async function listPrices(productId, flags, cfg) {
  const params = { active: flags.inactive ? undefined : 'true' };
  if (productId) params.product = productId;
  const prices = await paginate('/prices', params, cfg);
  const simplified = prices.map(p => ({
    id: p.id,
    product: p.product,
    nickname: p.nickname,
    lookup_key: p.lookup_key,
    active: p.active,
    unit_amount: p.unit_amount,
    currency: p.currency,
    recurring: p.recurring ? `${p.recurring.interval}ly` : 'one-time',
  }));
  output(simplified);
}

async function getPrice(id, cfg) {
  if (!id) throw new Error('Price ID required. Usage: price <id>');
  const data = await apiRequest(`/prices/${id}`, {}, cfg);
  output(data);
}

async function createPrice(flags, cfg) {
  if (!flags.product) throw new Error('--product required');
  if (flags.amount === undefined) throw new Error('--amount required (in cents, e.g. 2000 for $20)');

  const body = {
    product: flags.product,
    unit_amount: flags.amount,
    currency: flags.currency || 'usd',
  };

  if (flags.interval) {
    body['recurring[interval]'] = flags.interval;
  }

  if (flags['lookup-key']) {
    body.lookup_key = flags['lookup-key'];
    body.transfer_lookup_key = 'true';
  }

  if (flags.nickname) body.nickname = flags.nickname;

  const data = await apiRequest('/prices', { method: 'POST', body }, cfg);
  const amount = data.unit_amount ? `$${(data.unit_amount / 100).toFixed(2)}` : '$0.00';
  const recur = data.recurring ? `/${data.recurring.interval}` : '';
  console.log(`✓ Price created: ${data.id} (${amount}${recur})`);
  output(data);
}

async function archivePrice(id, cfg) {
  if (!id) throw new Error('Price ID required. Usage: archive-price <id>');
  const data = await apiRequest(`/prices/${id}`, { method: 'POST', body: { active: 'false' } }, cfg);
  console.log(`✓ Price archived: ${id}`);
  output(data);
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help') { showHelp(); return; }

  const cfg = loadConfig();

  try {
    switch (command) {
      case 'list':          await listProducts(args, cfg); break;
      case 'get':           await getProduct(args._[1], cfg); break;
      case 'create':        await createProduct(args, cfg); break;
      case 'update':        await updateProduct(args._[1], args, cfg); break;
      case 'archive':       await archiveProduct(args._[1], cfg); break;
      case 'prices':        await listPrices(args._[1], args, cfg); break;
      case 'price':         await getPrice(args._[1], cfg); break;
      case 'create-price':  await createPrice(args, cfg); break;
      case 'archive-price': await archivePrice(args._[1], cfg); break;
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
