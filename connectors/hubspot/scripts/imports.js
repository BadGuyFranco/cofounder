#!/usr/bin/env node

/**
 * HubSpot Imports Management
 * View import history and status.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Imports', {
    'Commands': [
      'list                        List import history',
      'get <id>                    Get import details',
      'errors <id>                 Get import errors',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Results per page',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node imports.js list',
      'node imports.js get 12345',
      'node imports.js errors 12345'
    ],
    'Note': [
      'Imports are primarily initiated via HubSpot UI or dedicated CSV upload.',
      'API provides status tracking and error reporting.',
      'For bulk data import, use HubSpot Import UI.'
    ]
  });
}

// List imports
async function listImports(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  console.log('Fetching import history...\n');
  
  const data = await apiRequest('GET', `/crm/v3/imports?limit=${limit}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const imports = data.results || [];
  console.log(`Found ${imports.length} imports:\n`);
  
  for (const imp of imports) {
    const state = imp.state || 'UNKNOWN';
    const stateIcon = state === 'DONE' ? '✓' : state === 'FAILED' ? '✗' : '○';
    
    console.log(`${stateIcon} Import ${imp.id}`);
    console.log(`  State: ${state}`);
    console.log(`  Files: ${imp.files?.length || 0}`);
    
    if (imp.metadata) {
      console.log(`  Object Type: ${imp.metadata.objectLists?.[0]?.objectType || 'N/A'}`);
    }
    
    if (imp.importRequestJson) {
      const req = JSON.parse(imp.importRequestJson);
      if (req.name) console.log(`  Name: ${req.name}`);
    }
    
    console.log(`  Created: ${formatDate(imp.createdAt)}`);
    console.log(`  Updated: ${formatDate(imp.updatedAt)}`);
    console.log('');
  }
}

// Get import details
async function getImport(id, args) {
  const token = getToken();
  
  const imp = await apiRequest('GET', `/crm/v3/imports/${id}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(imp, null, 2));
    return;
  }
  
  console.log(`Import ID: ${imp.id}\n`);
  console.log(`State: ${imp.state}`);
  
  if (imp.importRequestJson) {
    const req = JSON.parse(imp.importRequestJson);
    if (req.name) console.log(`Name: ${req.name}`);
    if (req.dateFormat) console.log(`Date Format: ${req.dateFormat}`);
  }
  
  if (imp.metadata) {
    console.log('\nMetadata:');
    for (const objList of imp.metadata.objectLists || []) {
      console.log(`  Object Type: ${objList.objectType}`);
      console.log(`  Property Names: ${objList.propertyNames?.length || 0} columns`);
    }
    
    if (imp.metadata.counters) {
      console.log('\nCounters:');
      for (const [key, value] of Object.entries(imp.metadata.counters)) {
        console.log(`  ${key}: ${value}`);
      }
    }
  }
  
  console.log(`\nCreated: ${formatDate(imp.createdAt)}`);
  console.log(`Updated: ${formatDate(imp.updatedAt)}`);
}

// Get import errors
async function getErrors(id, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  console.log(`Fetching errors for import ${id}...\n`);
  
  const data = await apiRequest('GET', `/crm/v3/imports/${id}/errors?limit=${limit}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const errors = data.results || [];
  
  if (errors.length === 0) {
    console.log('No errors found for this import.');
    return;
  }
  
  console.log(`Found ${errors.length} errors:\n`);
  
  for (const err of errors) {
    console.log(`- Row ${err.sourceData?.row || 'N/A'}`);
    console.log(`  Error: ${err.errorType}`);
    console.log(`  Column: ${err.knownColumnNumber || 'N/A'}`);
    if (err.invalidValue) console.log(`  Invalid Value: ${err.invalidValue}`);
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listImports(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Import ID required'); process.exit(1); }
        await getImport(args._[1], args); break;
      case 'errors':
        if (!args._[1]) { console.error('Error: Import ID required'); process.exit(1); }
        await getErrors(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
