#!/usr/bin/env node

/**
 * Airtable Fields Script
 * Create, update, and manage table fields (columns).
 *
 * Usage:
 *   node fields.js list <base-id> <table-id>
 *   node fields.js get <base-id> <table-id> <field-id-or-name>
 *   node fields.js create <base-id> <table-id> --name "Field Name" --type <type> [options]
 *   node fields.js update <base-id> <table-id> <field-id> --name "New Name" [options]
 *   node fields.js help
 */

import { parseArgs, apiRequest, parseJSON } from './utils.js';

// List all fields in a table
async function listFields(baseId, tableId, verbose) {
  const data = await apiRequest(`/meta/bases/${baseId}/tables`);

  const table = data.tables.find(t => t.id === tableId || t.name === tableId);
  if (!table) {
    console.error(`Error: Table "${tableId}" not found`);
    process.exit(1);
  }

  console.log(`Table: ${table.name}`);
  console.log(`ID: ${table.id}`);
  console.log(`\nFields (${table.fields.length}):\n`);

  for (const field of table.fields) {
    console.log(`${field.name}`);
    console.log(`  ID: ${field.id}`);
    console.log(`  Type: ${field.type}`);

    if (field.options) {
      if (field.options.choices) {
        const choices = field.options.choices.map(c => c.name).join(', ');
        console.log(`  Choices: ${choices}`);
      }
      if (field.options.linkedTableId) {
        console.log(`  Linked Table: ${field.options.linkedTableId}`);
      }
      if (field.options.precision !== undefined) {
        console.log(`  Precision: ${field.options.precision}`);
      }
      if (field.options.dateFormat) {
        console.log(`  Date Format: ${JSON.stringify(field.options.dateFormat)}`);
      }
    }
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(table.fields, null, 2));
  }

  return table.fields;
}

// Get a single field
async function getField(baseId, tableId, fieldIdOrName, verbose) {
  const data = await apiRequest(`/meta/bases/${baseId}/tables`);

  const table = data.tables.find(t => t.id === tableId || t.name === tableId);
  if (!table) {
    console.error(`Error: Table "${tableId}" not found`);
    process.exit(1);
  }

  const field = table.fields.find(f => f.id === fieldIdOrName || f.name === fieldIdOrName);
  if (!field) {
    console.error(`Error: Field "${fieldIdOrName}" not found`);
    console.error('Available fields:');
    for (const f of table.fields) {
      console.error(`  - ${f.name} (${f.id})`);
    }
    process.exit(1);
  }

  console.log(`Field: ${field.name}`);
  console.log(`ID: ${field.id}`);
  console.log(`Type: ${field.type}`);

  if (field.description) {
    console.log(`Description: ${field.description}`);
  }

  if (field.options) {
    console.log('\nOptions:');
    console.log(JSON.stringify(field.options, null, 2));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(field, null, 2));
  }

  return field;
}

