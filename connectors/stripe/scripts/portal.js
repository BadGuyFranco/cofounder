import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function parseBoolFlag(val) {
  if (val === true) return true;
  if (val === false) return false;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

function defaultPortalFeatures() {
  return {
    customer_update: { enabled: true, allowed_updates: ['email', 'address', 'phone'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true },
    subscription_pause: { enabled: false },
    subscription_update: { enabled: false },
  };
}

function showHelp() {
  console.log(`
Customer Portal - Billing portal sessions and configurations

Usage: node scripts/portal.js <command> [options]

Commands:
  create-session              Create a billing portal session
  create-config               Create a portal configuration
  list-configs                List portal configurations
  get-config <id>             Get a configuration by ID
  update-config <id>          Update a configuration
  accounts                    List configured Stripe accounts
  help                        Show this help

Options:
  --account <name>            Use specific Stripe account
  --mode <test|live>          Use test or live keys (default: test)
  --customer <id>             Customer ID (create-session)
  --return-url <url>          Return URL after portal (create-session)
  --headline <text>           Business profile headline (create-config, update-config)
  --privacy-policy-url <url>  Privacy policy URL (create-config, update-config)
  --terms-of-service-url <url> Terms of service URL (create-config, update-config)
  --active <true|false>       Filter list-configs or set on update-config
  --limit <n>                 Max results for list-configs

Examples:
  node scripts/portal.js create-session --customer cus_xxx --return-url https://example.com/done
  node scripts/portal.js create-config --headline "Acme" \\
    --privacy-policy-url https://example.com/privacy --terms-of-service-url https://example.com/terms
  node scripts/portal.js list-configs --limit 10
`);
}

async function createSession(args, cfg) {
  if (!args.customer) throw new Error('--customer required');
  if (!args['return-url']) throw new Error('--return-url required');
  const body = {
    customer: args.customer,
    return_url: args['return-url'],
  };
  const data = await apiRequest('/billing_portal/sessions', { method: 'POST', body }, cfg);
  console.log('Billing portal session created');
  output(data);
}

async function createConfig(args, cfg) {
  if (!args.headline) throw new Error('--headline required');
  if (!args['privacy-policy-url']) throw new Error('--privacy-policy-url required');
  if (!args['terms-of-service-url']) throw new Error('--terms-of-service-url required');
  const body = {
    business_profile: {
      headline: args.headline,
      privacy_policy_url: args['privacy-policy-url'],
      terms_of_service_url: args['terms-of-service-url'],
    },
    features: defaultPortalFeatures(),
  };
  const data = await apiRequest('/billing_portal/configurations', { method: 'POST', body }, cfg);
  console.log(`Portal configuration created: ${data.id}`);
  output(data);
}

async function listConfigs(args, cfg) {
  const params = {};
  const active = parseBoolFlag(args.active);
  if (active !== undefined) params.active = active ? 'true' : 'false';
  if (args.limit) params.limit = args.limit;

  if (args.limit) {
    const data = await apiRequest('/billing_portal/configurations', { params }, cfg);
    output(data.data || []);
  } else {
    const rows = await paginate('/billing_portal/configurations', params, cfg);
    output(rows);
  }
}

async function getConfig(id, cfg) {
  if (!id) throw new Error('Configuration ID required. Usage: get-config <id>');
  const data = await apiRequest(`/billing_portal/configurations/${id}`, {}, cfg);
  output(data);
}

async function updateConfig(id, args, cfg) {
  if (!id) throw new Error('Configuration ID required. Usage: update-config <id>');
  const body = {};
  if (args.headline || args['privacy-policy-url'] || args['terms-of-service-url']) {
    body.business_profile = {};
    if (args.headline) body.business_profile.headline = args.headline;
    if (args['privacy-policy-url']) body.business_profile.privacy_policy_url = args['privacy-policy-url'];
    if (args['terms-of-service-url']) body.business_profile.terms_of_service_url = args['terms-of-service-url'];
  }
  const active = parseBoolFlag(args.active);
  if (active !== undefined) body.active = active ? 'true' : 'false';
  if (Object.keys(body).length === 0) {
    throw new Error('Provide --headline, --privacy-policy-url, --terms-of-service-url, and/or --active');
  }
  const data = await apiRequest(`/billing_portal/configurations/${id}`, { method: 'POST', body }, cfg);
  console.log(`Portal configuration updated: ${id}`);
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'create-session': await createSession(args, cfg); break;
      case 'create-config': await createConfig(args, cfg); break;
      case 'list-configs': await listConfigs(args, cfg); break;
      case 'get-config': await getConfig(args._[1], cfg); break;
      case 'update-config': await updateConfig(args._[1], args, cfg); break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) { outputError(error); }
}
main();
