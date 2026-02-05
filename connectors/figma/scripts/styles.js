#!/usr/bin/env node
/**
 * Figma Styles Script
 * Get published styles from team or file libraries.
 */

import { parseArgs, apiRequest, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Figma Styles - Access published styles

Usage: node scripts/styles.js <command> [options]

Commands:
  list-team <team_id>     List styles in team library
  list-file <file_key>    List styles in file library
  get <style_key>         Get style by key
  help                    Show this help

Options:
  --page-size <n>         Number of results (default: 30, max: 1000)
  --after <cursor>        Pagination cursor (after)
  --before <cursor>       Pagination cursor (before)

Style Types:
  - FILL: Color and gradient fills
  - TEXT: Typography styles
  - EFFECT: Shadows and blurs
  - GRID: Layout grids

Finding IDs:
  - Team ID: In Figma URL after /team/ (e.g., figma.com/files/team/123456/...)
  - File key: In Figma URL after /file/ (e.g., figma.com/file/ABC123xyz/...)
  - Style key: From list-team or list-file output

Examples:
  # List team styles
  node scripts/styles.js list-team 123456789

  # List file styles
  node scripts/styles.js list-file ABC123xyz

  # Get specific style
  node scripts/styles.js get abc123def456

  # List with pagination
  node scripts/styles.js list-team 123456789 --page-size 100
`);
}

/**
 * List team styles
 */
async function listTeamStyles(teamId, flags) {
  const params = new URLSearchParams();
  if (flags['page-size']) params.set('page_size', flags['page-size']);
  if (flags.after) params.set('after', flags.after);
  if (flags.before) params.set('before', flags.before);

  const queryString = params.toString();
  const endpoint = `/v1/teams/${teamId}/styles${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  if (data.meta?.styles?.length === 0) {
    console.log('No styles found.');
    return;
  }

  console.log(`Found ${data.meta?.styles?.length || 0} style(s):\n`);
  
  for (const style of data.meta?.styles || []) {
    console.log(`Key: ${style.key}`);
    console.log(`  Name: ${style.name}`);
    console.log(`  Type: ${style.style_type}`);
    console.log(`  File: ${style.file_key}`);
    console.log(`  Node: ${style.node_id}`);
    if (style.description) console.log(`  Description: ${style.description}`);
    console.log(`  Updated: ${style.updated_at}`);
    console.log('');
  }

  if (data.meta?.cursor) {
    console.log('Pagination:');
    if (data.meta.cursor.after) console.log(`  Next page: --after ${data.meta.cursor.after}`);
    if (data.meta.cursor.before) console.log(`  Prev page: --before ${data.meta.cursor.before}`);
  }
}

/**
 * List file styles
 */
async function listFileStyles(fileKey) {
  const endpoint = `/v1/files/${fileKey}/styles`;
  const data = await apiRequest(endpoint);
  
  if (data.meta?.styles?.length === 0) {
    console.log('No published styles found in this file.');
    return;
  }

  console.log(`Found ${data.meta?.styles?.length || 0} style(s):\n`);
  
  for (const style of data.meta?.styles || []) {
    console.log(`Key: ${style.key}`);
    console.log(`  Name: ${style.name}`);
    console.log(`  Type: ${style.style_type}`);
    console.log(`  Node: ${style.node_id}`);
    if (style.description) console.log(`  Description: ${style.description}`);
    console.log(`  Updated: ${style.updated_at}`);
    console.log('');
  }
}

/**
 * Get style by key
 */
async function getStyle(styleKey) {
  const endpoint = `/v1/styles/${styleKey}`;
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
    console.error('Error: ID required (team_id, file_key, or style_key)');
    showHelp();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'list-team':
        await listTeamStyles(id, flags);
        break;
      case 'list-file':
        await listFileStyles(id);
        break;
      case 'get':
        await getStyle(id);
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
