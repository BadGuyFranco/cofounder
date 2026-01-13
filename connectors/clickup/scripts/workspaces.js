#!/usr/bin/env node

/**
 * ClickUp Workspaces Script
 * List and view workspaces (teams).
 *
 * Usage:
 *   node workspaces.js list
 *   node workspaces.js get <workspace-id>
 *   node workspaces.js help
 */

import { parseArgs, apiRequest, formatWorkspace } from './utils.js';

/**
 * List all workspaces the user has access to
 */
async function listWorkspaces(verbose) {
  const data = await apiRequest('/team');

  const teams = data.teams || [];
  console.log(`Found ${teams.length} workspace(s):\n`);

  for (const workspace of teams) {
    console.log(formatWorkspace(workspace));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return teams;
}

/**
 * Get a single workspace by ID
 */
async function getWorkspace(workspaceId, verbose) {
  // ClickUp doesn't have a direct get-workspace endpoint
  // We fetch all and filter
  const data = await apiRequest('/team');

  const workspace = data.teams?.find(t => t.id === workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  console.log(formatWorkspace(workspace));

  if (workspace.members && workspace.members.length > 0) {
    console.log('\nMembers:');
    for (const member of workspace.members) {
      console.log(`  - ${member.user.username || member.user.email}`);
      console.log(`    ID: ${member.user.id}`);
      console.log(`    Role: ${member.user.role || 'member'}`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(workspace, null, 2));
  }

  return workspace;
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Workspaces Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                     List all workspaces');
  console.log('  get <workspace-id>       Get workspace details and members');
  console.log('  help                     Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all workspaces');
  console.log('  node workspaces.js list');
  console.log('');
  console.log('  # Get workspace details');
  console.log('  node workspaces.js get 12345678');
  console.log('');
  console.log('Note: ClickUp calls workspaces "Teams" in the API.');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list':
        await listWorkspaces(verbose);
        break;

      case 'get': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node workspaces.js get <workspace-id>');
          process.exit(1);
        }
        await getWorkspace(workspaceId, verbose);
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
