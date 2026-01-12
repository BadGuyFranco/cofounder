#!/usr/bin/env node

/**
 * X.com Blocks Management
 * Block, unblock, and list blocked users.
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
  showHelp('X.com Blocks', {
    'Commands': [
      'list                       List blocked users',
      'block <user_id>            Block a user',
      'unblock <user_id>          Unblock a user',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results (default: 100, max: 1000)',
      '--all                      Fetch all pages',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for unblock'
    ],
    'Examples': [
      'node blocks.js list',
      'node blocks.js block 1234567890123456789',
      'node blocks.js unblock 1234567890123456789'
    ],
    'Notes': [
      'Blocked users cannot follow you or see your tweets',
      'They will be unfollowed if they were following you',
      'Use user.js to look up user IDs from usernames'
    ]
  });
}

const USER_FIELDS = 'name,username,description,public_metrics';

// List blocked users
async function listBlocks(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 1000)
  };
  
  console.log('Fetching blocked users...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${userId}/blocking`, {
      all: true,
      maxResults: Math.min(limit, 1000),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} blocked users:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/users/${userId}/blocking`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} blocked users:\n`);
    
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

// Block a user
async function blockUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Blocking user...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/blocking`, {
    body: { target_user_id: targetUserId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.blocking) {
    console.log('User blocked successfully.');
  } else {
    console.log('Block may have failed. Check the user.');
  }
}

// Unblock a user
async function unblockUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Unblock user: ${targetUserId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/blocking/${targetUserId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('User unblocked successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listBlocks(args);
        break;
      case 'block':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node blocks.js block <user_id>');
          process.exit(1);
        }
        await blockUser(args._[1], args);
        break;
      case 'unblock':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node blocks.js unblock <user_id>');
          process.exit(1);
        }
        await unblockUser(args._[1], args);
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
