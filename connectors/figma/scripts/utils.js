/**
 * Figma Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs as sharedParseArgs, sleep } from '../../../system/shared/utils.js';

// Built-in Node.js modules (always available)
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/figma/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/figma/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'figma', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

/**
 * Load configuration from .env file
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/figma/.env with your FIGMA_PAT');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.FIGMA_PAT) {
    console.error('Error: FIGMA_PAT not found in environment.');
    console.error('Add FIGMA_PAT=figd_XXXXX to your .env file.');
    process.exit(1);
  }

  return {
    pat: process.env.FIGMA_PAT
  };
}

/**
 * Parse command line arguments
 * @returns {object} { command, args, flags }
 */
export function parseArgs() {
  const parsed = sharedParseArgs(process.argv.slice(2));
  const positional = parsed._ || [];
  const command = positional[0];
  const args = positional.slice(1);
  
  // Extract flags (everything except _)
  const flags = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== '_') {
      flags[key] = value;
    }
  }
  
  return { command, args, flags };
}

/**
 * Make API request with rate limiting and error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const baseUrl = 'https://api.figma.com';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'X-Figma-Token': config.pat,
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

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API request failed: ${text}. Status: ${response.status}`);
      }
      return { raw: await response.text() };
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.err || data.message || 'API request failed');
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

// Re-export sleep from shared utils
export { sleep };

/**
 * Parse a Figma URL to extract file key and optionally node ID
 * @param {string} urlOrKey - Figma URL or file key
 * @returns {object} { fileKey, nodeId }
 */
export function parseFigmaUrl(urlOrKey) {
  // If it's just a key (no slashes), return as-is
  if (!urlOrKey.includes('/')) {
    return { fileKey: urlOrKey, nodeId: null };
  }

  // Parse URL: https://www.figma.com/:file_type/:file_key/:file_name?node-id=:id
  const url = new URL(urlOrKey);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // file_type is first (file, design, etc.), file_key is second
  const fileKey = pathParts[1] || null;
  
  // Node ID from query parameter
  const nodeId = url.searchParams.get('node-id');

  return { fileKey, nodeId };
}

/**
 * Download a file from a URL and save it locally
 * @param {string} url - URL to download
 * @param {string} outputPath - Local file path to save to
 */
export async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * Format output as JSON
 * @param {object} data - Data to output
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format error and exit
 * @param {Error} error - Error to output
 */
export function outputError(error) {
  console.error(`Error: ${error.message}`);
  if (error.details) {
    console.error('Details:', JSON.stringify(error.details, null, 2));
  }
  process.exit(1);
}
