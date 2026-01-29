// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Built-in Node.js modules
import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/zoom/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/zoom/
const MEMORY_DIR = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'zoom');
const memoryEnvPath = join(MEMORY_DIR, '.env');
const localEnvPath = join(__dirname, '..', '.env');
const tokenCachePath = join(MEMORY_DIR, '.token-cache.json');

// Zoom API base URL
const API_BASE = 'https://api.zoom.us/v2';

/**
 * Load configuration from .env file
 * Checks memory location first, then local fallback
 */
export function loadConfig() {
  if (existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error(`Create ${memoryEnvPath} with your Zoom credentials.`);
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  const required = ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Error: Missing required credentials: ${missing.join(', ')}`);
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  return {
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET
  };
}

/**
 * Get cached access token or fetch new one
 * Zoom S2S tokens expire after 1 hour
 */
export async function getAccessToken() {
  const config = loadConfig();
  
  // Check for cached token
  if (existsSync(tokenCachePath)) {
    try {
      const cache = JSON.parse(readFileSync(tokenCachePath, 'utf8'));
      const expiresAt = new Date(cache.expires_at);
      const now = new Date();
      
      // Use cached token if it has more than 5 minutes remaining
      if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
        return cache.access_token;
      }
    } catch (e) {
      // Cache read failed, fetch new token
    }
  }
  
  // Fetch new token using Server-to-Server OAuth
  const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=account_credentials&account_id=${config.accountId}`
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${errorText}. Status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the token
  const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
  const cacheData = {
    access_token: data.access_token,
    expires_at: expiresAt.toISOString(),
    token_type: data.token_type
  };
  
  // Ensure memory directory exists
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  
  writeFileSync(tokenCachePath, JSON.stringify(cacheData, null, 2));
  
  return data.access_token;
}

/**
 * Parse command line arguments
 * @returns {object} { command, args, flags }
 */
export function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const flags = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }

  return { command, args: positional, flags };
}

/**
 * Initialize script with access token
 * Handles help command (no credentials needed)
 * @param {function} showHelp - Function to display help
 * @returns {Promise<object|null>} { token } or null if help shown
 */
export async function initScript(showHelp) {
  const { command } = parseArgs();

  if (command === 'help') {
    showHelp();
    return null;
  }

  const token = await getAccessToken();
  return { token };
}

/**
 * Make Zoom API request with error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @param {string} token - Access token
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}, token) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  const text = await response.text();
  
  if (!response.ok) {
    let errorMessage;
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.message || errorJson.error || text;
    } catch {
      errorMessage = text;
    }
    throw new Error(`${errorMessage} Status: ${response.status}`);
  }

  return text ? JSON.parse(text) : {};
}

/**
 * Format output consistently
 * @param {object} data - Data to output
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format error consistently
 * @param {Error} error - Error to output
 */
export function outputError(error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

/**
 * Build query string from flags
 * @param {object} flags - Flag object
 * @param {string[]} allowedKeys - Keys to include in query string
 * @returns {string} Query string (with leading ?)
 */
export function buildQuery(flags, allowedKeys) {
  const params = new URLSearchParams();
  for (const key of allowedKeys) {
    if (flags[key] !== undefined) {
      params.append(key, flags[key]);
    }
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export { MEMORY_DIR, API_BASE };
