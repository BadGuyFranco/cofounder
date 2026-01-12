#!/usr/bin/env node

/**
 * X.com User Management
 * Get user info, lookup users by username or ID.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com User Management', {
    'Commands': [
      'me                         Get authenticated user info',
      'get <id>                   Get user by ID',
      'lookup <username>          Get user by username',
      'lookup-many <u1,u2,...>    Get multiple users by username',
      'help                       Show this help'
    ],
    'Options': [
      '--verbose                  Show full API response'
    ],
    'Examples': [
      'node user.js me',
      'node user.js get 12345678901234567890',
      'node user.js lookup elonmusk',
      'node user.js lookup-many elonmusk,jack,naval'
    ],
    'Notes': [
      'User IDs are large numbers (19+ digits)',
      'Usernames do not include the @ symbol'
    ]
  });
}

const USER_FIELDS = 'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,verified_type,withheld';

// Display user info
function displayUser(user, verbose = false) {
  if (verbose) {
    console.log(JSON.stringify(user, null, 2));
    return;
  }
  
  const metrics = user.public_metrics || {};
  
  console.log(`${user.name} (@${user.username})`);
  if (user.verified_type) {
    console.log(`Verified: ${user.verified_type}`);
  }
  console.log('');
  console.log(`ID: ${user.id}`);
  console.log(`Bio: ${user.description || 'No bio'}`);
  if (user.location) console.log(`Location: ${user.location}`);
  if (user.url) console.log(`URL: ${user.url}`);
  console.log(`Created: ${formatDate(user.created_at)}`);
  console.log('');
  console.log('Stats:');
  console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0}`);
  console.log(`  Following: ${metrics.following_count?.toLocaleString() || 0}`);
  console.log(`  Tweets: ${metrics.tweet_count?.toLocaleString() || 0}`);
  console.log(`  Listed: ${metrics.listed_count?.toLocaleString() || 0}`);
  console.log('');
  console.log(`Profile: https://x.com/${user.username}`);
}

// Get authenticated user
async function getMe(args) {
  const data = await apiRequest('GET', '/users/me', {
    params: { 'user.fields': USER_FIELDS }
  });
  
  console.log('Authenticated User:\n');
  displayUser(data.data, args.verbose);
}

// Get user by ID
async function getUserById(id, args) {
  const data = await apiRequest('GET', `/users/${id}`, {
    params: { 'user.fields': USER_FIELDS }
  });
  
  displayUser(data.data, args.verbose);
}

// Get user by username
async function getUserByUsername(username, args) {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, '');
  
  const data = await apiRequest('GET', `/users/by/username/${cleanUsername}`, {
    params: { 'user.fields': USER_FIELDS }
  });
  
  displayUser(data.data, args.verbose);
}

// Get multiple users by username
async function getUsersByUsernames(usernames, args) {
  // Clean usernames
  const cleanUsernames = usernames.split(',').map(u => u.trim().replace(/^@/, '')).join(',');
  
  const data = await apiRequest('GET', '/users/by', {
    params: {
      usernames: cleanUsernames,
      'user.fields': USER_FIELDS
    }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Found ${data.data.length} users:\n`);
  
  for (const user of data.data) {
    const metrics = user.public_metrics || {};
    console.log(`${user.name} (@${user.username})`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0}`);
    console.log(`  Tweets: ${metrics.tweet_count?.toLocaleString() || 0}`);
    console.log('');
  }
  
  if (data.errors) {
    console.log('Not found:');
    for (const error of data.errors) {
      console.log(`  ${error.value}: ${error.detail}`);
    }
  }
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'me':
        await getMe(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node user.js get <id>');
          process.exit(1);
        }
        await getUserById(args._[1], args);
        break;
      case 'lookup':
        if (!args._[1]) {
          console.error('Error: Username required');
          console.error('Usage: node user.js lookup <username>');
          process.exit(1);
        }
        await getUserByUsername(args._[1], args);
        break;
      case 'lookup-many':
        if (!args._[1]) {
          console.error('Error: Usernames required');
          console.error('Usage: node user.js lookup-many <username1,username2,...>');
          process.exit(1);
        }
        await getUsersByUsernames(args._[1], args);
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
