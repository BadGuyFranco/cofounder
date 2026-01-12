#!/usr/bin/env node

/**
 * Supabase SQL Script
 * Execute raw SQL queries via RPC.
 *
 * Note: This requires a custom RPC function to be created in your database.
 * See the help command for setup instructions.
 *
 * Usage:
 *   node sql.js "SELECT * FROM users LIMIT 10"
 *   node sql.js --file query.sql
 *   node sql.js help
 */

import { parseArgs, restRequest, loadConfig } from './utils.js';
import fs from 'fs';

// Execute SQL query via RPC
async function executeSql(query, verbose) {
  // Try using the exec_sql RPC function
  try {
    const data = await restRequest('/rpc/exec_sql', {
      method: 'POST',
      body: { query: query }
    });

    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.log('Query executed successfully. No rows returned.');
        return data;
      }

      console.log(`Returned ${data.length} row(s):\n`);
      
      // Get column names from first row
      const columns = Object.keys(data[0]);
      
      // Calculate column widths
      const widths = {};
      for (const col of columns) {
        widths[col] = Math.max(col.length, ...data.map(row => String(row[col] ?? '').length));
        widths[col] = Math.min(widths[col], 50); // Cap at 50 chars
      }
      
      // Print header
      const header = columns.map(col => col.padEnd(widths[col])).join(' | ');
      console.log(header);
      console.log(columns.map(col => '-'.repeat(widths[col])).join('-+-'));
      
      // Print rows
      for (const row of data) {
        const line = columns.map(col => {
          const val = String(row[col] ?? '');
          return val.substring(0, widths[col]).padEnd(widths[col]);
        }).join(' | ');
        console.log(line);
      }
    } else {
      console.log('Result:');
      console.log(JSON.stringify(data, null, 2));
    }

    if (verbose) {
      console.log('\nFull response:');
      console.log(JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    if (error.status === 404 || error.message.includes('function') || error.message.includes('does not exist')) {
      console.error('Error: The exec_sql RPC function is not set up.');
      console.error('');
      console.error('To enable raw SQL queries, create this function in your Supabase SQL editor:');
      console.error('');
      console.error(`CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;`);
      console.error('');
      console.error('WARNING: This function allows arbitrary SQL execution.');
      console.error('Only use with service_role key and never expose to clients.');
      process.exit(1);
    }
    throw error;
  }
}

// Show help
function showHelp() {
  console.log('Supabase SQL Script');
  console.log('');
  console.log('Execute raw SQL queries against your Supabase database.');
  console.log('');
  console.log('SETUP REQUIRED: Create the exec_sql function in your database.');
  console.log('Run: node sql.js setup');
  console.log('');
  console.log('Usage:');
  console.log('  node sql.js "<query>"           Execute SQL query');
  console.log('  node sql.js --file <file.sql>   Execute SQL from file');
  console.log('  node sql.js setup               Show setup instructions');
  console.log('  node sql.js help                Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                       Show full response');
  console.log('  --file <path>                   Read query from file');
  console.log('');
  console.log('Examples:');
  console.log('  # Simple query');
  console.log('  node sql.js "SELECT * FROM users LIMIT 10"');
  console.log('');
  console.log('  # Query with filter');
  console.log('  node sql.js "SELECT id, email FROM users WHERE role = \'admin\'"');
  console.log('');
  console.log('  # Count records');
  console.log('  node sql.js "SELECT COUNT(*) FROM orders"');
  console.log('');
  console.log('  # Join tables');
  console.log('  node sql.js "SELECT u.email, o.total FROM users u JOIN orders o ON u.id = o.user_id"');
  console.log('');
  console.log('  # Execute from file');
  console.log('  node sql.js --file complex-query.sql');
  console.log('');
  console.log('Security Notes:');
  console.log('  - Only use with service_role key');
  console.log('  - Never expose the exec_sql function to anonymous users');
  console.log('  - Consider creating read-only variants for safer operations');
}

// Show setup instructions
function showSetup() {
  console.log('Supabase SQL Setup');
  console.log('');
  console.log('To enable raw SQL queries, you need to create a function in your database.');
  console.log('');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the following SQL:');
  console.log('');
  console.log(`-- Create function for executing arbitrary SQL
-- WARNING: Only use with service_role key, never expose to clients

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Revoke access from anon and authenticated roles (safety measure)
REVOKE EXECUTE ON FUNCTION exec_sql FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql FROM authenticated;`);
  console.log('');
  console.log('4. Click "Run" to create the function');
  console.log('');
  console.log('The function will only be accessible via service_role key.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    if (command === 'help') {
      showHelp();
      return;
    }

    if (command === 'setup') {
      showSetup();
      return;
    }

    let query;

    if (args.file) {
      // Read query from file
      if (!fs.existsSync(args.file)) {
        console.error(`Error: File not found: ${args.file}`);
        process.exit(1);
      }
      query = fs.readFileSync(args.file, 'utf-8').trim();
    } else if (command) {
      // Query provided as argument
      query = command;
    } else {
      showHelp();
      return;
    }

    if (!query) {
      console.error('Error: No query provided');
      process.exit(1);
    }

    await executeSql(query, verbose);
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
