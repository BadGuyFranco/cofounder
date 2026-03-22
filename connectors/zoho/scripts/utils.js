#!/usr/bin/env node

/**
 * Zoho CRM Shared Utilities
 * Common functions used across all Zoho scripts.
 * Supports multi-organization and multi-region configurations.
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
// Script is at: .../GPT/cofounder/connectors/zoho/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/zoho/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'zoho');

// Zoho API regions and their endpoints
const ZOHO_REGIONS = {
  'us': {
    accounts: 'https://accounts.zoho.com',
    api: 'https://www.zohoapis.com'
  },
  'eu': {
    accounts: 'https://accounts.zoho.eu',
    api: 'https://www.zohoapis.eu'
  },
  'in': {
    accounts: 'https://accounts.zoho.in',
    api: 'https://www.zohoapis.in'
  },
  'au': {
    accounts: 'https://accounts.zoho.com.au',
    api: 'https://www.zohoapis.com.au'
  },
  'jp': {
    accounts: 'https://accounts.zoho.jp',
    api: 'https://www.zohoapis.jp'
  },
  'cn': {
    accounts: 'https://accounts.zoho.com.cn',
    api: 'https://www.zohoapis.com.cn'
  },
  'ca': {
    accounts: 'https://accounts.zohocloud.ca',
    api: 'https://www.zohoapis.ca'
  }
};

// Product-specific API base URLs by region
const ZOHO_MAIL_HOSTS = {
  'us': 'https://mail.zoho.com',
  'eu': 'https://mail.zoho.eu',
  'in': 'https://mail.zoho.in',
  'au': 'https://mail.zoho.com.au',
  'jp': 'https://mail.zoho.jp',
  'cn': 'https://mail.zoho.com.cn',
  'ca': 'https://mail.zohocloud.ca'
};

const ZOHO_CALENDAR_HOSTS = {
  'us': 'https://calendar.zoho.com',
  'eu': 'https://calendar.zoho.eu',
  'in': 'https://calendar.zoho.in',
  'au': 'https://calendar.zoho.com.au',
  'jp': 'https://calendar.zoho.jp',
  'cn': 'https://calendar.zoho.com.cn',
  'ca': 'https://calendar.zohocloud.ca'
};

const DEFAULT_REGION = 'us';
const API_VERSION = 'v8';
const SUPPORTED_EDITIONS = ['standard', 'professional', 'enterprise', 'ultimate'];
const DEFAULT_EDITION = 'professional';

/**
 * Normalize Zoho CRM edition values for consistent config storage.
 * @param {string} edition
 * @returns {string}
 */
export function normalizeEdition(edition) {
  if (!edition || typeof edition !== 'string') {
    return DEFAULT_EDITION;
  }

  const normalized = edition.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_EDITION;
  }

  return SUPPORTED_EDITIONS.includes(normalized) ? normalized : normalized;
}

/**
 * Get the path to an organization's config file
 * @param {string} orgName - Organization name (optional)
 * @returns {string} Path to config file
 */
function getOrgConfigPath(orgName) {
  if (orgName) {
    return path.join(MEMORY_DIR, `${orgName}.json`);
  }
  // Default config file
  return path.join(MEMORY_DIR, 'default.json');
}

/**
 * List all configured organizations
 * @returns {string[]} Array of org names
 */
