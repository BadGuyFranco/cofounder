/**
 * Cloudflare Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs, sleep, parseJSON } from '../../../system/shared/utils.js';

// Built-in Node.js modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/cloudflare/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/cloudflare/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'cloudflare', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

/**
 * Load configuration from .env file
 * @returns {object} Configuration object with apiToken
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/cloudflare/.env with your CLOUDFLARE_API_TOKEN');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('Error: CLOUDFLARE_API_TOKEN not found in environment.');
    console.error('Add CLOUDFLARE_API_TOKEN=your_token to your .env file.');
    process.exit(1);
  }

  return {
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  };
}

// Re-export parseArgs from shared utils
export { parseArgs };

const BASE_URL = 'https://api.cloudflare.com/client/v4';

/**
 * Make API request to Cloudflare
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    const response = await fetch(url, fetchOptions);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || 30;
      console.error(`Rate limited. Waiting ${retryAfter} seconds...`);
      await sleep(parseInt(retryAfter) * 1000);
      retries++;
      continue;
    }

    const data = await response.json();

    if (!data.success) {
      const errors = data.errors || [];
      const error = new Error(errors[0]?.message || 'API request failed');
      error.code = errors[0]?.code;
      error.status = response.status;
      error.errors = errors;
      throw error;
    }

    return data;
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

/**
 * Fetch all pages of a paginated endpoint
 * @param {string} endpoint - API endpoint
 * @param {object} options - Additional options
 * @returns {Promise<array>} All results combined
 */
export async function fetchAllPages(endpoint, options = {}) {
  const allResults = [];
  let page = 1;
  const perPage = options.perPage || 50;

  while (true) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const paginatedEndpoint = `${endpoint}${separator}page=${page}&per_page=${perPage}`;
    
    const data = await apiRequest(paginatedEndpoint, options);
    const results = data.result || [];
    allResults.push(...results);

    const resultInfo = data.result_info || {};
    const totalPages = resultInfo.total_pages || 1;

    if (page >= totalPages) {
      break;
    }

    page++;
  }

  return allResults;
}

/**
 * Get zone ID by domain name
 * @param {string} domain - Domain name
 * @returns {Promise<string|null>} Zone ID or null
 */
export async function getZoneId(domain) {
  try {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(domain)}`);
    const zones = data.result || [];
    return zones.length > 0 ? zones[0].id : null;
  } catch (error) {
    return null;
  }
}

/**
 * Resolve zone identifier (ID or domain name) to zone ID
 * @param {string} zoneIdentifier - Zone ID or domain name
 * @returns {Promise<string>} Zone ID
 */
export async function resolveZoneId(zoneIdentifier) {
  // If it looks like a zone ID (32 hex chars), use it directly
  if (/^[a-f0-9]{32}$/i.test(zoneIdentifier)) {
    return zoneIdentifier;
  }
  
  // Otherwise, look up by domain name
  const zoneId = await getZoneId(zoneIdentifier);
  if (!zoneId) {
    throw new Error(`Zone not found: ${zoneIdentifier}`);
  }
  return zoneId;
}

// Re-export sleep from shared utils
export { sleep };

/**
 * Format output as JSON
 * @param {object} data - Data to output
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format error output
 * @param {Error} error - Error to output
 */
export function outputError(error) {
  if (error.errors && error.errors.length > 0) {
    console.error(`Error: ${error.message} (Code: ${error.code || 'unknown'})`);
    for (const err of error.errors.slice(1)) {
      console.error(`  - ${err.message} (Code: ${err.code})`);
    }
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}

// Re-export parseJSON from shared utils
export { parseJSON };
