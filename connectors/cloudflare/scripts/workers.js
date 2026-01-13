#!/usr/bin/env node
/**
 * Cloudflare Workers Script
 * Deploy and manage Cloudflare Workers.
 * 
 * Note: Requires Account-level API token permissions.
 * See SETUP.md for creating a Workers-enabled token.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Workers Script - Manage Cloudflare Workers

Usage: node scripts/workers.js <command> [options]

Commands:
  list                            List all workers in account
  get <name>                      Get worker details
  deploy <name> <file>            Deploy a worker script
  delete <name>                   Delete a worker
  routes <zone>                   List worker routes for a zone
  route-create <zone>             Create a worker route
  route-delete <zone> <route-id>  Delete a worker route
  help                            Show this help

Deploy Options:
  --file <path>           Path to worker script file

Route Options:
  --pattern <pattern>     Route pattern (e.g., example.com/api/*)
  --worker <name>         Worker name to bind to route

Examples:
  node scripts/workers.js list
  node scripts/workers.js deploy my-worker ./worker.js
  node scripts/workers.js routes example.com
  node scripts/workers.js route-create example.com --pattern "example.com/api/*" --worker my-worker
  node scripts/workers.js delete my-worker

Note: Requires Account-level token with Workers Scripts Edit permission.
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

async function listWorkers() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/workers/scripts`);
  
  const workers = data.result || [];
  const simplified = workers.map(w => ({
    id: w.id,
    name: w.id,
    created_on: w.created_on,
    modified_on: w.modified_on
  }));

  output(simplified);
}

async function getWorker(name) {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/workers/scripts/${name}`);
  output(data.result);
}

async function deployWorker(name, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const script = fs.readFileSync(filePath, 'utf-8');
  const accountId = await getAccountId();

  // Deploy the worker
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${name}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/javascript'
      },
      body: script
    }
  );

  const data = await response.json();
  if (!data.success) {
    const error = new Error(data.errors?.[0]?.message || 'Deploy failed');
    error.errors = data.errors;
    throw error;
  }

  console.log(`Deployed worker: ${name}`);
  output(data.result);
}

async function deleteWorker(name) {
  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/workers/scripts/${name}`, {
    method: 'DELETE'
  });

  console.log(`Deleted worker: ${name}`);
}

async function listRoutes(zoneIdentifier) {
  // Resolve zone ID
  let zoneId = zoneIdentifier;
  if (!(/^[a-f0-9]{32}$/i.test(zoneIdentifier))) {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(zoneIdentifier)}`);
    const zones = data.result || [];
    if (zones.length === 0) {
      throw new Error(`Zone not found: ${zoneIdentifier}`);
    }
    zoneId = zones[0].id;
  }

  const data = await apiRequest(`/zones/${zoneId}/workers/routes`);
  output(data.result);
}

async function createRoute(zoneIdentifier, flags) {
  if (!flags.pattern) {
    throw new Error('--pattern is required (route pattern)');
  }
  if (!flags.worker) {
    throw new Error('--worker is required (worker name)');
  }

  // Resolve zone ID
  let zoneId = zoneIdentifier;
  if (!(/^[a-f0-9]{32}$/i.test(zoneIdentifier))) {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(zoneIdentifier)}`);
    const zones = data.result || [];
    if (zones.length === 0) {
      throw new Error(`Zone not found: ${zoneIdentifier}`);
    }
    zoneId = zones[0].id;
  }

  const data = await apiRequest(`/zones/${zoneId}/workers/routes`, {
    method: 'POST',
    body: {
      pattern: flags.pattern,
      script: flags.worker
    }
  });

  console.log(`Created route: ${flags.pattern} -> ${flags.worker}`);
  output(data.result);
}

async function deleteRoute(zoneIdentifier, routeId) {
  // Resolve zone ID
  let zoneId = zoneIdentifier;
  if (!(/^[a-f0-9]{32}$/i.test(zoneIdentifier))) {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(zoneIdentifier)}`);
    const zones = data.result || [];
    if (zones.length === 0) {
      throw new Error(`Zone not found: ${zoneIdentifier}`);
    }
    zoneId = zones[0].id;
  }

  await apiRequest(`/zones/${zoneId}/workers/routes/${routeId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted route: ${routeId}`);
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
      case 'list':
        await listWorkers();
        break;

      case 'get':
        if (!args._[1]) {
          throw new Error('Worker name required. Usage: get <name>');
        }
        await getWorker(args._[1]);
        break;

      case 'deploy':
        if (!args._[1] || !args._[2]) {
          throw new Error('Worker name and file required. Usage: deploy <name> <file>');
        }
        await deployWorker(args._[1], args._[2]);
        break;

      case 'delete':
        if (!args._[1]) {
          throw new Error('Worker name required. Usage: delete <name>');
        }
        await deleteWorker(args._[1]);
        break;

      case 'routes':
        if (!args._[1]) {
          throw new Error('Zone required. Usage: routes <zone>');
        }
        await listRoutes(args._[1]);
        break;

      case 'route-create':
        if (!args._[1]) {
          throw new Error('Zone required. Usage: route-create <zone> --pattern <pattern> --worker <name>');
        }
        await createRoute(args._[1], args);
        break;

      case 'route-delete':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and route ID required. Usage: route-delete <zone> <route-id>');
        }
        await deleteRoute(args._[1], args._[2]);
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
