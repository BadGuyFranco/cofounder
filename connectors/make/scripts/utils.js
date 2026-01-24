/**
 * Make.com API Utilities
 * Shared utilities for Make connector scripts.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Built-in Node.js modules
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/make/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/make/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'make', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(memoryEnvPath)) {
  dotenv.config({ path: memoryEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}
// Don't exit here - let validateEnv() handle missing credentials when API is called

// Validate required environment variables
export function validateEnv() {
  if (!process.env.MAKE_API_TOKEN) {
    console.error('Error: MAKE_API_TOKEN not found in environment.');
    console.error('');
    console.error('Create /memory/connectors/make/.env with:');
    console.error('  MAKE_API_TOKEN=your-token-here');
    console.error('  MAKE_REGION=us1');
    console.error('');
    console.error('See SETUP.md for instructions on creating an API token.');
    process.exit(1);
  }
}

// Get the API base URL based on region
export function getBaseUrl() {
  const region = process.env.MAKE_REGION || 'us1';
  return `https://${region}.make.com/api/v2`;
}

// Make an authenticated API request
export async function makeRequest(endpoint, options = {}) {
  validateEnv();
  
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Authorization': `Token ${process.env.MAKE_API_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.detail || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`API Error ${response.status}: ${errorMessage}`);
  }
  
  // Handle empty responses (204 No Content, etc.)
  const text = await response.text();
  if (!text) {
    return null;
  }
  
  return JSON.parse(text);
}

// GET request helper
export async function get(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return makeRequest(url, { method: 'GET' });
}

// POST request helper
export async function post(endpoint, data = {}) {
  return makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// PATCH request helper
export async function patch(endpoint, data = {}) {
  return makeRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

// DELETE request helper
export async function del(endpoint) {
  return makeRequest(endpoint, { method: 'DELETE' });
}

// Parse command line arguments
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

// Format output based on verbosity
export function formatOutput(data, verbose = false) {
  if (verbose) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Print a table of items
export function printTable(items, columns) {
  if (!items || items.length === 0) {
    console.log('No items found.');
    return;
  }
  
  // Calculate column widths
  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.label.length;
    items.forEach(item => {
      const value = String(col.getter ? col.getter(item) : item[col.key] || '');
      widths[col.key] = Math.max(widths[col.key], value.length);
    });
  });
  
  // Print header
  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(header);
  console.log(columns.map(col => '-'.repeat(widths[col.key])).join('  '));
  
  // Print rows
  items.forEach(item => {
    const row = columns.map(col => {
      const value = String(col.getter ? col.getter(item) : item[col.key] || '');
      return value.padEnd(widths[col.key]);
    }).join('  ');
    console.log(row);
  });
}
