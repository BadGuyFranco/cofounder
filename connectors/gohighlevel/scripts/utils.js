#!/usr/bin/env node

/**
 * Go High Level Shared Utilities
 * Common functions used across all GHL scripts.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const MEMORY_DIR = path.join(process.env.HOME || '', 'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/connectors/gohighlevel');
const BASE_URL = 'https://services.leadconnectorhq.com';

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
    console.error('Create /memory/connectors/gohighlevel/.env');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
}

/**
 * Parse locations from environment variables
 * Looks for GHL_*_ID and GHL_*_KEY pairs
 */
export function loadLocations() {
  const locations = {};
  const envKeys = Object.keys(process.env);
  
  for (const key of envKeys) {
    const match = key.match(/^GHL_(.+)_ID$/);
    if (match) {
      const name = match[1].replace(/_/g, ' ');
      const id = process.env[key];
      const keyVar = `GHL_${match[1]}_KEY`;
      const apiKey = process.env[keyVar];
      
      locations[name] = { id, key: apiKey || null };
    }
  }
  
  const defaultLoc = process.env.GHL_DEFAULT || null;
  
  return { locations, default: defaultLoc };
}

/**
 * Resolve location from name argument
 */
export function resolveLocation(locationArg, locationsConfig) {
  const normalizeForMatch = (str) => str.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  
  if (!locationArg) {
    // Check for default
    if (locationsConfig.default) {
      const defaultNorm = normalizeForMatch(locationsConfig.default);
      for (const [name, config] of Object.entries(locationsConfig.locations)) {
        if (normalizeForMatch(name) === defaultNorm) {
          console.log(`Using default location: ${name}\n`);
          if (!config.key) {
            console.error(`Error: No API key configured for "${name}"`);
            console.error('Add GHL_<NAME>_KEY to your .env file');
            process.exit(1);
          }
          return config;
        }
      }
    }
    
    // No location specified, show available
    console.error('Error: No location specified.');
    console.error('');
    console.error('Available locations:');
    for (const name of Object.keys(locationsConfig.locations)) {
      console.error(`  --location "${name}"`);
    }
    console.error('');
    console.error('Or set GHL_DEFAULT in .env');
    process.exit(1);
  }
  
  // Try to match location name
  const inputNorm = normalizeForMatch(locationArg);
  for (const [name, config] of Object.entries(locationsConfig.locations)) {
    if (normalizeForMatch(name) === inputNorm) {
      if (!config.key) {
        console.error(`Error: No API key configured for "${name}"`);
        console.error('Add GHL_<NAME>_KEY to your .env file');
        process.exit(1);
      }
      return config;
    }
  }
  
  console.error(`Error: Location "${locationArg}" not found.`);
  console.error('');
  console.error('Available locations:');
  for (const name of Object.keys(locationsConfig.locations)) {
    console.error(`  --location "${name}"`);
  }
  process.exit(1);
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
 * Make API request to Go High Level
 */
export async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
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
 * Paginated API request - fetches all pages
 */
export async function apiRequestPaginated(endpoint, apiKey, options = {}) {
  const { all = false, limit = 20 } = options;
  let allResults = [];
  let nextPageUrl = null;
  let pageCount = 0;
  let url = endpoint;
  
  // Add limit to initial URL if specified
  if (limit && !url.includes('limit=')) {
    url += (url.includes('?') ? '&' : '?') + `limit=${limit}`;
  }
  
  do {
    const data = await apiRequest('GET', url, apiKey);
    
    // Handle different response structures
    const results = data.contacts || data.opportunities || data.conversations || 
                   data.appointments || data.tasks || data.notes || data.tags ||
                   data.customFields || data.users || data.forms || data.submissions ||
                   data.funnels || data.websites || data.campaigns || data.workflows ||
                   data.calendars || data.events || [];
    
    allResults = allResults.concat(results);
    nextPageUrl = data.meta?.nextPageUrl || data.nextPageUrl || null;
    pageCount++;
    
    if (!all) break;
    
    if (nextPageUrl) {
      url = nextPageUrl.replace('https://services.leadconnectorhq.com', '');
    }
    
    // Safety limit
    if (pageCount > 100) {
      console.log('Warning: Reached 100 page limit');
      break;
    }
  } while (nextPageUrl && all);
  
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
 * List available locations
 */
export function listLocations(locationsConfig) {
  console.log('Available locations:\n');
  
  if (Object.keys(locationsConfig.locations).length === 0) {
    console.log('  No locations configured.');
    console.log('');
    console.log('Add locations to .env:');
    console.log('  GHL_MY_ACCOUNT_ID=xxx');
    console.log('  GHL_MY_ACCOUNT_KEY=pit-xxx');
    return;
  }
  
  for (const [name, config] of Object.entries(locationsConfig.locations)) {
    const isDefault = locationsConfig.default?.toLowerCase().replace(/[_\s]+/g, ' ') === name.toLowerCase() ? ' (default)' : '';
    const hasKey = config.key ? '' : ' [NO KEY]';
    console.log(`  ${name}${isDefault}${hasKey}`);
    console.log(`    ID: ${config.id}`);
    console.log('');
  }
  
  console.log('Usage: --location "Location Name"');
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

export { MEMORY_DIR, BASE_URL };
