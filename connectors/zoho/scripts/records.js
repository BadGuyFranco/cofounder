#!/usr/bin/env node

/**
 * Zoho CRM Records Management
 * Generic CRUD operations for any CRM module.
 * Supports Leads, Contacts, Accounts, Deals, Products, Tasks, and custom modules.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Standard modules and their common fields
const STANDARD_MODULES = {
  Leads: ['First_Name', 'Last_Name', 'Email', 'Phone', 'Company', 'Lead_Status', 'Lead_Source'],
  Contacts: ['First_Name', 'Last_Name', 'Email', 'Phone', 'Account_Name', 'Title'],
  Accounts: ['Account_Name', 'Website', 'Phone', 'Industry', 'Account_Type', 'Billing_City'],
  Deals: ['Deal_Name', 'Amount', 'Stage', 'Closing_Date', 'Account_Name', 'Pipeline'],
  Products: ['Product_Name', 'Product_Code', 'Unit_Price', 'Qty_in_Stock', 'Product_Active'],
  Tasks: ['Subject', 'Due_Date', 'Status', 'Priority', 'What_Id', 'Who_Id'],
  Calls: ['Subject', 'Call_Type', 'Call_Start_Time', 'Call_Duration', 'Who_Id'],
  Events: ['Event_Title', 'Start_DateTime', 'End_DateTime', 'Location', 'Participants'],
  Notes: ['Note_Title', 'Note_Content', 'Parent_Id'],
  Quotes: ['Subject', 'Quote_Stage', 'Account_Name', 'Grand_Total', 'Valid_Till'],
  Invoices: ['Subject', 'Account_Name', 'Invoice_Date', 'Due_Date', 'Grand_Total', 'Status'],
  Vendors: ['Vendor_Name', 'Email', 'Phone', 'Website', 'City'],
  Price_Books: ['Price_Book_Name', 'Pricing_Model', 'Active']
};

const DEFAULT_MODULE = 'Leads';

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Records', {
    'Commands': [
      'list                        List records in a module',
      'get <id>                    Get a single record by ID',
      'create                      Create a new record',
      'update <id>                 Update an existing record',
      'delete <id>                 Delete a record (destructive)',
      'upsert                      Insert or update based on duplicate check',
      'convert <id>                Convert a Lead (Leads module only)',
      'related <id> <module>       Get related records',
      'help                        Show this help'
    ],
    'Options': [
      '--module <name>             Module name (default: Leads)',
      '--org <name>                Organization to use',
      '--fields <json>             JSON object of field:value pairs',
      '--field-<name> <value>      Set individual field (e.g., --field-Email john@example.com)',
      '--properties <list>         Comma-separated fields to return',
      '--limit <n>                 Results per page (default: 200, max: 200)',
      '--all                       Fetch all pages',
      '--sort <field>              Sort by field',
      '--order <asc|desc>          Sort order (default: desc)',
      '--criteria <string>         Filter criteria (Zoho format)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Modules': Object.keys(STANDARD_MODULES).join(', '),
    'Examples': [
      'node records.js list --module Leads',
      'node records.js list --module Deals --all',
      'node records.js get 1234567890 --module Contacts',
      'node records.js create --module Leads --field-Last_Name "Smith" --field-Company "Acme"',
      'node records.js create --module Deals --fields \'{"Deal_Name":"Big Deal","Amount":50000}\'',
      'node records.js update 1234567890 --module Contacts --field-Phone "+1234567890"',
      'node records.js delete 1234567890 --module Leads',
      'node records.js convert 1234567890 --org mycompany',
      'node records.js related 1234567890 Contacts --module Accounts'
    ],
    'Filter Criteria': [
      'Use Zoho criteria syntax: ((field:operator:value))',
      'Operators: equals, not_equal, contains, starts_with, in, not_in, greater_than, less_than',
      'Example: --criteria "((Lead_Status:equals:Contacted))"',
      'Multiple: --criteria "((Lead_Status:equals:Contacted)and(Company:contains:Inc))"'
    ]
  });
}

/**
 * Parse field arguments from --field-<name> format
 */
function parseFieldArgs(args) {
  const fields = {};
  
  // Parse --fields JSON if provided
  if (args.fields) {
    try {
      const parsed = JSON.parse(args.fields);
      Object.assign(fields, parsed);
    } catch (e) {
      console.error('Error: Invalid JSON in --fields');
      console.error('Example: --fields \'{"First_Name":"John","Last_Name":"Doe"}\'');
      process.exit(1);
    }
  }
  
  // Parse individual --field-<name> arguments
  for (const [key, value] of Object.entries(args)) {
    if (key.startsWith('field-')) {
      const fieldName = key.replace('field-', '');
      fields[fieldName] = value;
    }
  }
  
  return fields;
}

