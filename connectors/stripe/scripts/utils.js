// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { join, dirname } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));

const MEMORY_DIR = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'stripe');
const LOCAL_DIR = join(__dirname, '..');
const STRIPE_API = 'https://api.stripe.com/v1';

function findEnvPath(account) {
  if (account) {
    const memAcct = join(MEMORY_DIR, account, '.env');
    if (existsSync(memAcct)) return memAcct;
    const localAcct = join(LOCAL_DIR, account, '.env');
    if (existsSync(localAcct)) return localAcct;
    console.error(`Error: No .env found for account "${account}".`);
    const available = listAccounts();
    if (available.length) console.error(`Available accounts: ${available.join(', ')}`);
    process.exit(1);
  }

  const memDefault = join(MEMORY_DIR, '.env');
  if (existsSync(memDefault)) return memDefault;
  const localDefault = join(LOCAL_DIR, '.env');
  if (existsSync(localDefault)) return localDefault;

  const accounts = listAccounts();
  if (accounts.length === 1) {
    return findEnvPath(accounts[0]);
  }
  if (accounts.length > 1) {
    console.error('Error: Multiple accounts found. Use --account <name> to select one.');
    console.error(`Available accounts: ${accounts.join(', ')}`);
    process.exit(1);
  }

  console.error('Error: No .env file found.');
  console.error('Create /memory/connectors/stripe/.env with your credentials.');
  console.error('See SETUP.md for instructions.');
  process.exit(1);
}

export function listAccounts() {
  const accounts = [];
  for (const dir of [MEMORY_DIR, LOCAL_DIR]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'scripts') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory() && existsSync(join(full, '.env'))) {
        if (!accounts.includes(entry)) accounts.push(entry);
      }
    }
  }
  return accounts;
}

export function loadConfig(account, mode) {
  const envPath = findEnvPath(account);
  dotenv.config({ path: envPath, override: true });

  const resolvedMode = mode || process.env.STRIPE_DEFAULT_MODE || 'test';
  const isLive = resolvedMode === 'live';

  const secretKey = isLive
    ? (process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY);

  const publishableKey = isLive
    ? (process.env.STRIPE_LIVE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY)
    : (process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY);

  if (!secretKey) {
    const prefix = isLive ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
    console.error(`Error: No secret key found for ${resolvedMode} mode.`);
    console.error(`Set ${prefix} (or STRIPE_SECRET_KEY) in your .env file.`);
    process.exit(1);
  }

  return {
    secretKey,
    publishableKey: publishableKey || null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    mode: resolvedMode,
    account: account || 'default',
  };
}

export function flattenParams(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenParams(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object') {
          Object.assign(result, flattenParams(v, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = String(v);
        }
      });
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

export async function apiRequest(path, options = {}, config = null) {
  const cfg = config || loadConfig();
  const { method = 'GET', body = null, params = null } = options;

  let url = `${STRIPE_API}${path}`;

  if (params) {
    const flat = flattenParams(params);
    const qs = new URLSearchParams(flat).toString();
    if (qs) url += `?${qs}`;
  }

  const fetchOptions = {
    method,
    headers: {
      'Authorization': `Bearer ${cfg.secretKey}`,
      'Stripe-Version': '2024-06-20',
    },
  };

  if (body) {
    const flat = flattenParams(body);
    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetchOptions.body = new URLSearchParams(flat).toString();
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text}`);
  }

  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`${msg} (${response.status})`);
  }

  return data;
}

export async function paginate(path, params = {}, config = null) {
  const cfg = config || loadConfig();
  const results = [];
  let startingAfter = null;

  while (true) {
    const p = { ...params, limit: 100 };
    if (startingAfter) p.starting_after = startingAfter;
    const data = await apiRequest(path, { params: p }, cfg);
    results.push(...(data.data || []));
    if (!data.has_more) break;
    startingAfter = data.data[data.data.length - 1].id;
  }

  return results;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(argv[i]);
    }
  }

  return { _: positional, ...flags };
}

export function initScript(showHelp) {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return null;
  }

  if (command === 'accounts') {
    const accounts = listAccounts();
    if (!accounts.length) {
      console.log('No named accounts configured.');
      console.log('Using default .env at /memory/connectors/stripe/.env');
    } else {
      console.log('Configured accounts:');
      accounts.forEach(a => console.log(`  ${a}`));
    }
    return null;
  }

  const cfg = loadConfig(args.account, args.mode);
  return { config: cfg, args, command };
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
