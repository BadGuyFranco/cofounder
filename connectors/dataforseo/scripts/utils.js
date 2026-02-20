/**
 * DataForSEO Connector Utilities
 * Shared auth, request handling, and CLI helpers.
 *
 * Auth: HTTP Basic with login (email) + password from .env
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'dataforseo', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    console.error('Error: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not found.');
    console.error('');
    console.error('Setup:');
    console.error('  1. Register free at https://app.dataforseo.com/register');
    console.error('  2. Add to /memory/connectors/dataforseo/.env:');
    console.error('     DATAFORSEO_LOGIN=your@email.com');
    console.error('     DATAFORSEO_PASSWORD=your_password');
    process.exit(1);
  }

  return { login, password };
}

const BASE_URL = 'https://api.dataforseo.com/v3';

export async function apiPost(endpoint, body) {
  const { login, password } = loadConfig();
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = `DataForSEO API error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.status_message) msg += `: ${data.status_message}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();

  // Top-level API errors (wrong creds, etc.)
  if (data.status_code && data.status_code !== 20000) {
    throw new Error(`DataForSEO error ${data.status_code}: ${data.status_message}`);
  }

  // Task-level errors
  const task = data.tasks?.[0];
  if (task && task.status_code !== 20000) {
    throw new Error(`Task error ${task.status_code}: ${task.status_message}`);
  }

  return {
    result: task?.result || [],
    cost: data.cost || 0,
    taskData: task
  };
}

export function parseFlags(argv) {
  const flags = {};
  const positional = [];

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

  return { flags, positional };
}

// Location code mapping (most common)
const LOCATIONS = {
  'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
  'de': 2276, 'fr': 2250, 'es': 2724, 'it': 2380,
  'nl': 2528, 'br': 2076, 'mx': 2484, 'in': 2356,
  'jp': 2392, 'sg': 2702, 'za': 2710
};

const LANGUAGES = {
  'us': 'en', 'uk': 'en', 'ca': 'en', 'au': 'en',
  'de': 'de', 'fr': 'fr', 'es': 'es', 'it': 'it',
  'nl': 'nl', 'br': 'pt', 'mx': 'es', 'in': 'en',
  'jp': 'ja', 'sg': 'en', 'za': 'en'
};

export function resolveLocation(locationArg) {
  const loc = (locationArg || 'us').toLowerCase();
  const code = LOCATIONS[loc] || parseInt(loc, 10) || 2840;
  const lang = LANGUAGES[loc] || 'en';
  return { locationCode: code, languageCode: lang };
}

// Strip protocol and trailing slash for domain-based calls
export function normalizeDomain(input) {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '');
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

export function printCost(cost) {
  if (cost > 0) {
    console.log(`\n(Cost: $${cost.toFixed(4)})`);
  }
}
