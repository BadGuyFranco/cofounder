#!/usr/bin/env node

/**
 * Monday.com Shared Utilities
 * Common functions used across all Monday.com scripts.
 * Uses GraphQL API.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/monday/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/monday/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'monday');
const API_URL = 'https://api.monday.com/v2';

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
    console.error('Create /memory/connectors/monday/.env with:');
    console.error('  MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
}

/**
 * Get API token from environment
 */
export function getToken() {
  const token = process.env.MONDAY_API_KEY;
  if (!token) {
    console.error('Error: MONDAY_API_KEY not found in environment.');
    console.error('Add it to /memory/connectors/monday/.env');
    process.exit(1);
  }
  return token;
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
 * Make GraphQL request to Monday.com
 */
export async function graphqlRequest(query, variables = {}, token) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
      'API-Version': '2024-10'
    },
    body: JSON.stringify({ query, variables })
  });
  
  const data = await response.json();
  
  if (data.errors && data.errors.length > 0) {
    const error = new Error(data.errors[0].message);
    error.status = response.status;
    error.errors = data.errors;
    throw error;
  }
  
  if (!response.ok) {
    const error = new Error(data.error_message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data.data;
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
 * Handle errors consistently
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (verbose && error.errors) {
    console.error('Details:', JSON.stringify(error.errors, null, 2));
  }
  if (verbose && error.data) {
    console.error('Data:', JSON.stringify(error.data, null, 2));
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
}

/**
 * Parse column value from Monday.com's JSON format to display format
 */
export function parseColumnValue(column) {
  if (!column.value) return column.text || '';
  
  try {
    const value = JSON.parse(column.value);
    
    // Handle different column types
    if (value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    
    // Status column
    if (value.label) return value.label;
    
    // Date column
    if (value.date) return value.date;
    
    // Person column
    if (value.personsAndTeams) {
      return value.personsAndTeams.map(p => p.id).join(', ');
    }
    
    // Email column
    if (value.email) return value.email;
    
    // Phone column
    if (value.phone) return value.phone;
    
    // Link column
    if (value.url) return value.url;
    
    // Default: return text representation
    return column.text || JSON.stringify(value);
  } catch {
    return column.text || '';
  }
}

/**
 * Format column value for mutation (converts user input to Monday.com JSON format)
 */
export function formatColumnValue(type, value) {
  switch (type) {
    case 'text':
    case 'long-text':
      return JSON.stringify(value);
    
    case 'numbers':
      return JSON.stringify(value);
    
    case 'status':
      // Accept label or index
      if (typeof value === 'number' || !isNaN(parseInt(value))) {
        return JSON.stringify({ index: parseInt(value) });
      }
      return JSON.stringify({ label: value });
    
    case 'date':
      return JSON.stringify({ date: value });
    
    case 'email':
      return JSON.stringify({ email: value, text: value });
    
    case 'phone':
      return JSON.stringify({ phone: value, countryShortName: 'US' });
    
    case 'link':
      return JSON.stringify({ url: value, text: value });
    
    default:
      // For unknown types, try to pass as-is or as JSON
      try {
        JSON.parse(value);
        return value; // Already valid JSON
      } catch {
        return JSON.stringify(value);
      }
  }
}

export { MEMORY_DIR, API_URL };
