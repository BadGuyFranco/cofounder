import { initScript, apiRequest, paginate, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Stripe Terminal Script - Readers, locations, configurations, connection tokens

Usage: node scripts/terminal.js <command> [options]

Commands:
  list-readers                List readers
  get-reader <id>             Get reader
  create-reader               Create reader
  update-reader <id>        Update reader (label)
  delete-reader <id>        Delete reader
  list-locations              List locations
  get-location <id>         Get location
  create-location             Create location
  update-location <id>      Update location
  delete-location <id>      Delete location
  list-configs                List configurations
  get-config <id>           Get configuration
  create-config               Create configuration
  update-config <id>        Update configuration
  delete-config <id>        Delete configuration
  create-token                Create connection token
  accounts                    List configured Stripe credential profiles
  help                        Show this help

Options:
  --account <name>            Credential profile
  --mode <test|live>          Test or live keys (default: test)
  --registration-code <code>
  --label <text>
  --location <id>             Terminal location id (reader, token)
  --display-name <name>       Location display name
  --line1 <line>              Address line1
  --city <city>
  --state <state>
  --country <code>
  --postal-code <code>
  --status <status>           Filter readers
  --limit <n>                 Max list results (default: paginate all)
`);
}

function addressFromArgs(args) {
  const line1 = args.line1;
  const city = args.city;
  const state = args.state;
  const country = args.country;
  const postal = args['postal-code'];
  if (!line1 && !city && !state && !country && !postal) return null;
  const address = {};
  if (line1) address.line1 = line1;
  if (city) address.city = city;
  if (state) address.state = state;
  if (country) address.country = country;
  if (postal) address.postal_code = postal;
  return address;
}

async function listReaders(args, cfg) {
  const params = {};
  if (args.location) params.location = args.location;
  if (args.status) params.status = args.status;
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/terminal/readers', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/terminal/readers', params, cfg);
    output(items);
  }
}

async function getReader(id, cfg) {
  if (!id) throw new Error('Reader id required. Usage: get-reader <id>');
  const data = await apiRequest(`/terminal/readers/${id}`, {}, cfg);
  output(data);
}

async function createReader(args, cfg) {
  if (!args['registration-code']) throw new Error('--registration-code required');
  const body = { registration_code: args['registration-code'] };
  if (args.label) body.label = args.label;
  if (args.location) body.location = args.location;
  const data = await apiRequest('/terminal/readers', { method: 'POST', body }, cfg);
  console.log(`Reader created: ${data.id}`);
  output(data);
}

async function updateReader(id, args, cfg) {
  if (!id) throw new Error('Reader id required. Usage: update-reader <id>');
  const body = {};
  if (args.label) body.label = args.label;
  const data = await apiRequest(`/terminal/readers/${id}`, { method: 'POST', body }, cfg);
  console.log(`Reader updated: ${data.id}`);
  output(data);
}

async function deleteReader(id, cfg) {
  if (!id) throw new Error('Reader id required. Usage: delete-reader <id>');
  const data = await apiRequest(`/terminal/readers/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Reader deleted: ${id}`);
  output(data);
}

async function listLocations(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/terminal/locations', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/terminal/locations', params, cfg);
    output(items);
  }
}

async function getLocation(id, cfg) {
  if (!id) throw new Error('Location id required. Usage: get-location <id>');
  const data = await apiRequest(`/terminal/locations/${id}`, {}, cfg);
  output(data);
}

async function createLocation(args, cfg) {
  if (!args['display-name']) throw new Error('--display-name required');
  const body = { display_name: args['display-name'] };
  const address = addressFromArgs(args);
  if (address) body.address = address;
  const data = await apiRequest('/terminal/locations', { method: 'POST', body }, cfg);
  console.log(`Location created: ${data.id}`);
  output(data);
}

async function updateLocation(id, args, cfg) {
  if (!id) throw new Error('Location id required. Usage: update-location <id>');
  const body = {};
  if (args['display-name']) body.display_name = args['display-name'];
  const address = addressFromArgs(args);
  if (address) body.address = address;
  const data = await apiRequest(`/terminal/locations/${id}`, { method: 'POST', body }, cfg);
  console.log(`Location updated: ${data.id}`);
  output(data);
}

async function deleteLocation(id, cfg) {
  if (!id) throw new Error('Location id required. Usage: delete-location <id>');
  const data = await apiRequest(`/terminal/locations/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Location deleted: ${id}`);
  output(data);
}

async function listConfigs(args, cfg) {
  const params = {};
  if (args.limit) params.limit = args.limit;
  if (args.limit) {
    const data = await apiRequest('/terminal/configurations', { params }, cfg);
    output(data.data);
  } else {
    const items = await paginate('/terminal/configurations', params, cfg);
    output(items);
  }
}

async function getConfig(id, cfg) {
  if (!id) throw new Error('Configuration id required. Usage: get-config <id>');
  const data = await apiRequest(`/terminal/configurations/${id}`, {}, cfg);
  output(data);
}

async function createConfig(config) {
  const data = await apiRequest('/terminal/configurations', { method: 'POST', body: {} }, config);
  console.log(`Configuration created: ${data.id}`);
  output(data);
}

async function updateConfig(id, cfg) {
  if (!id) throw new Error('Configuration id required. Usage: update-config <id>');
  const data = await apiRequest(`/terminal/configurations/${id}`, { method: 'POST', body: {} }, cfg);
  console.log(`Configuration updated: ${data.id}`);
  output(data);
}

async function deleteConfig(id, cfg) {
  if (!id) throw new Error('Configuration id required. Usage: delete-config <id>');
  const data = await apiRequest(`/terminal/configurations/${id}`, { method: 'DELETE' }, cfg);
  console.log(`Configuration deleted: ${id}`);
  output(data);
}

async function createToken(args, cfg) {
  const body = {};
  if (args.location) body.location = args.location;
  const data = await apiRequest('/terminal/connection_tokens', { method: 'POST', body }, cfg);
  console.log('Connection token created');
  output(data);
}

async function main() {
  const init = initScript(showHelp);
  if (!init) return;
  const { config: cfg, args, command } = init;
  try {
    switch (command) {
      case 'list-readers':
        await listReaders(args, cfg);
        break;
      case 'get-reader':
        await getReader(args._[1], cfg);
        break;
      case 'create-reader':
        await createReader(args, cfg);
        break;
      case 'update-reader':
        await updateReader(args._[1], args, cfg);
        break;
      case 'delete-reader':
        await deleteReader(args._[1], cfg);
        break;
      case 'list-locations':
        await listLocations(args, cfg);
        break;
      case 'get-location':
        await getLocation(args._[1], cfg);
        break;
      case 'create-location':
        await createLocation(args, cfg);
        break;
      case 'update-location':
        await updateLocation(args._[1], args, cfg);
        break;
      case 'delete-location':
        await deleteLocation(args._[1], cfg);
        break;
      case 'list-configs':
        await listConfigs(args, cfg);
        break;
      case 'get-config':
        await getConfig(args._[1], cfg);
        break;
      case 'create-config':
        await createConfig(cfg);
        break;
      case 'update-config':
        await updateConfig(args._[1], cfg);
        break;
      case 'delete-config':
        await deleteConfig(args._[1], cfg);
        break;
      case 'create-token':
        await createToken(args, cfg);
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
