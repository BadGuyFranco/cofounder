#!/usr/bin/env node

/**
 * Browser Control - Element Assertions
 * 
 * Check element state for workflow validation.
 * 
 * Usage:
 *   node scripts/check.js exists --selector "#login"
 *   node scripts/check.js visible --selector "#modal"
 *   node scripts/check.js text --selector "h1" "Welcome"
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Element Assertions', {
    'Usage': [
      'node scripts/check.js <assertion> --selector <sel> [expected]'
    ],
    'Assertions': [
      'exists              Element exists in DOM',
      'visible             Element is visible on page',
      'hidden              Element is hidden or not visible',
      'enabled             Element is not disabled',
      'disabled            Element is disabled',
      'checked             Checkbox/radio is checked',
      'unchecked           Checkbox/radio is not checked',
      'text <expected>     Element contains text',
      'value <expected>    Input has value',
      'count <n>           Exactly N elements match selector'
    ],
    'Options': [
      '--selector <sel>    Element selector (required)',
      '--port <n>          Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/check.js exists --selector "#login-form"',
      'node scripts/check.js visible --selector ".modal"',
      'node scripts/check.js hidden --selector ".loading-spinner"',
      'node scripts/check.js enabled --selector "button[type=submit]"',
      'node scripts/check.js checked --selector "#agree-terms"',
      'node scripts/check.js text --selector "h1" "Welcome"',
      'node scripts/check.js value --selector "#email" "test@example.com"',
      'node scripts/check.js count --selector ".list-item" 5'
    ],
    'Notes': [
      'Returns { passed: true/false, details: "..." }',
      'Use for validating workflow steps before proceeding.'
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

  if (!flags.selector) {
    outputError('--selector is required');
    return;
  }

  const params = {
    assertion: command,
    selector: flags.selector
  };

  // Some assertions need an expected value
  if (['text', 'value', 'count'].includes(command)) {
    if (!args[0]) {
      outputError(`${command} requires an expected value`);
      return;
    }
    params.expected = command === 'count' ? parseInt(args[0], 10) : args[0];
  }

  try {
    const result = await sendCommand('check', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
