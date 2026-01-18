#!/usr/bin/env node

/**
 * Browser Control - Click
 * 
 * Click elements on the page.
 * 
 * Usage:
 *   node scripts/click.js --selector <css-selector>
 *   node scripts/click.js --text <visible-text>
 *   node scripts/click.js --coords <x,y>
 *   node scripts/click.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Click', {
    'Usage': [
      'node scripts/click.js --selector <css-selector>',
      'node scripts/click.js --text <visible-text>',
      'node scripts/click.js --coords <x,y>'
    ],
    'Options': [
      '--selector <sel>   CSS selector to click',
      '--text <text>      Visible text to click (partial match)',
      '--coords <x,y>     Click at coordinates (e.g., 100,200)',
      '--button <btn>     Mouse button: left, right, middle (default: left)',
      '--count <n>        Click count, 2 for double-click (default: 1)',
      '--delay <ms>       Delay between clicks in milliseconds',
      '--force            Force click even if element not visible',
      '--timeout <ms>     Timeout in milliseconds (default: 5000)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/click.js --selector "button.submit"',
      'node scripts/click.js --selector "#login-btn"',
      'node scripts/click.js --text "Sign In"',
      'node scripts/click.js --text "Accept" --timeout 10000',
      'node scripts/click.js --coords 100,200',
      'node scripts/click.js --selector ".menu" --button right'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  const hasTarget = flags.selector || flags.text || flags.coords;

  // Show help if explicitly requested OR if no valid arguments provided
  if ((command === 'help' && !hasTarget) || !hasTarget) {
    printHelp();
    if (command !== 'help') process.exit(1);
    return;
  }

  const port = getPort(flags);
  const params = {
    selector: flags.selector,
    text: flags.text,
    coords: flags.coords,
    button: flags.button || 'left',
    clickCount: flags.count ? parseInt(flags.count, 10) : 1,
    delay: flags.delay ? parseInt(flags.delay, 10) : undefined,
    force: flags.force === true,
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 5000
  };

  try {
    const result = await sendCommand('click', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
