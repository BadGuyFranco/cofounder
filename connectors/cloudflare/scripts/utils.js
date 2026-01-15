/**
 * Cloudflare Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments { _: [], flags }
 */
export function parseArgs(args) {
  const result = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

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

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

/**
 * Parse JSON safely
 * @param {string} str - JSON string
 * @param {string} fieldName - Field name for error messages
 * @returns {object} Parsed JSON
 */
export function parseJSON(str, fieldName) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Error: Invalid JSON in --${fieldName}`);
    console.error(`Received: ${str}`);
    process.exit(1);
  }
}
