#!/usr/bin/env node

/**
 * Supabase Tables Script
 * List tables and view schema information.
 *
 * Usage:
 *   node tables.js list
 *   node tables.js schema <table-name>
 *   node tables.js help
 */

import { parseArgs, restRequest, loadConfig } from './utils.js';

// List all tables in the public schema
async function listTables(verbose, project) {
  // Query the information_schema to get table info
  const endpoint = '/rpc/get_tables';
  
  // Try using a stored function first, fall back to direct query
  try {
    const data = await restRequest(endpoint, { method: 'POST', project });
    displayTables(data, verbose);
    return data;
  } catch (e) {
    // Function doesn't exist, use information_schema directly
    // This requires the table to be exposed via PostgREST, which it usually isn't
    // So we'll query via raw SQL using the SQL endpoint
    console.log('Note: Using information_schema query. For better results, enable the get_tables function.\n');
    
    // Try querying pg_catalog via RPC if available
    const config = loadConfig(project);
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.serviceKey,
        'Authorization': `Bearer ${config.serviceKey}`
      }
    });
    
    if (response.ok) {
      const text = await response.text();
      // The root endpoint returns OpenAPI spec with all available tables
      try {
        const spec = JSON.parse(text);
        if (spec.paths) {
          const tables = Object.keys(spec.paths)
            .filter(p => p !== '/' && !p.startsWith('/rpc/'))
            .map(p => p.replace(/^\//, ''));
          
          console.log(`Found ${tables.length} table(s):\n`);
          for (const table of tables.sort()) {
            console.log(`  ${table}`);
          }
          
          if (verbose) {
            console.log('\nFull OpenAPI spec available at root endpoint.');
          }
          
          return tables;
        }
      } catch (e) {
        // Not JSON, probably error
      }
    }
    
    console.error('Unable to list tables. Make sure your project has tables created.');
    return [];
  }
}

function displayTables(tables, verbose) {
  console.log(`Found ${tables.length} table(s):\n`);
  
  for (const table of tables) {
    if (typeof table === 'string') {
      console.log(`  ${table}`);
    } else {
      console.log(`  ${table.table_name || table.name}`);
      if (verbose && table.description) {
        console.log(`    Description: ${table.description}`);
      }
    }
  }
}

// Get schema for a specific table
async function getTableSchema(tableName, verbose, project) {
  const config = loadConfig(project);
  
  // Get the OpenAPI definition which includes column info
  const response = await fetch(`${config.url}/rest/v1/`, {
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch schema information');
  }
  
  const spec = JSON.parse(await response.text());
  
  // Find the table in definitions
  const tablePath = `/${tableName}`;
  const tableDefinition = spec.definitions?.[tableName];
  
  if (!tableDefinition) {
    console.error(`Table '${tableName}' not found in schema.`);
    console.error('Available tables:');
    const tables = Object.keys(spec.definitions || {}).filter(d => !d.includes('.'));
    for (const t of tables.sort()) {
      console.error(`  ${t}`);
    }
    process.exit(1);
  }
  
  console.log(`Table: ${tableName}\n`);
  console.log('Columns:');
  
  const properties = tableDefinition.properties || {};
  const required = tableDefinition.required || [];
  
  for (const [colName, colDef] of Object.entries(properties)) {
    const type = colDef.type || colDef.format || 'unknown';
    const isRequired = required.includes(colName);
    const nullable = !isRequired;
    const description = colDef.description || '';
    
    let typeStr = type;
    if (colDef.format && colDef.format !== type) {
      typeStr = `${type} (${colDef.format})`;
    }
    
    console.log(`  ${colName}: ${typeStr}${nullable ? '' : ' NOT NULL'}${description ? ` -- ${description}` : ''}`);
  }
  
  if (verbose) {
    console.log('\nFull definition:');
    console.log(JSON.stringify(tableDefinition, null, 2));
  }
  
  return tableDefinition;
}

// Show help
function showHelp() {
  console.log('Supabase Tables Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                    List all tables');
  console.log('  schema <table-name>     Show table schema');
  console.log('  help                    Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --project <ref>         Target project (required if multiple configured)');
  console.log('  --verbose               Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all tables');
  console.log('  node tables.js list --project abc123');
  console.log('');
  console.log('  # Show schema for users table');
  console.log('  node tables.js schema users --project abc123');
  console.log('');
  console.log('  # Show detailed schema');
  console.log('  node tables.js schema users --project abc123 --verbose');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const project = args.project; // Project reference

  try {
    switch (command) {
      case 'list': {
        await listTables(verbose, project);
        break;
      }

      case 'schema': {
        const tableName = args._[1];
        
        if (!tableName) {
          console.error('Error: Table name is required');
          console.error('Usage: node tables.js schema <table-name> [--project <ref>]');
          process.exit(1);
        }
        
        await getTableSchema(tableName, verbose, project);
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
