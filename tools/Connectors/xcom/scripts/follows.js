#!/usr/bin/env node

/**
 * X.com Follows Management
 * Follow, unfollow, list followers and following.
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
  showHelp('X.com Follows', {
    'Commands': [
      'followers [user_id]        List followers (yours if no user specified)',
      'following [user_id]        List following (yours if no user specified)',
      'follow <user_id>           Follow a user',
      'unfollow <user_id>         Unfollow a user (destructive)',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results to return (default: 100, max: 1000)',
      '--all                      Fetch all available pages',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for unfollow'
    ],
    'Examples': [
      'node follows.js followers',
      'node follows.js followers 1234567890123456789',
      'node follows.js following',
      'node follows.js follow 1234567890123456789',
      'node follows.js unfollow 1234567890123456789'
    ],
    'Notes': [
      'Use user.js to look up user IDs from usernames',
      'Following protected accounts requires their approval',
      'Rate limits apply to follow/unfollow actions'
    ]
  });
}

const USER_FIELDS = 'name,username,description,public_metrics,verified,verified_type';

// List followers
async function listFollowers(userId, args) {
  const targetUserId = userId || await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 1000)
  };
  
  console.log('Fetching followers...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${targetUserId}/followers`, {
      all: true,
      maxResults: Math.min(limit, 1000),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} followers:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/users/${targetUserId}/followers`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} followers:\n`);
    
    for (const user of users) {
      displayUser(user);
    }
  }
}

// List following
async function listFollowing(userId, args) {
  const targetUserId = userId || await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 100;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 1000)
  };
  
  console.log('Fetching following...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${targetUserId}/following`, {
      all: true,
      maxResults: Math.min(limit, 1000),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} following:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/users/${targetUserId}/following`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} following:\n`);
    
    for (const user of users) {
      displayUser(user);
    }
  }
}

// Display user
function displayUser(user) {
  const metrics = user.public_metrics || {};
  const verified = user.verified_type ? ` [${user.verified_type}]` : '';
  
  console.log(`${user.name} (@${user.username})${verified}`);
  if (user.description) {
    const desc = user.description.length > 100 ? user.description.substring(0, 100) + '...' : user.description;
    console.log(`  ${desc}`);
  }
  console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0} | Following: ${metrics.following_count?.toLocaleString() || 0} | Tweets: ${metrics.tweet_count?.toLocaleString() || 0}`);
  console.log(`  ID: ${user.id}`);
  console.log('');
}

// Follow a user
async function followUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Following user...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/following`, {
    body: { target_user_id: targetUserId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.following) {
    console.log('User followed successfully!');
  } else if (data.data?.pending_follow) {
    console.log('Follow request sent (protected account).');
  } else {
    console.log('Follow may have failed. Check the user.');
  }
}

// Unfollow a user
async function unfollowUser(targetUserId, args) {
  const userId = await getAuthenticatedUserId();
  
  // Try to get user info first
  let userInfo = targetUserId;
  try {
    const userData = await apiRequest('GET', `/users/${targetUserId}`, {
      params: { 'user.fields': 'name,username' }
    });
    userInfo = `${userData.data.name} (@${userData.data.username})`;
  } catch (e) {
    // Continue with just the ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Unfollow user: ${userInfo}`,
    [`User ID: ${targetUserId}`],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/following/${targetUserId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('User unfollowed successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'followers':
        await listFollowers(args._[1], args);
        break;
      case 'following':
        await listFollowing(args._[1], args);
        break;
      case 'follow':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node follows.js follow <user_id>');
          console.error('Use "node user.js lookup <username>" to get user ID');
          process.exit(1);
        }
        await followUser(args._[1], args);
        break;
      case 'unfollow':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node follows.js unfollow <user_id>');
          process.exit(1);
        }
        await unfollowUser(args._[1], args);
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
