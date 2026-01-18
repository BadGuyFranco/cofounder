#!/usr/bin/env node

/**
 * Browser Control - Select Dropdown
 * 
 * Interact with native <select> dropdown elements.
 * 
 * Usage:
 *   node scripts/select.js --selector "#country" --value "US"
 *   node scripts/select.js --selector "#country" --label "United States"
 *   node scripts/select.js --selector "#country" list
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Select Dropdown', {
    'Usage': [
      'node scripts/select.js --selector <sel> [options]'
    ],
    'Options': [
      '--selector <sel>   The <select> element selector (required)',
      '--value <val>      Select option by value attribute',
      '--label <text>     Select option by visible text',
      '--index <n>        Select option by index (0-based)',
      'list               List all available options',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/select.js --selector "#country" --value "US"',
      'node scripts/select.js --selector "#country" --label "United States"',
      'node scripts/select.js --selector "#country" --index 5',
      'node scripts/select.js --selector "#country" list'
    ],
    'Notes': [
      'This is for native HTML <select> elements only.',
      'For custom dropdown components, use click.js instead.',
      'The "list" command shows all options with their values and labels.'
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

  const params = { selector: flags.selector };

  // Check if listing options
  if (command === 'list' || args.includes('list')) {
    params.action = 'list';
  } else if (flags.value) {
    params.action = 'select';
    params.by = 'value';
    params.option = flags.value;
  } else if (flags.label) {
    params.action = 'select';
    params.by = 'label';
    params.option = flags.label;
  } else if (flags.index !== undefined) {
    params.action = 'select';
    params.by = 'index';
    params.option = parseInt(flags.index, 10);
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('select', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
