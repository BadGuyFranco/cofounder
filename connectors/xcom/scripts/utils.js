#!/usr/bin/env node

/**
 * X.com (Twitter) Shared Utilities
 * OAuth 1.0a authentication and common functions for all X.com scripts.
 * Supports multiple accounts via --account flag.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import readline from 'readline';

const MEMORY_DIR = path.join(process.env.HOME || '', 'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/xcom');
const API_BASE = 'https://api.x.com/2';
const UPLOAD_BASE = 'https://upload.twitter.com/1.1';

// Track which account is loaded
let loadedAccount = null;

/**
 * List available accounts
 */
export function listAccounts() {
  const accounts = [];
  
  // Check for default account
  if (fs.existsSync(path.join(MEMORY_DIR, '.env'))) {
    accounts.push('default');
  }
  
  // Check for named account directories
  if (fs.existsSync(MEMORY_DIR)) {
    const entries = fs.readdirSync(MEMORY_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && fs.existsSync(path.join(MEMORY_DIR, entry.name, '.env'))) {
        accounts.push(entry.name);
      }
    }
  }
  
  return accounts;
}

/**
 * Load environment variables for a specific account
 * @param {string} localDir - Local directory for fallback
 * @param {string} account - Account name (optional, uses default if not specified)
 */
export function loadEnv(localDir, account = null) {
  let envPath;
  
  if (account && account !== 'default') {
    // Named account: look in subdirectory
    envPath = path.join(MEMORY_DIR, account, '.env');
    if (!fs.existsSync(envPath)) {
      console.error(`Error: Account "${account}" not found.`);
      console.error(`Expected credentials at: ${envPath}`);
      console.error('');
      console.error('Available accounts:');
      const accounts = listAccounts();
      if (accounts.length === 0) {
        console.error('  (none configured)');
      } else {
        for (const acc of accounts) {
          console.error(`  - ${acc}`);
        }
      }
      console.error('');
      console.error('See SETUP.md for multi-account configuration.');
      process.exit(1);
    }
  } else {
    // Default account: look in root memory dir or local
    const memoryEnvPath = path.join(MEMORY_DIR, '.env');
    const localEnvPath = path.join(localDir, '.env');
    
    if (fs.existsSync(memoryEnvPath)) {
      envPath = memoryEnvPath;
    } else if (fs.existsSync(localEnvPath)) {
      envPath = localEnvPath;
    } else {
      // Check if there are named accounts available
      const accounts = listAccounts();
      if (accounts.length > 0) {
        console.error('Error: No default account configured.');
        console.error('');
        console.error('Available accounts (use --account <name>):');
        for (const acc of accounts) {
          console.error(`  - ${acc}`);
        }
        console.error('');
        console.error('Example: node scripts/user.js me --account personal');
      } else {
        console.error('Error: No .env file found.');
        console.error('Create /memory/Connectors/xcom/.env with:');
        console.error('  X_API_KEY=your_api_key');
        console.error('  X_API_SECRET=your_api_secret');
        console.error('  X_ACCESS_TOKEN=your_access_token');
        console.error('  X_ACCESS_TOKEN_SECRET=your_access_token_secret');
        console.error('');
        console.error('For multiple accounts, create subdirectories:');
        console.error('  /memory/Connectors/xcom/personal/.env');
        console.error('  /memory/Connectors/xcom/business/.env');
        console.error('');
        console.error('See SETUP.md for instructions.');
      }
      process.exit(1);
    }
  }
  
  dotenv.config({ path: envPath });
  loadedAccount = account || 'default';
  return envPath;
}

/**
 * Get currently loaded account name
 */
export function getLoadedAccount() {
  return loadedAccount;
}

/**
 * Get OAuth 1.0a credentials from environment
 */
export function getCredentials() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  const bearerToken = process.env.X_BEARER_TOKEN;
  
  if (!apiKey || !apiSecret) {
    console.error('Error: X_API_KEY and X_API_SECRET are required.');
    console.error('Add them to /memory/Connectors/xcom/.env');
    process.exit(1);
  }
  
  return { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken };
}

/**
 * Generate OAuth 1.0a nonce
 */
function generateNonce() {
  return crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Percent encode per OAuth spec
 */
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Generate OAuth 1.0a signature
 */
function generateSignature(method, url, params, consumerSecret, tokenSecret) {
  // Sort and encode parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  
  // Create signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(url.split('?')[0]),
    percentEncode(sortedParams)
  ].join('&');
  
  // Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret || '')}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
  
  return signature;
}

/**
 * Generate OAuth 1.0a Authorization header
 */
export function generateOAuthHeader(method, url, params = {}, credentials) {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials;
  
  if (!accessToken || !accessTokenSecret) {
    console.error('Error: X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET are required for this operation.');
    console.error('Add them to /memory/Connectors/xcom/.env');
    process.exit(1);
  }
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0'
  };
  
  // Combine OAuth params with request params for signature
  const allParams = { ...oauthParams, ...params };
  
  // Generate signature
  const signature = generateSignature(method, url, allParams, apiSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;
  
  // Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
  
  return authHeader;
}

