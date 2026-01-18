#!/usr/bin/env node

/**
 * Browser Control - Download
 * 
 * Download files from the browser. Two modes:
 * 1. URL mode: Fetch a URL directly using browser's auth cookies
 * 2. Click mode: Click an element that triggers a download
 * 
 * Usage:
 *   node scripts/download.js --url <url> --output <file>
 *   node scripts/download.js --selector <sel> --dir <dir>
 *   node scripts/download.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Download', {
    'Usage': [
      'node scripts/download.js --url <url> --output <file>     # Direct URL download',
      'node scripts/download.js --selector <sel> --dir <dir>    # Click-triggered download'
    ],
    'Options': [
      '--url <url>        URL to download directly (uses browser auth cookies)',
      '--output <file>    File path to save (for URL mode)',
      '--selector <sel>   CSS selector of download link/button to click',
      '--dir <dir>        Directory to save downloaded file (for click mode)',
      '--timeout <ms>     Download timeout in milliseconds (default: 30000)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      '# Download an image URL (authenticated)',
      'node scripts/download.js --url "https://example.com/photo.jpg" --output ~/photo.jpg',
      '',
      '# Click a download button',
      'node scripts/download.js --selector "a.download-btn" --dir ~/Downloads',
      'node scripts/download.js --selector "#export-csv" --dir ./exports'
    ],
    'Notes': [
      'URL mode fetches with browser cookies, bypassing auth restrictions.',
      'Click mode waits for browser download event after clicking.',
      'URL mode saves to exact path; click mode uses original filename.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  const hasUrlMode = flags.url && flags.output;
  const hasClickMode = flags.selector && flags.dir;
  const hasRequired = hasUrlMode || hasClickMode;

  if ((command === 'help' && !hasRequired) || !hasRequired) {
    printHelp();
    if (command !== 'help') process.exit(1);
    return;
  }

  const port = getPort(flags);
  const params = {
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 30000
  };

  // URL mode
  if (hasUrlMode) {
    params.url = flags.url;
    params.outputFile = flags.output;
  }

  // Click mode
  if (hasClickMode) {
    params.selector = flags.selector;
    params.outputDir = flags.dir;
  }

  try {
    const result = await sendCommand('download', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
