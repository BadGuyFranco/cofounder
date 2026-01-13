#!/usr/bin/env node

/**
 * Make.com API Keys Script
 * Manage API tokens.
 * 
 * Usage:
 *   node keys.js list
 *   node keys.js get <key-id>
 *   node keys.js create --name "Key Name" [--scopes "scenarios:read,hooks:read"]
 *   node keys.js delete <key-id>
 */

import { get, post, del, parseArgs, printTable, formatOutput } from './utils.js';

// List API keys
async function listKeys(verbose) {
  const response = await get('/users/me/api-tokens');
  const keys = response.apiTokens || response;
  
  if (verbose) {
    formatOutput(keys, true);
    return;
  }
  
  if (!keys || keys.length === 0) {
    console.log('No API keys found.');
    return;
  }
  
  console.log(`Found ${keys.length} API key(s):\n`);
  
  printTable(keys, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'created', label: 'Created' },
    { key: 'lastUsed', label: 'Last Used', getter: k => k.lastUsed || 'Never' }
  ]);
}

// Get a specific key
async function getKey(keyId, verbose) {
  const response = await get(`/users/me/api-tokens/${keyId}`);
  const key = response.apiToken || response;
  
  if (verbose) {
    formatOutput(key, true);
    return;
  }
  
  console.log(`API Key: ${key.name}`);
  console.log(`ID: ${key.id}`);
  console.log(`Created: ${key.created}`);
  console.log(`Last Used: ${key.lastUsed || 'Never'}`);
  if (key.scopes) {
    console.log(`Scopes: ${key.scopes.join(', ')}`);
  }
}

// Create a new API key
async function createKey(name, scopes, verbose) {
  const payload = { name };
  if (scopes) {
    payload.scopes = scopes.split(',').map(s => s.trim());
  }
  
  const response = await post('/users/me/api-tokens', payload);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const key = response.apiToken || response;
  console.log(`API key created: ${key.name}`);
  console.log(`ID: ${key.id}`);
  if (key.token) {
    console.log(`\nToken (save this, it won't be shown again):`);
    console.log(key.token);
  }
}

// Delete an API key
async function deleteKey(keyId, verbose) {
  const response = await del(`/users/me/api-tokens/${keyId}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`API key ${keyId} deleted.`);
}

// Show help
function showHelp() {
  console.log('Make.com API Keys Script');
  console.log('');
  console.log('Manage API tokens for programmatic access.');
  console.log('');
  console.log('Commands:');
  console.log('  list                               List API keys');
  console.log('  get <key-id>                       Get key details');
  console.log('  create --name "Name" [--scopes]    Create new key');
  console.log('  delete <key-id>                    Delete key (destructive)');
  console.log('');
  console.log('Options:');
  console.log('  --name <name>       Key name');
  console.log('  --scopes <scopes>   Comma-separated scopes');
  console.log('  --verbose           Show full API responses');
  console.log('');
  console.log('Available Scopes:');
  console.log('  scenarios:read, scenarios:write');
  console.log('  hooks:read, hooks:write');
  console.log('  data-stores:read, data-stores:write');
  console.log('  teams:read, organizations:read');
  console.log('  users:read, users:write');
  console.log('');
  console.log('Examples:');
  console.log('  node keys.js list');
  console.log('  node keys.js create --name "CI/CD Key" --scopes "scenarios:read,hooks:read"');
  console.log('  node keys.js delete 12345');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        await listKeys(verbose);
        break;
      }
      
      case 'get': {
        const keyId = args._[1];
        if (!keyId) {
          console.error('Error: Key ID is required');
          console.error('Usage: node keys.js get <key-id>');
          process.exit(1);
        }
        await getKey(keyId, verbose);
        break;
      }
      
      case 'create': {
        const name = args.name;
        if (!name) {
          console.error('Error: --name is required');
          console.error('Usage: node keys.js create --name "Key Name"');
          process.exit(1);
        }
        await createKey(name, args.scopes, verbose);
        break;
      }
      
      case 'delete': {
        const keyId = args._[1];
        if (!keyId) {
          console.error('Error: Key ID is required');
          console.error('Usage: node keys.js delete <key-id>');
          process.exit(1);
        }
        await deleteKey(keyId, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
