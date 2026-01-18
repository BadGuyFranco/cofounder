#!/usr/bin/env node

/**
 * Browser Control - Frame/Iframe Management
 * 
 * Switch between main page and iframe contexts.
 * 
 * Usage:
 *   node scripts/frame.js list
 *   node scripts/frame.js switch 0
 *   node scripts/frame.js main
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Frame Management', {
    'Usage': [
      'node scripts/frame.js <command> [options]'
    ],
    'Commands': [
      'list                  List all iframes on page',
      'switch <index>        Switch to iframe by index',
      'switch --name <name>  Switch to iframe by name attribute',
      'switch --src <partial> Switch to iframe by partial src match',
      'main                  Return to main page context',
      'current               Show current frame context'
    ],
    'Options': [
      '--port <n>            Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/frame.js list',
      'node scripts/frame.js switch 0',
      'node scripts/frame.js switch --name "widget"',
      'node scripts/frame.js switch --src "leadconnector"',
      'node scripts/frame.js main'
    ],
    'Notes': [
      'After switching frames, all commands operate on that frame.',
      'Use "main" to return to the main page context.',
      'Frame indices are shown by the "list" command.'
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

  if (command === 'list') {
    try {
      const result = await sendCommand('frame', { action: 'list' }, port);
      output({ success: true, ...result });
    } catch (error) {
      outputError(error);
    }
    return;
  }

  if (command === 'main') {
    try {
      const result = await sendCommand('frame', { action: 'main' }, port);
      output({ success: true, ...result });
    } catch (error) {
      outputError(error);
    }
    return;
  }

  if (command === 'current') {
    try {
      const result = await sendCommand('frame', { action: 'current' }, port);
      output({ success: true, ...result });
    } catch (error) {
      outputError(error);
    }
    return;
  }

  if (command === 'switch') {
    const params = { action: 'switch' };
    
    if (flags.name) {
      params.by = 'name';
      params.value = flags.name;
    } else if (flags.src) {
      params.by = 'src';
      params.value = flags.src;
    } else if (args[0] !== undefined) {
      params.by = 'index';
      params.value = parseInt(args[0], 10);
    } else {
      outputError('Specify frame index, --name, or --src');
      return;
    }

    try {
      const result = await sendCommand('frame', params, port);
      output({ success: true, ...result });
    } catch (error) {
      outputError(error);
    }
    return;
  }

  printHelp();
}

main();
