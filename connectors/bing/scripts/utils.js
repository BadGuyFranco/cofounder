/**
 * Bing Webmaster Tools Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// /memory/connectors/bing/.env (preferred) or local .env
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'bing', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  if (!process.env.BING_WEBMASTER_API_KEY) {
    console.error('Error: BING_WEBMASTER_API_KEY not found.');
    console.error('');
    console.error('Setup:');
    console.error('  1. Go to https://www.bing.com/webmasters/');
    console.error('  2. Sign in with your Microsoft account');
    console.error('  3. Click your account icon (top right) > API Access > Generate API Key');
    console.error('  4. Add to /memory/connectors/bing/.env:');
    console.error('     BING_WEBMASTER_API_KEY=your_key_here');
    process.exit(1);
  }

  return { apiKey: process.env.BING_WEBMASTER_API_KEY };
}

const BASE_URL = 'https://ssl.bing.com/webmaster/api.svc/json';

export async function apiRequest(endpoint, options = {}) {
  const { apiKey } = loadConfig();

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('apikey', apiKey);

  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    }
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    let msg = `Bing API error ${res.status}`;
    try {
      const body = await res.text();
      const parsed = JSON.parse(body);
      if (parsed.Message) msg += `: ${parsed.Message}`;
      else if (parsed.d?.ExceptionMessage) msg += `: ${parsed.d.ExceptionMessage}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  // Bing wraps responses in {"d": ...}
  return data?.d !== undefined ? data.d : data;
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

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// Sites cache at /memory/connectors/bing/sites.json
const sitesCachePath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'bing', 'sites.json');

export function loadSitesCache() {
  try {
    if (fs.existsSync(sitesCachePath)) {
      return JSON.parse(fs.readFileSync(sitesCachePath, 'utf8'));
    }
  } catch {}
  return {};
}

export function saveSitesCache(sites) {
  try {
    const dir = path.dirname(sitesCachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = {
      last_updated: new Date().toISOString().slice(0, 10),
      sites: sites.map(s => ({
        url: s.Url || s,
        verified: s.IsVerified !== false
      }))
    };
    fs.writeFileSync(sitesCachePath, JSON.stringify(data, null, 2));
  } catch {}
}
