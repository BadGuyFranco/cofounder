#!/usr/bin/env node

/**
 * Go High Level Custom Fields Script
 * Manage custom fields for the location.
 * 
 * Usage:
 *   node custom-fields.js list --location "Name"
 *   node custom-fields.js get <field-id> --location "Name"
 *   node custom-fields.js create --name "Field Name" --dataType "TEXT" --location "Name"
 *   node custom-fields.js update <field-id> --name "New Name" --location "Name"
 *   node custom-fields.js delete <field-id> --location "Name"
 *   node custom-fields.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
  listLocations,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// Valid data types
const VALID_DATA_TYPES = [
  'TEXT', 'LARGE_TEXT', 'NUMERICAL', 'PHONE', 'MONETORY', 'CHECKBOX', 
  'SINGLE_OPTIONS', 'MULTIPLE_OPTIONS', 'FLOAT', 'TIME', 'DATE', 
  'TEXTBOX_LIST', 'FILE_UPLOAD', 'SIGNATURE'
];

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List custom fields
async function listCustomFields(location, verbose) {
  const data = await apiRequest('GET', `/locations/${location.id}/customFields`, location.key);
  
  const fields = data.customFields || [];
  console.log(`Found ${fields.length} custom fields:\n`);
  
  for (const field of fields) {
    console.log(`- ${field.name}`);
    console.log(`  ID: ${field.id}`);
    console.log(`  Key: ${field.fieldKey || 'N/A'}`);
    console.log(`  Type: ${field.dataType || 'N/A'}`);
    if (field.options && field.options.length > 0) {
      console.log(`  Options: ${field.options.join(', ')}`);
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return fields;
}

// Get custom field details
async function getCustomField(fieldId, location, verbose) {
  const data = await apiRequest('GET', `/locations/${location.id}/customFields/${fieldId}`, location.key);
  
  const field = data.customField || data;
  console.log(`Custom Field: ${field.name}`);
  console.log(`ID: ${field.id}`);
  console.log(`Key: ${field.fieldKey || 'N/A'}`);
  console.log(`Data Type: ${field.dataType || 'N/A'}`);
  console.log(`Position: ${field.position || 'N/A'}`);
  if (field.options && field.options.length > 0) {
    console.log(`Options: ${field.options.join(', ')}`);
  }
  if (field.placeholder) console.log(`Placeholder: ${field.placeholder}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return field;
}

// Create custom field
async function createCustomField(options, location, verbose) {
  const body = {
    name: options.name,
    dataType: options.dataType || options['data-type'] || 'TEXT'
  };
  
  // Validate data type
  if (!VALID_DATA_TYPES.includes(body.dataType.toUpperCase())) {
    console.error(`Error: Invalid data type "${body.dataType}"`);
    console.error(`Valid types: ${VALID_DATA_TYPES.join(', ')}`);
    process.exit(1);
  }
  
  body.dataType = body.dataType.toUpperCase();
  
  if (options.placeholder) body.placeholder = options.placeholder;
  if (options.options) {
    body.options = options.options.split(',').map(o => o.trim());
  }
  if (options.position) body.position = parseInt(options.position);
  
  const data = await apiRequest('POST', `/locations/${location.id}/customFields`, location.key, body);
  
  console.log('Custom field created successfully!');
  console.log(`Field ID: ${data.customField?.id || data.id}`);
  console.log(`Field Key: ${data.customField?.fieldKey || data.fieldKey || 'N/A'}`);
  console.log(`Name: ${options.name}`);
  console.log(`Type: ${body.dataType}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Update custom field
async function updateCustomField(fieldId, options, location, verbose) {
  const body = {};
  
  if (options.name) body.name = options.name;
  if (options.placeholder) body.placeholder = options.placeholder;
  if (options.options) {
    body.options = options.options.split(',').map(o => o.trim());
  }
  if (options.position) body.position = parseInt(options.position);
  
  const data = await apiRequest('PUT', `/locations/${location.id}/customFields/${fieldId}`, location.key, body);
  
  console.log(`Updated custom field: ${fieldId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete custom field
async function deleteCustomField(fieldId, location, verbose, force = false) {
  // Get field name for confirmation
  let fieldName = fieldId;
  try {
    const fieldData = await apiRequest('GET', `/locations/${location.id}/customFields/${fieldId}`, location.key);
    fieldName = fieldData.customField?.name || fieldData.name || fieldId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a custom field.',
    [
      `Field: ${fieldName}`,
      `ID: ${fieldId}`,
      '',
      'This will remove the field and its data from all contacts.',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/locations/${location.id}/customFields/${fieldId}`, location.key);
  
  console.log(`Deleted custom field: ${fieldId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listCustomFields(location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const fieldId = args._[1];
        
        if (!fieldId) {
          console.error('Error: Field ID is required');
          console.error('Usage: node custom-fields.js get <field-id> --location "Name"');
          process.exit(1);
        }
        
        await getCustomField(fieldId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        const name = args.name;
        
        if (!name) {
          console.error('Error: --name is required');
          console.error('Usage: node custom-fields.js create --name "Field Name" [--dataType "TEXT"] --location "Name"');
          process.exit(1);
        }
        
        await createCustomField({
          name: name,
          dataType: args.dataType || args['data-type'],
          placeholder: args.placeholder,
          options: args.options,
          position: args.position
        }, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const fieldId = args._[1];
        
        if (!fieldId) {
          console.error('Error: Field ID is required');
          console.error('Usage: node custom-fields.js update <field-id> [--name "Name"] --location "Name"');
          process.exit(1);
        }
        
        await updateCustomField(fieldId, {
          name: args.name,
          placeholder: args.placeholder,
          options: args.options,
          position: args.position
        }, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const fieldId = args._[1];
        
        if (!fieldId) {
          console.error('Error: Field ID is required');
          console.error('Usage: node custom-fields.js delete <field-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteCustomField(fieldId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Custom Fields Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"                List all custom fields');
        console.log('  get <field-id> --location             Get field details');
        console.log('  create --name "Name" [options]        Create a new custom field');
        console.log('  update <field-id> [options]           Update a custom field');
        console.log('  delete <field-id> --location          Delete a custom field');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Create Options:');
        console.log('  --name "Field Name"           Field name (required)');
        console.log('  --dataType "TEXT"             Data type (see below)');
        console.log('  --placeholder "Placeholder"   Placeholder text');
        console.log('  --options "opt1,opt2,opt3"    Options for select fields');
        console.log('  --position 1                  Field position');
        console.log('');
        console.log('Valid Data Types:');
        console.log(`  ${VALID_DATA_TYPES.join(', ')}`);
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
