#!/usr/bin/env node

/**
 * HubSpot Owners Management
 * List and search users/owners (read-only).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Owners', {
    'Commands': [
      'list                        List all owners/users',
      'get <id>                    Get owner by ID',
      'search <email>              Search owner by email',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node owners.js list',
      'node owners.js get 12345',
      'node owners.js search "john@company.com"'
    ],
    'Note': [
      'Owners are read-only. To manage users, use HubSpot admin settings.'
    ]
  });
}

// List all owners
async function listOwners(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching owners...\n');
  
  const endpoint = '/crm/v3/owners';
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} owners${all ? '' : ' (page 1)'}:\n`);
  
  for (const owner of results) {
    const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'No name';
    console.log(`- ${name}`);
    console.log(`  ID: ${owner.id}`);
    console.log(`  Email: ${owner.email || 'N/A'}`);
    if (owner.teams && owner.teams.length > 0) {
      console.log(`  Teams: ${owner.teams.map(t => t.name).join(', ')}`);
    }
    console.log(`  Created: ${formatDate(owner.createdAt)}`);
    console.log('');
  }
}

// Get single owner
async function getOwner(id, args) {
  const token = getToken();
  
  const endpoint = `/crm/v3/owners/${id}`;
  const owner = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(owner, null, 2));
    return;
  }
  
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'No name';
  
  console.log(`Owner: ${name}\n`);
  console.log(`ID: ${owner.id}`);
  console.log(`User ID: ${owner.userId || 'N/A'}`);
  console.log(`Email: ${owner.email || 'N/A'}`);
  console.log(`Archived: ${owner.archived ? 'Yes' : 'No'}`);
  if (owner.teams && owner.teams.length > 0) {
    console.log(`Teams: ${owner.teams.map(t => `${t.name} (${t.id})`).join(', ')}`);
  }
  console.log(`Created: ${formatDate(owner.createdAt)}`);
  console.log(`Updated: ${formatDate(owner.updatedAt)}`);
}

// Search owner by email
async function searchOwner(email, args) {
  const token = getToken();
  
  console.log(`Searching for "${email}"...\n`);
  
  // HubSpot doesn't have owner search, so we list all and filter
  const endpoint = `/crm/v3/owners?email=${encodeURIComponent(email)}`;
  
  try {
    const data = await apiRequest('GET', endpoint, token);
    const results = data.results || [];
    
    if (args.verbose) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    
    if (results.length === 0) {
      console.log('No owners found with that email.');
      return;
    }
    
    console.log(`Found ${results.length} owners:\n`);
    
    for (const owner of results) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'No name';
      console.log(`- ${name}`);
      console.log(`  ID: ${owner.id}`);
      console.log(`  Email: ${owner.email}`);
      console.log('');
    }
  } catch (error) {
    // If email filter doesn't work, fall back to listing all
    const allData = await apiRequest('GET', '/crm/v3/owners', token);
    const filtered = (allData.results || []).filter(o => 
      o.email && o.email.toLowerCase().includes(email.toLowerCase())
    );
    
    if (filtered.length === 0) {
      console.log('No owners found matching that email.');
      return;
    }
    
    console.log(`Found ${filtered.length} owners:\n`);
    
    for (const owner of filtered) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'No name';
      console.log(`- ${name}`);
      console.log(`  ID: ${owner.id}`);
      console.log(`  Email: ${owner.email}`);
      console.log('');
    }
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listOwners(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Owner ID required');
          console.error('Usage: node owners.js get <id>');
          process.exit(1);
        }
        await getOwner(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Email required');
          console.error('Usage: node owners.js search <email>');
          process.exit(1);
        }
        await searchOwner(args._[1], args);
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
