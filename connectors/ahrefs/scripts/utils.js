/**
 * Ahrefs Connector Utilities
 * Shared auth, request handling, and CLI helpers.
 *
 * Auth: Bearer API key (AHREFS_API_KEY) from .env
 * API v3 base: https://api.ahrefs.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'ahrefs', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

const BASE_URL = 'https://api.ahrefs.com';

export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    console.error('Error: AHREFS_API_KEY not found.');
    console.error('');
    console.error('Setup:');
    console.error('  1. Create an API key at https://app.ahrefs.com/account/api-keys');
    console.error('  2. Add to /memory/connectors/ahrefs/.env:');
    console.error('     AHREFS_API_KEY=your_api_key');
    console.error('  See SETUP.md for the full walkthrough.');
    process.exit(1);
  }

  return { apiKey };
}

// Detect whether a key is configured, without exiting (for optional-key flows)
export function hasApiKey() {
  if (fs.existsSync(memoryEnvPath)) dotenv.config({ path: memoryEnvPath });
  else if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
  return Boolean(process.env.AHREFS_API_KEY);
}

// Best-effort extraction of the DR number across response shapes
export function extractDr(data) {
  return (
    data?.domain_rating?.domain_rating ??
    data?.domainRating?.domain_rating ??
    data?.domain_rating ??
    null
  );
}

async function request(url, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();

  if (!res.ok) {
    let msg = `Ahrefs API error ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) msg += `: ${data.join(' ')}`;
      else if (data?.error) msg += `: ${data.error}`;
      else if (data?.message) msg += `: ${data.message}`;
    } catch {
      if (text) msg += `: ${text}`;
    }
    if (res.status === 401) msg += ' (check AHREFS_API_KEY)';
    if (res.status === 403) msg += ' (this endpoint needs a paid API key, or units are exhausted)';
    if (res.status === 429) msg += ' (rate limit: ~60 requests/minute)';
    throw new Error(msg);
  }

  return text ? JSON.parse(text) : {};
}

function buildUrl(endpoint, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }
  return `${BASE_URL}${endpoint}${qs.toString() ? `?${qs}` : ''}`;
}

/**
 * GET a keyed Ahrefs API v3 endpoint (consumes units; requires AHREFS_API_KEY).
 */
export async function apiGet(endpoint, params = {}) {
  const { apiKey } = loadConfig();
  return request(buildUrl(endpoint, params), {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json'
  });
}

/**
 * GET a public Ahrefs endpoint (no key, no units). Used for domain-rating-free.
 */
export async function apiGetPublic(endpoint, params = {}) {
  return request(buildUrl(endpoint, params), { 'Accept': 'application/json' });
}

/**
 * Parse argv into { flags, positional }.
 */
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

// Strip protocol, trailing slash, and leading www for domain-based calls
export function normalizeDomain(input) {
  return String(input)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '');
}

// Comma-separated list -> trimmed array
export function splitList(value) {
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

// Today's date as YYYY-MM-DD (Ahrefs requires a report date on many endpoints)
export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
