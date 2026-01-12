#!/usr/bin/env node

/**
 * ClickUp Checklists Script
 * Manage checklists and checklist items on tasks.
 *
 * Usage:
 *   node checklists.js create <task-id> --name "Checklist Name"
 *   node checklists.js update <checklist-id> --name "New Name"
 *   node checklists.js delete <checklist-id> [--force]
 *   node checklists.js item-create <checklist-id> --name "Item Name"
 *   node checklists.js item-update <checklist-id> <item-id> [options]
 *   node checklists.js item-delete <checklist-id> <item-id> [--force]
 *   node checklists.js help
 */

import { parseArgs, apiRequest } from './utils.js';
import * as readline from 'readline';

/**
 * Create a checklist on a task
 */
async function createChecklist(taskId, name, verbose) {
  const body = { name };

  const data = await apiRequest(`/task/${taskId}/checklist`, {
    method: 'POST',
    body
  });

  console.log('Created checklist:');
  console.log(`  ID: ${data.checklist.id}`);
  console.log(`  Name: ${data.checklist.name}`);
  console.log(`  Task: ${taskId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.checklist;
}

/**
 * Update a checklist
 */
async function updateChecklist(checklistId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.position !== undefined) body.position = parseInt(options.position);

  const data = await apiRequest(`/checklist/${checklistId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated checklist:');
  console.log(`  ID: ${data.checklist.id}`);
  console.log(`  Name: ${data.checklist.name}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.checklist;
}

/**
 * Delete a checklist
 */
async function deleteChecklist(checklistId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete('checklist', checklistId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/checklist/${checklistId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted checklist: ${checklistId}`);
  return { success: true, id: checklistId };
}

/**
 * Create a checklist item
 */
async function createChecklistItem(checklistId, name, options, verbose) {
  const body = {
    name,
    ...(options.assignee && { assignee: parseInt(options.assignee) })
  };

  const data = await apiRequest(`/checklist/${checklistId}/checklist_item`, {
    method: 'POST',
    body
  });

  console.log('Created checklist item:');
  console.log(`  ID: ${data.checklist.items[data.checklist.items.length - 1]?.id || 'created'}`);
  console.log(`  Name: ${name}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Update a checklist item
 */
async function updateChecklistItem(checklistId, itemId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.assignee) body.assignee = parseInt(options.assignee);
  if (options.resolved !== undefined) body.resolved = options.resolved === 'true';
  if (options.parent) body.parent = options.parent;

  const data = await apiRequest(`/checklist/${checklistId}/checklist_item/${itemId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated checklist item:');
  console.log(`  Checklist: ${checklistId}`);
  console.log(`  Item: ${itemId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Delete a checklist item
 */
async function deleteChecklistItem(checklistId, itemId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete('checklist item', itemId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/checklist/${checklistId}/checklist_item/${itemId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted checklist item: ${itemId}`);
  return { success: true, id: itemId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(type, id) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete ${type} ${id}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Checklists Script');
  console.log('');
  console.log('Commands:');
  console.log('  create <task-id> --name "..."          Create a checklist');
  console.log('  update <checklist-id> [options]        Update a checklist');
  console.log('  delete <checklist-id>                  Delete a checklist');
  console.log('  item-create <checklist-id> --name      Create a checklist item');
  console.log('  item-update <checklist-id> <item-id>   Update a checklist item');
  console.log('  item-delete <checklist-id> <item-id>   Delete a checklist item');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Checklist Options:');
  console.log('  --name "..."             Checklist name');
  console.log('  --position <n>           Position in task (0-based)');
  console.log('');
  console.log('Item Options:');
  console.log('  --name "..."             Item name/text');
  console.log('  --assignee <user-id>     Assign item to user');
  console.log('  --resolved true/false    Mark item as completed');
  console.log('  --parent <item-id>       Make nested under another item');
  console.log('');
  console.log('Other Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # Create a checklist on a task');
  console.log('  node checklists.js create abc123 --name "Pre-launch Checklist"');
  console.log('');
  console.log('  # Add items to checklist');
  console.log('  node checklists.js item-create checklist-uuid --name "Review code"');
  console.log('  node checklists.js item-create checklist-uuid --name "Run tests"');
  console.log('  node checklists.js item-create checklist-uuid --name "Update docs"');
  console.log('');
  console.log('  # Mark item as completed');
  console.log('  node checklists.js item-update checklist-uuid item-uuid --resolved true');
  console.log('');
  console.log('  # Assign item to someone');
  console.log('  node checklists.js item-update checklist-uuid item-uuid --assignee 123456');
  console.log('');
  console.log('  # Rename a checklist');
  console.log('  node checklists.js update checklist-uuid --name "Launch Checklist"');
  console.log('');
  console.log('  # Delete a checklist');
  console.log('  node checklists.js delete checklist-uuid');
  console.log('');
  console.log('Note: To view checklists, use "node tasks.js get <task-id>" which shows');
  console.log('      checklist details including all items and their completion status.');
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
      case 'create': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node checklists.js create <task-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          process.exit(1);
        }
        await createChecklist(taskId, args.name, verbose);
        break;
      }

      case 'update': {
        const checklistId = args._[1];
        if (!checklistId) {
          console.error('Error: Checklist ID is required');
          console.error('Usage: node checklists.js update <checklist-id> [options]');
          process.exit(1);
        }
        await updateChecklist(checklistId, {
          name: args.name,
          position: args.position
        }, verbose);
        break;
      }

      case 'delete': {
        const checklistId = args._[1];
        if (!checklistId) {
          console.error('Error: Checklist ID is required');
          console.error('Usage: node checklists.js delete <checklist-id>');
          process.exit(1);
        }
        await deleteChecklist(checklistId, args.force, verbose);
        break;
      }

      case 'item-create': {
        const checklistId = args._[1];
        if (!checklistId) {
          console.error('Error: Checklist ID is required');
          console.error('Usage: node checklists.js item-create <checklist-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          process.exit(1);
        }
        await createChecklistItem(checklistId, args.name, {
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'item-update': {
        const checklistId = args._[1];
        const itemId = args._[2];
        if (!checklistId || !itemId) {
          console.error('Error: Checklist ID and Item ID are required');
          console.error('Usage: node checklists.js item-update <checklist-id> <item-id> [options]');
          process.exit(1);
        }
        await updateChecklistItem(checklistId, itemId, {
          name: args.name,
          assignee: args.assignee,
          resolved: args.resolved,
          parent: args.parent
        }, verbose);
        break;
      }

      case 'item-delete': {
        const checklistId = args._[1];
        const itemId = args._[2];
        if (!checklistId || !itemId) {
          console.error('Error: Checklist ID and Item ID are required');
          console.error('Usage: node checklists.js item-delete <checklist-id> <item-id>');
          process.exit(1);
        }
        await deleteChecklistItem(checklistId, itemId, args.force, verbose);
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
