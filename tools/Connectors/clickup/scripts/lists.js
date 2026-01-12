#!/usr/bin/env node

/**
 * ClickUp Lists Script
 * List, create, update, and delete lists.
 *
 * Usage:
 *   node lists.js list <folder-id>
 *   node lists.js folderless <space-id>
 *   node lists.js get <list-id>
 *   node lists.js create <folder-id> --name "List Name"
 *   node lists.js create-folderless <space-id> --name "List Name"
 *   node lists.js update <list-id> --name "New Name"
 *   node lists.js delete <list-id> [--force]
 *   node lists.js help
 */

import { parseArgs, apiRequest, formatList } from './utils.js';
import * as readline from 'readline';

/**
 * List all lists in a folder
 */
async function listListsInFolder(folderId, verbose) {
  const data = await apiRequest(`/folder/${folderId}/list?archived=false`);

  const lists = data.lists || [];
  console.log(`Found ${lists.length} list(s):\n`);

  for (const list of lists) {
    console.log(formatList(list));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return lists;
}

/**
 * List all folderless lists in a space
 */
async function listFolderlessLists(spaceId, verbose) {
  const data = await apiRequest(`/space/${spaceId}/list?archived=false`);

  const lists = data.lists || [];
  console.log(`Found ${lists.length} folderless list(s):\n`);

  for (const list of lists) {
    console.log(formatList(list));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return lists;
}

/**
 * Get a single list by ID
 */
async function getList(listId, verbose) {
  const list = await apiRequest(`/list/${listId}`);

  console.log(formatList(list));

  if (list.statuses && list.statuses.length > 0) {
    console.log('\nStatuses:');
    for (const status of list.statuses) {
      console.log(`  - ${status.status} (${status.type})`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(list, null, 2));
  }

  return list;
}

/**
 * Create a new list in a folder
 */
async function createList(folderId, name, options, verbose) {
  const body = {
    name,
    ...(options.content && { content: options.content }),
    ...(options.dueDate && { due_date: options.dueDate }),
    ...(options.priority && { priority: parseInt(options.priority) }),
    ...(options.assignee && { assignee: parseInt(options.assignee) })
  };

  const list = await apiRequest(`/folder/${folderId}/list`, {
    method: 'POST',
    body
  });

  console.log('Created list:');
  console.log(formatList(list));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(list, null, 2));
  }

  return list;
}

/**
 * Create a folderless list in a space
 */
async function createFolderlessList(spaceId, name, options, verbose) {
  const body = {
    name,
    ...(options.content && { content: options.content }),
    ...(options.dueDate && { due_date: options.dueDate }),
    ...(options.priority && { priority: parseInt(options.priority) }),
    ...(options.assignee && { assignee: parseInt(options.assignee) })
  };

  const list = await apiRequest(`/space/${spaceId}/list`, {
    method: 'POST',
    body
  });

  console.log('Created folderless list:');
  console.log(formatList(list));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(list, null, 2));
  }

  return list;
}

/**
 * Update a list
 */
async function updateList(listId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.content) body.content = options.content;
  if (options.dueDate) body.due_date = options.dueDate;
  if (options.priority) body.priority = parseInt(options.priority);
  if (options.assignee) body.assignee = parseInt(options.assignee);
  if (options.unsetStatus) body.unset_status = options.unsetStatus === 'true';

  const list = await apiRequest(`/list/${listId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated list:');
  console.log(formatList(list));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(list, null, 2));
  }

  return list;
}

/**
 * Delete a list
 */
async function deleteList(listId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(listId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/list/${listId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted list: ${listId}`);
  return { success: true, id: listId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(listId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`WARNING: Deleting list ${listId} will delete ALL tasks within it.\nAre you sure? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Lists Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <folder-id>                       List all lists in a folder');
  console.log('  folderless <space-id>                  List folderless lists in a space');
  console.log('  get <list-id>                          Get list details');
  console.log('  create <folder-id> --name "..."        Create a list in a folder');
  console.log('  create-folderless <space-id> --name    Create a folderless list');
  console.log('  update <list-id> [options]             Update a list');
  console.log('  delete <list-id>                       Delete a list');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --name "..."             List name');
  console.log('  --content "..."          List description');
  console.log('  --due-date <timestamp>   Due date (milliseconds)');
  console.log('  --priority <1-4>         Priority (1=urgent, 4=low)');
  console.log('  --assignee <user-id>     Default assignee');
  console.log('');
  console.log('Examples:');
  console.log('  # List lists in a folder');
  console.log('  node lists.js list 12345678');
  console.log('');
  console.log('  # List folderless lists in a space');
  console.log('  node lists.js folderless 90123456');
  console.log('');
  console.log('  # Get list details');
  console.log('  node lists.js get 12345678');
  console.log('');
  console.log('  # Create a list in a folder');
  console.log('  node lists.js create 12345678 --name "Sprint 1"');
  console.log('');
  console.log('  # Create a folderless list');
  console.log('  node lists.js create-folderless 90123456 --name "Quick Tasks"');
  console.log('');
  console.log('  # Update list name');
  console.log('  node lists.js update 12345678 --name "Sprint 2"');
  console.log('');
  console.log('  # Delete list (with confirmation)');
  console.log('  node lists.js delete 12345678');
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
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node lists.js list <folder-id>');
          process.exit(1);
        }
        await listListsInFolder(folderId, verbose);
        break;
      }

      case 'folderless': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node lists.js folderless <space-id>');
          process.exit(1);
        }
        await listFolderlessLists(spaceId, verbose);
        break;
      }

      case 'get': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node lists.js get <list-id>');
          process.exit(1);
        }
        await getList(listId, verbose);
        break;
      }

      case 'create': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node lists.js create <folder-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node lists.js create <folder-id> --name "..."');
          process.exit(1);
        }
        await createList(folderId, args.name, {
          content: args.content,
          dueDate: args['due-date'],
          priority: args.priority,
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'create-folderless': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node lists.js create-folderless <space-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node lists.js create-folderless <space-id> --name "..."');
          process.exit(1);
        }
        await createFolderlessList(spaceId, args.name, {
          content: args.content,
          dueDate: args['due-date'],
          priority: args.priority,
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'update': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node lists.js update <list-id> [options]');
          process.exit(1);
        }
        await updateList(listId, {
          name: args.name,
          content: args.content,
          dueDate: args['due-date'],
          priority: args.priority,
          assignee: args.assignee,
          unsetStatus: args['unset-status']
        }, verbose);
        break;
      }

      case 'delete': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node lists.js delete <list-id>');
          process.exit(1);
        }
        await deleteList(listId, args.force, verbose);
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
