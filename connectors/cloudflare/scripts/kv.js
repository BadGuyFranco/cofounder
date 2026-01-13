#!/usr/bin/env node
/**
 * Cloudflare KV Script
 * Manage Workers KV namespaces and key-value pairs.
 * 
 * Note: Requires Account-level API token permissions.
 * See SETUP.md for creating a KV-enabled token.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
KV Script - Manage Cloudflare Workers KV storage

Usage: node scripts/kv.js <command> [options]

Commands:
  namespaces                      List all KV namespaces
  namespace-create <title>        Create a new namespace
  namespace-delete <namespace-id> Delete a namespace
  keys <namespace-id>             List keys in a namespace
  get <namespace-id> <key>        Get a key's value
  put <namespace-id> <key>        Set a key's value
  delete <namespace-id> <key>     Delete a key
  help                            Show this help

Put Options:
  --value <value>         Value to store (string)
  --file <path>           Read value from file
  --expiration <unix>     Expiration timestamp (optional)
  --ttl <seconds>         Time to live in seconds (optional)

Examples:
  node scripts/kv.js namespaces
  node scripts/kv.js namespace-create "My KV Store"
  node scripts/kv.js keys abc123
  node scripts/kv.js put abc123 my-key --value "my value"
  node scripts/kv.js put abc123 my-key --file ./data.json
  node scripts/kv.js get abc123 my-key
  node scripts/kv.js delete abc123 my-key

Note: Requires Account-level token with Workers KV Storage Edit permission.
`);
}

import fs from 'fs';

// Get account ID from zones (first available)
async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listNamespaces() {
  const accountId = await getAccountId();
  const namespaces = await fetchAllPages(`/accounts/${accountId}/storage/kv/namespaces`);
  output(namespaces);
}

async function createNamespace(title) {
  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: 'POST',
    body: { title }
  });

  console.log(`Created namespace: ${title}`);
  output(data.result);
}

async function deleteNamespace(namespaceId) {
  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted namespace: ${namespaceId}`);
}

async function listKeys(namespaceId, flags) {
  const accountId = await getAccountId();
  
  let endpoint = `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys`;
  if (flags.prefix) {
    endpoint += `?prefix=${encodeURIComponent(flags.prefix)}`;
  }

  const keys = await fetchAllPages(endpoint);
  output(keys);
}

async function getValue(namespaceId, key) {
  const accountId = await getAccountId();
  
  // KV get returns raw value, not JSON
  const config = await import('./utils.js').then(m => m.loadConfig());
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Key not found: ${key}`);
    }
    throw new Error(`Failed to get key: ${response.status}`);
  }

  const value = await response.text();
  
  // Try to parse as JSON for pretty output
  try {
    const json = JSON.parse(value);
    output(json);
  } catch {
    console.log(value);
  }
}

async function putValue(namespaceId, key, flags) {
  let value;
  
  if (flags.file) {
    if (!fs.existsSync(flags.file)) {
      throw new Error(`File not found: ${flags.file}`);
    }
    value = fs.readFileSync(flags.file, 'utf-8');
  } else if (flags.value !== undefined) {
    value = flags.value;
  } else {
    throw new Error('--value or --file is required');
  }

  const accountId = await getAccountId();
  
  let endpoint = `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const params = [];
  
  if (flags.expiration) {
    params.push(`expiration=${flags.expiration}`);
  }
  if (flags.ttl) {
    params.push(`expiration_ttl=${flags.ttl}`);
  }
  
  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  // KV put uses raw body
  const config = await import('./utils.js').then(m => m.loadConfig());
  const response = await fetch(
    `https://api.cloudflare.com/client/v4${endpoint}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'text/plain'
      },
      body: value
    }
  );

  const data = await response.json();
  if (!data.success) {
    const error = new Error(data.errors?.[0]?.message || 'Put failed');
    error.errors = data.errors;
    throw error;
  }

  console.log(`Set key: ${key}`);
}

async function deleteKey(namespaceId, key) {
  const accountId = await getAccountId();
  
  await apiRequest(
    `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    { method: 'DELETE' }
  );

  console.log(`Deleted key: ${key}`);
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
      case 'namespaces':
        await listNamespaces();
        break;

      case 'namespace-create':
        if (!args._[1]) {
          throw new Error('Title required. Usage: namespace-create <title>');
        }
        await createNamespace(args._[1]);
        break;

      case 'namespace-delete':
        if (!args._[1]) {
          throw new Error('Namespace ID required. Usage: namespace-delete <namespace-id>');
        }
        await deleteNamespace(args._[1]);
        break;

      case 'keys':
        if (!args._[1]) {
          throw new Error('Namespace ID required. Usage: keys <namespace-id>');
        }
        await listKeys(args._[1], args);
        break;

      case 'get':
        if (!args._[1] || !args._[2]) {
          throw new Error('Namespace ID and key required. Usage: get <namespace-id> <key>');
        }
        await getValue(args._[1], args._[2]);
        break;

      case 'put':
        if (!args._[1] || !args._[2]) {
          throw new Error('Namespace ID and key required. Usage: put <namespace-id> <key> --value <value>');
        }
        await putValue(args._[1], args._[2], args);
        break;

      case 'delete':
        if (!args._[1] || !args._[2]) {
          throw new Error('Namespace ID and key required. Usage: delete <namespace-id> <key>');
        }
        await deleteKey(args._[1], args._[2]);
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
