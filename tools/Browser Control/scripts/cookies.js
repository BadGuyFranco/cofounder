#!/usr/bin/env node

/**
 * Browser Control - Cookie Management
 * 
 * Get, set, and manage browser cookies.
 * 
 * Usage:
 *   node scripts/cookies.js list
 *   node scripts/cookies.js get "session_id"
 *   node scripts/cookies.js set --name "token" --value "abc123"
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Cookie Management', {
    'Usage': [
      'node scripts/cookies.js <command> [options]'
    ],
    'Commands': [
      'list                List all cookies',
      'get <name>          Get specific cookie by name',
      'set                 Set a cookie (use with --name, --value)',
      'delete <name>       Delete a cookie by name',
      'clear               Clear all cookies',
      'export              Export cookies to JSON file',
      'import              Import cookies from JSON file'
    ],
    'Options': [
      '--domain <domain>   Filter by domain (for list)',
      '--name <name>       Cookie name (for set)',
      '--value <value>     Cookie value (for set)',
      '--path <path>       Cookie path (for set, default: /)',
      '--expires <days>    Days until expiry (for set)',
      '--output <file>     Output file (for export)',
      '--file <file>       Input file (for import)',
      '--port <n>          Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/cookies.js list',
      'node scripts/cookies.js list --domain "example.com"',
      'node scripts/cookies.js get "session_id"',
      'node scripts/cookies.js set --name "token" --value "abc123"',
      'node scripts/cookies.js set --name "pref" --value "dark" --expires 30',
      'node scripts/cookies.js delete "tracking_id"',
      'node scripts/cookies.js clear',
      'node scripts/cookies.js export --output cookies.json',
      'node scripts/cookies.js import --file cookies.json'
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
  const params = { action: command };

  if (command === 'list') {
    if (flags.domain) params.domain = flags.domain;
  } else if (command === 'get') {
    if (!args[0]) {
      outputError('Specify cookie name');
      return;
    }
    params.name = args[0];
  } else if (command === 'set') {
    if (!flags.name || !flags.value) {
      outputError('--name and --value are required');
      return;
    }
    params.name = flags.name;
    params.value = flags.value;
    if (flags.path) params.path = flags.path;
    if (flags.domain) params.domain = flags.domain;
    if (flags.expires) params.expires = parseInt(flags.expires, 10);
  } else if (command === 'delete') {
    if (!args[0]) {
      outputError('Specify cookie name to delete');
      return;
    }
    params.name = args[0];
  } else if (command === 'clear') {
    // No additional params needed
  } else if (command === 'export') {
    if (!flags.output) {
      outputError('--output file is required');
      return;
    }
    params.output = flags.output;
  } else if (command === 'import') {
    if (!flags.file) {
      outputError('--file is required');
      return;
    }
    params.file = flags.file;
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('cookies', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
