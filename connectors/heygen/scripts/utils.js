#!/usr/bin/env node

/**
 * HeyGen Connector Utilities
 * Shared functions for API calls, config, and multi-account support.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs } from '../../../system/shared/utils.js';

// Built-in Node.js modules
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/heygen/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/heygen/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'heygen');
const API_BASE = 'https://api.heygen.com';

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
 * @param {string} account - Account name (optional, uses default if not specified)
 */
export function loadEnv(account = null) {
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
    // Default account: look in root memory dir
    envPath = path.join(MEMORY_DIR, '.env');
    
    if (!fs.existsSync(envPath)) {
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
        console.error('Example: node scripts/videos.js list --account personal');
      } else {
        console.error('Error: No .env file found.');
        console.error('Create /memory/connectors/heygen/.env with:');
        console.error('  HEYGEN_API_KEY=your_api_key_here');
        console.error('');
        console.error('For multiple accounts, create subdirectories:');
        console.error('  /memory/connectors/heygen/personal/.env');
        console.error('  /memory/connectors/heygen/business/.env');
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
 * Get API credentials from environment
 */
export function getCredentials() {
  const apiKey = process.env.HEYGEN_API_KEY;
  
  if (!apiKey) {
    console.error('Error: HEYGEN_API_KEY not found in environment.');
    console.error('Add HEYGEN_API_KEY=your_key to /memory/connectors/heygen/.env');
    process.exit(1);
  }
  
  return { apiKey };
}

// Re-export parseArgs from shared utils
export { parseArgs };

/**
 * Make API request to HeyGen
 */
export async function apiRequest(method, endpoint, options = {}) {
  const credentials = getCredentials();
  const { body, params = {} } = options;
  
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
    'X-Api-Key': credentials.apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
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
    const error = new Error('Rate limit exceeded. Please wait and try again.');
    error.status = 429;
    throw error;
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || data.error || 'API request failed';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Initialize script with account support
 */
export function initScript(args) {
  // Handle "accounts" command
  if (args._[0] === 'accounts') {
    printAccounts();
    process.exit(0);
  }
  
  // Skip credential loading for help command
  if (args._[0] === 'help' || args.help || args._.length === 0) {
    return false; // Let the script show help without requiring credentials
  }
  
  // Load environment for specified account
  loadEnv(args.account);
  
  // Show which account if not default
  if (args.account && args.account !== 'default') {
    showAccountInfo();
  }
  
  return true;
}

/**
 * Print available accounts
 */
export function printAccounts() {
  const accounts = listAccounts();
  
  if (accounts.length === 0) {
    console.log('No accounts configured.\n');
    console.log('To set up an account:');
    console.log('1. Create /memory/connectors/heygen/.env for a default account');
    console.log('2. Or create /memory/connectors/heygen/<name>/.env for named accounts');
    console.log('');
    console.log('See SETUP.md for detailed instructions.');
    return;
  }
  
  console.log('Available HeyGen accounts:\n');
  for (const account of accounts) {
    console.log(`  - ${account}`);
  }
  console.log('');
  console.log('Usage: node scripts/<script>.js <command> --account <name>');
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
 * Format output consistently
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
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

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
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
 * Poll for video completion
 */
export async function pollVideoStatus(videoId, maxAttempts = 60, intervalMs = 5000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await apiRequest('GET', `/v1/video_status.get`, {
      params: { video_id: videoId }
    });
    
    const status = data.data?.status;
    
    if (status === 'completed') {
      return data.data;
    }
    
    if (status === 'failed') {
      throw new Error(`Video generation failed: ${data.data?.error || 'Unknown error'}`);
    }
    
    // Still processing, wait and retry
    console.log(`Status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Video generation timed out. Check status manually with: videos.js status <id>');
}

export { MEMORY_DIR, API_BASE };
