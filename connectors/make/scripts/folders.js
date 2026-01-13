#!/usr/bin/env node

/**
 * Make.com Scenario Folders Script
 * Organize scenarios into folders.
 * 
 * Usage:
 *   node folders.js list --team-id <id>
 *   node folders.js get <folder-id>
 *   node folders.js create --team-id <id> --name "Folder Name"
 *   node folders.js update <folder-id> --name "New Name"
 *   node folders.js delete <folder-id>
 */

import { get, post, patch, del, parseArgs, printTable, formatOutput } from './utils.js';

// List folders for a team
async function listFolders(teamId, verbose) {
  const response = await get('/scenarios-folders', { teamId });
  const folders = response.scenariosFolders || response;
  
  if (verbose) {
    formatOutput(folders, true);
    return;
  }
  
  if (!folders || folders.length === 0) {
    console.log('No scenario folders found.');
    return;
  }
  
  console.log(`Found ${folders.length} folder(s):\n`);
  
  printTable(folders, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'scenariosTotal', label: 'Scenarios' }
  ]);
}

// Get a specific folder
async function getFolder(folderId, verbose) {
  const response = await get(`/scenarios-folders/${folderId}`);
  const folder = response.scenariosFolder || response;
  
  if (verbose) {
    formatOutput(folder, true);
    return;
  }
  
  console.log(`Folder: ${folder.name}`);
  console.log(`ID: ${folder.id}`);
  console.log(`Team ID: ${folder.teamId}`);
  console.log(`Scenarios: ${folder.scenariosTotal || 0}`);
}

// Create a new folder
async function createFolder(teamId, name, verbose) {
  const response = await post('/scenarios-folders', {
    teamId: parseInt(teamId),
    name
  });
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const folder = response.scenariosFolder || response;
  console.log(`Folder created: ${folder.name}`);
  console.log(`ID: ${folder.id}`);
}

// Update a folder
async function updateFolder(folderId, name, verbose) {
  const response = await patch(`/scenarios-folders/${folderId}`, { name });
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Folder ${folderId} updated.`);
}

// Delete a folder
async function deleteFolder(folderId, verbose) {
  const response = await del(`/scenarios-folders/${folderId}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Folder ${folderId} deleted.`);
}

// Show help
function showHelp() {
  console.log('Make.com Scenario Folders Script');
  console.log('');
  console.log('Organize scenarios into folders.');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>                  List folders');
  console.log('  get <folder-id>                      Get folder details');
  console.log('  create --team-id <id> --name "Name"  Create folder');
  console.log('  update <folder-id> --name "New Name" Rename folder');
  console.log('  delete <folder-id>                   Delete folder (destructive)');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>    Team ID');
  console.log('  --name <name>     Folder name');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node folders.js list --team-id 12345');
  console.log('  node folders.js create --team-id 12345 --name "Production"');
  console.log('  node folders.js update 67890 --name "Production v2"');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node folders.js list --team-id <id>');
          process.exit(1);
        }
        await listFolders(teamId, verbose);
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
        const teamId = args['team-id'];
        const name = args.name;
        if (!teamId || !name) {
          console.error('Error: --team-id and --name are required');
          console.error('Usage: node folders.js create --team-id <id> --name "Name"');
          process.exit(1);
        }
        await createFolder(teamId, name, verbose);
        break;
      }
      
      case 'update': {
        const folderId = args._[1];
        const name = args.name;
        if (!folderId || !name) {
          console.error('Error: Folder ID and --name are required');
          console.error('Usage: node folders.js update <folder-id> --name "New Name"');
          process.exit(1);
        }
        await updateFolder(folderId, name, verbose);
        break;
      }
      
      case 'delete': {
        const folderId = args._[1];
        if (!folderId) {
          console.error('Error: Folder ID is required');
          console.error('Usage: node folders.js delete <folder-id>');
          process.exit(1);
        }
        await deleteFolder(folderId, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
