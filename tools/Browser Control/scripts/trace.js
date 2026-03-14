#!/usr/bin/env node

/**
 * Browser Control - Trace
 *
 * Record a Playwright trace for debugging failed automations.
 * Traces capture screenshots, DOM snapshots, and action history.
 *
 * Usage:
 *   node scripts/trace.js start
 *   node scripts/trace.js stop [--output <path>]
 *   node scripts/trace.js status
 *   node scripts/trace.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Trace', {
    'Usage': [
      'node scripts/trace.js <command> [options]'
    ],
    'Commands': [
      'start       Start recording a trace',
      'stop        Stop recording and save trace file',
      'status      Check if tracing is active',
      'help        Show this help'
    ],
    'Options': [
      '--output <path>  Save trace to specific path (default: trace-<timestamp>.zip)',
      '--port <n>       Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/trace.js start',
      'node scripts/trace.js stop --output ~/my-trace.zip',
      'node scripts/trace.js status'
    ],
    'Viewing': [
      'npx playwright show-trace <file.zip>'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help' || (!['start', 'stop', 'status'].includes(command))) {
    printHelp();
    if (command !== 'help') process.exit(1);
    return;
  }

  const port = getPort(flags);
  const params = {
    action: command,
    output: flags.output
  };

  try {
    const result = await sendCommand('trace', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
