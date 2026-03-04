/**
 * Shared utilities for the CoBuilder tickets connector.
 * Handles API requests, arg parsing, and output formatting.
 */

const DEFAULT_LOCAL = 'http://localhost:3000';
const DEFAULT_STAGING = 'https://api-staging.cobuilder.me';

/**
 * Load config from environment or flags.
 * --target staging|local (default: local)
 * --user-id <uuid> (default: v0-anonymous)
 */
export function loadConfig(flags = {}) {
  const target = flags.target || process.env.TICKETS_TARGET || 'local';
  const baseUrl = target === 'staging' ? DEFAULT_STAGING : DEFAULT_LOCAL;
  const userId = flags['user-id'] || process.env.TICKETS_USER_ID || 'v0-anonymous';

  return { baseUrl, userId, target };
}

/**
 * Make an API request to the CoBuilder tickets API.
 */
export async function apiRequest(path, options = {}, config) {
  const { method = 'GET', body = null, params = null } = options;

  let url = `${config.baseUrl}${path}`;

  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null)
      )
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': config.userId,
  };

  const fetchOptions = { method, headers };
  if (body) fetchOptions.body = JSON.stringify(body);

  const response = await fetch(url, fetchOptions);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const msg = data?.error || data?.message || JSON.stringify(data);
    throw new Error(`${msg} (${response.status})`);
  }

  return data;
}

/**
 * Parse CLI arguments into positional args and flags.
 */
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

/**
 * Output data as formatted JSON.
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error and exit.
 */
export function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

/**
 * Parse a JSON string or return null.
 */
export function parseJsonArg(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    console.error(`Invalid JSON: ${value}`);
    process.exit(1);
  }
}
