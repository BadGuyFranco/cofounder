#!/usr/bin/env node

/**
 * Airtable Tables Script
 * List tables and get table schemas.
 *
 * Usage:
 *   node tables.js list <base-id>
 *   node tables.js schema <base-id> <table-id-or-name>
 *   node tables.js help
 */

import { parseArgs, apiRequest } from './utils.js';

// List all tables in a base
async function listTables(baseId, verbose) {
  const data = await apiRequest(`/meta/bases/${baseId}/tables`);

  console.log(`Base: ${baseId}`);
  console.log(`Found ${data.tables.length} table(s):\n`);

  for (const table of data.tables) {
    console.log(`${table.name}`);
    console.log(`  ID: ${table.id}`);
    console.log(`  Fields: ${table.fields?.length || 0}`);
    console.log(`  Views: ${table.views?.length || 0}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.tables;
}

// Get detailed table schema
async function getTableSchema(baseId, tableIdOrName, verbose) {
  const data = await apiRequest(`/meta/bases/${baseId}/tables`);

  // Find table by ID or name
  const table = data.tables.find(
    t => t.id === tableIdOrName || t.name === tableIdOrName
  );

  if (!table) {
    console.error(`Error: Table "${tableIdOrName}" not found in base ${baseId}`);
    console.error('Available tables:');
    for (const t of data.tables) {
      console.error(`  - ${t.name} (${t.id})`);
    }
    process.exit(1);
  }

  console.log(`Table: ${table.name}`);
  console.log(`ID: ${table.id}`);
  console.log(`Primary Field ID: ${table.primaryFieldId}`);
  console.log('');

  console.log('Fields:');
  for (const field of table.fields || []) {
    console.log(`  ${field.name}`);
    console.log(`    ID: ${field.id}`);
    console.log(`    Type: ${field.type}`);

    // Show type-specific info
    if (field.options) {
      if (field.options.choices) {
        const choices = field.options.choices.map(c => c.name).join(', ');
        console.log(`    Choices: ${choices}`);
      }
      if (field.options.linkedTableId) {
        console.log(`    Linked Table: ${field.options.linkedTableId}`);
      }
      if (field.options.isReversed !== undefined) {
        console.log(`    Is Reversed: ${field.options.isReversed}`);
      }
      if (field.options.dateFormat) {
        console.log(`    Date Format: ${JSON.stringify(field.options.dateFormat)}`);
      }
      if (field.options.precision !== undefined) {
        console.log(`    Precision: ${field.options.precision}`);
      }
    }
    console.log('');
  }

  if (table.views && table.views.length > 0) {
    console.log('Views:');
    for (const view of table.views) {
      console.log(`  ${view.name}`);
      console.log(`    ID: ${view.id}`);
      console.log(`    Type: ${view.type}`);
      console.log('');
    }
  }

  if (verbose) {
    console.log('\nFull schema:');
    console.log(JSON.stringify(table, null, 2));
  }

  return table;
}

// Show help
function showHelp() {
  console.log('Airtable Tables Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <base-id>                          List all tables in a base');
  console.log('  schema <base-id> <table-id-or-name>     Get detailed table schema');
  console.log('  help                                    Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                               Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all tables');
  console.log('  node tables.js list appXXXXXXXXXXXXXX');
  console.log('');
  console.log('  # Get schema by table ID');
  console.log('  node tables.js schema appXXXXXXXXXXXXXX tblXXXXXXXXXXXXXX');
  console.log('');
  console.log('  # Get schema by table name');
  console.log('  node tables.js schema appXXXXXXXXXXXXXX "My Table"');
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
        if (!baseId) {
          console.error('Error: Base ID is required');
          console.error('Usage: node tables.js list <base-id>');
          process.exit(1);
        }
        await listTables(baseId, verbose);
        break;
      }

      case 'schema': {
        const baseId = args._[1];
        const tableIdOrName = args._[2];

        if (!baseId) {
          console.error('Error: Base ID is required');
          console.error('Usage: node tables.js schema <base-id> <table-id-or-name>');
          process.exit(1);
        }
        if (!tableIdOrName) {
          console.error('Error: Table ID or name is required');
          console.error('Usage: node tables.js schema <base-id> <table-id-or-name>');
          process.exit(1);
        }

        await getTableSchema(baseId, tableIdOrName, verbose);
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
