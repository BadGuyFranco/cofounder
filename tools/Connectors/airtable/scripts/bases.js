#!/usr/bin/env node

/**
 * Airtable Bases Script
 * List bases and get base schemas.
 *
 * Usage:
 *   node bases.js list
 *   node bases.js schema <base-id>
 *   node bases.js help
 */

import { parseArgs, apiRequest } from './utils.js';

// List all accessible bases
async function listBases(verbose) {
  let allBases = [];
  let offset = null;

  do {
    const endpoint = offset
      ? `/meta/bases?offset=${offset}`
      : '/meta/bases';

    const data = await apiRequest(endpoint);
    allBases = allBases.concat(data.bases || []);
    offset = data.offset;
  } while (offset);

  console.log(`Found ${allBases.length} base(s):\n`);

  for (const base of allBases) {
    console.log(`${base.name}`);
    console.log(`  ID: ${base.id}`);
    console.log(`  Permission: ${base.permissionLevel}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(allBases, null, 2));
  }

  return allBases;
}

// Get base schema (tables and fields)
async function getBaseSchema(baseId, verbose) {
  const data = await apiRequest(`/meta/bases/${baseId}/tables`);

  console.log(`Base: ${baseId}`);
  console.log(`Tables: ${data.tables.length}\n`);

  for (const table of data.tables) {
    console.log(`${table.name}`);
    console.log(`  ID: ${table.id}`);
    console.log(`  Primary Field: ${table.primaryFieldId}`);

    if (table.fields && table.fields.length > 0) {
      console.log('  Fields:');
      for (const field of table.fields) {
        console.log(`    - ${field.name} (${field.type})`);
        if (field.id) {
          console.log(`      ID: ${field.id}`);
        }
        // Show options for select fields
        if (field.options?.choices) {
          const choices = field.options.choices.map(c => c.name).join(', ');
          console.log(`      Choices: ${choices}`);
        }
      }
    }

    if (table.views && table.views.length > 0) {
      console.log('  Views:');
      for (const view of table.views) {
        console.log(`    - ${view.name} (${view.type})`);
        console.log(`      ID: ${view.id}`);
      }
    }

    console.log('');
  }

  if (verbose) {
    console.log('\nFull schema:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Show help
function showHelp() {
  console.log('Airtable Bases Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                     List all accessible bases');
  console.log('  schema <base-id>         Get base schema (tables, fields, views)');
  console.log('  help                     Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all bases');
  console.log('  node bases.js list');
  console.log('');
  console.log('  # Get schema for a base');
  console.log('  node bases.js schema appXXXXXXXXXXXXXX');
  console.log('');
  console.log('  # With verbose output');
  console.log('  node bases.js schema appXXXXXXXXXXXXXX --verbose');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list':
        await listBases(verbose);
        break;

      case 'schema': {
        const baseId = args._[1];
        if (!baseId) {
          console.error('Error: Base ID is required');
          console.error('Usage: node bases.js schema <base-id>');
          process.exit(1);
        }
        await getBaseSchema(baseId, verbose);
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
