#!/usr/bin/env node

/**
 * Monday.com Users Management
 * List users and get user details.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  handleError, showHelp, formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Users', {
    'Commands': [
      'list                        List all users',
      'me                          Get current user info',
      'get <id>                    Get user details',
      'help                        Show this help'
    ],
    'Options': [
      '--kind <type>               Filter: all, non_guests, guests, non_pending',
      '--limit <n>                 Number of users to list (default: 100)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node users.js list',
      'node users.js list --kind guests',
      'node users.js list --kind non_pending',
      'node users.js me',
      'node users.js get 12345678'
    ],
    'User Kinds': [
      'all          - All users (default)',
      'non_guests   - Team members only',
      'guests       - Guest users only',
      'non_pending  - Active (non-pending) users'
    ],
    'Notes': [
      'User IDs are numeric',
      'Use "me" to get current authenticated user',
      'Read-only operations only'
    ]
  });
}

// List all users
async function listUsers(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const kind = args.kind || 'all';
  
  console.log('Fetching users...\n');
  
  const query = `
    query ($limit: Int!, $kind: UserKind) {
      users(limit: $limit, kind: $kind) {
        id
        name
        email
        title
        phone
        location
        is_admin
        is_guest
        is_pending
        enabled
        created_at
        photo_thumb_small
        teams {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { limit, kind }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const users = data.users || [];
  console.log(`Found ${users.length} users:\n`);
  
  for (const user of users) {
    const badges = [];
    if (user.is_admin) badges.push('Admin');
    if (user.is_guest) badges.push('Guest');
    if (user.is_pending) badges.push('Pending');
    if (!user.enabled) badges.push('Disabled');
    
    const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
    
    console.log(`- ${user.name}${badgeStr}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    if (user.title) console.log(`  Title: ${user.title}`);
    if (user.teams?.length > 0) {
      console.log(`  Teams: ${user.teams.map(t => t.name).join(', ')}`);
    }
    console.log('');
  }
}

// Get current user
async function getCurrentUser(args) {
  const token = getToken();
  
  const query = `
    query {
      me {
        id
        name
        email
        title
        phone
        mobile_phone
        location
        time_zone_identifier
        birthday
        is_admin
        is_guest
        is_pending
        is_view_only
        enabled
        created_at
        photo_original
        account {
          id
          name
          slug
          plan {
            period
            tier
            max_users
          }
        }
        teams {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, {}, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const user = data.me;
  
  console.log(`Current User: ${user.name}\n`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  if (user.title) console.log(`Title: ${user.title}`);
  if (user.phone) console.log(`Phone: ${user.phone}`);
  if (user.mobile_phone) console.log(`Mobile: ${user.mobile_phone}`);
  if (user.location) console.log(`Location: ${user.location}`);
  if (user.time_zone_identifier) console.log(`Timezone: ${user.time_zone_identifier}`);
  
  console.log('\n--- Account ---');
  if (user.account) {
    console.log(`  Name: ${user.account.name}`);
    console.log(`  ID: ${user.account.id}`);
    if (user.account.plan) {
      console.log(`  Plan: ${user.account.plan.tier} (${user.account.plan.period})`);
      console.log(`  Max Users: ${user.account.plan.max_users}`);
    }
  }
  
  console.log('\n--- Permissions ---');
  console.log(`  Admin: ${user.is_admin ? 'Yes' : 'No'}`);
  console.log(`  Guest: ${user.is_guest ? 'Yes' : 'No'}`);
  console.log(`  View Only: ${user.is_view_only ? 'Yes' : 'No'}`);
  console.log(`  Enabled: ${user.enabled ? 'Yes' : 'No'}`);
  
  if (user.teams?.length > 0) {
    console.log('\n--- Teams ---');
    for (const team of user.teams) {
      console.log(`  ${team.name} (${team.id})`);
    }
  }
  
  console.log(`\nCreated: ${formatDate(user.created_at)}`);
}

// Get single user
async function getUser(userId, args) {
  const token = getToken();
  
  const query = `
    query ($userId: [ID!]!) {
      users(ids: $userId) {
        id
        name
        email
        title
        phone
        mobile_phone
        location
        time_zone_identifier
        birthday
        is_admin
        is_guest
        is_pending
        is_view_only
        enabled
        created_at
        photo_original
        teams {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { userId: [userId] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const user = data.users?.[0];
  if (!user) {
    console.error(`User not found: ${userId}`);
    process.exit(1);
  }
  
  const badges = [];
  if (user.is_admin) badges.push('Admin');
  if (user.is_guest) badges.push('Guest');
  if (user.is_pending) badges.push('Pending');
  if (user.is_view_only) badges.push('View Only');
  if (!user.enabled) badges.push('Disabled');
  
  console.log(`User: ${user.name}\n`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  if (user.title) console.log(`Title: ${user.title}`);
  if (user.phone) console.log(`Phone: ${user.phone}`);
  if (user.mobile_phone) console.log(`Mobile: ${user.mobile_phone}`);
  if (user.location) console.log(`Location: ${user.location}`);
  if (user.time_zone_identifier) console.log(`Timezone: ${user.time_zone_identifier}`);
  
  if (badges.length > 0) {
    console.log(`\nStatus: ${badges.join(', ')}`);
  }
  
  if (user.teams?.length > 0) {
    console.log('\n--- Teams ---');
    for (const team of user.teams) {
      console.log(`  ${team.name} (${team.id})`);
    }
  }
  
  console.log(`\nCreated: ${formatDate(user.created_at)}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listUsers(args);
        break;
      case 'me':
        await getCurrentUser(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node users.js get <id>');
          process.exit(1);
        }
        await getUser(args._[1], args);
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