/**
 * Parse command line arguments
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

/**
 * Make authenticated API request to X.com API v2
 */
export async function apiRequest(method, endpoint, options = {}) {
  const credentials = getCredentials();
  const { body, params = {}, useBearer = false } = options;
  
  // Build URL
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  // Add query parameters to URL
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  }
  const queryString = queryParams.toString();
  if (queryString) {
    url += (url.includes('?') ? '&' : '?') + queryString;
  }
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (useBearer && credentials.bearerToken) {
    headers['Authorization'] = `Bearer ${credentials.bearerToken}`;
  } else {
    // Use OAuth 1.0a
    const oauthParams = method === 'GET' ? params : {};
    headers['Authorization'] = generateOAuthHeader(method, url.split('?')[0], oauthParams, credentials);
  }
  
  const fetchOptions = {
    method,
    headers
  };
  
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  // Handle rate limiting
  if (response.status === 429) {
    const resetTime = response.headers.get('x-rate-limit-reset');
    const error = new Error('Rate limit exceeded');
    error.status = 429;
    error.resetTime = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
    throw error;
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.detail || data.title || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Make request to v1.1 media upload endpoint
 */
export async function mediaUploadRequest(endpoint, options = {}) {
  const credentials = getCredentials();
  const { formData, params = {} } = options;
  
  const url = `${UPLOAD_BASE}${endpoint}`;
  
  // For media upload, we use form data and OAuth 1.0a
  const oauthHeader = generateOAuthHeader('POST', url, params, credentials);
  
  const headers = {
    'Authorization': oauthHeader
  };
  
  const fetchOptions = {
    method: 'POST',
    headers,
    body: formData
  };
  
  const response = await fetch(url, fetchOptions);
  
  if (response.status === 429) {
    const error = new Error('Rate limit exceeded');
    error.status = 429;
    throw error;
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || data.errors?.[0]?.message || 'Media upload failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Paginated API request
 */
export async function apiRequestPaginated(endpoint, options = {}) {
  const { all = false, maxResults = 100, params = {} } = options;
  let allResults = [];
  let nextToken = null;
  let pageCount = 0;
  
  do {
    const requestParams = { ...params, max_results: maxResults };
    if (nextToken) {
      requestParams.pagination_token = nextToken;
    }
    
    const data = await apiRequest('GET', endpoint, { params: requestParams });
    
    const results = data.data || [];
    allResults = allResults.concat(results);
    
    nextToken = data.meta?.next_token || null;
    pageCount++;
    
    if (!all) break;
    
    // Safety limit
    if (pageCount > 100) {
      console.log('Warning: Reached 100 page limit');
      break;
    }
  } while (nextToken && all);
  
  return {
    data: allResults,
    meta: {
      total: allResults.length,
      pages: pageCount
    }
  };
}

/**
 * Confirm destructive action with user
 */
export async function confirmDestructiveAction(message, details = null, forceFlag = false) {
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
 * Handle errors consistently
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (error.resetTime) {
    console.error('Rate limit resets at:', error.resetTime.toLocaleString());
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
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
  
  // Always show account options
  console.log('Account Options:');
  console.log('  --account <name>          Use a specific account');
  console.log('  accounts                  List available accounts');
  console.log('');
}

/**
 * Show which account is being used
 */
export function showAccountInfo() {
  const account = getLoadedAccount();
  if (account && account !== 'default') {
    console.log(`Using account: ${account}\n`);
  }
}

/**
 * Print available accounts
 */
export function printAccounts() {
  const accounts = listAccounts();
  
  if (accounts.length === 0) {
    console.log('No accounts configured.\n');
    console.log('To set up an account:');
    console.log('1. Create /memory/Connectors/xcom/.env for a default account');
    console.log('2. Or create /memory/Connectors/xcom/<name>/.env for named accounts');
    console.log('');
    console.log('See SETUP.md for detailed instructions.');
    return;
  }
  
  console.log('Available X.com accounts:\n');
  for (const account of accounts) {
    console.log(`  - ${account}`);
  }
  console.log('');
  console.log('Usage: node scripts/<script>.js <command> --account <name>');
}

/**
 * Truncate text for display
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length - 3) + '...';
}

/**
 * Get authenticated user ID (needed for many endpoints)
 */
export async function getAuthenticatedUserId() {
  const data = await apiRequest('GET', '/users/me');
  return data.data.id;
}

/**
 * Initialize script with account support
 * Call this at the start of each script instead of loadEnv directly
 */
export function initScript(localDir, args) {
  // Handle "accounts" command
  if (args._[0] === 'accounts') {
    printAccounts();
    process.exit(0);
  }
  
  // Skip credential loading for help command
  if (args._[0] === 'help' || args.help || args._.length === 0) {
    return; // Let the script show help without requiring credentials
  }
  
  // Load environment for specified account
  loadEnv(localDir, args.account);
  
  // Show which account if not default
  if (args.account && args.account !== 'default') {
    showAccountInfo();
  }
}

export { MEMORY_DIR, API_BASE, UPLOAD_BASE };
