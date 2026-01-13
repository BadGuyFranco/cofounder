#!/usr/bin/env node

/**
 * Make.com Data Stores Script
 * List, get, and manage data stores and their records.
 * 
 * Usage:
 *   node data-stores.js list --team-id <id>
 *   node data-stores.js get <store-id>
 *   node data-stores.js records <store-id> [--limit 100]
 *   node data-stores.js add <store-id> --data '{"key":"value"}'
 *   node data-stores.js update <store-id> <record-key> --data '{"field":"value"}'
 *   node data-stores.js delete <store-id> <record-key>
 */

import { get, post, patch, del, parseArgs, printTable, formatOutput } from './utils.js';

// List data stores for a team
async function listDataStores(teamId, verbose) {
  const response = await get('/data-stores', { teamId });
  const stores = response.dataStores || response;
  
  if (verbose) {
    formatOutput(stores, true);
    return;
  }
  
  console.log(`Found ${stores.length} data store(s):\n`);
  
  printTable(stores, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'records', label: 'Records' },
    { key: 'size', label: 'Size (bytes)' },
    { key: 'maxSize', label: 'Max Size' }
  ]);
}

// Get a specific data store
async function getDataStore(storeId, verbose) {
  const response = await get(`/data-stores/${storeId}`);
  const store = response.dataStore || response;
  
  if (verbose) {
    formatOutput(store, true);
    return;
  }
  
  console.log(`Data Store: ${store.name}`);
  console.log(`ID: ${store.id}`);
  console.log(`Records: ${store.records || 0}`);
  console.log(`Size: ${store.size || 0} bytes`);
  console.log(`Max Size: ${store.maxSize || 'N/A'}`);
  if (store.dataStructureId) {
    console.log(`Data Structure ID: ${store.dataStructureId}`);
  }
}

// List records in a data store
async function listRecords(storeId, limit, verbose) {
  const params = {};
  if (limit) {
    params.pg = { limit: parseInt(limit) };
  }
  
  const response = await get(`/data-stores/${storeId}/data`, params);
  const records = response.records || response;
  
  if (verbose) {
    formatOutput(records, true);
    return;
  }
  
  if (!records || records.length === 0) {
    console.log('No records found.');
    return;
  }
  
  console.log(`Found ${records.length} record(s):\n`);
  console.log(JSON.stringify(records, null, 2));
}

// Add a record to a data store
async function addRecord(storeId, data, verbose) {
  const parsedData = JSON.parse(data);
  const response = await post(`/data-stores/${storeId}/data`, parsedData);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log('Record added successfully.');
  if (response) {
    console.log(JSON.stringify(response, null, 2));
  }
}

// Update a record in a data store
async function updateRecord(storeId, recordKey, data, verbose) {
  const parsedData = JSON.parse(data);
  const response = await patch(`/data-stores/${storeId}/data/${recordKey}`, parsedData);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log('Record updated successfully.');
  if (response) {
    console.log(JSON.stringify(response, null, 2));
  }
}

// Delete a record from a data store
async function deleteRecord(storeId, recordKey, verbose) {
  const response = await del(`/data-stores/${storeId}/data/${recordKey}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Record "${recordKey}" deleted successfully.`);
}

// Show help
function showHelp() {
  console.log('Make.com Data Stores Script');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>                      List data stores for a team');
  console.log('  get <store-id>                           Get data store details');
  console.log('  records <store-id> [--limit 100]         List records in a data store');
  console.log('  add <store-id> --data \'{"key":"val"}\'    Add a record to a data store');
  console.log('  update <store-id> <key> --data \'{"f":"v"}\' Update a record');
  console.log('  delete <store-id> <record-key>           Delete a record');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>     Team ID (required for list)');
  console.log('  --data <json>      JSON data for the record');
  console.log('  --limit <n>        Number of records to show');
  console.log('  --verbose          Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node data-stores.js list --team-id 12345');
  console.log('  node data-stores.js get 67890');
  console.log('  node data-stores.js records 67890 --limit 50');
  console.log('  node data-stores.js add 67890 --data \'{"name":"John","email":"john@example.com"}\'');
  console.log('  node data-stores.js update 67890 mykey --data \'{"name":"Jane"}\'');
  console.log('  node data-stores.js delete 67890 mykey');
  console.log('');
  console.log('Note: Record keys depend on your data store structure.');
  console.log('      Use "records" command to see existing records and their keys.');
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
          console.error('Usage: node data-stores.js list --team-id <id>');
          process.exit(1);
        }
        await listDataStores(teamId, verbose);
        break;
      }
      
      case 'get': {
        const storeId = args._[1];
        if (!storeId) {
          console.error('Error: Data store ID is required');
          console.error('Usage: node data-stores.js get <store-id>');
          process.exit(1);
        }
        await getDataStore(storeId, verbose);
        break;
      }
      
      case 'records': {
        const storeId = args._[1];
        if (!storeId) {
          console.error('Error: Data store ID is required');
          console.error('Usage: node data-stores.js records <store-id> [--limit 100]');
          process.exit(1);
        }
        await listRecords(storeId, args.limit, verbose);
        break;
      }
      
      case 'add': {
        const storeId = args._[1];
        const data = args.data;
        if (!storeId) {
          console.error('Error: Data store ID is required');
          console.error('Usage: node data-stores.js add <store-id> --data \'{"key":"value"}\'');
          process.exit(1);
        }
        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node data-stores.js add <store-id> --data \'{"key":"value"}\'');
          process.exit(1);
        }
        await addRecord(storeId, data, verbose);
        break;
      }
      
      case 'update': {
        const storeId = args._[1];
        const recordKey = args._[2];
        const data = args.data;
        if (!storeId || !recordKey) {
          console.error('Error: Data store ID and record key are required');
          console.error('Usage: node data-stores.js update <store-id> <record-key> --data \'{"field":"value"}\'');
          process.exit(1);
        }
        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node data-stores.js update <store-id> <record-key> --data \'{"field":"value"}\'');
          process.exit(1);
        }
        await updateRecord(storeId, recordKey, data, verbose);
        break;
      }
      
      case 'delete': {
        const storeId = args._[1];
        const recordKey = args._[2];
        if (!storeId || !recordKey) {
          console.error('Error: Data store ID and record key are required');
          console.error('Usage: node data-stores.js delete <store-id> <record-key>');
          process.exit(1);
        }
        await deleteRecord(storeId, recordKey, verbose);
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
