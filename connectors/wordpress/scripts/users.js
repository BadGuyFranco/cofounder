#!/usr/bin/env node

/**
 * WordPress Users Script
 * List and get user information.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, listAll, showHelp, handleError, formatDate } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Users', {
    'Usage': 'node scripts/users.js <command> [options]',
    'Commands': [
      'me                  Get current authenticated user',
      'list                List users',
      'get <id>            Get user by ID',
      'help                Show this help'
    ],
    'List Options': [
      '--per-page <n>      Results per page (default: 10)',
      '--page <n>          Page number',
      '--search <term>     Search by name, email, or username',
      '--role <role>       Filter by role (administrator, editor, author, contributor, subscriber)',
      '--all               Get all users (paginated)'
    ],
    'Examples': [
      'node scripts/users.js me',
      'node scripts/users.js list --role author',
      'node scripts/users.js get 1'
    ]
  });
}

function formatUser(user, detailed = false) {
  const lines = [
    `ID: ${user.id}`,
    `Username: ${user.slug}`,
    `Name: ${user.name}`,
  ];
  
  if (user.email) {
    lines.push(`Email: ${user.email}`);
  }
  
  if (user.roles?.length) {
    lines.push(`Roles: ${user.roles.join(', ')}`);
  }
  
  if (user.link) {
    lines.push(`Profile: ${user.link}`);
  }
  
  if (detailed) {
    if (user.description) {
      lines.push(`Bio: ${user.description}`);
    }
    if (user.url) {
      lines.push(`Website: ${user.url}`);
    }
    if (user.registered_date) {
      lines.push(`Registered: ${formatDate(user.registered_date)}`);
    }
    if (user.avatar_urls) {
      const avatarUrl = user.avatar_urls['96'] || user.avatar_urls['48'] || Object.values(user.avatar_urls)[0];
      if (avatarUrl) {
        lines.push(`Avatar: ${avatarUrl}`);
      }
    }
  }
  
  return lines.join('\n');
}

async function me() {
  const user = await apiRequest('/users/me', {
    params: { context: 'edit' }
  });
  
  console.log('Current User:\n');
  console.log(formatUser(user, true));
  
  if (user.capabilities) {
    console.log('\nCapabilities:');
    const caps = Object.entries(user.capabilities)
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.log(`  ${caps.slice(0, 10).join(', ')}${caps.length > 10 ? ` ... and ${caps.length - 10} more` : ''}`);
  }
}

async function list() {
  const params = { context: 'edit' };
  
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.page) params.page = parseInt(args.page);
  if (args.search) params.search = args.search;
  if (args.role) params.roles = args.role;
  
  if (!params.per_page && !args.all) {
    params.per_page = 10;
  }
  
  const items = await listAll('/users', { all: args.all, params });
  
  if (items.length === 0) {
    console.log('No users found.');
    return;
  }
  
  console.log(`Found ${items.length} user(s):\n`);
  for (const user of items) {
    console.log(formatUser(user));
    console.log('');
  }
}

async function get(id) {
  const user = await apiRequest(`/users/${id}`, {
    params: { context: 'edit' }
  });
  console.log(formatUser(user, true));
}

async function main() {
  initScript(__dirname, args);
  
  const command = args._[0] || 'help';
  const id = args._[1];
  
  try {
    switch (command) {
      case 'me':
        await me();
        break;
      case 'list':
        await list();
        break;
      case 'get':
        if (!id) throw new Error('User ID required. Usage: get <id>');
        await get(id);
        break;
      case 'help':
      default:
        displayHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
