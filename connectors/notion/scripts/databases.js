#!/usr/bin/env node

/**
 * Notion Databases Script
 * Query databases, create entries, and update properties.
 * 
 * Usage:
 *   node databases.js query <database-id> [--filter '{}'] [--sorts '[]']
 *   node databases.js create <database-id> --properties '{}'
 *   node databases.js update <page-id> --properties '{}'
 *   node databases.js schema <database-id>
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { Client } = await import('@notionhq/client');
const dotenv = (await import('dotenv')).default;

// Built-in Node.js modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/notion/scripts/databases.js
// Memory is at: .../GPT/memory/connectors/notion/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'notion', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(memoryEnvPath)) {
  dotenv.config({ path: memoryEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  console.error('Error: No .env file found.');
  console.error('Create /memory/connectors/notion/.env with your NOTION_API_KEY');
  console.error('See SETUP.md for instructions.');
  process.exit(1);
}

if (!process.env.NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY not found in environment.');
  console.error('Add NOTION_API_KEY=secret_xxx to your .env file.');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Parse command line arguments
function parseArgs(args) {
  const result = { _: [] };
  let i = 0;
  
  while (i < args.length) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }
  
  return result;
}

// Query a database
async function queryDatabase(databaseId, filter, sorts, verbose) {
  const queryParams = { database_id: databaseId };
  
  if (filter) {
    try {
      queryParams.filter = JSON.parse(filter);
    } catch (e) {
      console.error('Error: Invalid JSON in --filter');
      process.exit(1);
    }
  }
  
  if (sorts) {
    try {
      queryParams.sorts = JSON.parse(sorts);
    } catch (e) {
      console.error('Error: Invalid JSON in --sorts');
      process.exit(1);
    }
  }
  
  const response = await notion.databases.query(queryParams);
  
  console.log(`Found ${response.results.length} entries:\n`);
  
  for (const page of response.results) {
    // Extract title from various possible property names
    let title = 'Untitled';
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === 'title' && value.title?.[0]?.plain_text) {
        title = value.title[0].plain_text;
        break;
      }
    }
    
    console.log(`- ${title}`);
    console.log(`  ID: ${page.id}`);
    
    // Show select/status properties
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === 'select' && value.select?.name) {
        console.log(`  ${key}: ${value.select.name}`);
      }
      if (value.type === 'status' && value.status?.name) {
        console.log(`  ${key}: ${value.status.name}`);
      }
      if (value.type === 'date' && value.date?.start) {
        console.log(`  ${key}: ${value.date.start}`);
      }
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response.results;
}

// Create a database entry
async function createEntry(databaseId, properties, verbose) {
  let props;
  try {
    props = JSON.parse(properties);
  } catch (e) {
    console.error('Error: Invalid JSON in --properties');
    process.exit(1);
  }
  
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: props
  });
  
  console.log('Created database entry');
  console.log(`ID: ${response.id}`);
  console.log(`URL: ${response.url}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Update a database entry (page properties)
async function updateEntry(pageId, properties, verbose) {
  let props;
  try {
    props = JSON.parse(properties);
  } catch (e) {
    console.error('Error: Invalid JSON in --properties');
    process.exit(1);
  }
  
  const response = await notion.pages.update({
    page_id: pageId,
    properties: props
  });
  
  console.log(`Updated entry: ${pageId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Get database schema
async function getSchema(databaseId, verbose) {
  const response = await notion.databases.retrieve({ database_id: databaseId });
  
  console.log(`Database: ${response.title?.[0]?.plain_text || 'Untitled'}`);
  console.log(`ID: ${response.id}`);
  console.log('\nProperties:\n');
  
  for (const [name, property] of Object.entries(response.properties)) {
    console.log(`  ${name}`);
    console.log(`    Type: ${property.type}`);
    
    // Show options for select/multi-select/status
    if (property.select?.options?.length) {
      const options = property.select.options.map(o => o.name).join(', ');
      console.log(`    Options: ${options}`);
    }
    if (property.multi_select?.options?.length) {
      const options = property.multi_select.options.map(o => o.name).join(', ');
      console.log(`    Options: ${options}`);
    }
    if (property.status?.options?.length) {
      const options = property.status.options.map(o => o.name).join(', ');
      console.log(`    Options: ${options}`);
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull schema:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'query': {
        const databaseId = args._[1];
        
        if (!databaseId) {
          console.error('Error: Database ID is required');
          console.error('Usage: node databases.js query <database-id> [--filter "{}"] [--sorts "[]"]');
          process.exit(1);
        }
        
        await queryDatabase(databaseId, args.filter, args.sorts, verbose);
        break;
      }
      
      case 'create': {
        const databaseId = args._[1];
        const properties = args.properties;
        
        if (!databaseId) {
          console.error('Error: Database ID is required');
          console.error('Usage: node databases.js create <database-id> --properties "{}"');
          process.exit(1);
        }
        
        if (!properties) {
          console.error('Error: --properties is required');
          console.error('Usage: node databases.js create <database-id> --properties "{}"');
          process.exit(1);
        }
        
        await createEntry(databaseId, properties, verbose);
        break;
      }
      
      case 'update': {
        const pageId = args._[1];
        const properties = args.properties;
        
        if (!pageId) {
          console.error('Error: Page ID is required');
          console.error('Usage: node databases.js update <page-id> --properties "{}"');
          process.exit(1);
        }
        
        if (!properties) {
          console.error('Error: --properties is required');
          console.error('Usage: node databases.js update <page-id> --properties "{}"');
          process.exit(1);
        }
        
        await updateEntry(pageId, properties, verbose);
        break;
      }
      
      case 'schema': {
        const databaseId = args._[1];
        
        if (!databaseId) {
          console.error('Error: Database ID is required');
          console.error('Usage: node databases.js schema <database-id>');
          process.exit(1);
        }
        
        await getSchema(databaseId, verbose);
        break;
      }
      
      default:
        console.log('Notion Databases Script');
        console.log('');
        console.log('Commands:');
        console.log('  query <database-id> [--filter "{}"] [--sorts "[]"]');
        console.log('  create <database-id> --properties "{}"');
        console.log('  update <page-id> --properties "{}"');
        console.log('  schema <database-id>');
        console.log('');
        console.log('Options:');
        console.log('  --verbose    Show full API responses');
        console.log('');
        console.log('Examples:');
        console.log('  # Query all entries');
        console.log('  node databases.js query abc123');
        console.log('');
        console.log('  # Query with filter');
        console.log('  node databases.js query abc123 --filter \'{"property": "Status", "select": {"equals": "Done"}}\'');
        console.log('');
        console.log('  # Create entry');
        console.log('  node databases.js create abc123 --properties \'{"Name": {"title": [{"text": {"content": "New Item"}}]}}\'');
        console.log('');
        console.log('  # Update entry status');
        console.log('  node databases.js update def456 --properties \'{"Status": {"select": {"name": "Done"}}}\'');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

main();
