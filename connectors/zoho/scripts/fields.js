#!/usr/bin/env node

/**
 * Zoho CRM Fields Management
 * View and manage module fields, custom fields, and picklists.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Fields', {
    'Commands': [
      'list <module>               List fields in a module',
      'get <module> <field>        Get field metadata',
      'create <module>             Create a custom field',
      'update <module> <field>     Update a custom field',
      'delete <module> <field>     Delete a custom field',
      'picklist <module> <field>   Get picklist values',
      'global-picklists            List global picklists',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--name <name>               Field display name',
      '--api-name <name>           Field API name',
      '--type <type>               Field type (see below)',
      '--required                  Make field required',
      '--unique                    Make field unique',
      '--layout <id>               Layout ID',
      '--picklist <json>           Picklist values JSON',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Field Types': [
      'text, textarea, email, phone, number, currency, decimal,',
      'percent, date, datetime, checkbox, picklist, multi_select,',
      'lookup, auto_number, url, formula'
    ],
    'Examples': [
      'node fields.js list Leads',
      'node fields.js list Contacts --verbose',
      'node fields.js get Leads Lead_Status',
      'node fields.js picklist Leads Lead_Status',
      'node fields.js create Leads --name "Custom Field" --type text',
      'node fields.js global-picklists'
    ]
  });
}

// List fields in a module
async function listFields(moduleName, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Fetching fields for ${moduleName}...\n`);
  
  let endpoint = `/settings/fields?module=${moduleName}`;
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const fields = data.fields || [];
  
  // Group fields
  const standard = fields.filter(f => !f.custom_field);
  const custom = fields.filter(f => f.custom_field);
  
  console.log(`Found ${fields.length} fields (${custom.length} custom):\n`);
  
  console.log('API Name'.padEnd(30) + 'Label'.padEnd(25) + 'Type'.padEnd(15) + 'Required');
  console.log('-'.repeat(80));
  
  for (const field of fields) {
    const required = field.system_mandatory ? 'Yes' : (field.custom_field ? (field._required ? 'Yes' : 'No') : 'No');
    const customMark = field.custom_field ? ' *' : '';
    
    console.log(
      (field.api_name + customMark).substring(0, 29).padEnd(30) +
      (field.display_label || field.field_label || 'N/A').substring(0, 23).padEnd(25) +
      (field.data_type || 'N/A').substring(0, 13).padEnd(15) +
      required
    );
  }
  
  if (custom.length > 0) {
    console.log('\n* = custom field');
  }
}

// Get field metadata
async function getField(moduleName, fieldName, args) {
  const { config, token } = await initScript(args);
  
  const endpoint = `/settings/fields?module=${moduleName}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  const fields = data.fields || [];
  const field = fields.find(f => f.api_name === fieldName || f.id === fieldName);
  
  if (!field) {
    console.error(`Error: Field not found: ${fieldName}`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(field, null, 2));
    return;
  }
  
  console.log(`Field: ${field.display_label || field.field_label}\n`);
  console.log(`API Name: ${field.api_name}`);
  console.log(`ID: ${field.id}`);
  console.log(`Data Type: ${field.data_type}`);
  console.log(`Custom: ${field.custom_field ? 'Yes' : 'No'}`);
  console.log(`Required: ${field.system_mandatory || field._required ? 'Yes' : 'No'}`);
  console.log(`Unique: ${field.unique ? 'Yes' : 'No'}`);
  console.log(`Read Only: ${field.read_only ? 'Yes' : 'No'}`);
  console.log(`Visible: ${field.visible ? 'Yes' : 'No'}`);
  
  if (field.length) {
    console.log(`Max Length: ${field.length}`);
  }
  
  if (field.decimal_place) {
    console.log(`Decimal Places: ${field.decimal_place}`);
  }
  
  // Picklist values
  if (field.pick_list_values && field.pick_list_values.length > 0) {
    console.log(`\nPicklist Values (${field.pick_list_values.length}):`);
    for (const value of field.pick_list_values.slice(0, 20)) {
      console.log(`  - ${value.display_value} (${value.actual_value || value.id})`);
    }
    if (field.pick_list_values.length > 20) {
      console.log(`  ... and ${field.pick_list_values.length - 20} more`);
    }
  }
  
  // Lookup details
  if (field.lookup && field.lookup.module) {
    console.log(`\nLookup Module: ${field.lookup.module.api_name}`);
  }
}

// Create custom field
async function createField(moduleName, args) {
  const { config, token } = await initScript(args);
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  if (!args.type) {
    console.error('Error: --type is required');
    console.error('Types: text, textarea, email, phone, number, currency, decimal, percent, date, datetime, checkbox, picklist, multi_select, lookup, auto_number, url');
    process.exit(1);
  }
  
  const field = {
    field_label: args.name,
    data_type: args.type
  };
  
  if (args['api-name']) {
    field.api_name = args['api-name'];
  }
  
  if (args.required) {
    field._required = true;
  }
  
  if (args.unique) {
    field.unique = { casesensitive: args.casesensitive || 'false' };
  }
  
  if (args.length) {
    field.length = parseInt(args.length);
  }
  
  // Picklist values
  if (args.picklist) {
    try {
      field.pick_list_values = JSON.parse(args.picklist);
    } catch (e) {
      console.error('Error: Invalid JSON in --picklist');
      console.error('Example: --picklist \'[{"display_value":"Option 1"},{"display_value":"Option 2"}]\'');
      process.exit(1);
    }
  }
  
  const body = { fields: [field] };
  
  const endpoint = `/settings/fields?module=${moduleName}`;
  const data = await apiRequest('POST', endpoint, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.fields && data.fields[0]) {
    const result = data.fields[0];
    if (result.status === 'success') {
      console.log('Custom field created successfully!\n');
      console.log(`API Name: ${result.details.api_name}`);
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update custom field
async function updateField(moduleName, fieldName, args) {
  const { config, token } = await initScript(args);
  
  const field = {};
  
  if (args.name) field.field_label = args.name;
  if (args.required !== undefined) field._required = args.required === 'true';
  
  if (args.picklist) {
    try {
      field.pick_list_values = JSON.parse(args.picklist);
    } catch (e) {
      console.error('Error: Invalid JSON in --picklist');
      process.exit(1);
    }
  }
  
  if (Object.keys(field).length === 0) {
    console.error('Error: No updates specified.');
    process.exit(1);
  }
  
  const body = { fields: [field] };
  
  // First get the field ID
  const fieldsData = await apiRequest('GET', `/settings/fields?module=${moduleName}`, token, null, { region: config.region });
  const existingField = (fieldsData.fields || []).find(f => f.api_name === fieldName || f.id === fieldName);
  
  if (!existingField) {
    console.error(`Error: Field not found: ${fieldName}`);
    process.exit(1);
  }
  
  if (!existingField.custom_field) {
    console.error('Error: Only custom fields can be updated.');
    process.exit(1);
  }
  
  const endpoint = `/settings/fields/${existingField.id}?module=${moduleName}`;
  const data = await apiRequest('PATCH', endpoint, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.fields && data.fields[0]) {
    const result = data.fields[0];
    if (result.status === 'success') {
      console.log('Field updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete custom field
async function deleteField(moduleName, fieldName, args) {
  const { config, token } = await initScript(args);
  
  // Get field info first
  const fieldsData = await apiRequest('GET', `/settings/fields?module=${moduleName}`, token, null, { region: config.region });
  const field = (fieldsData.fields || []).find(f => f.api_name === fieldName || f.id === fieldName);
  
  if (!field) {
    console.error(`Error: Field not found: ${fieldName}`);
    process.exit(1);
  }
  
  if (!field.custom_field) {
    console.error('Error: Only custom fields can be deleted.');
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete field: ${field.display_label || field.field_label}`,
    [
      `API Name: ${field.api_name}`,
      `Module: ${moduleName}`,
      'All data in this field will be lost.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const endpoint = `/settings/fields/${field.id}?module=${moduleName}`;
  const data = await apiRequest('DELETE', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Field deleted successfully.');
}

// Get picklist values
async function getPicklist(moduleName, fieldName, args) {
  const { config, token } = await initScript(args);
  
  const endpoint = `/settings/fields?module=${moduleName}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  const fields = data.fields || [];
  const field = fields.find(f => f.api_name === fieldName || f.id === fieldName);
  
  if (!field) {
    console.error(`Error: Field not found: ${fieldName}`);
    process.exit(1);
  }
  
  if (!field.pick_list_values || field.pick_list_values.length === 0) {
    console.error(`Error: ${fieldName} is not a picklist field or has no values.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(field.pick_list_values, null, 2));
    return;
  }
  
  console.log(`Picklist values for ${field.display_label || field.field_label}:\n`);
  
  for (const value of field.pick_list_values) {
    const displayValue = value.display_value || value.actual_value;
    const id = value.id || value.actual_value;
    console.log(`  - ${displayValue} (${id})`);
  }
}

// List global picklists
async function listGlobalPicklists(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching global picklists...\n');
  
  const data = await apiRequest('GET', '/settings/global_picklists', token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const picklists = data.global_picklists || [];
  
  console.log(`Found ${picklists.length} global picklists:\n`);
  
  for (const picklist of picklists) {
    console.log(`- ${picklist.display_label || picklist.name}`);
    console.log(`  ID: ${picklist.id}`);
    console.log(`  API Name: ${picklist.api_name}`);
    
    if (picklist.pick_list_values && picklist.pick_list_values.length > 0) {
      console.log(`  Values: ${picklist.pick_list_values.slice(0, 5).map(v => v.display_value).join(', ')}${picklist.pick_list_values.length > 5 ? '...' : ''}`);
    }
    
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Module name required');
          console.error('Usage: node fields.js list <module>');
          process.exit(1);
        }
        await listFields(args._[1], args);
        break;
      case 'get':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and field name required');
          console.error('Usage: node fields.js get <module> <field>');
          process.exit(1);
        }
        await getField(args._[1], args._[2], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Module name required');
          process.exit(1);
        }
        await createField(args._[1], args);
        break;
      case 'update':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and field name required');
          process.exit(1);
        }
        await updateField(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and field name required');
          process.exit(1);
        }
        await deleteField(args._[1], args._[2], args);
        break;
      case 'picklist':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and field name required');
          console.error('Usage: node fields.js picklist <module> <field>');
          process.exit(1);
        }
        await getPicklist(args._[1], args._[2], args);
        break;
      case 'global-picklists':
        await listGlobalPicklists(args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
