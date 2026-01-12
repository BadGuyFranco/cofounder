#!/usr/bin/env node

/**
 * ClickUp Members Script
 * View and manage workspace members and teams.
 *
 * Usage:
 *   node members.js list <workspace-id>
 *   node members.js list-task <task-id>
 *   node members.js list-list <list-id>
 *   node members.js help
 */

import { parseArgs, apiRequest } from './utils.js';

/**
 * Format member for display
 */
function formatMember(member) {
  const output = [];

  const user = member.user || member;

  output.push(`${user.username || user.email}`);
  output.push(`  ID: ${user.id}`);

  if (user.email) {
    output.push(`  Email: ${user.email}`);
  }

  if (user.color) {
    output.push(`  Color: ${user.color}`);
  }

  if (user.profilePicture || user.profileInfo?.profilePicture) {
    output.push(`  Has Profile Picture: Yes`);
  }

  if (member.role) {
    output.push(`  Role: ${member.role}`);
  }

  if (user.role) {
    output.push(`  Role: ${user.role}`);
  }

  return output.join('\n');
}

/**
 * List members in a workspace
 */
async function listWorkspaceMembers(workspaceId, verbose) {
  // Get workspace (team) which includes members
  const data = await apiRequest('/team');

  const team = data.teams?.find(t => t.id === workspaceId);

  if (!team) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const members = team.members || [];
  console.log(`Workspace: ${team.name}`);
  console.log(`Found ${members.length} member(s):\n`);

  for (const member of members) {
    console.log(formatMember(member));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(team, null, 2));
  }

  return members;
}

/**
 * List members with access to a task
 */
async function listTaskMembers(taskId, verbose) {
  const data = await apiRequest(`/task/${taskId}/member`);

  const members = data.members || [];
  console.log(`Found ${members.length} member(s) with access to task:\n`);

  for (const member of members) {
    console.log(formatMember(member));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return members;
}

/**
 * List members with access to a list
 */
async function listListMembers(listId, verbose) {
  const data = await apiRequest(`/list/${listId}/member`);

  const members = data.members || [];
  console.log(`Found ${members.length} member(s) with access to list:\n`);

  for (const member of members) {
    console.log(formatMember(member));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return members;
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Members Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <workspace-id>        List all workspace members');
  console.log('  list-task <task-id>        List members with task access');
  console.log('  list-list <list-id>        List members with list access');
  console.log('  help                       Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                  Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all members in workspace');
  console.log('  node members.js list 12345678');
  console.log('');
  console.log('  # List members who can access a specific task');
  console.log('  node members.js list-task abc123');
  console.log('');
  console.log('  # List members who can access a specific list');
  console.log('  node members.js list-list 87654321');
  console.log('');
  console.log('Member Management:');
  console.log('  Note: Adding and removing workspace members is done through');
  console.log('  ClickUp\'s web interface or Admin API (Enterprise only).');
  console.log('');
  console.log('  To assign members to tasks, use:');
  console.log('    node tasks.js update <task-id> --assignees \'[123456]\'');
  console.log('');
  console.log('  To invite guests, use:');
  console.log('    node guests.js invite <task-id> --email "guest@example.com"');
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
      case 'list': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node members.js list <workspace-id>');
          process.exit(1);
        }
        await listWorkspaceMembers(workspaceId, verbose);
        break;
      }

      case 'list-task': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node members.js list-task <task-id>');
          process.exit(1);
        }
        await listTaskMembers(taskId, verbose);
        break;
      }

      case 'list-list': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node members.js list-list <list-id>');
          process.exit(1);
        }
        await listListMembers(listId, verbose);
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
