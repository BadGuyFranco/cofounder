#!/usr/bin/env node

/**
 * HubSpot Lists Management
 * Manage contact and company lists (static and dynamic).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Lists', {
    'Commands': [
      'list                        List all lists',
      'get <id>                    Get list by ID',
      'search <query>              Search lists by name',
      'create                      Create a new static list',
      'delete <id>                 Delete a list (destructive)',
      'members <id>                Get list members',
      'add <id>                    Add contacts to static list',
      'remove <id>                 Remove contacts from static list',
      'help                        Show this help'
    ],
    'Options': [
      '--name <name>               List name (required for create)',
      '--type <type>               List type for filtering: STATIC, DYNAMIC',
      '--object <type>             Object type: CONTACT, COMPANY (default: CONTACT)',
      '--contacts <ids>            Comma-separated contact IDs for add/remove',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node lists.js list',
      'node lists.js list --type STATIC',
      'node lists.js get 12345',
      'node lists.js search "newsletter"',
      'node lists.js members 12345',
      'node lists.js create --name "Hot Leads" --object CONTACT',
      'node lists.js add 12345 --contacts "111,222,333"',
      'node lists.js remove 12345 --contacts "111"',
      'node lists.js delete 12345'
    ],
    'Note': [
      'Only static lists can have members added/removed via API.',
      'Dynamic lists are automatically populated based on filters.'
    ]
  });
}

// List all lists
async function listLists(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching lists...\n');
  
  let endpoint = '/crm/v3/lists';
  const params = [];
  if (args.type) params.push(`listType=${args.type.toUpperCase()}`);
  if (args.object) params.push(`objectTypeId=${args.object.toLowerCase()}s`);
  if (params.length > 0) endpoint += '?' + params.join('&');
  
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit, dataKey: 'lists' });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} lists${all ? '' : ' (page 1)'}:\n`);
  
  for (const list of results) {
    console.log(`- ${list.name}`);
    console.log(`  ID: ${list.listId}`);
    console.log(`  Type: ${list.listType}`);
    console.log(`  Object: ${list.objectTypeId}`);
    console.log(`  Size: ${list.size || 0} members`);
    console.log(`  Created: ${formatDate(list.createdAt)}`);
    console.log('');
  }
}

// Get single list
async function getList(id, args) {
  const token = getToken();
  
  const list = await apiRequest('GET', `/crm/v3/lists/${id}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  
  console.log(`List: ${list.name}\n`);
  console.log(`ID: ${list.listId}`);
  console.log(`Type: ${list.listType}`);
  console.log(`Object Type: ${list.objectTypeId}`);
  console.log(`Size: ${list.size || 0} members`);
  console.log(`Processing: ${list.processingStatus}`);
  console.log(`Created: ${formatDate(list.createdAt)}`);
  console.log(`Updated: ${formatDate(list.updatedAt)}`);
}

// Search lists
async function searchLists(query, args) {
  const token = getToken();
  
  console.log(`Searching for "${query}"...\n`);
  
  // HubSpot lists don't have search, so we filter from list
  const { results } = await apiRequestPaginated('/crm/v3/lists', token, { all: true, limit: 100, dataKey: 'lists' });
  
  const filtered = results.filter(l => 
    l.name.toLowerCase().includes(query.toLowerCase())
  );
  
  if (args.verbose) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }
  
  console.log(`Found ${filtered.length} matching lists:\n`);
  
  for (const list of filtered) {
    console.log(`- ${list.name}`);
    console.log(`  ID: ${list.listId}`);
    console.log(`  Type: ${list.listType}`);
    console.log(`  Size: ${list.size || 0}`);
    console.log('');
  }
}

// Get list members
async function getMembers(id, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  console.log(`Fetching members of list ${id}...\n`);
  
  const data = await apiRequest('GET', `/crm/v3/lists/${id}/memberships?limit=${limit}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const results = data.results || [];
  console.log(`Found ${results.length} members:\n`);
  
  for (const member of results) {
    console.log(`- ID: ${member.recordId}`);
    console.log(`  Added: ${formatDate(member.membershipTimestamp)}`);
    console.log('');
  }
}

// Create list
async function createList(args) {
  const token = getToken();
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const body = {
    name: args.name,
    objectTypeId: args.object ? `0-${args.object.toLowerCase() === 'company' ? '2' : '1'}` : '0-1',
    processingType: 'MANUAL',
    listFolderId: 0
  };
  
  const list = await apiRequest('POST', '/crm/v3/lists', token, body);
  
  console.log('List created successfully!');
  console.log(`ID: ${list.listId}`);
  console.log(`Name: ${list.name}`);
}

// Add contacts to list
async function addToList(id, args) {
  const token = getToken();
  
  if (!args.contacts) {
    console.error('Error: --contacts is required');
    process.exit(1);
  }
  
  const contactIds = args.contacts.split(',').map(c => c.trim());
  
  await apiRequest('PUT', `/crm/v3/lists/${id}/memberships/add`, token, contactIds);
  
  console.log(`Added ${contactIds.length} contact(s) to list ${id}`);
}

// Remove contacts from list
async function removeFromList(id, args) {
  const token = getToken();
  
  if (!args.contacts) {
    console.error('Error: --contacts is required');
    process.exit(1);
  }
  
  const contactIds = args.contacts.split(',').map(c => c.trim());
  
  await apiRequest('PUT', `/crm/v3/lists/${id}/memberships/remove`, token, contactIds);
  
  console.log(`Removed ${contactIds.length} contact(s) from list ${id}`);
}

// Delete list
async function deleteList(id, args) {
  const token = getToken();
  
  const list = await apiRequest('GET', `/crm/v3/lists/${id}`, token);
  
  const confirmed = await confirmDestructiveAction(
    `Delete list: ${list.name}`,
    [`ID: ${id}`, `Contains ${list.size || 0} members`],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/lists/${id}`, token);
  console.log('List deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listLists(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: List ID required'); process.exit(1); }
        await getList(args._[1], args); break;
      case 'search':
        if (!args._[1]) { console.error('Error: Search query required'); process.exit(1); }
        await searchLists(args._[1], args); break;
      case 'members':
        if (!args._[1]) { console.error('Error: List ID required'); process.exit(1); }
        await getMembers(args._[1], args); break;
      case 'create': await createList(args); break;
      case 'add':
        if (!args._[1]) { console.error('Error: List ID required'); process.exit(1); }
        await addToList(args._[1], args); break;
      case 'remove':
        if (!args._[1]) { console.error('Error: List ID required'); process.exit(1); }
        await removeFromList(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: List ID required'); process.exit(1); }
        await deleteList(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
