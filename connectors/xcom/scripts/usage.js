#!/usr/bin/env node

/**
 * X.com API Usage
 * Check pay-per-use Post consumption and legacy rate limits.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, getCredentials, generateOAuthHeader, apiRequest,
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
      'posts                     Check pay-per-use Post consumption via /2/usage/tweets',
      'status                    Check legacy 15-minute rate limit status',
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
      'node usage.js posts',
      'node usage.js status',
      'node usage.js status --resources users,statuses',
      'node usage.js status --verbose'
    ],
    'Notes': [
      'X API uses pay-per-use credits. Reads are charged per resource returned; writes/actions are charged per request.',
      'Use "posts" to monitor monthly Post consumption against the project cap.',
      'Use "status" only for legacy 15-minute rate-limit diagnostics.'
    ]
  });
}

// Get pay-per-use Post consumption
async function getPostUsage(args) {
  console.log('Fetching pay-per-use Post consumption...\n');

  const data = await apiRequest('GET', '/usage/tweets', { useBearer: true });

  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const usage = data.data || {};
  const projectUsage = Number(usage.project_usage ?? 0);
  const projectCap = Number(usage.project_cap ?? 0);
  const remaining = projectCap ? Math.max(projectCap - projectUsage, 0) : null;
  const percentUsed = projectCap ? ((projectUsage / projectCap) * 100).toFixed(2) : null;

  console.log('Pay-Per-Use Post Consumption');
  console.log('-'.repeat(50));
  console.log(`Project ID: ${usage.project_id || 'n/a'}`);
  console.log(`Posts consumed this cycle: ${projectUsage.toLocaleString()}`);
  console.log(`Project cap: ${projectCap ? projectCap.toLocaleString() : 'n/a'}`);
  if (remaining !== null) {
    console.log(`Remaining before cap: ${remaining.toLocaleString()} (${percentUsed}% used)`);
  }
  if (usage.cap_reset_day) {
    console.log(`Cap reset day: ${usage.cap_reset_day}`);
  }

  const daily = usage.daily_project_usage || [];
  if (daily.length > 0) {
    console.log('\nDaily usage:');
    for (const day of daily) {
      const dayTotal = (day.usage || []).reduce((sum, item) => sum + Number(item.tweets_consumed || 0), 0);
      console.log(`  ${day.date}: ${dayTotal.toLocaleString()} Posts`);
      for (const item of day.usage || []) {
        console.log(`    app ${item.app_id}: ${Number(item.tweets_consumed || 0).toLocaleString()}`);
      }
    }
  }

  console.log('\nCost model: reads are charged per resource returned; writes/actions are charged per request.');
  console.log('Credit balance and exact dollar spend are available in the X Developer Console.');
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
  console.log('Legacy Rate Limit Information:');
  console.log('-'.repeat(50));
  console.log('These are 15-minute endpoint limits, not pay-per-use credit balance.');
  console.log('Run "node usage.js posts" to check monthly Post consumption.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'posts':
        await getPostUsage(args);
        break;
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
