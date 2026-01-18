#!/usr/bin/env node

/**
 * Browser Control - Network
 * 
 * Capture and control network requests.
 * 
 * Usage:
 *   node scripts/network.js start
 *   node scripts/network.js stop
 *   node scripts/network.js block <pattern>
 *   node scripts/network.js unblock
 *   node scripts/network.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Network', {
    'Usage': [
      'node scripts/network.js <command> [args]'
    ],
    'Commands': [
      'start             Start capturing network requests',
      'stop              Stop capturing and output log',
      'block <pattern>   Block URLs matching pattern',
      'unblock           Clear all URL blocks',
      'help              Show this help'
    ],
    'Options': [
      '--port <n>        Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/network.js start',
      'node scripts/network.js stop',
      'node scripts/network.js block "*.ads.*"',
      'node scripts/network.js block "analytics"',
      'node scripts/network.js unblock'
    ],
    'Notes': [
      'Capture starts fresh each time (previous log cleared).',
      'Block patterns use glob matching.',
      'Useful for blocking ads, analytics, or debugging API calls.'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const validCommands = ['start', 'stop', 'block', 'unblock'];
  if (!validCommands.includes(command)) {
    printHelp();
    process.exit(1);
  }

  if (command === 'block' && !args[0]) {
    console.error('Error: Pattern required. Usage: block <pattern>');
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    action: command,
    pattern: command === 'block' ? args[0] : undefined
  };

  try {
    const result = await sendCommand('network', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
