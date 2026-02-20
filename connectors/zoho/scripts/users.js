#!/usr/bin/env node

/**
 * Zoho CRM Users Management
 * Manage users, roles, and profiles.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Users', {
    'Commands': [
      'list                        List all users',
      'get <id>                    Get user details',
      'current                     Get current user',
      'roles                       List all roles',
      'profiles                    List all profiles',
      'territories                 List all territories',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--type <type>               User type filter (all, active, inactive, etc.)',
      '--verbose                   Show full API response'
    ],
    'User Types': [
      'AllUsers, ActiveUsers, DeactiveUsers, ConfirmedUsers,',
      'NotConfirmedUsers, DeletedUsers, ActiveConfirmedUsers,',
      'AdminUsers, ActiveConfirmedAdmins, CurrentUser'
    ],
    'Examples': [
      'node users.js list',
      'node users.js list --type ActiveUsers',
      'node users.js get 1234567890',
      'node users.js current',
      'node users.js roles',
      'node users.js profiles',
      'node users.js territories'
    ]
  });
}

// List users
async function listUsers(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching users...\n');
  
  let endpoint = '/users';
  
  if (args.type) {
    endpoint += `?type=${args.type}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const users = data.users || [];
  
  console.log(`Found ${users.length} users:\n`);
  
  for (const user of users) {
    const status = user.status === 'active' ? '' : ` [${user.status}]`;
    console.log(`- ${user.full_name}${status}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    if (user.role?.name) console.log(`  Role: ${user.role.name}`);
    if (user.profile?.name) console.log(`  Profile: ${user.profile.name}`);
    console.log('');
  }
}

// Get user details
async function getUser(id, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/users/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const users = data.users || [];
  
  if (users.length === 0) {
    console.error(`Error: User not found: ${id}`);
    process.exit(1);
  }
  
  const user = users[0];
  
  console.log(`User: ${user.full_name}\n`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Status: ${user.status}`);
  console.log(`Confirm: ${user.confirm ? 'Yes' : 'No'}`);
  
  if (user.role) {
    console.log(`Role: ${user.role.name} (${user.role.id})`);
  }
  
  if (user.profile) {
    console.log(`Profile: ${user.profile.name} (${user.profile.id})`);
  }
  
  if (user.territory) {
    console.log(`Territory: ${user.territory.name}`);
  }
  
  if (user.phone) console.log(`Phone: ${user.phone}`);
  if (user.mobile) console.log(`Mobile: ${user.mobile}`);
  if (user.city) console.log(`City: ${user.city}`);
  if (user.country) console.log(`Country: ${user.country}`);
  if (user.time_zone) console.log(`Timezone: ${user.time_zone}`);
  if (user.language) console.log(`Language: ${user.language}`);
  if (user.locale) console.log(`Locale: ${user.locale}`);
  
  if (user.created_time) {
    console.log(`Created: ${new Date(user.created_time).toLocaleString()}`);
  }
}

// Get current user
async function getCurrentUser(args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', '/users?type=CurrentUser', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const users = data.users || [];
  
  if (users.length === 0) {
    console.error('Error: Could not retrieve current user');
    process.exit(1);
  }
  
  const user = users[0];
  
  console.log('Current User\n');
  console.log(`Name: ${user.full_name}`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  
  if (user.role) {
    console.log(`Role: ${user.role.name}`);
  }
  
  if (user.profile) {
    console.log(`Profile: ${user.profile.name}`);
  }
  
  if (user.time_zone) console.log(`Timezone: ${user.time_zone}`);
  if (user.language) console.log(`Language: ${user.language}`);
}

// List roles
async function listRoles(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching roles...\n');
  
  const data = await apiRequest('GET', '/settings/roles', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const roles = data.roles || [];
  
  console.log(`Found ${roles.length} roles:\n`);
  
  // Build hierarchy
  const roleMap = {};
  for (const role of roles) {
    roleMap[role.id] = role;
  }
  
  // Display with hierarchy
  const printRole = (role, indent = 0) => {
    const prefix = '  '.repeat(indent);
    const admin = role.admin_user ? ' [Admin]' : '';
    console.log(`${prefix}- ${role.display_label || role.name}${admin}`);
    console.log(`${prefix}  ID: ${role.id}`);
    
    // Find children
    const children = roles.filter(r => r.reporting_to?.id === role.id);
    for (const child of children) {
      printRole(child, indent + 1);
    }
  };
  
  // Start with top-level roles (no reporting_to)
  const topLevel = roles.filter(r => !r.reporting_to);
  for (const role of topLevel) {
    printRole(role);
  }
}

// List profiles
async function listProfiles(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching profiles...\n');
  
  const data = await apiRequest('GET', '/settings/profiles', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const profiles = data.profiles || [];
  
  console.log(`Found ${profiles.length} profiles:\n`);
  
  for (const profile of profiles) {
    const isDefault = profile.default ? ' [Default]' : '';
    const isAdmin = profile.admin_type ? ` [${profile.admin_type}]` : '';
    console.log(`- ${profile.display_label || profile.name}${isDefault}${isAdmin}`);
    console.log(`  ID: ${profile.id}`);
    if (profile.description) {
      console.log(`  Description: ${profile.description}`);
    }
    console.log('');
  }
}

// List territories
async function listTerritories(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching territories...\n');
  
  const data = await apiRequest('GET', '/settings/territories', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const territories = data.territories || [];
  
  if (territories.length === 0) {
    console.log('No territories configured.');
    console.log('Territory management may need to be enabled in Zoho CRM settings.');
    return;
  }
  
  console.log(`Found ${territories.length} territories:\n`);
  
  // Build hierarchy
  const printTerritory = (territory, indent = 0) => {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}- ${territory.name}`);
    console.log(`${prefix}  ID: ${territory.id}`);
    
    // Find children
    const children = territories.filter(t => t.reporting_to?.id === territory.id);
    for (const child of children) {
      printTerritory(child, indent + 1);
    }
  };
  
  // Start with top-level territories
  const topLevel = territories.filter(t => !t.reporting_to);
  for (const territory of topLevel) {
    printTerritory(territory);
  }
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
      case 'get':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node users.js get <id>');
          process.exit(1);
        }
        await getUser(args._[1], args);
        break;
      case 'current':
        await getCurrentUser(args);
        break;
      case 'roles':
        await listRoles(args);
        break;
      case 'profiles':
        await listProfiles(args);
        break;
      case 'territories':
        await listTerritories(args);
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
