#!/usr/bin/env node

/**
 * HubSpot Properties Management
 * Manage custom field schemas for contacts, companies, deals, etc.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Properties', {
    'Commands': [
      'list <object_type>          List all properties for object type',
      'get <object_type> <name>    Get specific property',
      'create <object_type>        Create a new property',
      'update <object_type> <name> Update a property',
      'delete <object_type> <name> Delete a property (destructive)',
      'groups <object_type>        List property groups',
      'help                        Show this help'
    ],
    'Object Types': [
      'contacts, companies, deals, tickets, products, line_items, quotes'
    ],
    'Options': [
      '--name <name>               Property internal name (required for create)',
      '--label <label>             Property display label',
      '--type <type>               Property type (see below)',
      '--field <field_type>        Field type (see below)',
      '--group <group>             Property group name',
      '--description <text>        Property description',
      '--options <json>            Options for enumeration types (JSON array)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Property Types': [
      'string, number, date, datetime, enumeration, bool'
    ],
    'Field Types': [
      'text, textarea, select, radio, checkbox, date, file, number,',
      'calculation_equation, booleancheckbox, phonenumber'
    ],
    'Examples': [
      'node properties.js list contacts',
      'node properties.js get contacts email',
      'node properties.js groups contacts',
      'node properties.js create contacts --name "custom_score" --label "Custom Score" --type number --field number --group contactinformation',
      'node properties.js create deals --name "deal_source" --label "Deal Source" --type enumeration --field select --options \'[{"label":"Inbound","value":"inbound"},{"label":"Outbound","value":"outbound"}]\'',
      'node properties.js update contacts custom_score --label "Lead Score"',
      'node properties.js delete contacts custom_score'
    ]
  });
}

// List properties
async function listProperties(objectType, args) {
  const token = getToken();
  
  console.log(`Fetching ${objectType} properties...\n`);
  
  const data = await apiRequest('GET', `/crm/v3/properties/${objectType}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const results = data.results || [];
  console.log(`Found ${results.length} properties:\n`);
  
  // Group by property group
  const grouped = {};
  for (const prop of results) {
    const group = prop.groupName || 'ungrouped';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(prop);
  }
  
  for (const [group, props] of Object.entries(grouped)) {
    console.log(`[${group}]`);
    for (const prop of props) {
      const custom = prop.hubspotDefined ? '' : ' (custom)';
      console.log(`  ${prop.name}: ${prop.label}${custom}`);
      console.log(`    Type: ${prop.type} / ${prop.fieldType}`);
    }
    console.log('');
  }
}

// Get single property
async function getProperty(objectType, propertyName, args) {
  const token = getToken();
  
  const property = await apiRequest('GET', `/crm/v3/properties/${objectType}/${propertyName}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(property, null, 2));
    return;
  }
  
  console.log(`Property: ${property.label}\n`);
  console.log(`Name: ${property.name}`);
  console.log(`Type: ${property.type}`);
  console.log(`Field Type: ${property.fieldType}`);
  console.log(`Group: ${property.groupName}`);
  console.log(`Description: ${property.description || 'N/A'}`);
  console.log(`HubSpot Defined: ${property.hubspotDefined ? 'Yes' : 'No (custom)'}`);
  console.log(`Hidden: ${property.hidden ? 'Yes' : 'No'}`);
  
  if (property.options && property.options.length > 0) {
    console.log('\nOptions:');
    for (const opt of property.options) {
      console.log(`  - ${opt.label} (${opt.value})`);
    }
  }
}

// List property groups
async function listGroups(objectType, args) {
  const token = getToken();
  
  console.log(`Fetching ${objectType} property groups...\n`);
  
  const data = await apiRequest('GET', `/crm/v3/properties/${objectType}/groups`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const results = data.results || [];
  console.log(`Found ${results.length} groups:\n`);
  
  for (const group of results) {
    console.log(`- ${group.label}`);
    console.log(`  Name: ${group.name}`);
    console.log(`  Display Order: ${group.displayOrder}`);
    console.log('');
  }
}

// Create property
async function createProperty(objectType, args) {
  const token = getToken();
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const body = {
    name: args.name,
    label: args.label || args.name,
    type: args.type || 'string',
    fieldType: args.field || 'text',
    groupName: args.group || `${objectType}information`
  };
  
  if (args.description) body.description = args.description;
  if (args.options) {
    try {
      body.options = JSON.parse(args.options);
    } catch (e) {
      console.error('Error: --options must be valid JSON array');
      process.exit(1);
    }
  }
  
  const property = await apiRequest('POST', `/crm/v3/properties/${objectType}`, token, body);
  
  console.log('Property created successfully!');
  console.log(`Name: ${property.name}`);
  console.log(`Label: ${property.label}`);
  console.log(`Type: ${property.type}`);
}

// Update property
async function updateProperty(objectType, propertyName, args) {
  const token = getToken();
  
  const body = {};
  if (args.label) body.label = args.label;
  if (args.description) body.description = args.description;
  if (args.group) body.groupName = args.group;
  if (args.options) {
    try {
      body.options = JSON.parse(args.options);
    } catch (e) {
      console.error('Error: --options must be valid JSON array');
      process.exit(1);
    }
  }
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/properties/${objectType}/${propertyName}`, token, body);
  console.log('Property updated successfully!');
}

// Delete property
async function deleteProperty(objectType, propertyName, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete property: ${propertyName}`,
    [
      `Object type: ${objectType}`,
      'All data stored in this property will be lost.',
      'This affects ALL records of this type.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/properties/${objectType}/${propertyName}`, token);
  console.log('Property deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) { console.error('Error: Object type required'); process.exit(1); }
        await listProperties(args._[1], args); break;
      case 'get':
        if (!args._[1] || !args._[2]) { console.error('Error: Object type and property name required'); process.exit(1); }
        await getProperty(args._[1], args._[2], args); break;
      case 'groups':
        if (!args._[1]) { console.error('Error: Object type required'); process.exit(1); }
        await listGroups(args._[1], args); break;
      case 'create':
        if (!args._[1]) { console.error('Error: Object type required'); process.exit(1); }
        await createProperty(args._[1], args); break;
      case 'update':
        if (!args._[1] || !args._[2]) { console.error('Error: Object type and property name required'); process.exit(1); }
        await updateProperty(args._[1], args._[2], args); break;
      case 'delete':
        if (!args._[1] || !args._[2]) { console.error('Error: Object type and property name required'); process.exit(1); }
        await deleteProperty(args._[1], args._[2], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
