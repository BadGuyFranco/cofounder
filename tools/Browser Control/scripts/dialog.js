#!/usr/bin/env node

/**
 * Browser Control - Dialog Handling
 * 
 * Configure automatic handling of JavaScript dialogs (alert, confirm, prompt).
 * 
 * Usage:
 *   node scripts/dialog.js auto-accept
 *   node scripts/dialog.js auto-dismiss
 *   node scripts/dialog.js off
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Dialog Handling', {
    'Usage': [
      'node scripts/dialog.js <command> [options]'
    ],
    'Commands': [
      'auto-accept         Auto-accept all dialogs (OK/Yes)',
      'auto-dismiss        Auto-dismiss all dialogs (Cancel/No)',
      'auto-prompt <text>  Auto-fill prompt dialogs with text',
      'off                 Disable auto-handling (dialogs will block)',
      'status              Show current dialog handling mode'
    ],
    'Options': [
      '--port <n>          Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/dialog.js auto-accept',
      'node scripts/dialog.js auto-dismiss',
      'node scripts/dialog.js auto-prompt "my answer"',
      'node scripts/dialog.js off',
      'node scripts/dialog.js status'
    ],
    'Notes': [
      'Dialogs include alert(), confirm(), and prompt() popups.',
      'Auto-accept clicks OK/Yes on all dialogs.',
      'Auto-dismiss clicks Cancel/No on all dialogs.',
      'Auto-prompt accepts and fills prompt() with specified text.',
      'When off, dialogs will block until manually handled.'
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
  const params = {};

  if (command === 'auto-accept') {
    params.mode = 'accept';
  } else if (command === 'auto-dismiss') {
    params.mode = 'dismiss';
  } else if (command === 'auto-prompt') {
    params.mode = 'prompt';
    params.text = args[0] || '';
  } else if (command === 'off') {
    params.mode = 'off';
  } else if (command === 'status') {
    params.mode = 'status';
  } else {
    printHelp();
    return;
  }

  try {
    const result = await sendCommand('dialog', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
