#!/usr/bin/env node

/**
 * X.com API Usage
 * Check rate limits and API usage.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, getCredentials, generateOAuthHeader,
  handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

const RATE_LIMIT_URL = 'https://api.twitter.com/1.1/application/rate_limit_status.json';

// Help documentation
function printHelp() {
  showHelp('X.com API Usage', {
    'Commands': [
      'status                    Check current rate limit status',
      'help                      Show this help'
    ],
    'Options': [
      '--resources <list>        Comma-separated resources (e.g., users,statuses)',
      '--verbose                 Show full API response'
    ],
    'Resource Categories': [
      'users          - User lookups and operations',
      'statuses       - Tweet operations',
      'search         - Search queries',
      'followers      - Follower operations',
      'friends        - Following operations',
      'favorites      - Like operations',
      'lists          - List operations',
      'direct_messages - DM operations',
      'blocks         - Block operations',
      'mutes          - Mute operations'
    ],
    'Examples': [
      'node usage.js status',
      'node usage.js status --resources users,statuses',
      'node usage.js status --verbose'
    ],
    'Notes': [
      'Rate limits reset every 15 minutes',
      'Different endpoints have different limits',
      'Free tier has 500 tweets/month, 10K reads/month'
    ]
  });
}

// Get rate limit status
async function getRateLimitStatus(args) {
  const credentials = getCredentials();
  
  const params = {};
  if (args.resources) {
    params.resources = args.resources;
  }
  
  const queryString = Object.keys(params).length > 0
    ? '?' + new URLSearchParams(params).toString()
    : '';
  
  const url = RATE_LIMIT_URL + queryString;
  const oauthHeader = generateOAuthHeader('GET', RATE_LIMIT_URL, params, credentials);
  
  console.log('Fetching rate limit status...\n');
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': oauthHeader
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.message || 'Failed to fetch rate limits');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  // Display rate limits by category
  const resources = data.resources || {};
  
  for (const [category, endpoints] of Object.entries(resources)) {
    console.log(`\n${category.toUpperCase()}`);
    console.log('-'.repeat(50));
    
    for (const [endpoint, limits] of Object.entries(endpoints)) {
      const remaining = limits.remaining;
      const limit = limits.limit;
      const reset = new Date(limits.reset * 1000);
      const resetIn = Math.max(0, Math.ceil((reset - Date.now()) / 60000));
      
      const status = remaining === 0 ? '[EXHAUSTED]' : 
                     remaining < limit * 0.1 ? '[LOW]' : '';
      
      console.log(`${endpoint}`);
      console.log(`  ${remaining}/${limit} remaining ${status}`);
      console.log(`  Resets in ${resetIn} minutes`);
    }
  }
  
  console.log('\n');
  console.log('API Tier Information:');
  console.log('-'.repeat(50));
  console.log('Free:  500 tweets/month, 10K reads/month');
  console.log('Basic: 3K tweets/month, 10K reads/month ($200/mo)');
  console.log('Pro:   1M tweets/month, full access ($5,000/mo)');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'status':
        await getRateLimitStatus(args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
