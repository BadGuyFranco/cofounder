#!/usr/bin/env node

/**
 * ClickUp Folders Script
 * List, create, update, and delete folders.
 *
 * Usage:
 *   node folders.js list <space-id>
 *   node folders.js get <folder-id>
 *   node folders.js create <space-id> --name "Folder Name"
 *   node folders.js update <folder-id> --name "New Name"
 *   node folders.js delete <folder-id> [--force]
 *   node folders.js help
 */

import { parseArgs, apiRequest, formatFolder } from './utils.js';
import * as readline from 'readline';

/**
 * List all folders in a space
 */
async function listFolders(spaceId, verbose) {
  const data = await apiRequest(`/space/${spaceId}/folder?archived=false`);

  const folders = data.folders || [];
  console.log(`Found ${folders.length} folder(s):\n`);

  for (const folder of folders) {
    console.log(formatFolder(folder));

    if (folder.lists && folder.lists.length > 0) {
      console.log('  Lists:');
      for (const list of folder.lists) {
        console.log(`    - ${list.name} (${list.id})`);
      }
    }

    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return folders;
}

/**
 * Get a single folder by ID
 */
async function getFolder(folderId, verbose) {
  const folder = await apiRequest(`/folder/${folderId}`);

  console.log(formatFolder(folder));

  if (folder.lists && folder.lists.length > 0) {
    console.log('\nLists:');
    for (const list of folder.lists) {
      console.log(`  - ${list.name}`);
      console.log(`    ID: ${list.id}`);
      if (list.task_count !== undefined) {
        console.log(`    Tasks: ${list.task_count}`);
      }
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(folder, null, 2));
  }

  return folder;
}

/**
 * Create a new folder
 */
async function createFolder(spaceId, name, verbose) {
  const folder = await apiRequest(`/space/${spaceId}/folder`, {
    method: 'POST',
    body: { name }
  });

  console.log('Created folder:');
  console.log(formatFolder(folder));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(folder, null, 2));
  }

  return folder;
}

/**
 * Update a folder
 */
async function updateFolder(folderId, name, verbose) {
  const folder = await apiRequest(`/folder/${folderId}`, {
    method: 'PUT',
    body: { name }
  });

  console.log('Updated folder:');
  console.log(formatFolder(folder));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(folder, null, 2));
  }

  return folder;
}

/**
 * Delete a folder
 */
async function deleteFolder(folderId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(folderId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/folder/${folderId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted folder: ${folderId}`);
  return { success: true, id: folderId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(folderId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`WARNING: Deleting folder ${folderId} will delete ALL lists and tasks within it.\nAre you sure? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Folders Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <space-id>                  List all folders in a space');
  console.log('  get <folder-id>                  Get folder details and lists');
  console.log('  create <space-id> --name "..."   Create a new folder');
  console.log('  update <folder-id> --name "..."  Update folder name');
  console.log('  delete <folder-id>               Delete a folder');
  console.log('  help                             Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --name "..."             Folder name');
  console.log('');
  console.log('Examples:');
  console.log('  # List folders in space');
  console.log('  node folders.js list 90123456');
  console.log('');
  console.log('  # Get folder details');
  console.log('  node folders.js get 12345678');
  console.log('');
  console.log('  # Create a folder');
  console.log('  node folders.js create 90123456 --name "Q1 Projects"');
  console.log('');
  console.log('  # Update folder name');
  console.log('  node folders.js update 12345678 --name "Q2 Projects"');
  console.log('');
  console.log('  # Delete folder (with confirmation)');
  console.log('  node folders.js delete 12345678');
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
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node folders.js list <space-id>');
          process.exit(1);
        }
        await listFolders(spaceId, verbose);
        break;
      }

      case 'get': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node folders.js get <folder-id>');
          process.exit(1);
        }
        await getFolder(folderId, verbose);
        break;
      }

      case 'create': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node folders.js create <space-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node folders.js create <space-id> --name "..."');
          process.exit(1);
        }
        await createFolder(spaceId, args.name, verbose);
        break;
      }

      case 'update': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node folders.js update <folder-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node folders.js update <folder-id> --name "..."');
          process.exit(1);
        }
        await updateFolder(folderId, args.name, verbose);
        break;
      }

      case 'delete': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node folders.js delete <folder-id>');
          process.exit(1);
        }
        await deleteFolder(folderId, args.force, verbose);
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
