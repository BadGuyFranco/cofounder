#!/usr/bin/env node

/**
 * Browser Control - Web Storage Management
 * 
 * Access localStorage and sessionStorage.
 * 
 * Usage:
 *   node scripts/storage.js list
 *   node scripts/storage.js get "user_prefs"
 *   node scripts/storage.js set "theme" "dark"
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Web Storage', {
    'Usage': [
      'node scripts/storage.js <command> [options]'
    ],
    'Commands': [
      'list                List all storage items',
      'get <key>           Get value by key',
      'set <key> <value>   Set a storage item',
      'delete <key>        Delete a storage item',
      'clear               Clear all storage'
    ],
    'Options': [
      '--session           Use sessionStorage instead of localStorage',
      '--port <n>          Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/storage.js list',
      'node scripts/storage.js list --session',
      'node scripts/storage.js get "user_prefs"',
      'node scripts/storage.js set "theme" "dark"',
      'node scripts/storage.js set "config" \'{"debug": true}\' --session',
      'node scripts/storage.js delete "cache_key"',
      'node scripts/storage.js clear'
    ],
    'Notes': [
      'Default is localStorage. Use --session for sessionStorage.',
      'Values are stored as strings. Use JSON for complex data.'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const port = getPort(flags);
  const params = { 
    action: command,
    storage: flags.session ? 'session' : 'local'
  };

  if (command === 'list') {
    // No additional params
  } else if (command === 'get') {
    if (!args[0]) {
      outputError('Specify key to get');
      return;
    }
    params.key = args[0];
  } else if (command === 'set') {
    if (!args[0] || !args[1]) {
      outputError('Specify key and value');
      return;
    }
    params.key = args[0];
    params.value = args[1];
  } else if (command === 'delete') {
    if (!args[0]) {
      outputError('Specify key to delete');
      return;
    }
    params.key = args[0];
  } else if (command === 'clear') {
    // No additional params
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('storage', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
