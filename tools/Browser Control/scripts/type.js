#!/usr/bin/env node

/**
 * Browser Control - Type
 * 
 * Type text into elements or press keyboard keys.
 * 
 * Usage:
 *   node scripts/type.js --selector <sel> --text <text>
 *   node scripts/type.js --key <key>
 *   node scripts/type.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Type', {
    'Usage': [
      'node scripts/type.js --selector <sel> --text <text>',
      'node scripts/type.js --key <key>'
    ],
    'Options': [
      '--selector <sel>   CSS selector of input element',
      '--text <text>      Text to type',
      '--key <key>        Single key to press (Enter, Tab, Escape, etc.)',
      '--clear            Clear field before typing',
      '--delay <ms>       Delay between keystrokes in milliseconds',
      '--submit           Press Enter after typing',
      '--timeout <ms>     Timeout in milliseconds (default: 5000)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Common Keys': [
      'Enter, Tab, Escape, Backspace, Delete',
      'ArrowUp, ArrowDown, ArrowLeft, ArrowRight',
      'Home, End, PageUp, PageDown',
      'F1-F12, Control, Shift, Alt, Meta'
    ],
    'Examples': [
      'node scripts/type.js --selector "#email" --text "user@example.com"',
      'node scripts/type.js --selector "#search" --text "query" --submit',
      'node scripts/type.js --selector "#name" --text "John" --clear',
      'node scripts/type.js --key Enter',
      'node scripts/type.js --key Tab',
      'node scripts/type.js --key Escape'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  // Validate arguments
  const hasKey = flags.key !== undefined;
  const hasText = flags.selector !== undefined && flags.text !== undefined;

  // Show help if explicitly requested OR if no valid arguments provided
  if (command === 'help' && !hasKey && !hasText) {
    printHelp();
    return;
  }

  if (!hasKey && !hasText) {
    printHelp();
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    selector: flags.selector,
    text: flags.text,
    key: flags.key,
    clear: flags.clear === true,
    delay: flags.delay ? parseInt(flags.delay, 10) : undefined,
    submit: flags.submit === true,
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 5000
  };

  try {
    const result = await sendCommand('type', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
