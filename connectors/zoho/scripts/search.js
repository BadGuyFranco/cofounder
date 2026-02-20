#!/usr/bin/env node

/**
 * Zoho CRM Search
 * Search records and execute COQL queries.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, coqlRequest, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Search', {
    'Commands': [
      'search <query>              Search records by keyword',
      'coql <query>                Execute COQL query (SQL-like)',
      'criteria <criteria>         Search with Zoho criteria syntax',
      'help                        Show this help'
    ],
    'Options': [
      '--module <name>             Module to search (default: Leads)',
      '--org <name>                Organization to use',
      '--fields <list>             Comma-separated fields to return',
      '--limit <n>                 Max results (default: 200)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response'
    ],
    'Search Examples': [
      'node search.js search "john" --module Contacts',
      'node search.js search "acme" --module Accounts',
      'node search.js criteria "((Email:contains:@gmail.com))" --module Leads'
    ],
    'COQL Examples': [
      'node search.js coql "select Last_Name, Email from Leads limit 10"',
      'node search.js coql "select * from Deals where Amount > 10000"',
      'node search.js coql "select Deal_Name, Amount from Deals where Stage = \'Closed Won\'"',
      'node search.js coql "select Account_Name, Industry from Accounts order by Created_Time desc"'
    ],
    'COQL Syntax': [
      'SELECT field1, field2 FROM Module',
      'WHERE field operator value',
      'ORDER BY field [ASC|DESC]',
      'LIMIT number OFFSET number',
      '',
      'Operators: =, !=, <, >, <=, >=, like, in, not in, is null, is not null',
      'Functions: coalesce(field, default)'
    ],
    'Criteria Syntax': [
      'Format: ((field:operator:value))',
      'Operators: equals, not_equal, contains, starts_with, ends_with',
      '           in, not_in, greater_than, less_than, between',
      '',
      'Combine with: and, or',
      'Example: ((Status:equals:Active)and(Amount:greater_than:1000))'
    ]
  });
}

// Keyword search
async function searchRecords(query, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || 'Leads';
  
  console.log(`Searching "${query}" in ${moduleName}...\n`);
  
  let endpoint = `/${moduleName}/search?word=${encodeURIComponent(query)}`;
  
  if (args.fields) {
    endpoint += `&fields=${args.fields}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const records = data.data || [];
  
  console.log(`Found ${records.length} results:\n`);
  
  for (const record of records) {
    const displayName = record.Full_Name || record.Name || record.Deal_Name || 
                        record.Subject || record.Account_Name || `ID: ${record.id}`;
    
    console.log(`- ${displayName}`);
    console.log(`  ID: ${record.id}`);
    
    // Show some key fields
    if (record.Email) console.log(`  Email: ${record.Email}`);
    if (record.Phone) console.log(`  Phone: ${record.Phone}`);
    if (record.Company) console.log(`  Company: ${record.Company}`);
    if (record.Account_Name?.name) console.log(`  Account: ${record.Account_Name.name}`);
    if (record.Amount) console.log(`  Amount: $${record.Amount}`);
    if (record.Stage) console.log(`  Stage: ${record.Stage}`);
    
    console.log('');
  }
}

// COQL query
async function executeCoql(query, args) {
  const { config, token } = await initScript(args);
  
  console.log('Executing COQL query...\n');
  console.log(`Query: ${query}\n`);
  
  const data = await coqlRequest(query, token, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const records = data.data || [];
  const info = data.info || {};
  
  console.log(`Found ${info.count || records.length} results:\n`);
  
  if (records.length === 0) {
    console.log('No records found.');
    return;
  }
  
  // Get field names from first record
  const fields = Object.keys(records[0]).filter(k => !k.startsWith('$'));
  
  // Print header
  const header = fields.map(f => f.substring(0, 20).padEnd(20)).join(' | ');
  console.log(header);
  console.log('-'.repeat(header.length));
  
  // Print rows
  for (const record of records) {
    const row = fields.map(f => {
      let value = record[f];
      
      // Handle lookup fields
      if (typeof value === 'object' && value !== null) {
        value = value.name || value.id || JSON.stringify(value);
      }
      
      // Truncate and pad
      value = String(value || '').substring(0, 20).padEnd(20);
      return value;
    }).join(' | ');
    
    console.log(row);
  }
  
  if (info.more_records) {
    console.log('\nMore records available. Adjust LIMIT/OFFSET to fetch more.');
  }
}

// Criteria search
async function searchByCriteria(criteria, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || 'Leads';
  const limit = parseInt(args.limit) || 200;
  
  console.log(`Searching ${moduleName} with criteria...\n`);
  console.log(`Criteria: ${criteria}\n`);
  
  let endpoint = `/${moduleName}/search?criteria=${encodeURIComponent(criteria)}`;
  
  if (args.fields) {
    endpoint += `&fields=${args.fields}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const records = data.data || [];
  
  console.log(`Found ${records.length} results:\n`);
  
  for (const record of records) {
    const displayName = record.Full_Name || record.Name || record.Deal_Name || 
                        record.Subject || record.Account_Name || `ID: ${record.id}`;
    
    console.log(`- ${displayName}`);
    console.log(`  ID: ${record.id}`);
    
    // Show key fields based on module
    const keyFields = ['Email', 'Phone', 'Company', 'Amount', 'Stage', 'Status', 'Lead_Status'];
    for (const field of keyFields) {
      if (record[field] !== undefined && record[field] !== null) {
        let value = record[field];
        if (typeof value === 'object' && value.name) value = value.name;
        console.log(`  ${field.replace(/_/g, ' ')}: ${value}`);
      }
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
      case 'search':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node search.js search <query> --module <module>');
          process.exit(1);
        }
        await searchRecords(args._[1], args);
        break;
      case 'coql':
        if (!args._[1]) {
          console.error('Error: COQL query required');
          console.error('Usage: node search.js coql "<select query>"');
          process.exit(1);
        }
        // Join remaining args in case query wasn't quoted properly
        const coqlQuery = args._.slice(1).join(' ');
        await executeCoql(coqlQuery, args);
        break;
      case 'criteria':
        if (!args._[1]) {
          console.error('Error: Criteria required');
          console.error('Usage: node search.js criteria "((field:operator:value))" --module <module>');
          process.exit(1);
        }
        await searchByCriteria(args._[1], args);
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
