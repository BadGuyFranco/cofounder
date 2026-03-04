// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));

const memoryEnvPath = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'openai', '.env');
const localEnvPath = join(__dirname, '..', '.env');

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function loadConfig() {
  if (existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/openai/.env with OPENAI_API_KEY=...');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found in .env');
    process.exit(1);
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    orgId: process.env.OPENAI_ORG_ID || null,
  };
}

export async function apiRequest(path, options = {}, config = null) {
  const cfg = config || loadConfig();
  const { method = 'GET', body = null } = options;

  const headers = {
    'Authorization': `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (cfg.orgId) headers['OpenAI-Organization'] = cfg.orgId;

  const fetchOptions = { method, headers };
  if (body) fetchOptions.body = JSON.stringify(body);

  const response = await fetch(`${OPENAI_BASE_URL}${path}`, fetchOptions);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text}`); }

  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`${msg} (${response.status})`);
  }

  return data;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else {
      positional.push(argv[i]);
    }
  }

  return { _: positional, ...flags };
}

export function output(data) { console.log(JSON.stringify(data, null, 2)); }
export function outputError(error) { console.error(`Error: ${error.message}`); process.exit(1); }
