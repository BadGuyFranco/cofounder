// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Built-in Node.js modules
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// npm packages (dynamic import AFTER dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));

// cofounder/connectors/courtlistener/scripts -> ../../../../memory/connectors/courtlistener/.env
const memoryEnvPath = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'courtlistener', '.env');
const localEnvPath = join(__dirname, '..', '.env');

export const CL_BASE = 'https://www.courtlistener.com/api/rest/v4';

/**
 * Load configuration. Checks memory location first, then local fallback.
 */
export function loadConfig() {
  if (existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/courtlistener/.env with COURTLISTENER_API_TOKEN');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.COURTLISTENER_API_TOKEN) {
    console.error('Error: COURTLISTENER_API_TOKEN not found in environment.');
    process.exit(1);
  }

  return { token: process.env.COURTLISTENER_API_TOKEN };
}

/**
 * CourtListener auth headers. CourtListener uses "Token", not "Bearer".
 */
export function authHeaders(token, extra = {}) {
  return { Authorization: `Token ${token}`, ...extra };
}

/**
 * Parse command line arguments into { command, args, flags }.
 */
export function parseArgs() {
  const argv = process.argv.slice(2);
  const command = argv[0] || 'help';
  const flags = {};
  const positional = [];

  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      flags[key] = value;
    } else {
      positional.push(argv[i]);
    }
  }

  return { command, args: positional, flags };
}

/**
 * Initialize a script: handle help, then load credentials.
 * Returns { token } or null if help was shown.
 */
export function initScript(showHelp) {
  const { command } = parseArgs();
  if (command === 'help') {
    showHelp();
    return null;
  }
  const { token } = loadConfig();
  return { token };
}

/**
 * Make an API request with consistent error handling.
 */
export async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const j = JSON.parse(errorText);
      errorMessage = j.detail || j.message || j.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`${errorMessage} Status: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
