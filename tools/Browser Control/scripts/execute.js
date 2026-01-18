#!/usr/bin/env node

/**
 * Browser Control - Execute JavaScript
 * 
 * Run JavaScript code on the current page.
 * 
 * Usage:
 *   node scripts/execute.js --code <javascript>
 *   node scripts/execute.js --file <path>
 *   node scripts/execute.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Execute JavaScript', {
    'Usage': [
      'node scripts/execute.js --code <javascript>',
      'node scripts/execute.js --file <path>'
    ],
    'Options': [
      '--code <js>     JavaScript code to execute',
      '--file <path>   Path to JavaScript file to execute',
      '--port <n>      Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/execute.js --code "document.title"',
      'node scripts/execute.js --code "document.querySelectorAll(\'a\').length"',
      'node scripts/execute.js --code "window.scrollTo(0, document.body.scrollHeight)"',
      'node scripts/execute.js --file ./extract-data.js'
    ],
    'Notes': [
      'Code runs in the browser context, not Node.js.',
      'Return values are serialized to JSON.',
      'Complex objects may not serialize fully.',
      'Use for data extraction, scrolling, or page manipulation.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  const hasCode = flags.code !== undefined;
  const hasFile = flags.file !== undefined;

  if ((command === 'help' && !hasCode && !hasFile) || (!hasCode && !hasFile)) {
    printHelp();
    if (command !== 'help') process.exit(1);
    return;
  }

  const port = getPort(flags);
  const params = {
    code: flags.code,
    file: flags.file
  };

  try {
    const result = await sendCommand('execute', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
