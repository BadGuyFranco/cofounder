#!/usr/bin/env node

/**
 * Browser Control - Scroll
 * 
 * Scroll the page or specific elements into view.
 * 
 * Usage:
 *   node scripts/scroll.js --to "#footer"
 *   node scripts/scroll.js --by 500
 *   node scripts/scroll.js --to bottom
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Scroll', {
    'Usage': [
      'node scripts/scroll.js [options]'
    ],
    'Options': [
      '--to <selector>    Scroll element into view',
      '--to top           Scroll to page top',
      '--to bottom        Scroll to page bottom',
      '--by <pixels>      Scroll by pixel amount (negative = up)',
      '--infinite         Trigger infinite scroll loading',
      '--max <n>          Max scroll attempts for infinite (default: 10)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/scroll.js --to "#footer"',
      'node scripts/scroll.js --to bottom',
      'node scripts/scroll.js --to top',
      'node scripts/scroll.js --by 500',
      'node scripts/scroll.js --by -300',
      'node scripts/scroll.js --infinite --max 5'
    ],
    'Notes': [
      'Use --to with a selector to scroll that element into view.',
      'Use --by for relative scrolling (positive = down, negative = up).',
      'Infinite scroll repeatedly scrolls to bottom until no new content.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help' && process.argv.length > 2) {
    printHelp();
    return;
  }

  const port = getPort(flags);
  const params = {};

  if (flags.to) {
    params.action = 'to';
    params.target = flags.to;
  } else if (flags.by) {
    params.action = 'by';
    params.amount = parseInt(flags.by, 10);
  } else if (flags.infinite !== undefined) {
    params.action = 'infinite';
    params.max = flags.max ? parseInt(flags.max, 10) : 10;
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('scroll', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
