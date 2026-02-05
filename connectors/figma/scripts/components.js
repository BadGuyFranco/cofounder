#!/usr/bin/env node
/**
 * Figma Components Script
 * Get published components and component sets from team or file libraries.
 */

import { parseArgs, apiRequest, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Figma Components - Access published components and component sets

Usage: node scripts/components.js <command> [options]

Commands:
  list-team <team_id>     List components in team library
  list-file <file_key>    List components in file library
  get <component_key>     Get component by key
  sets-team <team_id>     List component sets in team library
  sets-file <file_key>    List component sets in file library
  get-set <set_key>       Get component set by key
  help                    Show this help

Options:
  --page-size <n>         Number of results (default: 30, max: 1000)
  --after <cursor>        Pagination cursor (after)
  --before <cursor>       Pagination cursor (before)

Finding IDs:
  - Team ID: In Figma URL after /team/ (e.g., figma.com/files/team/123456/...)
  - File key: In Figma URL after /file/ (e.g., figma.com/file/ABC123xyz/...)
  - Component key: From list-team or list-file output

Examples:
  # List team components
  node scripts/components.js list-team 123456789

  # List file components
  node scripts/components.js list-file ABC123xyz

  # Get specific component
  node scripts/components.js get abc123def456

  # List with pagination
  node scripts/components.js list-team 123456789 --page-size 50

  # List component sets
  node scripts/components.js sets-team 123456789
`);
}

/**
 * List team components
 */
async function listTeamComponents(teamId, flags) {
  const params = new URLSearchParams();
  if (flags['page-size']) params.set('page_size', flags['page-size']);
  if (flags.after) params.set('after', flags.after);
  if (flags.before) params.set('before', flags.before);

  const queryString = params.toString();
  const endpoint = `/v1/teams/${teamId}/components${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  if (data.meta?.components?.length === 0) {
    console.log('No components found.');
    return;
  }

  console.log(`Found ${data.meta?.components?.length || 0} component(s):\n`);
  
  for (const comp of data.meta?.components || []) {
    console.log(`Key: ${comp.key}`);
    console.log(`  Name: ${comp.name}`);
    console.log(`  File: ${comp.file_key}`);
    console.log(`  Node: ${comp.node_id}`);
    if (comp.description) console.log(`  Description: ${comp.description}`);
    console.log(`  Updated: ${comp.updated_at}`);
    console.log('');
  }

  if (data.meta?.cursor) {
    console.log('Pagination:');
    if (data.meta.cursor.after) console.log(`  Next page: --after ${data.meta.cursor.after}`);
    if (data.meta.cursor.before) console.log(`  Prev page: --before ${data.meta.cursor.before}`);
  }
}

/**
 * List file components
 */
async function listFileComponents(fileKey) {
  const endpoint = `/v1/files/${fileKey}/components`;
  const data = await apiRequest(endpoint);
  
  if (data.meta?.components?.length === 0) {
    console.log('No published components found in this file.');
    return;
  }

  console.log(`Found ${data.meta?.components?.length || 0} component(s):\n`);
  
  for (const comp of data.meta?.components || []) {
    console.log(`Key: ${comp.key}`);
    console.log(`  Name: ${comp.name}`);
    console.log(`  Node: ${comp.node_id}`);
    if (comp.description) console.log(`  Description: ${comp.description}`);
    console.log(`  Updated: ${comp.updated_at}`);
    console.log('');
  }
}

/**
 * Get component by key
 */
async function getComponent(componentKey) {
  const endpoint = `/v1/components/${componentKey}`;
  const data = await apiRequest(endpoint);
  output(data);
}

/**
 * List team component sets
 */
async function listTeamComponentSets(teamId, flags) {
  const params = new URLSearchParams();
  if (flags['page-size']) params.set('page_size', flags['page-size']);
  if (flags.after) params.set('after', flags.after);
  if (flags.before) params.set('before', flags.before);

  const queryString = params.toString();
  const endpoint = `/v1/teams/${teamId}/component_sets${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  if (data.meta?.component_sets?.length === 0) {
    console.log('No component sets found.');
    return;
  }

  console.log(`Found ${data.meta?.component_sets?.length || 0} component set(s):\n`);
  
  for (const set of data.meta?.component_sets || []) {
    console.log(`Key: ${set.key}`);
    console.log(`  Name: ${set.name}`);
    console.log(`  File: ${set.file_key}`);
    console.log(`  Node: ${set.node_id}`);
    if (set.description) console.log(`  Description: ${set.description}`);
    console.log(`  Updated: ${set.updated_at}`);
    console.log('');
  }

  if (data.meta?.cursor) {
    console.log('Pagination:');
    if (data.meta.cursor.after) console.log(`  Next page: --after ${data.meta.cursor.after}`);
    if (data.meta.cursor.before) console.log(`  Prev page: --before ${data.meta.cursor.before}`);
  }
}

/**
 * List file component sets
 */
async function listFileComponentSets(fileKey) {
  const endpoint = `/v1/files/${fileKey}/component_sets`;
  const data = await apiRequest(endpoint);
  
  if (data.meta?.component_sets?.length === 0) {
    console.log('No published component sets found in this file.');
    return;
  }

  console.log(`Found ${data.meta?.component_sets?.length || 0} component set(s):\n`);
  
  for (const set of data.meta?.component_sets || []) {
    console.log(`Key: ${set.key}`);
    console.log(`  Name: ${set.name}`);
    console.log(`  Node: ${set.node_id}`);
    if (set.description) console.log(`  Description: ${set.description}`);
    console.log(`  Updated: ${set.updated_at}`);
    console.log('');
  }
}

/**
 * Get component set by key
 */
async function getComponentSet(setKey) {
  const endpoint = `/v1/component_sets/${setKey}`;
  const data = await apiRequest(endpoint);
  output(data);
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help' || !command) {
    showHelp();
    return;
  }

  const id = args[0];
  if (!id && command !== 'help') {
    console.error('Error: ID required (team_id, file_key, or component_key)');
    showHelp();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'list-team':
        await listTeamComponents(id, flags);
        break;
      case 'list-file':
        await listFileComponents(id);
        break;
      case 'get':
        await getComponent(id);
        break;
      case 'sets-team':
        await listTeamComponentSets(id, flags);
        break;
      case 'sets-file':
        await listFileComponentSets(id);
        break;
      case 'get-set':
        await getComponentSet(id);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
