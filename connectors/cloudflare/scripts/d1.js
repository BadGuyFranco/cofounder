#!/usr/bin/env node
/**
 * Cloudflare D1 Script
 * Manage D1 SQLite databases.
 * 
 * Note: Requires Account-level API token permissions.
 * See SETUP.md for creating a D1-enabled token.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';
import fs from 'fs';

function showHelp() {
  console.log(`
D1 Script - Manage Cloudflare D1 SQLite databases

Usage: node scripts/d1.js <command> [options]

Commands:
  databases                       List all D1 databases
  create <name>                   Create a new database
  delete <database-id>            Delete a database
  info <database-id>              Get database details
  query <database-id> <sql>       Run a SQL query
  execute <database-id> <file>    Run SQL from a file
  tables <database-id>            List tables in database
  help                            Show this help

Options:
  --params <json>         JSON array of query parameters (for query)

Examples:
  node scripts/d1.js databases
  node scripts/d1.js create my-database
  node scripts/d1.js info abc123
  node scripts/d1.js query abc123 "SELECT * FROM users"
  node scripts/d1.js query abc123 "SELECT * FROM users WHERE id = ?" --params '[1]'
  node scripts/d1.js execute abc123 ./schema.sql
  node scripts/d1.js tables abc123
  node scripts/d1.js delete abc123

Note: Requires Account-level token with D1 Edit permission.
`);
}

// Get account ID from zones (first available)
async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listDatabases() {
  const accountId = await getAccountId();
  const databases = await fetchAllPages(`/accounts/${accountId}/d1/database`);
  
  const simplified = databases.map(db => ({
    uuid: db.uuid,
    name: db.name,
    created_at: db.created_at,
    version: db.version
  }));
  
  output(simplified);
}

async function createDatabase(name) {
  if (!name) {
    throw new Error('Database name required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/d1/database`, {
    method: 'POST',
    body: { name }
  });

  console.log(`Created database: ${name}`);
  console.log(`Database ID: ${data.result.uuid}`);
  output(data.result);
}

async function deleteDatabase(databaseId) {
  if (!databaseId) {
    throw new Error('Database ID required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/d1/database/${databaseId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted database: ${databaseId}`);
}

async function getDatabaseInfo(databaseId) {
  if (!databaseId) {
    throw new Error('Database ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/d1/database/${databaseId}`);
  output(data.result);
}

async function runQuery(databaseId, sql, flags) {
  if (!databaseId || !sql) {
    throw new Error('Database ID and SQL required. Usage: query <database-id> <sql>');
  }

  const accountId = await getAccountId();
  
  const body = { sql };
  
  if (flags.params) {
    try {
      body.params = JSON.parse(flags.params);
    } catch (e) {
      throw new Error('Invalid JSON in --params');
    }
  }

  const data = await apiRequest(`/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body
  });

  // D1 returns array of results (one per statement)
  const results = data.result || [];
  
  for (const result of results) {
    if (result.success) {
      if (result.results && result.results.length > 0) {
        output(result.results);
      } else {
        console.log(`Query executed successfully.`);
        if (result.meta) {
          console.log(`  Rows affected: ${result.meta.changes || 0}`);
          console.log(`  Duration: ${result.meta.duration || 0}ms`);
        }
      }
    } else {
      console.error(`Query failed: ${result.error || 'Unknown error'}`);
    }
  }
}

async function executeFile(databaseId, filePath) {
  if (!databaseId || !filePath) {
    throw new Error('Database ID and file path required. Usage: execute <database-id> <file>');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  const accountId = await getAccountId();

  // Split by semicolons but be careful with strings
  // For simplicity, we'll send the whole file as one query
  // D1 can handle multiple statements
  const data = await apiRequest(`/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body: { sql }
  });

  const results = data.result || [];
  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount++;
    } else {
      console.error(`Error: ${result.error || 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log(`Executed ${filePath}`);
  console.log(`  Statements: ${results.length}`);
  console.log(`  Succeeded: ${successCount}`);
  if (errorCount > 0) {
    console.log(`  Failed: ${errorCount}`);
  }
}

async function listTables(databaseId) {
  if (!databaseId) {
    throw new Error('Database ID required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body: {
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    }
  });

  const results = data.result?.[0]?.results || [];
  const tables = results.map(r => r.name);
  
  console.log(`Tables in database ${databaseId}:`);
  if (tables.length === 0) {
    console.log('  (no tables)');
  } else {
    for (const table of tables) {
      console.log(`  - ${table}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'databases':
        await listDatabases();
        break;

      case 'create':
        await createDatabase(args._[1]);
        break;

      case 'delete':
        await deleteDatabase(args._[1]);
        break;

      case 'info':
        await getDatabaseInfo(args._[1]);
        break;

      case 'query':
        await runQuery(args._[1], args._[2], args);
        break;

      case 'execute':
        await executeFile(args._[1], args._[2]);
        break;

      case 'tables':
        await listTables(args._[1]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
