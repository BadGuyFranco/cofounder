/**
 * Shared utilities for the CoBuilder tickets connector.
 * Handles API requests, arg parsing, and output formatting.
 */

const DEFAULT_LOCAL = 'http://localhost:3000';
const DEFAULT_STAGING = 'https://api-staging.cobuilder.me';

/** Well-known UUID for the CoBuilder HQ org (seeded by migration 0023). */
const DEFAULT_ORG_ID = '00000000-0000-4000-a000-000000000002';

/**
 * Default service account UUID for staging API calls.
 * Staging runs in dev-bypass mode (NODE_ENV=development), which passes the
 * X-User-Id header directly as the internal user ID — no clerk_id resolution.
 * Must be a valid UUID (the admin user's internal DB ID), not a clerk_id string.
 * DB user: admin@cobuilder.me (00000000-0000-4000-a000-000000000003).
 */
const STAGING_USER_ID = '00000000-0000-4000-a000-000000000003';
const LOCAL_USER_ID = '00000000-0000-4000-a000-000000000001';

/**
 * Load config from environment or flags.
 * --target staging|local (default: staging)
 * --user-id <id> (default: CoBuilder HQ admin service account)
 * --org <uuid> (default: CoBuilder HQ org)
 */
export function loadConfig(flags = {}) {
  const target = flags.target || process.env.TICKETS_TARGET || 'staging';
  const baseUrl = target === 'local' ? DEFAULT_LOCAL : DEFAULT_STAGING;
  const defaultUserId = target === 'local' ? LOCAL_USER_ID : STAGING_USER_ID;
  const userId = flags['user-id'] || process.env.TICKETS_USER_ID || defaultUserId;
  const orgId = flags.org || process.env.COBUILDER_ORG_ID || DEFAULT_ORG_ID;

  return { baseUrl, userId, target, orgId };
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
