import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Coupons Script - Manage Stripe coupons and promotion codes

Usage: node scripts/coupons.js <command> [options]

Commands:
  list                        List coupons
  get <id>                    Get coupon by ID
  create                      Create a coupon
  update <id>                 Update a coupon (name, metadata)
  delete <id>                 Delete a coupon

  create-promo                Create a promotion code
  list-promos                 List promotion codes
  get-promo <id>              Get promotion code by ID
  update-promo <id>           Update a promotion code (active, metadata)

  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --limit <n>                 Max results for list / list-promos

  Coupon create / body:
  --percent-off <n>           Percent discount (mutually exclusive with amount-off)
  --amount-off <cents>        Fixed amount off in smallest currency unit
  --currency <code>           Required with amount-off (default: usd)
  --duration <once|repeating|forever>
  --duration-in-months <n>    Required when duration is repeating
  --name <string>             Coupon name
  --max-redemptions <n>       Max times coupon can be redeemed

  Promotion code:
  --coupon <id>               Coupon ID (create-promo)
  --code <string>             Customer-facing code (create-promo)
  --active <true|false>       Promotion code active state
  --customer <id>             Restrict promo to customer (create-promo)
  --expires-at <unix>         Expiration Unix timestamp (create-promo)
  --metadata <json>           JSON object (update, update-promo)

Examples:
  node scripts/coupons.js list
  node scripts/coupons.js create --percent-off 20 --duration once --name SUMMER20
  node scripts/coupons.js create --amount-off 500 --currency usd --duration forever
  node scripts/coupons.js create-promo --coupon coupon_xxx --code LAUNCH25
  node scripts/coupons.js list-promos --coupon coupon_xxx
`);
}

function parseExpiresAt(raw) {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`Invalid --expires-at: ${raw}`);
  return Math.floor(ms / 1000);
}

function parseBoolFlag(val) {
  if (val === true) return true;
  if (val === false) return false;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

function parseMetadataJson(raw) {
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON for --metadata: ${e.message}`);
  }
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    throw new Error('--metadata must be a JSON object');
  }
  return meta;
}

async function listCoupons(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/coupons', { params }, cfg);
    output(data.data || []);
  } else {
    const coupons = await paginate('/coupons', params, cfg);
    output(coupons);
  }
}

async function getCoupon(id, cfg) {
  if (!id) throw new Error('Coupon ID required. Usage: get <id>');
  const data = await apiRequest(`/coupons/${id}`, {}, cfg);
  output(data);
}

async function createCoupon(args, cfg) {
  const hasPercent = args['percent-off'] !== undefined && args['percent-off'] !== '';
  const hasAmount = args['amount-off'] !== undefined && args['amount-off'] !== '';

  if (hasPercent === hasAmount) {
    throw new Error('Provide exactly one of --percent-off or --amount-off');
  }
  if (!args.duration) throw new Error('--duration required (once, repeating, or forever)');

  const body = { duration: args.duration };

  if (hasPercent) {
    body.percent_off = String(args['percent-off']);
  } else {
    body.amount_off = String(args['amount-off']);
    body.currency = (args.currency || 'usd').toLowerCase();
  }

  if (args.duration === 'repeating') {
    if (!args['duration-in-months']) throw new Error('--duration-in-months required when duration is repeating');
    body.duration_in_months = String(args['duration-in-months']);
  }

  if (args.name) body.name = args.name;
  if (args['max-redemptions'] !== undefined) body.max_redemptions = String(args['max-redemptions']);

  const data = await apiRequest('/coupons', { method: 'POST', body }, cfg);
  console.log(`Coupon created: ${data.id}`);
  output(data);
}

async function updateCoupon(id, args, cfg) {
  if (!id) throw new Error('Coupon ID required. Usage: update <id>');
  const body = {};
  if (args.name) body.name = args.name;
  if (args.metadata) body.metadata = parseMetadataJson(args.metadata);
  if (Object.keys(body).length === 0) throw new Error('Nothing to update. Use --name and/or --metadata');
  const data = await apiRequest(`/coupons/${id}`, { method: 'POST', body }, cfg);
  console.log(`Coupon updated: ${data.id}`);
  output(data);
}

async function deleteCoupon(id, cfg) {
  if (!id) throw new Error('Coupon ID required. Usage: delete <id>');
  const data = await apiRequest(`/coupons/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Coupon deleted: ${id}`);
  output(data);
}

async function createPromo(args, cfg) {
  if (!args.coupon) throw new Error('--coupon required');
  const body = { coupon: args.coupon };
  if (args.code) body.code = args.code;
  const active = parseBoolFlag(args.active);
  if (active !== undefined) body.active = active ? 'true' : 'false';
  if (args.customer) body.customer = args.customer;
  if (args['max-redemptions'] !== undefined) body.max_redemptions = String(args['max-redemptions']);
  if (args['expires-at'] !== undefined) {
    body.expires_at = String(parseExpiresAt(args['expires-at']));
  }

  const data = await apiRequest('/promotion_codes', { method: 'POST', body }, cfg);
  console.log(`Promotion code created: ${data.id} (${data.code})`);
  output(data);
}

async function listPromos(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.coupon) params.coupon = args.coupon;
  if (args.code) params.code = args.code;
  const active = parseBoolFlag(args.active);
  if (active !== undefined) params.active = active ? 'true' : 'false';

  if (args.limit) {
    const data = await apiRequest('/promotion_codes', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/promotion_codes', params, cfg);
    output(rows);
  }
}

async function getPromo(id, cfg) {
  if (!id) throw new Error('Promotion code ID required. Usage: get-promo <id>');
  const data = await apiRequest(`/promotion_codes/${id}`, {}, cfg);
  output(data);
}

async function updatePromo(id, args, cfg) {
  if (!id) throw new Error('Promotion code ID required. Usage: update-promo <id>');
  const body = {};
  const active = parseBoolFlag(args.active);
  if (active !== undefined) body.active = active ? 'true' : 'false';
  if (args.metadata) body.metadata = parseMetadataJson(args.metadata);
  if (Object.keys(body).length === 0) {
    throw new Error('Nothing to update. Use --active and/or --metadata');
  }
  const data = await apiRequest(`/promotion_codes/${id}`, { method: 'POST', body }, cfg);
  console.log(`Promotion code updated: ${data.id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list':         await listCoupons(args, cfg); break;
      case 'get':          await getCoupon(args._[1], cfg); break;
      case 'create':       await createCoupon(args, cfg); break;
      case 'update':       await updateCoupon(args._[1], args, cfg); break;
      case 'delete':       await deleteCoupon(args._[1], cfg); break;
      case 'create-promo': await createPromo(args, cfg); break;
      case 'list-promos':  await listPromos(args, cfg); break;
      case 'get-promo':    await getPromo(args._[1], cfg); break;
      case 'update-promo': await updatePromo(args._[1], args, cfg); break;
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
