#!/usr/bin/env node

/**
 * Supabase Functions Script
 * Invoke Edge Functions.
 *
 * Note: Edge Functions must be deployed separately via Supabase CLI.
 * This script invokes existing functions.
 *
 * Usage:
 *   node functions.js list
 *   node functions.js invoke <function-name> [--data '{}']
 *   node functions.js help
 */

import { parseArgs, loadConfig, parseJSON } from './utils.js';

// List functions (via OpenAPI spec)
async function listFunctions(verbose) {
  const config = loadConfig();
  
  // Get RPC functions from the REST API
  const response = await fetch(`${config.url}/rest/v1/`, {
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch function list');
  }
  
  const spec = JSON.parse(await response.text());
  
  // Extract RPC functions
  const rpcs = Object.keys(spec.paths || {})
    .filter(p => p.startsWith('/rpc/'))
    .map(p => {
      const name = p.replace('/rpc/', '');
      const methods = spec.paths[p];
      return { name, methods: Object.keys(methods) };
    });
  
  console.log('Database Functions (RPC):');
  if (rpcs.length === 0) {
    console.log('  (none)');
  } else {
    for (const rpc of rpcs.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  ${rpc.name}`);
    }
  }
  
  console.log('\nEdge Functions:');
  console.log('  (Use Supabase CLI to list: supabase functions list)');
  console.log('  Edge functions are deployed at:');
  console.log(`  ${config.url}/functions/v1/<function-name>`);
  
  if (verbose) {
    console.log('\nRPC Function Details:');
    console.log(JSON.stringify(rpcs, null, 2));
  }
  
  return rpcs;
}

// Invoke an Edge Function
async function invokeFunction(name, data, verbose) {
  const config = loadConfig();
  const url = `${config.url}/functions/v1/${name}`;
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(parseJSON(data, 'data'));
  }
  
  const response = await fetch(url, options);
  
  const contentType = response.headers.get('content-type');
  let result;
  
  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
  } else {
    result = await response.text();
  }
  
  if (!response.ok) {
    const error = new Error(result?.error || result || 'Function invocation failed');
    error.status = response.status;
    error.details = result;
    throw error;
  }
  
  console.log(`Function '${name}' invoked successfully.`);
  console.log('');
  console.log('Response:');
  
  if (typeof result === 'object') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result);
  }
  
  if (verbose) {
    console.log('\nResponse Headers:');
    for (const [key, value] of response.headers) {
      console.log(`  ${key}: ${value}`);
    }
  }
  
  return result;
}

// Invoke an RPC function (database function)
async function invokeRpc(name, data, verbose) {
  const config = loadConfig();
  const url = `${config.url}/rest/v1/rpc/${name}`;
  
  const options = {
    method: 'POST',
    headers: {
      'apikey': config.serviceKey,
      'Authorization': `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(parseJSON(data, 'data'));
  } else {
    options.body = '{}';
  }
  
  const response = await fetch(url, options);
  
  const contentType = response.headers.get('content-type');
  let result;
  
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    result = text ? JSON.parse(text) : null;
  } else {
    result = await response.text();
  }
  
  if (!response.ok) {
    const error = new Error(result?.message || result?.error || 'RPC invocation failed');
    error.status = response.status;
    error.details = result;
    throw error;
  }
  
  console.log(`RPC '${name}' invoked successfully.`);
  console.log('');
  console.log('Response:');
  
  if (typeof result === 'object') {
    console.log(JSON.stringify(result, null, 2));
  } else if (result !== null && result !== undefined) {
    console.log(result);
  } else {
    console.log('(no return value)');
  }
  
  return result;
}

// Show help
function showHelp() {
  console.log('Supabase Functions Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                              List available functions');
  console.log('  invoke <name> [--data "{}"]       Invoke Edge Function');
  console.log('  rpc <name> [--data "{}"]          Invoke RPC (database) function');
  console.log('  help                              Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                         Show detailed response');
  console.log('  --data "{}"                       JSON payload for function');
  console.log('');
  console.log('Edge Functions vs RPC:');
  console.log('  - Edge Functions: Serverless functions (Deno) deployed via CLI');
  console.log('  - RPC Functions: PostgreSQL functions callable via REST API');
  console.log('');
  console.log('Examples:');
  console.log('  # List functions');
  console.log('  node functions.js list');
  console.log('');
  console.log('  # Invoke Edge Function');
  console.log('  node functions.js invoke hello-world');
  console.log('');
  console.log('  # Invoke Edge Function with data');
  console.log('  node functions.js invoke process-data --data \'{"input": "test"}\'');
  console.log('');
  console.log('  # Invoke RPC function');
  console.log('  node functions.js rpc get_user_stats');
  console.log('');
  console.log('  # Invoke RPC with parameters');
  console.log('  node functions.js rpc calculate_total --data \'{"order_id": 123}\'');
  console.log('');
  console.log('Deploying Edge Functions:');
  console.log('  Use the Supabase CLI:');
  console.log('  - supabase functions new my-function');
  console.log('  - supabase functions deploy my-function');
  console.log('  - supabase functions list');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        await listFunctions(verbose);
        break;
      }

      case 'invoke': {
        const name = args._[1];
        
        if (!name) {
          console.error('Error: Function name is required');
          console.error('Usage: node functions.js invoke <name> [--data "{}"]');
          process.exit(1);
        }
        
        await invokeFunction(name, args.data, verbose);
        break;
      }

      case 'rpc': {
        const name = args._[1];
        
        if (!name) {
          console.error('Error: Function name is required');
          console.error('Usage: node functions.js rpc <name> [--data "{}"]');
          process.exit(1);
        }
        
        await invokeRpc(name, args.data, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
