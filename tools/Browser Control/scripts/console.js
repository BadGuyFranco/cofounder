#!/usr/bin/env node

/**
 * Browser Control - Console
 * 
 * Capture browser console messages.
 * 
 * Usage:
 *   node scripts/console.js start
 *   node scripts/console.js stop
 *   node scripts/console.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Console', {
    'Usage': [
      'node scripts/console.js <command>'
    ],
    'Commands': [
      'start             Start capturing console messages',
      'stop              Stop capturing and output log',
      'help              Show this help'
    ],
    'Options': [
      '--port <n>        Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/console.js start',
      'node scripts/console.js stop'
    ],
    'Notes': [
      'Captures: log, warn, error, info, debug messages.',
      'Useful for debugging JavaScript errors on pages.',
      'Capture starts fresh each time (previous log cleared).'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const validCommands = ['start', 'stop'];
  if (!validCommands.includes(command)) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    action: command
  };

  try {
    const result = await sendCommand('console', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
