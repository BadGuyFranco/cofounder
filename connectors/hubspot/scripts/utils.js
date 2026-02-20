#!/usr/bin/env node

/**
 * HubSpot Shared Utilities
 * Common functions used across all HubSpot scripts.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs as sharedParseArgs } from '../../../system/shared/utils.js';

// Built-in Node.js modules
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/hubspot/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/hubspot/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'hubspot');
const BASE_URL = 'https://api.hubapi.com';

/**
 * Load environment variables from memory or local directory
 */
export function loadEnv(localDir) {
  const memoryEnvPath = path.join(MEMORY_DIR, '.env');
  const localEnvPath = path.join(localDir, '.env');
  
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
    return memoryEnvPath;
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
    return localEnvPath;
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/hubspot/.env with:');
    console.error('  HUBSPOT_ACCESS_TOKEN=pat-xxx');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
}

/**
 * Canonical alias used by standardized connectors.
 * Uses connector root as local fallback path.
 */
export function loadConfig() {
  return loadEnv(path.join(__dirname, '..'));
}

/**
 * Get API token from environment
 */
export function getToken() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not found in environment.');
    console.error('Add it to /memory/connectors/hubspot/.env');
    process.exit(1);
  }
  return token;
}

/**
 * Canonical credentials mapper.
 */
export function getCredentials(env = process.env) {
  const accessToken = env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Error: HUBSPOT_ACCESS_TOKEN not found in environment.');
    console.error('Add it to /memory/connectors/hubspot/.env');
    process.exit(1);
  }
  return { accessToken };
}

// Canonical parseArgs wrapper
export function parseArgs(args = process.argv.slice(2)) {
  return sharedParseArgs(args);
}

/**
 * Make API request to HubSpot
 */
export async function apiRequest(methodOrEndpoint, endpointOrOptions, token, body = null) {
  let method;
  let endpoint;
  let requestToken;
  let requestBody;

  if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(methodOrEndpoint).toUpperCase())) {
    method = String(methodOrEndpoint).toUpperCase();
    endpoint = endpointOrOptions;
    requestToken = token;
    requestBody = body;
  } else {
    // Canonical shape: apiRequest(endpoint, options)
    endpoint = methodOrEndpoint;
    const canonicalOptions = endpointOrOptions || {};
    method = (canonicalOptions.method || 'GET').toUpperCase();
    requestToken = getCredentials().accessToken;
    requestBody = canonicalOptions.body || null;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${requestToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (requestBody) {
    options.body = JSON.stringify(requestBody);
  }
  
  const response = await fetch(url, options);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Canonical script initializer.
 */
export function initScript(showHelp) {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help' || args.help || args._.length === 0) {
    showHelp();
    return null;
  }

  loadConfig();
  return { credentials: getCredentials(), args, command };
}

/**
 * Paginated API request - fetches all pages using HubSpot cursor pagination
 */
export async function apiRequestPaginated(endpoint, token, options = {}) {
  const { all = false, limit = 100, dataKey = 'results' } = options;
  let allResults = [];
  let after = null;
  let pageCount = 0;
  
  do {
    let url = endpoint;
    const params = [];
    
    if (limit) params.push(`limit=${limit}`);
    if (after) params.push(`after=${after}`);
    
    if (params.length > 0) {
      url += (url.includes('?') ? '&' : '?') + params.join('&');
    }
    
    const data = await apiRequest('GET', url, token);
    
    // HubSpot returns results in 'results' array
    const results = data[dataKey] || data.results || [];
    allResults = allResults.concat(results);
    
    // HubSpot uses paging.next.after for cursor pagination
    after = data.paging?.next?.after || null;
    pageCount++;
    
    if (!all) break;
    
    // Safety limit
    if (pageCount > 100) {
      console.log('Warning: Reached 100 page limit');
      break;
    }
  } while (after && all);
  
  return {
    results: allResults,
    meta: {
      total: allResults.length,
      pages: pageCount
    }
  };
}

/**
 * Search API request - HubSpot uses POST for searches
 */
export async function searchRequest(objectType, token, filters, options = {}) {
  const { limit = 100, properties = [], all = false } = options;
  let allResults = [];
  let after = 0;
  let pageCount = 0;
  
  do {
    const body = {
      filterGroups: filters.length > 0 ? [{ filters }] : [],
      limit,
      after,
      properties
    };
    
    const data = await apiRequest('POST', `/crm/v3/objects/${objectType}/search`, token, body);
    
    allResults = allResults.concat(data.results || []);
    
    // HubSpot search uses numeric after for pagination
    const hasMore = data.paging?.next?.after;
    after = hasMore ? parseInt(hasMore) : null;
    pageCount++;
    
    if (!all) break;
    
    // Safety limit
    if (pageCount > 100) {
      console.log('Warning: Reached 100 page limit');
      break;
    }
  } while (after && all);
  
  return {
    results: allResults,
    meta: {
      total: allResults.length,
      pages: pageCount
    }
  };
}

/**
 * Confirm destructive action with user
 * Returns true if confirmed, false if cancelled
 */
export async function confirmDestructiveAction(message, details = null, forceFlag = false) {
  // If --force flag is passed, skip confirmation
  if (forceFlag) {
    console.log('WARNING: Bypassing confirmation with --force flag');
    return true;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ⚠️  DESTRUCTIVE ACTION WARNING                                 ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ${message.padEnd(62)}║`);
  
  if (details) {
    for (const line of details) {
      console.log(`║    ${line.padEnd(60)}║`);
    }
  }
  
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  This action cannot be undone.                                 ║');
  console.log('║                                                                ║');
  console.log('║  Use --force to skip this confirmation in scripts.             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Type "confirm" to proceed, anything else to cancel: ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'confirm') {
        resolve(true);
      } else {
        console.log('Action cancelled.');
        resolve(false);
      }
    });
  });
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format currency
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Handle errors consistently
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}

/**
 * Display help for a command
 */
export function showHelp(commandName, sections) {
  console.log(`\n${commandName}\n${'='.repeat(commandName.length)}\n`);
  
  for (const [title, content] of Object.entries(sections)) {
    console.log(`${title}:`);
    if (Array.isArray(content)) {
      for (const line of content) {
        console.log(`  ${line}`);
      }
    } else {
      console.log(`  ${content}`);
    }
    console.log('');
  }
}

export { MEMORY_DIR, BASE_URL };
