#!/usr/bin/env node

/**
 * ClickUp Custom Fields Script
 * Manage custom fields on lists and set values on tasks.
 *
 * Usage:
 *   node fields.js list <list-id>
 *   node fields.js list-space <space-id>
 *   node fields.js set <task-id> <field-id> --value <value>
 *   node fields.js remove <task-id> <field-id>
 *   node fields.js help
 */

import { parseArgs, apiRequest, parseJSON } from './utils.js';

/**
 * Format custom field for display
 */
function formatField(field) {
  const output = [];

  output.push(`${field.name}`);
  output.push(`  ID: ${field.id}`);
  output.push(`  Type: ${field.type}`);

  if (field.required) {
    output.push(`  Required: ${field.required}`);
  }

  // Type-specific info
  if (field.type_config) {
    const config = field.type_config;

    if (config.options) {
      const optionNames = config.options.map(o => o.name || o.label).join(', ');
      output.push(`  Options: ${optionNames}`);
    }

    if (config.default !== undefined) {
      output.push(`  Default: ${config.default}`);
    }

    if (config.precision !== undefined) {
      output.push(`  Precision: ${config.precision}`);
    }

    if (config.currency_type) {
      output.push(`  Currency: ${config.currency_type}`);
    }
  }

  return output.join('\n');
}

/**
 * List custom fields accessible in a list
 */
async function listFieldsForList(listId, verbose) {
  const data = await apiRequest(`/list/${listId}/field`);

  const fields = data.fields || [];
  console.log(`Found ${fields.length} custom field(s):\n`);

  for (const field of fields) {
    console.log(formatField(field));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return fields;
}

/**
 * List custom fields in a space (accessible to all lists in the space)
 */
async function listFieldsForSpace(spaceId, verbose) {
  // Get space to find lists, then get fields from first list
  // ClickUp doesn't have a direct space-level field endpoint
  const spaceData = await apiRequest(`/space/${spaceId}`);
  
  console.log(`Space: ${spaceData.name}`);
  console.log(`Custom fields in this space are inherited by all lists.\n`);
  
  // Get folders and lists to find fields
  const folderData = await apiRequest(`/space/${spaceId}/folder?archived=false`);
  const folderlessData = await apiRequest(`/space/${spaceId}/list?archived=false`);
  
  let firstListId = null;
  
  // Check folderless lists first
  if (folderlessData.lists && folderlessData.lists.length > 0) {
    firstListId = folderlessData.lists[0].id;
  }
  // Check folders for lists
  else if (folderData.folders && folderData.folders.length > 0) {
    for (const folder of folderData.folders) {
      if (folder.lists && folder.lists.length > 0) {
        firstListId = folder.lists[0].id;
        break;
      }
    }
  }
  
  if (!firstListId) {
    console.log('No lists found in space. Create a list first to define custom fields.');
    return [];
  }
  
  console.log(`Fetching fields from list ${firstListId}...\n`);
  return listFieldsForList(firstListId, verbose);
}

/**
 * Set a custom field value on a task
 */
async function setFieldValue(taskId, fieldId, value, options, verbose) {
  // Parse value based on options
  let parsedValue = value;
  
  if (options.json) {
    parsedValue = parseJSON(value, 'value');
  } else if (options.number) {
    parsedValue = parseFloat(value);
  } else if (options.boolean) {
    parsedValue = value === 'true';
  }

  const body = { value: parsedValue };

  const data = await apiRequest(`/task/${taskId}/field/${fieldId}`, {
    method: 'POST',
    body
  });

  console.log(`Set field ${fieldId} on task ${taskId}`);
  console.log(`  Value: ${JSON.stringify(parsedValue)}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Remove a custom field value from a task
 */
async function removeFieldValue(taskId, fieldId, verbose) {
  const data = await apiRequest(`/task/${taskId}/field/${fieldId}`, {
    method: 'DELETE'
  });

  console.log(`Removed field ${fieldId} from task ${taskId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Custom Fields Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <list-id>                         List custom fields for a list');
  console.log('  list-space <space-id>                  List custom fields in a space');
  console.log('  set <task-id> <field-id> --value <v>   Set field value on task');
  console.log('  remove <task-id> <field-id>            Remove field value from task');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --value <value>          The value to set');
  console.log('  --json                   Parse value as JSON');
  console.log('  --number                 Parse value as number');
  console.log('  --boolean                Parse value as boolean');
  console.log('');
  console.log('Field Types and Value Formats:');
  console.log('  text         - "any text string"');
  console.log('  number       - 123 or 123.45 (use --number)');
  console.log('  currency     - 123.45 (use --number)');
  console.log('  checkbox     - true or false (use --boolean)');
  console.log('  date         - timestamp in milliseconds');
  console.log('  dropdown     - option ID or index');
  console.log('  labels       - ["label_id_1", "label_id_2"] (use --json)');
  console.log('  users        - [123456] (user IDs, use --json)');
  console.log('  rating       - 1-5');
  console.log('  email        - "email@example.com"');
  console.log('  phone        - "+1234567890"');
  console.log('  url          - "https://example.com"');
  console.log('  location     - {"location": "...", "formatted_address": "..."} (use --json)');
  console.log('');
  console.log('Examples:');
  console.log('  # List fields for a list');
  console.log('  node fields.js list 12345678');
  console.log('');
  console.log('  # Set a text field');
  console.log('  node fields.js set abc123 field-uuid-123 --value "Some text"');
  console.log('');
  console.log('  # Set a number field');
  console.log('  node fields.js set abc123 field-uuid-123 --value 42 --number');
  console.log('');
  console.log('  # Set a checkbox field');
  console.log('  node fields.js set abc123 field-uuid-123 --value true --boolean');
  console.log('');
  console.log('  # Set a dropdown field (by option index)');
  console.log('  node fields.js set abc123 field-uuid-123 --value 0 --number');
  console.log('');
  console.log('  # Set a labels field');
  console.log('  node fields.js set abc123 field-uuid-123 --value \'["uuid-1", "uuid-2"]\' --json');
  console.log('');
  console.log('  # Set a users field');
  console.log('  node fields.js set abc123 field-uuid-123 --value \'[123456, 789012]\' --json');
  console.log('');
  console.log('  # Remove a field value');
  console.log('  node fields.js remove abc123 field-uuid-123');
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
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node fields.js list <list-id>');
          process.exit(1);
        }
        await listFieldsForList(listId, verbose);
        break;
      }

      case 'list-space': {
        const spaceId = args._[1];
        if (!spaceId) {
          console.error('Error: Space ID is required');
          console.error('Usage: node fields.js list-space <space-id>');
          process.exit(1);
        }
        await listFieldsForSpace(spaceId, verbose);
        break;
      }

      case 'set': {
        const taskId = args._[1];
        const fieldId = args._[2];
        if (!taskId || !fieldId) {
          console.error('Error: Task ID and Field ID are required');
          console.error('Usage: node fields.js set <task-id> <field-id> --value <value>');
          process.exit(1);
        }
        if (args.value === undefined) {
          console.error('Error: --value is required');
          process.exit(1);
        }
        await setFieldValue(taskId, fieldId, args.value, {
          json: args.json,
          number: args.number,
          boolean: args.boolean
        }, verbose);
        break;
      }

      case 'remove': {
        const taskId = args._[1];
        const fieldId = args._[2];
        if (!taskId || !fieldId) {
          console.error('Error: Task ID and Field ID are required');
          console.error('Usage: node fields.js remove <task-id> <field-id>');
          process.exit(1);
        }
        await removeFieldValue(taskId, fieldId, verbose);
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
