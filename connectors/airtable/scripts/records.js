#!/usr/bin/env node

/**
 * Airtable Records Script
 * Create, read, update, and delete records.
 *
 * Usage:
 *   node records.js list <base-id> <table-id> [options]
 *   node records.js get <base-id> <table-id> <record-id>
 *   node records.js create <base-id> <table-id> --fields '{}'
 *   node records.js update <base-id> <table-id> <record-id> --fields '{}'
 *   node records.js delete <base-id> <table-id> <record-id> [--force]
 *   node records.js help
 */

import { parseArgs, apiRequest, formatRecord, parseJSON } from './utils.js';
import * as readline from 'readline';

// List records in a table
async function listRecords(baseId, tableId, options, verbose) {
  const params = new URLSearchParams();

  if (options.view) {
    params.append('view', options.view);
  }
  if (options.filter) {
    params.append('filterByFormula', options.filter);
  }
  if (options.sort) {
    const sorts = parseJSON(options.sort, 'sort');
    for (const sort of sorts) {
      params.append('sort[0][field]', sort.field);
      if (sort.direction) {
        params.append('sort[0][direction]', sort.direction);
      }
    }
  }
  if (options.fields) {
    const fields = parseJSON(options.fields, 'fields');
    for (const field of fields) {
      params.append('fields[]', field);
    }
  }
  if (options.limit) {
    params.append('maxRecords', options.limit);
  }
  if (options.offset) {
    params.append('offset', options.offset);
  }

  const queryString = params.toString();
  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  console.log(`Found ${data.records.length} record(s):\n`);

  for (const record of data.records) {
    console.log(formatRecord(record));
    console.log('');
  }

  if (data.offset) {
    console.log(`More records available. Use --offset "${data.offset}" to get next page.`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Get a single record
async function getRecord(baseId, tableId, recordId, verbose) {
  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;
  const record = await apiRequest(endpoint);

  console.log(formatRecord(record));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(record, null, 2));
  }

  return record;
}

// Create a record
async function createRecord(baseId, tableId, fields, verbose) {
  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}`;

  const data = await apiRequest(endpoint, {
    method: 'POST',
    body: {
      fields: parseJSON(fields, 'fields')
    }
  });

  console.log('Created record:');
  console.log(formatRecord(data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Create multiple records
async function createRecords(baseId, tableId, records, verbose) {
  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}`;
  const recordsData = parseJSON(records, 'records');

  // Airtable limits to 10 records per request
  const batches = [];
  for (let i = 0; i < recordsData.length; i += 10) {
    batches.push(recordsData.slice(i, i + 10));
  }

  let allCreated = [];

  for (const batch of batches) {
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: {
        records: batch.map(r => ({ fields: r }))
      }
    });
    allCreated = allCreated.concat(data.records);
  }

  console.log(`Created ${allCreated.length} record(s):\n`);

  for (const record of allCreated) {
    console.log(`ID: ${record.id}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(allCreated, null, 2));
  }

  return allCreated;
}

// Update a record
async function updateRecord(baseId, tableId, recordId, fields, verbose) {
  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;

  const data = await apiRequest(endpoint, {
    method: 'PATCH',
    body: {
      fields: parseJSON(fields, 'fields')
    }
  });

  console.log('Updated record:');
  console.log(formatRecord(data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Delete a record
async function deleteRecord(baseId, tableId, recordId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(recordId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  const endpoint = `/${baseId}/${encodeURIComponent(tableId)}/${recordId}`;

  const data = await apiRequest(endpoint, {
    method: 'DELETE'
  });

  console.log(`Deleted record: ${data.id}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Confirm deletion
async function confirmDelete(recordId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete record ${recordId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Airtable Records Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <base-id> <table-id>                     List records');
  console.log('  get <base-id> <table-id> <record-id>          Get a single record');
  console.log('  create <base-id> <table-id> --fields "{}"     Create a record');
  console.log('  batch <base-id> <table-id> --records "[{}]"   Create multiple records');
  console.log('  update <base-id> <table-id> <rec-id> --fields Update a record');
  console.log('  delete <base-id> <table-id> <record-id>       Delete a record');
  console.log('  help                                          Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --view <view-id>         Filter by view');
  console.log('  --filter "<formula>"     Airtable formula filter');
  console.log('  --sort "[{}]"            Sort specification');
  console.log('  --fields "[names]"       Fields to return');
  console.log('  --limit <n>              Max records (default: 100)');
  console.log('  --offset "<token>"       Pagination offset');
  console.log('');
  console.log('Examples:');
  console.log('  # List all records');
  console.log('  node records.js list appXXX tblXXX');
  console.log('');
  console.log('  # List with filter');
  console.log('  node records.js list appXXX tblXXX --filter "{Status}=\'Done\'"');
  console.log('');
  console.log('  # List with sort');
  console.log('  node records.js list appXXX tblXXX --sort \'[{"field": "Created", "direction": "desc"}]\'');
  console.log('');
  console.log('  # Get specific record');
  console.log('  node records.js get appXXX tblXXX recXXX');
  console.log('');
  console.log('  # Create record');
  console.log('  node records.js create appXXX tblXXX --fields \'{"Name": "New Item", "Status": "Todo"}\'');
  console.log('');
  console.log('  # Create multiple records');
  console.log('  node records.js batch appXXX tblXXX --records \'[{"Name": "Item 1"}, {"Name": "Item 2"}]\'');
  console.log('');
  console.log('  # Update record');
  console.log('  node records.js update appXXX tblXXX recXXX --fields \'{"Status": "Done"}\'');
  console.log('');
  console.log('  # Delete record (with confirmation)');
  console.log('  node records.js delete appXXX tblXXX recXXX');
  console.log('');
  console.log('  # Delete record (skip confirmation)');
  console.log('  node records.js delete appXXX tblXXX recXXX --force');
  console.log('');
  console.log('Filter Formula Examples:');
  console.log('  {Status}=\'Done\'');
  console.log('  {Priority}>=3');
  console.log('  AND({Status}=\'Active\', {Assigned}!=BLANK())');
  console.log('  FIND(\'urgent\', LOWER({Name}))');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const baseId = args._[1];
        const tableId = args._[2];

        if (!baseId || !tableId) {
          console.error('Error: Base ID and Table ID are required');
          console.error('Usage: node records.js list <base-id> <table-id>');
          process.exit(1);
        }

        await listRecords(baseId, tableId, {
          view: args.view,
          filter: args.filter,
          sort: args.sort,
          fields: args.fields,
          limit: args.limit,
          offset: args.offset
        }, verbose);
        break;
      }

      case 'get': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];

        if (!baseId || !tableId || !recordId) {
          console.error('Error: Base ID, Table ID, and Record ID are required');
          console.error('Usage: node records.js get <base-id> <table-id> <record-id>');
          process.exit(1);
        }

        await getRecord(baseId, tableId, recordId, verbose);
        break;
      }

      case 'create': {
        const baseId = args._[1];
        const tableId = args._[2];
        const fields = args.fields;

        if (!baseId || !tableId) {
          console.error('Error: Base ID and Table ID are required');
          console.error('Usage: node records.js create <base-id> <table-id> --fields "{}"');
          process.exit(1);
        }

        if (!fields) {
          console.error('Error: --fields is required');
          console.error('Usage: node records.js create <base-id> <table-id> --fields "{}"');
          process.exit(1);
        }

        await createRecord(baseId, tableId, fields, verbose);
        break;
      }

      case 'batch': {
        const baseId = args._[1];
        const tableId = args._[2];
        const records = args.records;

        if (!baseId || !tableId) {
          console.error('Error: Base ID and Table ID are required');
          console.error('Usage: node records.js batch <base-id> <table-id> --records "[{}]"');
          process.exit(1);
        }

        if (!records) {
          console.error('Error: --records is required');
          console.error('Usage: node records.js batch <base-id> <table-id> --records "[{}]"');
          process.exit(1);
        }

        await createRecords(baseId, tableId, records, verbose);
        break;
      }

      case 'update': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];
        const fields = args.fields;

        if (!baseId || !tableId || !recordId) {
          console.error('Error: Base ID, Table ID, and Record ID are required');
          console.error('Usage: node records.js update <base-id> <table-id> <record-id> --fields "{}"');
          process.exit(1);
        }

        if (!fields) {
          console.error('Error: --fields is required');
          console.error('Usage: node records.js update <base-id> <table-id> <record-id> --fields "{}"');
          process.exit(1);
        }

        await updateRecord(baseId, tableId, recordId, fields, verbose);
        break;
      }

      case 'delete': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];

        if (!baseId || !tableId || !recordId) {
          console.error('Error: Base ID, Table ID, and Record ID are required');
          console.error('Usage: node records.js delete <base-id> <table-id> <record-id>');
          process.exit(1);
        }

        await deleteRecord(baseId, tableId, recordId, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.type) {
      console.error('Type:', error.type);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
