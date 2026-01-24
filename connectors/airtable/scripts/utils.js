/**
 * Airtable Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Built-in Node.js modules (always available)
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/airtable/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/airtable/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'airtable', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/airtable/.env with your AIRTABLE_PAT');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.AIRTABLE_PAT) {
    console.error('Error: AIRTABLE_PAT not found in environment.');
    console.error('Add AIRTABLE_PAT=patXXX to your .env file.');
    process.exit(1);
  }

  return {
    pat: process.env.AIRTABLE_PAT
  };
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

// Make API request with rate limiting and error handling
export async function apiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const baseUrl = 'https://api.airtable.com/v0';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${config.pat}`,
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

    if (!response.ok) {
      const error = new Error(data.error?.message || 'API request failed');
      error.type = data.error?.type;
      error.status = response.status;
      error.details = data.error;
      throw error;
    }

    return data;
  }

  throw new Error('Max retries exceeded due to rate limiting');
}

// Sleep helper
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format record for display
export function formatRecord(record, fields = null) {
  const output = [`ID: ${record.id}`];

  if (record.createdTime) {
    output.push(`Created: ${record.createdTime}`);
  }

  if (record.fields) {
    const fieldNames = fields || Object.keys(record.fields);
    for (const name of fieldNames) {
      if (record.fields[name] !== undefined) {
        const value = record.fields[name];
        const displayValue = formatFieldValue(value);
        output.push(`  ${name}: ${displayValue}`);
      }
    }
  }

  return output.join('\n');
}

// Format field value for display
export function formatFieldValue(value) {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';

    // Check if it's attachments
    if (value[0]?.url) {
      return value.map(a => a.filename || a.url).join(', ');
    }

    // Check if it's linked records (array of strings)
    if (typeof value[0] === 'string' && value[0].startsWith('rec')) {
      return `[${value.join(', ')}]`;
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    // User field
    if (value.email) {
      return value.email;
    }
    return JSON.stringify(value);
  }

  return String(value);
}

// Parse JSON safely
export function parseJSON(str, fieldName) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Error: Invalid JSON in --${fieldName}`);
    console.error(`Received: ${str}`);
    process.exit(1);
  }
}
