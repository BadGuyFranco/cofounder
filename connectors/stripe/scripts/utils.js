// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));

const memoryEnvPath = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'stripe', '.env');
const localEnvPath = join(__dirname, '..', '.env');

const STRIPE_API = 'https://api.stripe.com/v1';

export function loadConfig() {
  if (existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/stripe/.env with your credentials.');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Error: STRIPE_SECRET_KEY not found in .env');
    process.exit(1);
  }

  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
  };
}

// Flatten nested object to Stripe's form-encoded format
// e.g. { metadata: { key: 'val' } } -> { 'metadata[key]': 'val' }
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

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
