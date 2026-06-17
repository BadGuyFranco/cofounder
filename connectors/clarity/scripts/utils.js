/**
 * Microsoft Clarity Connector Utilities
 * Shared auth, request handling, and CLI helpers.
 *
 * Auth: Bearer JWT token (CLARITY_API_TOKEN) from .env
 * API base: https://www.clarity.ms
 * Data Export API is project-scoped: the token maps to one Clarity project (one site).
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'clarity', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

const BASE_URL = 'https://www.clarity.ms';
const INSIGHTS_ENDPOINT = '/export-data/api/v1/project-live-insights';

// Dimensions the Data Export API accepts (max 3 per request)
export const DIMENSIONS = [
  'Browser', 'Device', 'Country', 'OS', 'Source', 'Medium', 'Campaign', 'Channel', 'URL'
];

// Friction-signal metrics. These are the behavioral signals the Conversion
// Expert reads to explain WHY a page underperforms.
export const FRICTION_METRICS = [
  'Dead Click Count', 'Rage Click Count', 'Quickback Click',
  'Excessive Scroll', 'Script Error Count', 'Error Click Count'
];

export function loadToken() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }

  const token = process.env.CLARITY_API_TOKEN;

  if (!token) {
    console.error('Error: CLARITY_API_TOKEN not found.');
    console.error('');
    console.error('Setup:');
    console.error('  1. In your Clarity project: Settings > Data Export > Generate new API token');
    console.error('  2. Add to /memory/connectors/clarity/.env:');
    console.error('     CLARITY_API_TOKEN=your_jwt_token');
    console.error('  See SETUP.md for the full walkthrough.');
    process.exit(1);
  }

  return token;
}

// Detect whether a token is configured, without exiting (for optional flows)
export function hasToken() {
  if (fs.existsSync(memoryEnvPath)) dotenv.config({ path: memoryEnvPath });
  else if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });
  return Boolean(process.env.CLARITY_API_TOKEN);
}

function buildUrl(endpoint, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }
  return `${BASE_URL}${endpoint}${qs.toString() ? `?${qs}` : ''}`;
}

async function request(url, token) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const text = await res.text();

  if (!res.ok) {
    let msg = `Clarity API error ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (data?.message) msg += `: ${data.message}`;
      else if (data?.error) msg += `: ${data.error}`;
      else if (text) msg += `: ${text}`;
    } catch {
      if (text) msg += `: ${text}`;
    }
    if (res.status === 401) msg += ' (token missing, invalid, or expired; regenerate in Settings > Data Export)';
    if (res.status === 403) msg += ' (token not authorized for this project)';
    if (res.status === 429) msg += ' (daily limit reached: max 10 requests per project per day)';
    throw new Error(msg);
  }

  return text ? JSON.parse(text) : [];
}

/**
 * Pull Live Insights for the project.
 * @param {number} numOfDays 1, 2, or 3 (last 24/48/72 hours)
 * @param {string[]} dimensions up to 3 of DIMENSIONS
 * @returns {Promise<Array>} array of { metricName, information: [...] }
 */
export async function getLiveInsights(numOfDays = 1, dimensions = []) {
  const token = loadToken();
  const days = clampDays(numOfDays);
  const dims = dimensions.slice(0, 3);

  const params = { numOfDays: days };
  dims.forEach((d, i) => { params[`dimension${i + 1}`] = d; });

  return request(buildUrl(INSIGHTS_ENDPOINT, params), token);
}

export function clampDays(n) {
  const d = Number(n);
  if (!Number.isFinite(d)) return 1;
  return Math.min(3, Math.max(1, Math.round(d)));
}

// Validate a dimension name against the allowed set (case-insensitive).
// Returns the canonical casing, or null if unsupported.
export function canonicalDimension(input) {
  const match = DIMENSIONS.find((d) => d.toLowerCase() === String(input).trim().toLowerCase());
  return match || null;
}

/**
 * Sum every numeric field across a metric's information rows.
 * Numeric-looking string fields (Clarity returns counts as strings) are summed;
 * non-numeric fields (dimension labels like "OS": "Android") are ignored.
 * Returns { fieldName: total }.
 */
export function sumNumericFields(rows = []) {
  const totals = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      const num = typeof v === 'number' ? v : (/^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v) : null);
      if (num === null) continue;
      totals[k] = (totals[k] || 0) + num;
    }
  }
  return totals;
}

/**
 * Build the friction digest from a raw Live Insights response.
 * Pure function (no network): groups metrics by name, sums Traffic and each
 * friction metric across returned rows. Robust to the exact count field name
 * Clarity uses, since sumNumericFields sums whatever numeric fields are present.
 * @param {Array} data raw response: [{ metricName, information: [...] }]
 * @param {number} days the lookback window used
 * @param {string[]} dimensions the dimensions requested
 */
export function buildSignalsDigest(data, days, dimensions = []) {
  const byName = {};
  for (const m of Array.isArray(data) ? data : []) {
    if (m && m.metricName) byName[m.metricName] = m.information || [];
  }

  const traffic = byName['Traffic'] ? sumNumericFields(byName['Traffic']) : null;

  const friction = {};
  for (const name of FRICTION_METRICS) {
    if (byName[name]) friction[name] = sumNumericFields(byName[name]);
  }

  return {
    window_days: days,
    dimensions,
    note: 'Counts are summed across returned rows (max 1000). Friction metrics are the WHY behind page underperformance.',
    traffic,
    friction,
    metrics_present: Object.keys(byName)
  };
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

// Comma-separated list -> trimmed array
export function splitList(value) {
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
