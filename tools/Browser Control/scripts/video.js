#!/usr/bin/env node

/**
 * Browser Control - Video
 * 
 * Record browser session as video.
 * 
 * Usage:
 *   node scripts/video.js start --output <dir>
 *   node scripts/video.js stop
 *   node scripts/video.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Video Recording', {
    'Usage': [
      'node scripts/video.js start --output <dir>',
      'node scripts/video.js stop'
    ],
    'Commands': [
      'start             Start recording (requires --output)',
      'stop              Stop recording and save video',
      'help              Show this help'
    ],
    'Options': [
      '--output <dir>    Directory to save video file',
      '--port <n>        Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/video.js start --output ~/Videos',
      'node scripts/video.js stop'
    ],
    'Notes': [
      'Video is saved as WebM format.',
      'Recording continues until stop is called.',
      'Useful for debugging or reviewing automation runs.',
      'Note: Requires restarting the browser session to enable recording.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  if (command === 'help') {
    printHelp();
    return;
  }

  const validCommands = ['start', 'stop'];
  if (!validCommands.includes(command)) {
    printHelp();
    process.exit(1);
  }

  if (command === 'start' && !flags.output) {
    console.error('Error: --output directory required for recording.');
    process.exit(1);
  }

  const port = getPort(flags);
  const params = {
    action: command,
    outputDir: flags.output
  };

  try {
    const result = await sendCommand('video', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