// Create a new field
async function createField(baseId, tableId, options, verbose) {
  const { name, type, description } = options;

  if (!name || !type) {
    console.error('Error: --name and --type are required');
    process.exit(1);
  }

  const body = {
    name,
    type,
  };

  if (description) {
    body.description = description;
  }

  // Handle type-specific options
  if (options.options) {
    body.options = parseJSON(options.options, 'options');
  } else {
    // Build options based on type
    switch (type) {
      case 'singleSelect':
      case 'multipleSelects':
        if (options.choices) {
          body.options = {
            choices: options.choices.split(',').map(c => ({ name: c.trim() }))
          };
        }
        break;

      case 'number':
      case 'currency':
      case 'percent':
        if (options.precision !== undefined) {
          body.options = { precision: parseInt(options.precision) };
        }
        break;

      case 'date':
      case 'dateTime':
        body.options = {
          dateFormat: { name: options.dateFormat || 'iso' }
        };
        if (type === 'dateTime') {
          body.options.timeFormat = { name: options.timeFormat || '24hour' };
          body.options.timeZone = options.timeZone || 'utc';
        }
        break;

      case 'multipleRecordLinks':
        if (options.linkedTableId) {
          body.options = {
            linkedTableId: options.linkedTableId
          };
        }
        break;
    }
  }

  const endpoint = `/meta/bases/${baseId}/tables/${tableId}/fields`;

  const data = await apiRequest(endpoint, {
    method: 'POST',
    body
  });

  console.log('Created field:');
  console.log(`  Name: ${data.name}`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Type: ${data.type}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Update a field
async function updateField(baseId, tableId, fieldId, options, verbose) {
  const body = {};

  if (options.name) {
    body.name = options.name;
  }

  if (options.description !== undefined) {
    body.description = options.description;
  }

  if (options.options) {
    body.options = parseJSON(options.options, 'options');
  }

  if (Object.keys(body).length === 0) {
    console.error('Error: At least one update option is required (--name, --description, or --options)');
    process.exit(1);
  }

  const endpoint = `/meta/bases/${baseId}/tables/${tableId}/fields/${fieldId}`;

  const data = await apiRequest(endpoint, {
    method: 'PATCH',
    body
  });

  console.log('Updated field:');
  console.log(`  Name: ${data.name}`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Type: ${data.type}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Show help
function showHelp() {
  console.log('Airtable Fields Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <base-id> <table-id>                    List all fields');
  console.log('  get <base-id> <table-id> <field-id-or-name>  Get field details');
  console.log('  create <base-id> <table-id> [options]        Create a new field');
  console.log('  update <base-id> <table-id> <field-id>       Update a field');
  console.log('  help                                         Show this help');
  console.log('');
  console.log('Create Options:');
  console.log('  --name <name>              Field name (required)');
  console.log('  --type <type>              Field type (required)');
  console.log('  --description <desc>       Field description');
  console.log('  --options <json>           Type-specific options as JSON');
  console.log('  --choices <a,b,c>          Choices for select fields');
  console.log('  --precision <n>            Decimal precision for number fields');
  console.log('  --linkedTableId <id>       Linked table for link fields');
  console.log('');
  console.log('Update Options:');
  console.log('  --name <name>              New field name');
  console.log('  --description <desc>       New description');
  console.log('  --options <json>           Updated options as JSON');
  console.log('');
  console.log('Field Types:');
  console.log('  singleLineText, multilineText, richText');
  console.log('  number, currency, percent, rating');
  console.log('  singleSelect, multipleSelects');
  console.log('  date, dateTime, duration');
  console.log('  checkbox');
  console.log('  email, url, phoneNumber');
  console.log('  multipleRecordLinks, multipleLookupValues');
  console.log('  multipleAttachments');
  console.log('  formula, rollup, count');
  console.log('  autoNumber, createdTime, lastModifiedTime');
  console.log('  createdBy, lastModifiedBy');
  console.log('  button, barcode');
  console.log('');
  console.log('Examples:');
  console.log('  # List fields');
  console.log('  node fields.js list appXXX tblXXX');
  console.log('');
  console.log('  # Create text field');
  console.log('  node fields.js create appXXX tblXXX --name "Notes" --type multilineText');
  console.log('');
  console.log('  # Create select field with choices');
  console.log('  node fields.js create appXXX tblXXX --name "Status" --type singleSelect --choices "Todo,In Progress,Done"');
  console.log('');
  console.log('  # Create number field');
  console.log('  node fields.js create appXXX tblXXX --name "Amount" --type currency --precision 2');
  console.log('');
  console.log('  # Create linked record field');
  console.log('  node fields.js create appXXX tblXXX --name "Related Items" --type multipleRecordLinks --linkedTableId tblYYY');
  console.log('');
  console.log('  # Rename a field');
  console.log('  node fields.js update appXXX tblXXX fldXXX --name "New Name"');
  console.log('');
  console.log('Note: Some field types (formula, rollup, lookup) require additional');
  console.log('configuration via --options JSON. Use --verbose to see field structures.');
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
          console.error('Usage: node fields.js list <base-id> <table-id>');
          process.exit(1);
        }

        await listFields(baseId, tableId, verbose);
        break;
      }

      case 'get': {
        const baseId = args._[1];
        const tableId = args._[2];
        const fieldIdOrName = args._[3];

        if (!baseId || !tableId || !fieldIdOrName) {
          console.error('Error: Base ID, Table ID, and Field ID/Name are required');
          console.error('Usage: node fields.js get <base-id> <table-id> <field-id-or-name>');
          process.exit(1);
        }

        await getField(baseId, tableId, fieldIdOrName, verbose);
        break;
      }

      case 'create': {
        const baseId = args._[1];
        const tableId = args._[2];

        if (!baseId || !tableId) {
          console.error('Error: Base ID and Table ID are required');
          console.error('Usage: node fields.js create <base-id> <table-id> --name "Name" --type <type>');
          process.exit(1);
        }

        await createField(baseId, tableId, {
          name: args.name,
          type: args.type,
          description: args.description,
          options: args.options,
          choices: args.choices,
          precision: args.precision,
          linkedTableId: args.linkedTableId,
          dateFormat: args.dateFormat,
          timeFormat: args.timeFormat,
          timeZone: args.timeZone
        }, verbose);
        break;
      }

      case 'update': {
        const baseId = args._[1];
        const tableId = args._[2];
        const fieldId = args._[3];

        if (!baseId || !tableId || !fieldId) {
          console.error('Error: Base ID, Table ID, and Field ID are required');
          console.error('Usage: node fields.js update <base-id> <table-id> <field-id> --name "New Name"');
          process.exit(1);
        }

        await updateField(baseId, tableId, fieldId, {
          name: args.name,
          description: args.description,
          options: args.options
        }, verbose);
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
