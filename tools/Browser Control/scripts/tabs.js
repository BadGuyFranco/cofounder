#!/usr/bin/env node

/**
 * Browser Control - Tabs
 * 
 * Manage browser tabs.
 * 
 * Usage:
 *   node scripts/tabs.js list
 *   node scripts/tabs.js new [url]
 *   node scripts/tabs.js switch <index>
 *   node scripts/tabs.js close [index]
 *   node scripts/tabs.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Tabs', {
    'Usage': [
      'node scripts/tabs.js <command> [args]'
    ],
    'Commands': [
      'list              List all open tabs with indices',
      'new [url]         Open new tab (optionally navigate to URL)',
      'switch <index>    Switch to tab by index (0-based)',
      'close [index]     Close tab by index (current if omitted)',
      'help              Show this help'
    ],
    'Options': [
      '--port <n>        Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/tabs.js list',
      'node scripts/tabs.js new',
      'node scripts/tabs.js new https://example.com',
      'node scripts/tabs.js switch 1',
      'node scripts/tabs.js close',
      'node scripts/tabs.js close 0'
    ],
    'Notes': [
      'Tab indices are 0-based.',
      'New tabs become the active tab.',
      'Commands apply to the active tab unless index specified.'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const validCommands = ['list', 'new', 'switch', 'close'];
  if (!validCommands.includes(command)) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    action: command,
    url: command === 'new' ? args[0] : undefined,
    index: ['switch', 'close'].includes(command) && args[0] ? parseInt(args[0], 10) : undefined
  };

  try {
    const result = await sendCommand('tabs', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
