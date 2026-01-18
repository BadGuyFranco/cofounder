#!/usr/bin/env node

/**
 * Browser Control - Mouse Actions
 * 
 * Hover, drag, and other mouse operations.
 * 
 * Usage:
 *   node scripts/mouse.js hover --selector ".dropdown"
 *   node scripts/mouse.js drag --from ".item" --to ".zone"
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Mouse Actions', {
    'Usage': [
      'node scripts/mouse.js <action> [options]'
    ],
    'Actions': [
      'hover               Hover over an element',
      'drag                Drag from one element to another',
      'move                Move mouse to position',
      'wheel               Scroll with mouse wheel'
    ],
    'Options': [
      '--selector <sel>   Target element selector',
      '--coords <x,y>     Target coordinates (e.g., 100,200)',
      '--from <selector>  Drag source element',
      '--to <selector>    Drag target element',
      '--delta <amount>   Wheel scroll amount (negative = up)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/mouse.js hover --selector ".dropdown-trigger"',
      'node scripts/mouse.js hover --coords 100,200',
      'node scripts/mouse.js drag --from ".draggable" --to ".dropzone"',
      'node scripts/mouse.js move --coords 500,300',
      'node scripts/mouse.js wheel --delta -500'
    ],
    'Notes': [
      'Hover triggers mouseenter/mouseover events (useful for dropdowns).',
      'Drag performs a full drag-and-drop sequence.',
      'Wheel simulates mouse wheel scrolling.'
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
  const params = { action: command };

  if (command === 'hover') {
    if (flags.selector) {
      params.selector = flags.selector;
    } else if (flags.coords) {
      const [x, y] = flags.coords.split(',').map(n => parseInt(n.trim(), 10));
      params.x = x;
      params.y = y;
    } else {
      outputError('Specify --selector or --coords');
      return;
    }
  } else if (command === 'drag') {
    if (!flags.from || !flags.to) {
      outputError('Specify --from and --to selectors');
      return;
    }
    params.from = flags.from;
    params.to = flags.to;
  } else if (command === 'move') {
    if (!flags.coords) {
      outputError('Specify --coords');
      return;
    }
    const [x, y] = flags.coords.split(',').map(n => parseInt(n.trim(), 10));
    params.x = x;
    params.y = y;
  } else if (command === 'wheel') {
    if (!flags.delta) {
      outputError('Specify --delta amount');
      return;
    }
    params.delta = parseInt(flags.delta, 10);
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('mouse', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
