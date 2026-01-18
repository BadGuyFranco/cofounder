#!/usr/bin/env node

/**
 * Browser Control - Screenshot
 * 
 * Capture screenshots of the page or specific elements.
 * 
 * Usage:
 *   node scripts/screenshot.js --output <path>
 *   node scripts/screenshot.js --output <path> --fullpage
 *   node scripts/screenshot.js --output <path> --selector <sel>
 *   node scripts/screenshot.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Screenshot', {
    'Usage': [
      'node scripts/screenshot.js --output <path> [options]'
    ],
    'Options': [
      '--output <path>    Save screenshot to path (required)',
      '--fullpage         Capture full scrollable page',
      '--selector <sel>   Capture specific element only',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/screenshot.js --output ./screenshot.png',
      'node scripts/screenshot.js --output ./full.png --fullpage',
      'node scripts/screenshot.js --output ./header.png --selector "header"',
      'node scripts/screenshot.js --output ~/Desktop/page.png'
    ],
    'Notes': [
      'Output path can be relative or absolute.',
      'Supported formats: PNG (default), JPEG (if path ends in .jpg/.jpeg)',
      'Full page captures the entire scrollable content.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help' && !flags.output) {
    printHelp();
    return;
  }

  if (!flags.output) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    output: flags.output,
    fullPage: flags.fullpage === true,
    selector: flags.selector
  };

  try {
    const result = await sendCommand('screenshot', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
