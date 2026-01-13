#!/usr/bin/env node

/**
 * Go High Level Users Script
 * Manage users and team members.
 * 
 * Usage:
 *   node users.js list --location "Name"
 *   node users.js get <user-id> --location "Name"
 *   node users.js search "query" --location "Name"
 *   node users.js update <user-id> [options] --location "Name"
 *   node users.js delete <user-id> --location "Name"
 *   node users.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List users
async function listUsers(location, verbose) {
  const data = await apiRequest('GET', `/users/?locationId=${location.id}`, location.key);
  
  const users = data.users || [];
  console.log(`Found ${users.length} users:\n`);
  
  for (const user of users) {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed';
    console.log(`- ${name}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email || 'N/A'}`);
    console.log(`  Role: ${user.role || user.type || 'N/A'}`);
    if (user.phone) console.log(`  Phone: ${user.phone}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return users;
}

// Get user details
async function getUser(userId, location, verbose) {
  const data = await apiRequest('GET', `/users/${userId}`, location.key);
  
  const user = data.user || data;
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed';
  console.log(`User: ${name}`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email || 'N/A'}`);
  console.log(`Phone: ${user.phone || 'N/A'}`);
  console.log(`Role: ${user.role || user.type || 'N/A'}`);
  console.log(`Extension: ${user.extension || 'N/A'}`);
  console.log(`Created: ${formatDate(user.dateAdded)}`);
  
  if (user.permissions && Object.keys(user.permissions).length > 0) {
    console.log('\nPermissions:');
    for (const [key, value] of Object.entries(user.permissions)) {
      console.log(`  ${key}: ${value}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return user;
}

// Search users
async function searchUsers(query, location, verbose) {
  const data = await apiRequest('GET', `/users/search?locationId=${location.id}&query=${encodeURIComponent(query)}`, location.key);
  
  const users = data.users || [];
  console.log(`Found ${users.length} users matching "${query}":\n`);
  
  for (const user of users) {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed';
    console.log(`- ${name}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email || 'N/A'}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return users;
}

// Update user
async function updateUser(userId, options, location, verbose) {
  const body = {};
  
  if (options.firstName) body.firstName = options.firstName;
  if (options.lastName) body.lastName = options.lastName;
  if (options.email) body.email = options.email;
  if (options.phone) body.phone = options.phone;
  if (options.extension) body.extension = options.extension;
  
  const data = await apiRequest('PUT', `/users/${userId}`, location.key, body);
  
  console.log(`Updated user: ${userId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete user
async function deleteUser(userId, location, verbose, force = false) {
  // Get user name for confirmation
  let userName = userId;
  let userEmail = '';
  try {
    const userData = await apiRequest('GET', `/users/${userId}`, location.key);
    const u = userData.user || userData;
    userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || userId;
    userEmail = u.email || '';
  } catch (e) {
    // Continue with ID only
  }
  
  const details = [
    `User: ${userName}`,
    `ID: ${userId}`
  ];
  if (userEmail) details.push(`Email: ${userEmail}`);
  details.push('', 'This will remove the user from the location.', 'This action cannot be undone.');
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a user.',
    details,
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/users/${userId}`, location.key);
  
  console.log(`Deleted user: ${userId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listUsers(location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const userId = args._[1];
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node users.js get <user-id> --location "Name"');
          process.exit(1);
        }
        
        await getUser(userId, location, verbose);
        break;
      }
      
      case 'search': {
        const location = resolveLocation(args.location, locationsConfig);
        const query = args._[1];
        
        if (!query) {
          console.error('Error: Search query is required');
          console.error('Usage: node users.js search "query" --location "Name"');
          process.exit(1);
        }
        
        await searchUsers(query, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const userId = args._[1];
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node users.js update <user-id> [options] --location "Name"');
          process.exit(1);
        }
        
        await updateUser(userId, {
          firstName: args.firstName || args['first-name'],
          lastName: args.lastName || args['last-name'],
          email: args.email,
          phone: args.phone,
          extension: args.extension
        }, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const userId = args._[1];
        
        if (!userId) {
          console.error('Error: User ID is required');
          console.error('Usage: node users.js delete <user-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteUser(userId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Users Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"          List all users');
        console.log('  get <user-id> --location        Get user details');
        console.log('  search "query" --location       Search users by name/email');
        console.log('  update <user-id> [options]      Update a user');
        console.log('  delete <user-id> --location     Delete a user');
        console.log('  locations                       List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Update Options:');
        console.log('  --firstName "First"           First name');
        console.log('  --lastName "Last"             Last name');
        console.log('  --email "email@example.com"   Email address');
        console.log('  --phone "+1234567890"         Phone number');
        console.log('  --extension "123"             Phone extension');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
        console.log('');
        console.log('Note: User creation is typically done via GHL admin interface.');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
