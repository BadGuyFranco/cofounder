#!/usr/bin/env node

/**
 * ClickUp Spaces Script
 * List, create, update, and delete spaces.
 *
 * Usage:
 *   node spaces.js list <workspace-id>
 *   node spaces.js get <space-id>
 *   node spaces.js create <workspace-id> --name "Space Name"
 *   node spaces.js update <space-id> --name "New Name"
 *   node spaces.js delete <space-id> [--force]
 *   node spaces.js help
 */

import { parseArgs, apiRequest, formatSpace } from './utils.js';
import * as readline from 'readline';

/**
 * List all spaces in a workspace
 */
async function listSpaces(workspaceId, verbose) {
  const data = await apiRequest(`/team/${workspaceId}/space?archived=false`);

  const spaces = data.spaces || [];
  console.log(`Found ${spaces.length} space(s):\n`);

  for (const space of spaces) {
    console.log(formatSpace(space));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return spaces;
}

/**
 * Get a single space by ID
 */
async function getSpace(spaceId, verbose) {
  const space = await apiRequest(`/space/${spaceId}`);

  console.log(formatSpace(space));

  if (space.features) {
    console.log('\nFeatures:');
    for (const [feature, config] of Object.entries(space.features)) {
      if (config.enabled) {
        console.log(`  - ${feature}: enabled`);
      }
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(space, null, 2));
  }

  return space;
}

/**
 * Create a new space
 */
async function createSpace(workspaceId, name, options, verbose) {
  const body = {
    name,
    multiple_assignees: options.multipleAssignees !== false,
    features: {
      due_dates: {
        enabled: true,
        start_date: options.startDates || false,
        remap_due_dates: true,
        remap_closed_due_date: false
      },
      time_tracking: {
        enabled: options.timeTracking || false
      },
      tags: {
        enabled: true
      },
      time_estimates: {
        enabled: options.timeEstimates || false
      },
      checklists: {
        enabled: true
      },
      custom_fields: {
        enabled: true
      },
      priorities: {
        enabled: true,
        priorities: [
          { id: "1", priority: "urgent", color: "#f50000" },
          { id: "2", priority: "high", color: "#ffcc00" },
          { id: "3", priority: "normal", color: "#6fddff" },
          { id: "4", priority: "low", color: "#d8d8d8" }
        ]
      }
    }
  };

  const space = await apiRequest(`/team/${workspaceId}/space`, {
    method: 'POST',
    body
  });

  console.log('Created space:');
  console.log(formatSpace(space));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(space, null, 2));
  }

  return space;
}

/**
 * Update a space
 */
async function updateSpace(spaceId, options, verbose) {
  const body = {};

  if (options.name) {
    body.name = options.name;
  }

  if (options.private !== undefined) {
    body.private = options.private === 'true';
  }

  if (options.color) {
    body.color = options.color;
  }

  const space = await apiRequest(`/space/${spaceId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated space:');
  console.log(formatSpace(space));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(space, null, 2));
  }

  return space;
}

/**
 * Delete a space
 */
async function deleteSpace(spaceId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(spaceId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/space/${spaceId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted space: ${spaceId}`);
  return { success: true, id: spaceId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(spaceId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`WARNING: Deleting space ${spaceId} will delete ALL folders, lists, and tasks within it.\nAre you sure? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Spaces Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <workspace-id>                 List all spaces');
  console.log('  get <space-id>                      Get space details');
  console.log('  create <workspace-id> --name "..."  Create a new space');
  console.log('  update <space-id> [options]         Update a space');
  console.log('  delete <space-id>                   Delete a space');
  console.log('  help                                Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --name "..."             Space name');
  console.log('  --private true/false     Make space private');
  console.log('  --color "#RRGGBB"        Space color');
  console.log('  --time-tracking          Enable time tracking');
  console.log('  --time-estimates         Enable time estimates');
  console.log('  --start-dates            Enable start dates');
  console.log('');
  console.log('Examples:');
  console.log('  # List spaces in workspace');
  console.log('  node spaces.js list 12345678');
  console.log('');
  console.log('  # Get space details');
  console.log('  node spaces.js get 90123456');
  console.log('');
  console.log('  # Create a space');
  console.log('  node spaces.js create 12345678 --name "Marketing"');
  console.log('');
  console.log('  # Update space name');
  console.log('  node spaces.js update 90123456 --name "Sales"');
  console.log('');
  console.log('  # Delete space (with confirmation)');
  console.log('  node spaces.js delete 90123456');
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
          console.error('Usage: node spaces.js list <workspace-id>');
          process.exit(1);
        }
        await listSpaces(workspaceId, verbose);
        break;
      }

      case 'get': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node spaces.js get <space-id>');
          process.exit(1);
        }
        await getSpace(spaceId, verbose);
        break;
      }

      case 'create': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node spaces.js create <workspace-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node spaces.js create <workspace-id> --name "..."');
          process.exit(1);
        }
        await createSpace(workspaceId, args.name, {
          timeTracking: args['time-tracking'],
          timeEstimates: args['time-estimates'],
          startDates: args['start-dates']
        }, verbose);
        break;
      }

      case 'update': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node spaces.js update <space-id> [options]');
          process.exit(1);
        }
        await updateSpace(spaceId, {
          name: args.name,
          private: args.private,
          color: args.color
        }, verbose);
        break;
      }

      case 'delete': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node spaces.js delete <space-id>');
          process.exit(1);
        }
        await deleteSpace(spaceId, args.force, verbose);
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
