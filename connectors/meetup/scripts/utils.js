#!/usr/bin/env node

/**
 * Meetup Shared Utilities
 * Common functions used across all Meetup scripts.
 * Uses GraphQL API.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

const MEMORY_DIR = path.join(process.env.HOME || '', 'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/meetup');
const GRAPHQL_URL = 'https://api.meetup.com/gql';
const AUTH_URL = 'https://secure.meetup.com/oauth2/authorize';
const TOKEN_URL = 'https://secure.meetup.com/oauth2/access';

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
    console.error('Create /memory/Connectors/meetup/.env with:');
    console.error('  MEETUP_CLIENT_ID=your_client_id');
    console.error('  MEETUP_CLIENT_SECRET=your_client_secret');
    console.error('  MEETUP_ACCESS_TOKEN=your_access_token');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
}

/**
 * Get access token from environment
 */
export function getToken() {
  const token = process.env.MEETUP_ACCESS_TOKEN;
  if (!token) {
    console.error('Error: MEETUP_ACCESS_TOKEN not found in environment.');
    console.error('Add it to /memory/Connectors/meetup/.env');
    console.error('Run: node scripts/auth.js flow to get a token');
    process.exit(1);
  }
  return token;
}

/**
 * Get client credentials
 */
export function getClientCredentials() {
  const clientId = process.env.MEETUP_CLIENT_ID;
  const clientSecret = process.env.MEETUP_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Error: MEETUP_CLIENT_ID and MEETUP_CLIENT_SECRET required.');
    console.error('Add them to /memory/Connectors/meetup/.env');
    process.exit(1);
  }
  
  return { clientId, clientSecret };
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
 * Make GraphQL request to Meetup API
 */
export async function graphqlRequest(query, variables = {}, token) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
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
    const error = new Error(data.error_description || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data.data;
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
  console.log('========================================================================');
  console.log('  DESTRUCTIVE ACTION WARNING');
  console.log('========================================================================');
  console.log(`  ${message}`);
  
  if (details) {
    for (const line of details) {
      console.log(`    ${line}`);
    }
  }
  
  console.log('------------------------------------------------------------------------');
  console.log('  This action cannot be undone.');
  console.log('');
  console.log('  Use --force to skip this confirmation in scripts.');
  console.log('========================================================================');
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

export { MEMORY_DIR, GRAPHQL_URL, AUTH_URL, TOKEN_URL };
