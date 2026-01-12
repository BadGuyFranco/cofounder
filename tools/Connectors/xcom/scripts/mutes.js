#!/usr/bin/env node

/**
 * X.com Mutes Management
 * Mute, unmute, and list muted users.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated, confirmDestructiveAction,
  handleError, showHelp, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Mutes', {
    'Commands': [
      'list                       List muted users',
      'mute <user_id>             Mute a user',
      'unmute <user_id>           Unmute a user',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results (default: 100, max: 1000)',
      '--all                      Fetch all pages',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for unmute'
    ],
    'Examples': [
      'node mutes.js list',
      'node mutes.js mute 1234567890123456789',
      'node mutes.js unmute 1234567890123456789'
    ],
    'Notes': [
      'Muted users cannot see that they are muted',
      'You will not see their tweets in your timeline',
      'Use user.js to look up user IDs from usernames'
    ]
  });
}

const USER_FIELDS = 'name,username,description,public_metrics';

// List muted users
async function listMutes(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 1000)
  };
  
  console.log('Fetching muted users...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${userId}/muting`, {
      all: true,
      maxResults: Math.min(limit, 1000),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} muted users:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/users/${userId}/muting`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} muted users:\n`);
    
    for (const user of users) {
      displayUser(user);
    }
  }
}

// Display user
function displayUser(user) {
  const metrics = user.public_metrics || {};
  console.log(`${user.name} (@${user.username})`);
  if (user.description) {
    const desc = user.description.length > 80 ? user.description.substring(0, 80) + '...' : user.description;
    console.log(`  ${desc}`);
  }
  console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0} | ID: ${user.id}`);
  console.log('');
}

// Mute a user
async function muteUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Muting user...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/muting`, {
    body: { target_user_id: targetUserId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.muting) {
    console.log('User muted successfully.');
  } else {
    console.log('Mute may have failed. Check the user.');
  }
}

// Unmute a user
async function unmuteUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Unmute user: ${targetUserId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/muting/${targetUserId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('User unmuted successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listMutes(args);
        break;
      case 'mute':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node mutes.js mute <user_id>');
          process.exit(1);
        }
        await muteUser(args._[1], args);
        break;
      case 'unmute':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node mutes.js unmute <user_id>');
          process.exit(1);
        }
        await unmuteUser(args._[1], args);
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
