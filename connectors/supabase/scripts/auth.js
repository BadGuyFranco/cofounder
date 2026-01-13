#!/usr/bin/env node

/**
 * Supabase Auth Script
 * Manage authentication users.
 *
 * Usage:
 *   node auth.js list [options]
 *   node auth.js get <user-id>
 *   node auth.js create --email "..." --password "..."
 *   node auth.js update <user-id> --data '{}'
 *   node auth.js delete <user-id> [--force]
 *   node auth.js help
 */

import { parseArgs, authRequest, formatDate, parseJSON } from './utils.js';
import * as readline from 'readline';

// List all users
async function listUsers(options, verbose) {
  let endpoint = '/users';
  const params = [];

  if (options.page) {
    params.push(`page=${options.page}`);
  }
  if (options.per_page) {
    params.push(`per_page=${options.per_page}`);
  }

  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  const data = await authRequest(endpoint, { project: options.project });

  const users = data.users || data;
  console.log(`Found ${users.length} user(s):\n`);

  for (const user of users) {
    console.log(`ID: ${user.id}`);
    console.log(`  Email: ${user.email || '(none)'}`);
    console.log(`  Phone: ${user.phone || '(none)'}`);
    console.log(`  Created: ${formatDate(user.created_at)}`);
    console.log(`  Last Sign In: ${formatDate(user.last_sign_in_at)}`);
    console.log(`  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return users;
}

// Get a single user
async function getUser(userId, verbose, project) {
  const endpoint = `/users/${userId}`;
  const user = await authRequest(endpoint, { project });

  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email || '(none)'}`);
  console.log(`Phone: ${user.phone || '(none)'}`);
  console.log(`Created: ${formatDate(user.created_at)}`);
  console.log(`Updated: ${formatDate(user.updated_at)}`);
  console.log(`Last Sign In: ${formatDate(user.last_sign_in_at)}`);
  console.log(`Email Confirmed: ${user.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'No'}`);
  console.log(`Phone Confirmed: ${user.phone_confirmed_at ? formatDate(user.phone_confirmed_at) : 'No'}`);
  
  if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
    console.log(`User Metadata: ${JSON.stringify(user.user_metadata)}`);
  }
  
  if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
    console.log(`App Metadata: ${JSON.stringify(user.app_metadata)}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(user, null, 2));
  }

  return user;
}

// Create a user
async function createUser(email, password, options, verbose) {
  const body = {
    email: email,
    password: password,
    email_confirm: options.confirm !== false // Auto-confirm by default for admin-created users
  };

  if (options.phone) {
    body.phone = options.phone;
  }

  if (options.data) {
    body.user_metadata = parseJSON(options.data, 'data');
  }

  const user = await authRequest('/users', {
    method: 'POST',
    body: body,
    project: options.project
  });

  console.log('Created user:');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(user, null, 2));
  }

  return user;
}

// Update a user
async function updateUser(userId, dataStr, verbose, project) {
  const updates = parseJSON(dataStr, 'data');
  
  // Map common field names to API field names
  const body = {};
  if (updates.email) body.email = updates.email;
  if (updates.password) body.password = updates.password;
  if (updates.phone) body.phone = updates.phone;
  if (updates.email_confirm !== undefined) body.email_confirm = updates.email_confirm;
  if (updates.phone_confirm !== undefined) body.phone_confirm = updates.phone_confirm;
  if (updates.user_metadata) body.user_metadata = updates.user_metadata;
  if (updates.app_metadata) body.app_metadata = updates.app_metadata;
  if (updates.ban_duration) body.ban_duration = updates.ban_duration;

  const user = await authRequest(`/users/${userId}`, {
    method: 'PUT',
    body: body,
    project: project
  });

  console.log('Updated user:');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(user, null, 2));
  }

  return user;
}

// Delete a user
async function deleteUser(userId, force, verbose, project) {
  if (!force) {
    const confirmed = await confirmDelete(userId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await authRequest(`/users/${userId}`, {
    method: 'DELETE',
    project: project
  });

  console.log(`Deleted user: ${userId}`);

  return { id: userId, deleted: true };
}

// Confirm deletion
async function confirmDelete(userId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Delete user ${userId}? This cannot be undone. (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Supabase Auth Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                              List all users');
  console.log('  get <user-id>                     Get a user by ID');
  console.log('  create --email "..." --password   Create a new user');
  console.log('  update <user-id> --data "{}"      Update a user');
  console.log('  delete <user-id>                  Delete a user');
  console.log('  help                              Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                         Show full API responses');
  console.log('  --email "user@example.com"        User email');
  console.log('  --password "..."                  User password');
  console.log('  --phone "+1234567890"             User phone');
  console.log('  --data "{}"                       User metadata (JSON)');
  console.log('  --confirm                         Auto-confirm email (default: true)');
  console.log('  --page N                          Page number for list');
  console.log('  --per_page N                      Users per page (default: 50)');
  console.log('  --force                           Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # List all users');
  console.log('  node auth.js list');
  console.log('');
  console.log('  # List users with pagination');
  console.log('  node auth.js list --page 1 --per_page 10');
  console.log('');
  console.log('  # Get a user');
  console.log('  node auth.js get 12345678-1234-1234-1234-123456789abc');
  console.log('');
  console.log('  # Create a user');
  console.log('  node auth.js create --email "user@example.com" --password "securepass123"');
  console.log('');
  console.log('  # Create user with metadata');
  console.log('  node auth.js create --email "user@example.com" --password "pass" --data \'{"name": "John"}\'');
  console.log('');
  console.log('  # Update user email');
  console.log('  node auth.js update <user-id> --data \'{"email": "new@example.com"}\'');
  console.log('');
  console.log('  # Update user metadata');
  console.log('  node auth.js update <user-id> --data \'{"user_metadata": {"name": "Jane"}}\'');
  console.log('');
  console.log('  # Ban a user (24 hours)');
  console.log('  node auth.js update <user-id> --data \'{"ban_duration": "24h"}\'');
  console.log('');
  console.log('  # Delete a user');
  console.log('  node auth.js delete 12345678-1234-1234-1234-123456789abc');
  console.log('');
  console.log('  # Delete without confirmation');
  console.log('  node auth.js delete <user-id> --force');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const project = args.project;

  try {
    switch (command) {
      case 'list': {
        await listUsers({
          page: args.page,
          per_page: args.per_page,
          project: project
        }, verbose);
        break;
      }

      case 'get': {
        const userId = args._[1];
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node auth.js get <user-id> --project <ref>');
          process.exit(1);
        }
        
        await getUser(userId, verbose, project);
        break;
      }

      case 'create': {
        const email = args.email;
        const password = args.password;
        
        if (!email || !password) {
          console.error('Error: Email and password are required');
          console.error('Usage: node auth.js create --email "..." --password "..." --project <ref>');
          process.exit(1);
        }
        
        await createUser(email, password, {
          phone: args.phone,
          data: args.data,
          confirm: args.confirm,
          project: project
        }, verbose);
        break;
      }

      case 'update': {
        const userId = args._[1];
        const data = args.data;
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node auth.js update <user-id> --data "{}" --project <ref>');
          process.exit(1);
        }
        
        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node auth.js update <user-id> --data "{}" --project <ref>');
          process.exit(1);
        }
        
        await updateUser(userId, data, verbose, project);
        break;
      }

      case 'delete': {
        const userId = args._[1];
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node auth.js delete <user-id> --project <ref>');
          process.exit(1);
        }
        
        await deleteUser(userId, args.force, verbose, project);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
