#!/usr/bin/env node

/**
 * Browser Control - Navigate
 * 
 * Navigate to URLs or through browser history.
 * 
 * Usage:
 *   node scripts/navigate.js <url>
 *   node scripts/navigate.js back
 *   node scripts/navigate.js forward
 *   node scripts/navigate.js reload
 *   node scripts/navigate.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Navigate', {
    'Usage': [
      'node scripts/navigate.js <url>',
      'node scripts/navigate.js <direction>'
    ],
    'Commands': [
      '<url>       Navigate to URL (e.g., https://example.com)',
      'back        Go back one page',
      'forward     Go forward one page',
      'reload      Reload current page',
      'help        Show this help'
    ],
    'Options': [
      '--wait <state>   Wait until: load, domcontentloaded, networkidle (default: load)',
      '--timeout <ms>   Navigation timeout in milliseconds (default: 30000)',
      '--port <n>       Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/navigate.js https://example.com',
      'node scripts/navigate.js https://google.com --wait networkidle',
      'node scripts/navigate.js back',
      'node scripts/navigate.js reload'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const port = getPort(flags);
  const params = {
    waitUntil: flags.wait || 'load',
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 30000
  };

  // Determine if it's a URL or direction
  if (['back', 'forward', 'reload'].includes(command)) {
    params.direction = command;
  } else if (command.startsWith('http://') || command.startsWith('https://')) {
    params.url = command;
  } else if (command && command !== 'help') {
    // Assume it's a URL without protocol
    params.url = 'https://' + command;
  } else {
    printHelp();
    process.exit(1);
  }

  try {
    const result = await sendCommand('navigate', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