export function listOrganizations() {
  if (!fs.existsSync(MEMORY_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(MEMORY_DIR);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Load organization configuration
 * @param {string} orgName - Organization name (optional, uses default if not specified)
 * @returns {object} Organization config with tokens and region
 */
export function loadOrgConfig(orgName) {
  const configPath = getOrgConfigPath(orgName);
  
  // Also load .env for client credentials (shared across orgs)
  const envPath = path.join(MEMORY_DIR, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  if (!fs.existsSync(configPath)) {
    // Try to find any config file if no specific org requested
    if (!orgName) {
      const orgs = listOrganizations();
      if (orgs.length === 1) {
        return loadOrgConfig(orgs[0]);
      } else if (orgs.length > 1) {
        console.error('Error: Multiple organizations configured. Use --org to specify one:');
        for (const org of orgs) {
          console.error(`  --org ${org}`);
        }
        process.exit(1);
      }
    }
    
    console.error('Error: No organization configuration found.');
    console.error('Run: node scripts/auth.js setup --org <name> to configure an organization.');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const edition = normalizeEdition(config.edition || config.apiEdition || DEFAULT_EDITION);
    return {
      ...config,
      edition,
      configPath,
      orgName: orgName || config.orgName || 'default'
    };
  } catch (error) {
    console.error(`Error: Failed to read config file: ${configPath}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Canonical alias used by standardized connectors.
 * @param {string|null} orgName
 * @returns {object}
 */
export function loadConfig(orgName = null) {
  return loadOrgConfig(orgName);
}

/**
 * Save organization configuration
 * @param {string} orgName - Organization name
 * @param {object} config - Configuration object
 */
export function saveOrgConfig(orgName, config) {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  
  const configPath = getOrgConfigPath(orgName);
  const edition = normalizeEdition(config.edition || config.apiEdition || DEFAULT_EDITION);
  fs.writeFileSync(configPath, JSON.stringify({
    ...config,
    edition,
    orgName,
    updatedAt: new Date().toISOString()
  }, null, 2));
  
  return configPath;
}

/**
 * Get API endpoints for a region
 * @param {string} region - Region code (us, eu, in, au, jp, cn, ca)
 * @returns {object} { accounts, api } URLs
 */
export function getRegionEndpoints(region = DEFAULT_REGION) {
  const endpoints = ZOHO_REGIONS[region.toLowerCase()];
  if (!endpoints) {
    console.error(`Error: Unknown region "${region}".`);
    console.error('Valid regions: ' + Object.keys(ZOHO_REGIONS).join(', '));
    process.exit(1);
  }
  return endpoints;
}

/**
 * Get access token, refreshing if needed
 * @param {object} config - Organization config
 * @returns {Promise<string>} Valid access token
 */
export async function getAccessToken(config) {
  // Check if token is expired (with 5 minute buffer)
  const expiresAt = config.expiresAt ? new Date(config.expiresAt) : null;
  const isExpired = !expiresAt || (Date.now() > expiresAt.getTime() - 5 * 60 * 1000);
  
  if (!isExpired && config.accessToken) {
    return config.accessToken;
  }
  
  // Token expired or missing, try to refresh
  if (!config.refreshToken) {
    console.error('Error: Access token expired and no refresh token available.');
    console.error('Run: node scripts/auth.js flow --org ' + (config.orgName || 'default'));
    process.exit(1);
  }
  
  console.log('Access token expired, refreshing...');
  
  const clientId = process.env.ZOHO_CLIENT_ID || config.clientId;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || config.clientSecret;
  
  if (!clientId || !clientSecret) {
    console.error('Error: ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET required for token refresh.');
    console.error('Add them to /memory/connectors/zoho/.env');
    process.exit(1);
  }
  
  const endpoints = getRegionEndpoints(config.region);
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });
  
  const response = await fetch(`${endpoints.accounts}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const data = await response.json();
  
  if (!response.ok || data.error) {
    console.error('Error: Token refresh failed.');
    console.error(data.error || data);
    console.error('Run: node scripts/auth.js flow --org ' + (config.orgName || 'default'));
    process.exit(1);
  }
  
  // Update config with new token
  const newConfig = {
    ...config,
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
  };
  
  saveOrgConfig(config.orgName, newConfig);
  console.log('Token refreshed successfully.\n');
  
  return data.access_token;
}

/**
 * Get client credentials from environment
 * @returns {object} { clientId, clientSecret }
 */
export function getClientCredentials() {
  // Load .env if not already loaded
  const envPath = path.join(MEMORY_DIR, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Error: ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET required.');
    console.error('Create /memory/connectors/zoho/.env with:');
    console.error('  ZOHO_CLIENT_ID=your_client_id');
    console.error('  ZOHO_CLIENT_SECRET=your_client_secret');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
  
  return { clientId, clientSecret };
}

/**
 * Canonical credentials mapper.
 * @param {object} config
 * @returns {object}
 */
export function getCredentials(config = null) {
  const resolved = config || loadConfig();
  return {
    orgName: resolved.orgName || 'default',
    region: resolved.region || DEFAULT_REGION,
    edition: normalizeEdition(resolved.edition || resolved.apiEdition || DEFAULT_EDITION),
    accessToken: resolved.accessToken || null,
    refreshToken: resolved.refreshToken || null,
    clientId: process.env.ZOHO_CLIENT_ID || resolved.clientId || null,
    clientSecret: process.env.ZOHO_CLIENT_SECRET || resolved.clientSecret || null
  };
}

// Canonical parseArgs wrapper
export function parseArgs(args = process.argv.slice(2)) {
  return sharedParseArgs(args);
}

/**
 * Make API request to Zoho CRM
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {string} token - Access token
 * @param {object} body - Request body (optional)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(methodOrEndpoint, endpointOrOptions, token, body = null, options = {}) {
  let method;
  let endpoint;
  let authToken;
  let requestBody;
  let requestOptions;

  if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(methodOrEndpoint).toUpperCase())) {
    method = String(methodOrEndpoint).toUpperCase();
    endpoint = endpointOrOptions;
    authToken = token;
    requestBody = body;
    requestOptions = options;
  } else {
    // Canonical shape: apiRequest(endpoint, options)
    endpoint = methodOrEndpoint;
    const canonicalOptions = endpointOrOptions || {};
    method = (canonicalOptions.method || 'GET').toUpperCase();
    authToken = canonicalOptions.token || canonicalOptions.accessToken;
    requestBody = canonicalOptions.body || null;
    requestOptions = canonicalOptions;
  }

  const { region = DEFAULT_REGION, version = API_VERSION } = requestOptions;
  const endpoints = getRegionEndpoints(region);

  if (!authToken) {
    const error = new Error('Missing Zoho access token for apiRequest');
    error.code = 'MISSING_ACCESS_TOKEN';
    throw error;
  }
  
  // Build full URL
  let url;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else if (endpoint.startsWith('/crm/')) {
    url = `${endpoints.api}${endpoint}`;
  } else {
    url = `${endpoints.api}/crm/${version}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
  
  const headers = {
    'Authorization': `Zoho-oauthtoken ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  const fetchOptions = {
    method,
    headers
  };
  
  if (requestBody) {
    fetchOptions.body = JSON.stringify(requestBody);
  }
  
  const response = await fetch(url, fetchOptions);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return { success: response.ok };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }
  
  if (!response.ok) {
    const errorMessage = data.message || data.error || 
      (data.data && data.data[0] && data.data[0].message) || 
      'API request failed';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data.code || (data.data && data.data[0] && data.data[0].code);
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Paginated API request - fetches all pages using Zoho pagination
 * @param {string} endpoint - API endpoint
 * @param {string} token - Access token
 * @param {object} options - Options including all, perPage, region
 * @returns {Promise<object>} { data: [], info: { moreRecords, count, page } }
 */
export async function apiRequestPaginated(endpoint, token, options = {}) {
  const { all = false, perPage = 200, region = DEFAULT_REGION, dataKey = 'data' } = options;
  let allResults = [];
  let page = 1;
  let moreRecords = true;
  
  while (moreRecords) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${separator}page=${page}&per_page=${perPage}`;
    
    const data = await apiRequest('GET', url, token, null, { region });
    
    const results = data[dataKey] || data.data || [];
    allResults = allResults.concat(results);
    
    // Check if there are more records
    moreRecords = data.info?.more_records || false;
    page++;
    
    if (!all) break;
    
    // Safety limit
    if (page > 500) {
      console.log('Warning: Reached 500 page limit');
      break;
    }
  }
  
  return {
    data: allResults,
    info: {
      count: allResults.length,
      page: page - 1,
      moreRecords: moreRecords
    }
  };
}

/**
 * COQL (CRM Object Query Language) request
 * @param {string} query - COQL SELECT query
 * @param {string} token - Access token
 * @param {object} options - Options including region
 * @returns {Promise<object>} Query results
 */
export async function coqlRequest(query, token, options = {}) {
  const { region = DEFAULT_REGION } = options;
  
  return await apiRequest('POST', '/coql', token, { select_query: query }, { region });
}

/**
 * Confirm destructive action with user
 * @param {string} message - Warning message
 * @param {string[]} details - Additional details
 * @param {boolean} forceFlag - Skip confirmation if true
 * @returns {Promise<boolean>} True if confirmed
 */
export async function confirmDestructiveAction(message, details = null, forceFlag = false) {
  if (forceFlag) {
    console.log('WARNING: Bypassing confirmation with --force flag');
    return true;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WARNING: DESTRUCTIVE ACTION                                   ║');
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
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format currency
 * @param {number} value - Currency value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency
 */
export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/**
 * Handle errors consistently
 * @param {Error} error - Error object
 * @param {boolean} verbose - Show full details
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (error.code) {
    console.error('Code:', error.code);
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}

/**
 * Display help for a command
 * @param {string} commandName - Name of the command
 * @param {object} sections - Help sections
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

/**
 * Initialize script with organization config
 * Handles --org flag and returns config with valid token
 * @param {object} args - Parsed command line arguments
 * @returns {Promise<object>} { config, token }
 */
export async function initScript(args) {
  if (typeof args === 'function') {
    const showHelp = args;
    const parsed = parseArgs();
    const command = parsed._[0] || 'help';

    if (command === 'help' || parsed.help || parsed._.length === 0) {
      showHelp();
      return null;
    }

    const config = loadConfig(parsed.org);
    const token = await getAccessToken(config);
    return {
      credentials: {
        ...getCredentials(config),
        accessToken: token
      },
      args: parsed,
      command
    };
  }

  const config = loadOrgConfig(args.org);
  const token = await getAccessToken(config);
  return { config, token };
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
 * Get product-specific API base URL for a region.
 * @param {'mail'|'calendar'} product - Zoho product
 * @param {string} region - Region code
 * @returns {string} Base URL (no trailing slash)
 */
export function getProductBaseUrl(product, region = DEFAULT_REGION) {
  const hosts = { mail: ZOHO_MAIL_HOSTS, calendar: ZOHO_CALENDAR_HOSTS };
  const map = hosts[product];
  if (!map) {
    console.error(`Error: Unknown product "${product}".`);
    console.error('Valid products: ' + Object.keys(hosts).join(', '));
    process.exit(1);
  }
  const url = map[region.toLowerCase()];
  if (!url) {
    console.error(`Error: Unknown region "${region}" for ${product}.`);
    console.error('Valid regions: ' + Object.keys(map).join(', '));
    process.exit(1);
  }
  return url;
}

export {
  MEMORY_DIR,
  ZOHO_REGIONS,
  ZOHO_MAIL_HOSTS,
  ZOHO_CALENDAR_HOSTS,
  DEFAULT_REGION,
  API_VERSION,
  SUPPORTED_EDITIONS,
  DEFAULT_EDITION
};
