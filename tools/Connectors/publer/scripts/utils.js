/**
 * Publer Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 * 
 * API Documentation: https://publer.com/docs
 * Base URL: https://app.publer.com/api/v1
 * Rate Limit: 100 requests per 2 minutes per user
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory for credentials
const memoryEnvPath = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/publer/.env'
);
const localEnvPath = path.join(__dirname, '..', '.env');

// API base URL (from official docs)
const BASE_URL = 'https://app.publer.com/api/v1';

// Rate limit tracking
let requestCount = 0;
let windowStart = Date.now();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Load environment variables from .env file
 * @returns {object} Configuration object
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/Connectors/publer/.env with your credentials.');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.PUBLER_API_KEY) {
    console.error('Error: PUBLER_API_KEY not found in environment.');
    console.error('Add PUBLER_API_KEY=your_key to your .env file.');
    process.exit(1);
  }

  return {
    apiKey: process.env.PUBLER_API_KEY,
    // Workspace ID is optional - some endpoints don't require it
    workspaceId: process.env.PUBLER_WORKSPACE_ID || null
  };
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments with _ for positional args
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
 * Check and enforce rate limits
 * Publer allows 100 requests per 2 minutes
 */
async function checkRateLimit() {
  const now = Date.now();
  
  // Reset window if expired
  if (now - windowStart > RATE_WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }
  
  // If at limit, wait for window to reset
  if (requestCount >= RATE_LIMIT) {
    const waitTime = RATE_WINDOW_MS - (now - windowStart);
    if (waitTime > 0) {
      console.error(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await sleep(waitTime);
      requestCount = 0;
      windowStart = Date.now();
    }
  }
  
  requestCount++;
}

/**
 * Make API request with error handling and rate limiting
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {object} options - Fetch options
 * @param {object} [configOverride] - Optional config override
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}, configOverride = null) {
  await checkRateLimit();
  
  const config = configOverride || loadConfig();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add workspace header if available and not explicitly disabled
  if (config.workspaceId && options.includeWorkspace !== false) {
    headers['Publer-Workspace-Id'] = config.workspaceId;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete fetchOptions.headers['Content-Type'];
    fetchOptions.body = options.body;
  } else if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    const response = await fetch(url, fetchOptions);

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || 120; // Default 2 minutes
      console.error(`Rate limited. Waiting ${retryAfter} seconds...`);
      await sleep(parseInt(retryAfter) * 1000);
      retries++;
      continue;
    }

    // Handle empty responses
    const text = await response.text();
    let data = {};
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const error = new Error(data.message || data.error || `API request failed: ${response.statusText}`);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date for Publer API (ISO 8601)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Parse date from various formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date} Parsed date
 */
export function parseDate(dateStr) {
  // Support common formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

/**
 * Format post for display
 * @param {object} post - Post object from API
 * @returns {string} Formatted post string
 */
export function formatPost(post) {
  const lines = [];
  lines.push(`ID: ${post.id || post._id || 'N/A'}`);
  lines.push(`Status: ${post.status || 'unknown'}`);
  
  if (post.text) {
    const truncatedText = post.text.length > 100 
      ? post.text.substring(0, 100) + '...' 
      : post.text;
    lines.push(`Text: ${truncatedText}`);
  }
  
  if (post.scheduled_at) {
    lines.push(`Scheduled: ${new Date(post.scheduled_at).toLocaleString()}`);
  }
  
  if (post.published_at) {
    lines.push(`Published: ${new Date(post.published_at).toLocaleString()}`);
  }
  
  if (post.social_accounts && post.social_accounts.length > 0) {
    const accounts = post.social_accounts.map(a => a.name || a.username || a.id).join(', ');
    lines.push(`Accounts: ${accounts}`);
  } else if (post.account_ids && post.account_ids.length > 0) {
    lines.push(`Account IDs: ${post.account_ids.join(', ')}`);
  }
  
  if (post.media && post.media.length > 0) {
    lines.push(`Media: ${post.media.length} file(s)`);
  }
  
  return lines.join('\n');
}

/**
 * Format account for display
 * @param {object} account - Social account object
 * @returns {string} Formatted account string
 */
export function formatAccount(account) {
  const lines = [];
  const name = account.name || account.username || account.screen_name || 'Unknown';
  lines.push(`${name}`);
  lines.push(`  ID: ${account.id || account._id}`);
  lines.push(`  Platform: ${account.type || account.platform || account.social_network || 'Unknown'}`);
  
  if (account.connected !== undefined) {
    lines.push(`  Connected: ${account.connected ? 'Yes' : 'No'}`);
  }
  
  if (account.profile_url) {
    lines.push(`  Profile: ${account.profile_url}`);
  }
  
  return lines.join('\n');
}

/**
 * Format user for display
 * @param {object} user - User object from API
 * @returns {string} Formatted user string
 */
export function formatUser(user) {
  const lines = [];
  lines.push(`Name: ${user.name || user.full_name || 'N/A'}`);
  lines.push(`Email: ${user.email || 'N/A'}`);
  
  if (user.id || user._id) {
    lines.push(`ID: ${user.id || user._id}`);
  }
  
  if (user.plan) {
    lines.push(`Plan: ${user.plan}`);
  }
  
  if (user.timezone) {
    lines.push(`Timezone: ${user.timezone}`);
  }
  
  return lines.join('\n');
}

/**
 * Format workspace for display
 * @param {object} workspace - Workspace object from API
 * @returns {string} Formatted workspace string
 */
export function formatWorkspace(workspace) {
  const lines = [];
  lines.push(`${workspace.name || 'Unnamed Workspace'}`);
  lines.push(`  ID: ${workspace.id || workspace._id}`);
  
  if (workspace.plan) {
    lines.push(`  Plan: ${workspace.plan}`);
  }
  
  if (workspace.accounts_count !== undefined || workspace.social_accounts_count !== undefined) {
    lines.push(`  Social Accounts: ${workspace.accounts_count || workspace.social_accounts_count}`);
  }
  
  if (workspace.members_count !== undefined) {
    lines.push(`  Members: ${workspace.members_count}`);
  }
  
  return lines.join('\n');
}

/**
 * Format media item for display
 * @param {object} item - Media object from API
 * @returns {string} Formatted media string
 */
export function formatMedia(item) {
  const lines = [];
  lines.push(`${item.name || item.filename || item.original_filename || 'Unnamed'}`);
  lines.push(`  ID: ${item.id || item._id}`);
  lines.push(`  Type: ${item.type || item.content_type || item.mime_type || 'Unknown'}`);
  
  if (item.url) {
    lines.push(`  URL: ${item.url}`);
  }
  
  if (item.size) {
    lines.push(`  Size: ${formatFileSize(item.size)}`);
  }
  
  if (item.width && item.height) {
    lines.push(`  Dimensions: ${item.width}x${item.height}`);
  }
  
  return lines.join('\n');
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Human readable size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Parse JSON safely
 * @param {string} str - JSON string to parse
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

/**
 * Validate required environment
 * @param {string[]} required - Required env vars
 */
export function validateEnv(required) {
  const config = loadConfig();
  const missing = [];
  
  for (const key of required) {
    if (key === 'workspaceId' && !config.workspaceId) {
      missing.push('PUBLER_WORKSPACE_ID');
    }
  }
  
  if (missing.length > 0) {
    console.error(`Error: Missing required configuration: ${missing.join(', ')}`);
    console.error('Add these to /memory/Connectors/publer/.env');
    process.exit(1);
  }
  
  return config;
}
