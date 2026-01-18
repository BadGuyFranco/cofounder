#!/usr/bin/env node

/**
 * Browser Control - Snapshot
 * 
 * Get page content as accessibility tree, HTML, or text.
 * 
 * Usage:
 *   node scripts/snapshot.js
 *   node scripts/snapshot.js --html
 *   node scripts/snapshot.js --text
 *   node scripts/snapshot.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Snapshot', {
    'Usage': [
      'node scripts/snapshot.js [options]'
    ],
    'Formats': [
      '(default)       Accessibility tree (structured, best for AI)',
      '--html          Full HTML content',
      '--text          Visible text only'
    ],
    'Options': [
      '--selector <sel>  Limit to specific element',
      '--port <n>        Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/snapshot.js',
      'node scripts/snapshot.js --html',
      'node scripts/snapshot.js --text',
      'node scripts/snapshot.js --selector ".main-content"',
      'node scripts/snapshot.js --text --selector "article"'
    ],
    'Notes': [
      'Accessibility tree is the recommended format for AI processing.',
      'It provides structured data about interactive elements.',
      'Use --text for simple content extraction.',
      'Use --html when you need the full DOM structure.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  // Show help only if explicitly requested
  if (command === 'help' && process.argv.length > 2) {
    printHelp();
    return;
  }

  const port = getPort(flags);
  
  // Determine format
  let format = 'accessibility';
  if (flags.html) format = 'html';
  if (flags.text) format = 'text';

  const params = {
    format,
    selector: flags.selector
  };

  try {
    const result = await sendCommand('snapshot', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
