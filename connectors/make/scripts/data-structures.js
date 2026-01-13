#!/usr/bin/env node

/**
 * Make.com Data Structures Script
 * Define schemas for data stores.
 * 
 * Usage:
 *   node data-structures.js list --team-id <id>
 *   node data-structures.js get <structure-id>
 *   node data-structures.js create --team-id <id> --name "Name" --spec '[{"name":"field","type":"text"}]'
 *   node data-structures.js delete <structure-id>
 */

import { get, post, del, parseArgs, printTable, formatOutput } from './utils.js';

// List data structures for a team
async function listDataStructures(teamId, verbose) {
  const response = await get('/data-structures', { teamId });
  const structures = response.dataStructures || response;
  
  if (verbose) {
    formatOutput(structures, true);
    return;
  }
  
  if (!structures || structures.length === 0) {
    console.log('No data structures found.');
    return;
  }
  
  console.log(`Found ${structures.length} data structure(s):\n`);
  
  printTable(structures, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'strict', label: 'Strict', getter: s => s.strict ? 'Yes' : 'No' }
  ]);
}

// Get a specific data structure
async function getDataStructure(structureId, verbose) {
  const response = await get(`/data-structures/${structureId}`);
  const structure = response.dataStructure || response;
  
  if (verbose) {
    formatOutput(structure, true);
    return;
  }
  
  console.log(`Data Structure: ${structure.name}`);
  console.log(`ID: ${structure.id}`);
  console.log(`Strict: ${structure.strict ? 'Yes' : 'No'}`);
  console.log(`\nSpecification:`);
  console.log(JSON.stringify(structure.spec, null, 2));
}

// Create a new data structure
async function createDataStructure(teamId, name, spec, verbose) {
  const parsedSpec = JSON.parse(spec);
  const response = await post('/data-structures', {
    teamId: parseInt(teamId),
    name,
    spec: parsedSpec
  });
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const structure = response.dataStructure || response;
  console.log(`Data structure created: ${structure.name}`);
  console.log(`ID: ${structure.id}`);
}

// Delete a data structure
async function deleteDataStructure(structureId, verbose) {
  const response = await del(`/data-structures/${structureId}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Data structure ${structureId} deleted.`);
}

// Show help
function showHelp() {
  console.log('Make.com Data Structures Script');
  console.log('');
  console.log('Define schemas for data stores.');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>                    List data structures');
  console.log('  get <structure-id>                     Get structure details');
  console.log('  create --team-id <id> --name "Name" --spec \'[...]\'  Create structure');
  console.log('  delete <structure-id>                  Delete structure (destructive)');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>    Team ID');
  console.log('  --name <name>     Structure name');
  console.log('  --spec <json>     Field specification JSON array');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Spec Format:');
  console.log('  [{"name":"email","type":"email"},{"name":"count","type":"number"}]');
  console.log('');
  console.log('Field Types: text, number, boolean, date, email, url, array, collection');
  console.log('');
  console.log('Examples:');
  console.log('  node data-structures.js list --team-id 12345');
  console.log('  node data-structures.js get 67890');
  console.log('  node data-structures.js create --team-id 12345 --name "Contacts" \\');
  console.log('    --spec \'[{"name":"email","type":"email"},{"name":"name","type":"text"}]\'');
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
          console.error('Usage: node data-structures.js list --team-id <id>');
          process.exit(1);
        }
        await listDataStructures(teamId, verbose);
        break;
      }
      
      case 'get': {
        const structureId = args._[1];
        if (!structureId) {
          console.error('Error: Structure ID is required');
          console.error('Usage: node data-structures.js get <structure-id>');
          process.exit(1);
        }
        await getDataStructure(structureId, verbose);
        break;
      }
      
      case 'create': {
        const teamId = args['team-id'];
        const name = args.name;
        const spec = args.spec;
        if (!teamId || !name || !spec) {
          console.error('Error: --team-id, --name, and --spec are required');
          console.error('Usage: node data-structures.js create --team-id <id> --name "Name" --spec \'[...]\'');
          process.exit(1);
        }
        await createDataStructure(teamId, name, spec, verbose);
        break;
      }
      
      case 'delete': {
        const structureId = args._[1];
        if (!structureId) {
          console.error('Error: Structure ID is required');
          console.error('Usage: node data-structures.js delete <structure-id>');
          process.exit(1);
        }
        await deleteDataStructure(structureId, verbose);
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
