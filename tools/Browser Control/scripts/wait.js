#!/usr/bin/env node

/**
 * Browser Control - Wait
 * 
 * Wait for conditions before continuing.
 * 
 * Usage:
 *   node scripts/wait.js --selector <sel>
 *   node scripts/wait.js --text <text>
 *   node scripts/wait.js --time <ms>
 *   node scripts/wait.js --network
 *   node scripts/wait.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Wait', {
    'Usage': [
      'node scripts/wait.js --selector <sel>',
      'node scripts/wait.js --text <text>',
      'node scripts/wait.js --time <ms>',
      'node scripts/wait.js --network'
    ],
    'Options': [
      '--selector <sel>   Wait for element to be visible',
      '--text <text>      Wait for text to appear on page',
      '--hidden           Wait for element to disappear (with --selector)',
      '--time <ms>        Wait fixed time in milliseconds',
      '--network          Wait for network to be idle',
      '--timeout <ms>     Maximum wait time (default: 30000)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/wait.js --selector ".loading"  --hidden',
      'node scripts/wait.js --selector "#results"',
      'node scripts/wait.js --text "Success"',
      'node scripts/wait.js --time 2000',
      'node scripts/wait.js --network',
      'node scripts/wait.js --selector ".modal" --timeout 10000'
    ],
    'Notes': [
      'Use --network to wait for all requests to complete.',
      'Use --hidden to wait for loading indicators to disappear.',
      'Fixed time waits (--time) should be avoided when possible.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  // Validate at least one wait condition
  if (!flags.selector && !flags.text && !flags.time && !flags.network) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    selector: flags.selector,
    text: flags.text,
    hidden: flags.hidden === true,
    time: flags.time,
    network: flags.network === true,
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 30000
  };

  try {
    const result = await sendCommand('wait', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
