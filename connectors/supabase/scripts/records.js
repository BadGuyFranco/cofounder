#!/usr/bin/env node

/**
 * Supabase Records Script
 * Create, read, update, and delete records.
 *
 * Usage:
 *   node records.js list <table> [options]
 *   node records.js get <table> --filter "id=eq.123"
 *   node records.js create <table> --data '{}'
 *   node records.js update <table> --filter "id=eq.123" --data '{}'
 *   node records.js upsert <table> --data '{}' [--conflict "column"]
 *   node records.js delete <table> --filter "id=eq.123" [--force]
 *   node records.js help
 */

import { parseArgs, restRequest, formatRecord, parseJSON } from './utils.js';
import * as readline from 'readline';

// List/query records from a table
async function listRecords(table, options, verbose, project) {
  let endpoint = `/${table}`;
  const params = [];

  if (options.select) {
    params.push(`select=${encodeURIComponent(options.select)}`);
  }

  if (options.filter) {
    // Filter can contain multiple conditions separated by &
    params.push(options.filter);
  }

  if (options.order) {
    params.push(`order=${encodeURIComponent(options.order)}`);
  }

  if (options.limit) {
    params.push(`limit=${options.limit}`);
  }

  if (options.offset) {
    params.push(`offset=${options.offset}`);
  }

  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  const headers = {};
  if (options.count) {
    headers['Prefer'] = 'count=exact';
  }

  const data = await restRequest(endpoint, { headers, project: options.project });

  if (!Array.isArray(data)) {
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  }

  console.log(`Found ${data.length} record(s):\n`);

  for (const record of data) {
    console.log(formatRecord(record));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Get a single record (convenience wrapper)
async function getRecord(table, filter, verbose, project) {
  let endpoint = `/${table}`;
  
  if (filter) {
    endpoint += `?${filter}`;
  }

  const data = await restRequest(endpoint, {
    headers: { 'Accept': 'application/vnd.pgrst.object+json' },
    project: project
  });

  console.log(formatRecord(data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Create a record
async function createRecord(table, dataStr, verbose, project) {
  const endpoint = `/${table}`;
  const body = parseJSON(dataStr, 'data');

  const data = await restRequest(endpoint, {
    method: 'POST',
    body: body,
    prefer: 'return=representation',
    project: project
  });

  console.log('Created record:');
  if (Array.isArray(data) && data.length > 0) {
    console.log(formatRecord(data[0]));
  } else if (data) {
    console.log(formatRecord(data));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Create multiple records
async function createRecords(table, recordsStr, verbose, project) {
  const endpoint = `/${table}`;
  const records = parseJSON(recordsStr, 'data');

  if (!Array.isArray(records)) {
    console.error('Error: --data must be an array for batch create');
    process.exit(1);
  }

  const data = await restRequest(endpoint, {
    method: 'POST',
    body: records,
    prefer: 'return=representation',
    project: project
  });

  console.log(`Created ${data.length} record(s):\n`);

  for (const record of data) {
    if (record.id !== undefined) {
      console.log(`ID: ${record.id}`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Update records
async function updateRecords(table, filter, dataStr, verbose, project) {
  if (!filter) {
    console.error('Error: --filter is required for update');
    console.error('This prevents accidental updates to all records.');
    process.exit(1);
  }

  const endpoint = `/${table}?${filter}`;
  const body = parseJSON(dataStr, 'data');

  const data = await restRequest(endpoint, {
    method: 'PATCH',
    body: body,
    prefer: 'return=representation',
    project: project
  });

  console.log(`Updated ${Array.isArray(data) ? data.length : 1} record(s):`);
  
  if (Array.isArray(data)) {
    for (const record of data) {
      console.log(formatRecord(record));
      console.log('');
    }
  } else if (data) {
    console.log(formatRecord(data));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Upsert records (insert or update on conflict)
async function upsertRecords(table, dataStr, conflictColumn, verbose, project) {
  const endpoint = `/${table}`;
  const body = parseJSON(dataStr, 'data');

  let prefer = 'return=representation,resolution=merge-duplicates';
  if (conflictColumn) {
    // Note: conflict column is specified via on_conflict query param in PostgREST
  }

  const queryParams = conflictColumn ? `?on_conflict=${conflictColumn}` : '';

  const data = await restRequest(endpoint + queryParams, {
    method: 'POST',
    body: Array.isArray(body) ? body : [body],
    prefer: prefer,
    project: project
  });

  console.log(`Upserted ${Array.isArray(data) ? data.length : 1} record(s):`);
  
  if (Array.isArray(data)) {
    for (const record of data) {
      console.log(formatRecord(record));
      console.log('');
    }
  } else if (data) {
    console.log(formatRecord(data));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Delete records
async function deleteRecords(table, filter, force, verbose, project) {
  if (!filter) {
    console.error('Error: --filter is required for delete');
    console.error('This prevents accidental deletion of all records.');
    process.exit(1);
  }

  if (!force) {
    const confirmed = await confirmDelete(table, filter);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  const endpoint = `/${table}?${filter}`;

  const data = await restRequest(endpoint, {
    method: 'DELETE',
    prefer: 'return=representation',
    project: project
  });

  const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
  console.log(`Deleted ${count} record(s).`);

  if (verbose && data) {
    console.log('\nDeleted records:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Confirm deletion
async function confirmDelete(table, filter) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Delete from '${table}' where ${filter}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Supabase Records Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <table>              List/query records');
  console.log('  get <table>               Get single record (use --filter)');
  console.log('  create <table>            Create record(s)');
  console.log('  update <table>            Update records (requires --filter)');
  console.log('  upsert <table>            Insert or update on conflict');
  console.log('  delete <table>            Delete records (requires --filter)');
  console.log('  help                      Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                 Show full API responses');
  console.log('  --data "{}"               JSON data for create/update/upsert');
  console.log('  --filter "col=op.val"     PostgREST filter expression');
  console.log('  --select "col1,col2"      Columns to return');
  console.log('  --order "col.asc"         Sort order');
  console.log('  --limit N                 Max records (default: 100)');
  console.log('  --offset N                Skip N records');
  console.log('  --conflict "col"          Conflict column for upsert');
  console.log('  --force                   Skip delete confirmation');
  console.log('');
  console.log('Filter Operators:');
  console.log('  eq      Equals              status=eq.active');
  console.log('  neq     Not equals          status=neq.deleted');
  console.log('  gt      Greater than        age=gt.18');
  console.log('  gte     Greater or equal    age=gte.21');
  console.log('  lt      Less than           price=lt.100');
  console.log('  lte     Less or equal       price=lte.50');
  console.log('  like    Pattern match       name=like.*john*');
  console.log('  ilike   Case-insensitive    email=ilike.*@gmail.com');
  console.log('  in      In list             status=in.(active,pending)');
  console.log('  is      Is null/true/false  deleted_at=is.null');
  console.log('');
  console.log('Examples:');
  console.log('  # List all records');
  console.log('  node records.js list users');
  console.log('');
  console.log('  # List with filter');
  console.log('  node records.js list users --filter "role=eq.admin"');
  console.log('');
  console.log('  # List with multiple filters');
  console.log('  node records.js list users --filter "role=eq.admin&active=eq.true"');
  console.log('');
  console.log('  # Select specific columns');
  console.log('  node records.js list users --select "id,email,name"');
  console.log('');
  console.log('  # Order results');
  console.log('  node records.js list users --order "created_at.desc"');
  console.log('');
  console.log('  # Pagination');
  console.log('  node records.js list users --limit 10 --offset 20');
  console.log('');
  console.log('  # Get single record');
  console.log('  node records.js get users --filter "id=eq.123"');
  console.log('');
  console.log('  # Create record');
  console.log('  node records.js create users --data \'{"email": "user@example.com", "name": "John"}\'');
  console.log('');
  console.log('  # Create multiple records');
  console.log('  node records.js create users --data \'[{"name": "John"}, {"name": "Jane"}]\'');
  console.log('');
  console.log('  # Update records');
  console.log('  node records.js update users --filter "id=eq.123" --data \'{"name": "Jane"}\'');
  console.log('');
  console.log('  # Upsert (insert or update)');
  console.log('  node records.js upsert users --data \'{"id": 123, "name": "John"}\' --conflict "id"');
  console.log('');
  console.log('  # Delete records');
  console.log('  node records.js delete users --filter "id=eq.123"');
  console.log('');
  console.log('  # Delete without confirmation');
  console.log('  node records.js delete users --filter "id=eq.123" --force');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const project = args.project; // Project reference

  try {
    switch (command) {
      case 'list': {
        const table = args._[1];

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js list <table> [--project <ref>]');
          process.exit(1);
        }

        await listRecords(table, {
          select: args.select,
          filter: args.filter,
          order: args.order,
          limit: args.limit || '100',
          offset: args.offset,
          count: args.count,
          project: project
        }, verbose);
        break;
      }

      case 'get': {
        const table = args._[1];
        const filter = args.filter;

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js get <table> --filter "id=eq.123" [--project <ref>]');
          process.exit(1);
        }

        if (!filter) {
          console.error('Error: --filter is required');
          console.error('Usage: node records.js get <table> --filter "id=eq.123" [--project <ref>]');
          process.exit(1);
        }

        await getRecord(table, filter, verbose, project);
        break;
      }

      case 'create': {
        const table = args._[1];
        const data = args.data;

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js create <table> --data "{}" [--project <ref>]');
          process.exit(1);
        }

        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node records.js create <table> --data "{}" [--project <ref>]');
          process.exit(1);
        }

        // Check if it's an array (batch create)
        const parsed = parseJSON(data, 'data');
        if (Array.isArray(parsed)) {
          await createRecords(table, data, verbose, project);
        } else {
          await createRecord(table, data, verbose, project);
        }
        break;
      }

      case 'update': {
        const table = args._[1];
        const filter = args.filter;
        const data = args.data;

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js update <table> --filter "id=eq.123" --data "{}" [--project <ref>]');
          process.exit(1);
        }

        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node records.js update <table> --filter "id=eq.123" --data "{}" [--project <ref>]');
          process.exit(1);
        }

        await updateRecords(table, filter, data, verbose, project);
        break;
      }

      case 'upsert': {
        const table = args._[1];
        const data = args.data;
        const conflict = args.conflict;

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js upsert <table> --data "{}" [--conflict "col"] [--project <ref>]');
          process.exit(1);
        }

        if (!data) {
          console.error('Error: --data is required');
          console.error('Usage: node records.js upsert <table> --data "{}" [--conflict "col"] [--project <ref>]');
          process.exit(1);
        }

        await upsertRecords(table, data, conflict, verbose, project);
        break;
      }

      case 'delete': {
        const table = args._[1];
        const filter = args.filter;

        if (!table) {
          console.error('Error: Table name is required');
          console.error('Usage: node records.js delete <table> --filter "id=eq.123" [--project <ref>]');
          process.exit(1);
        }

        await deleteRecords(table, filter, args.force, verbose, project);
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