/**
 * Get default fields for a module
 */
function getDefaultFields(moduleName) {
  return STANDARD_MODULES[moduleName] || ['id', 'Created_Time', 'Modified_Time'];
}

// List records
async function listRecords(args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  const limit = Math.min(parseInt(args.limit) || 200, 200);
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : null;
  
  console.log(`Fetching ${moduleName}...\n`);
  
  let endpoint = `/${moduleName}`;
  const params = [];
  
  if (properties) {
    params.push(`fields=${properties.join(',')}`);
  }
  if (args.sort) {
    params.push(`sort_by=${args.sort}`);
    params.push(`sort_order=${args.order || 'desc'}`);
  }
  if (args.criteria) {
    params.push(`criteria=${encodeURIComponent(args.criteria)}`);
  }
  
  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }
  
  const { data, info } = await apiRequestPaginated(endpoint, token, {
    all,
    perPage: limit,
    region: config.region
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Found ${info.count} ${moduleName}${all ? '' : ' (page 1)'}:\n`);
  
  const defaultFields = getDefaultFields(moduleName);
  
  for (const record of data) {
    // Display primary identifier
    const primaryField = defaultFields[0];
    const displayName = record[primaryField] || 
                        record.Full_Name || 
                        record.Name || 
                        `ID: ${record.id}`;
    
    console.log(`- ${displayName}`);
    console.log(`  ID: ${record.id}`);
    
    // Display key fields
    for (const field of defaultFields.slice(1, 5)) {
      if (record[field] !== undefined && record[field] !== null) {
        let value = record[field];
        
        // Format lookup fields
        if (typeof value === 'object' && value.name) {
          value = value.name;
        }
        
        // Format currency
        if (field === 'Amount' || field.includes('Price') || field.includes('Total')) {
          value = formatCurrency(value);
        }
        
        console.log(`  ${field.replace(/_/g, ' ')}: ${value}`);
      }
    }
    
    if (record.Owner?.name) {
      console.log(`  Owner: ${record.Owner.name}`);
    }
    
    console.log('');
  }
  
  if (info.moreRecords && !all) {
    console.log('More records available. Use --all to fetch all pages.');
  }
}

// Get single record
async function getRecord(id, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  
  const endpoint = `/${moduleName}/${id}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (!data.data || data.data.length === 0) {
    console.error(`Error: ${moduleName} record not found: ${id}`);
    process.exit(1);
  }
  
  const record = data.data[0];
  const defaultFields = getDefaultFields(moduleName);
  
  console.log(`${moduleName} Record\n`);
  console.log(`ID: ${record.id}`);
  
  // Display all non-null fields
  for (const [field, value] of Object.entries(record)) {
    if (value === null || value === undefined || field === 'id' || field.startsWith('$')) continue;
    
    let displayValue = value;
    
    // Format lookup fields
    if (typeof value === 'object' && value !== null) {
      if (value.name) {
        displayValue = `${value.name} (${value.id})`;
      } else {
        displayValue = JSON.stringify(value);
      }
    }
    
    // Format dates
    if (field.includes('Time') || field.includes('Date')) {
      displayValue = formatDate(value);
    }
    
    // Format currency
    if (field === 'Amount' || field.includes('Price') || field.includes('Total')) {
      displayValue = formatCurrency(value);
    }
    
    const fieldLabel = field.replace(/_/g, ' ');
    console.log(`${fieldLabel}: ${displayValue}`);
  }
}

// Create record
async function createRecord(args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  const fields = parseFieldArgs(args);
  
  if (Object.keys(fields).length === 0) {
    console.error('Error: No fields provided');
    console.error('Use --fields \'{"Field":"value"}\' or --field-<name> <value>');
    console.error(`\nCommon fields for ${moduleName}:`);
    const defaultFields = getDefaultFields(moduleName);
    for (const field of defaultFields) {
      console.error(`  --field-${field} <value>`);
    }
    process.exit(1);
  }
  
  const body = {
    data: [fields]
  };
  
  const data = await apiRequest('POST', `/${moduleName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log(`${moduleName} record created successfully!\n`);
      console.log(`ID: ${result.details.id}`);
      console.log(`Created Time: ${formatDate(result.details.Created_Time)}`);
    } else {
      console.error(`Error: ${result.message}`);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
      process.exit(1);
    }
  }
}

// Update record
async function updateRecord(id, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  const fields = parseFieldArgs(args);
  
  if (Object.keys(fields).length === 0) {
    console.error('Error: No fields to update');
    console.error('Use --fields \'{"Field":"value"}\' or --field-<name> <value>');
    process.exit(1);
  }
  
  const body = {
    data: [{
      id,
      ...fields
    }]
  };
  
  const data = await apiRequest('PUT', `/${moduleName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log(`${moduleName} record updated successfully!\n`);
      console.log(`ID: ${result.details.id}`);
      console.log(`Modified Time: ${formatDate(result.details.Modified_Time)}`);
      console.log(`Updated fields: ${Object.keys(fields).join(', ')}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete record
async function deleteRecord(id, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  
  // Get record info first
  let recordName = id;
  try {
    const existing = await apiRequest('GET', `/${moduleName}/${id}`, token, null, { region: config.region });
    if (existing.data && existing.data[0]) {
      const record = existing.data[0];
      recordName = record.Full_Name || record.Name || record.Deal_Name || 
                   record.Subject || record.Account_Name || id;
    }
  } catch (e) {
    // Proceed with ID if we can't fetch the record
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete ${moduleName} record: ${recordName}`,
    [
      `ID: ${id}`,
      'This action cannot be undone.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/${moduleName}?ids=${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log(`${moduleName} record deleted successfully.`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Upsert record (insert or update)
async function upsertRecord(args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  const fields = parseFieldArgs(args);
  
  if (Object.keys(fields).length === 0) {
    console.error('Error: No fields provided');
    process.exit(1);
  }
  
  const body = {
    data: [fields]
  };
  
  // Add duplicate check fields if specified
  if (args.duplicate) {
    body.duplicate_check_fields = args.duplicate.split(',');
  }
  
  const data = await apiRequest('POST', `/${moduleName}/upsert`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      const action = result.action || 'processed';
      console.log(`${moduleName} record ${action} successfully!\n`);
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Convert Lead
async function convertLead(id, args) {
  const { config, token } = await initScript(args);
  
  if (args.module && args.module !== 'Leads') {
    console.error('Error: Convert only works with Leads module');
    process.exit(1);
  }
  
  const body = {
    data: [{
      overwrite: args.overwrite === 'true',
      notify_lead_owner: args.notify !== 'false',
      notify_new_entity_owner: args.notify !== 'false'
    }]
  };
  
  // Optionally specify which records to create
  if (args['create-account'] !== 'false') {
    body.data[0].Accounts = args['account-name'] || null;
  }
  if (args['create-contact'] !== 'false') {
    body.data[0].Contacts = {};
  }
  if (args['create-deal']) {
    body.data[0].Deals = {
      Deal_Name: args['deal-name'] || 'Converted Deal',
      Amount: args['deal-amount'] ? parseFloat(args['deal-amount']) : null,
      Stage: args['deal-stage'] || null,
      Closing_Date: args['deal-close'] || null
    };
  }
  
  const data = await apiRequest('POST', `/Leads/${id}/actions/convert`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    console.log('Lead converted successfully!\n');
    
    if (result.Contacts) {
      console.log(`Contact ID: ${result.Contacts}`);
    }
    if (result.Accounts) {
      console.log(`Account ID: ${result.Accounts}`);
    }
    if (result.Deals) {
      console.log(`Deal ID: ${result.Deals}`);
    }
  }
}

// Get related records
async function getRelatedRecords(id, relatedModule, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || DEFAULT_MODULE;
  
  const endpoint = `/${moduleName}/${id}/${relatedModule}`;
  const { data, info } = await apiRequestPaginated(endpoint, token, {
    all: args.all,
    perPage: parseInt(args.limit) || 200,
    region: config.region
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Related ${relatedModule} for ${moduleName} ${id}:\n`);
  console.log(`Found ${info.count} records:\n`);
  
  const defaultFields = getDefaultFields(relatedModule);
  
  for (const record of data) {
    const primaryField = defaultFields[0];
    const displayName = record[primaryField] || record.Name || `ID: ${record.id}`;
    
    console.log(`- ${displayName}`);
    console.log(`  ID: ${record.id}`);
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
        await listRecords(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node records.js get <id> --module <module>');
          process.exit(1);
        }
        await getRecord(args._[1], args);
        break;
      case 'create':
        await createRecord(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node records.js update <id> --module <module> --field-<name> <value>');
          process.exit(1);
        }
        await updateRecord(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node records.js delete <id> --module <module>');
          process.exit(1);
        }
        await deleteRecord(args._[1], args);
        break;
      case 'upsert':
        await upsertRecord(args);
        break;
      case 'convert':
        if (!args._[1]) {
          console.error('Error: Lead ID required');
          console.error('Usage: node records.js convert <lead_id>');
          process.exit(1);
        }
        await convertLead(args._[1], args);
        break;
      case 'related':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Record ID and related module required');
          console.error('Usage: node records.js related <id> <related_module> --module <module>');
          process.exit(1);
        }
        await getRelatedRecords(args._[1], args._[2], args);
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
