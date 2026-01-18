#!/usr/bin/env node

/**
 * Browser Control - Upload
 * 
 * Upload files to file input elements.
 * 
 * Usage:
 *   node scripts/upload.js --selector <sel> --file <path>
 *   node scripts/upload.js --selector <sel> --files <path1,path2,...>
 *   node scripts/upload.js help
 */

import { parseArgs, sendCommand, getPort, output, outputError, showHelp } from './utils.js';

function printHelp() {
  showHelp('Browser Control - Upload', {
    'Usage': [
      'node scripts/upload.js --selector <sel> --file <path>',
      'node scripts/upload.js --selector <sel> --files <path1,path2,...>'
    ],
    'Options': [
      '--selector <sel>   CSS selector of file input element',
      '--file <path>      Single file to upload',
      '--files <paths>    Comma-separated list of files to upload',
      '--timeout <ms>     Timeout in milliseconds (default: 5000)',
      '--port <n>         Server port (default: 9222)'
    ],
    'Examples': [
      'node scripts/upload.js --selector "input[type=file]" --file ~/photo.jpg',
      'node scripts/upload.js --selector "#file-input" --file ./document.pdf',
      'node scripts/upload.js --selector ".upload" --files ./a.jpg,./b.jpg,./c.jpg'
    ],
    'Notes': [
      'Selector must point to an <input type="file"> element.',
      'For multiple files, element must have "multiple" attribute.',
      'File paths can be relative or absolute.'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();

  const hasRequired = flags.selector && (flags.file || flags.files);

  if ((command === 'help' && !hasRequired) || !hasRequired) {
    printHelp();
    if (command !== 'help') process.exit(1);
    return;
  }

  const port = getPort(flags);
  
  // Parse files
  let files = [];
  if (flags.file) {
    files = [flags.file];
  } else if (flags.files) {
    files = flags.files.split(',').map(f => f.trim());
  }

  const params = {
    selector: flags.selector,
    files: files,
    timeout: flags.timeout ? parseInt(flags.timeout, 10) : 5000
  };

  try {
    const result = await sendCommand('upload', params, port);
    output({ success: true, ...result });
  } catch (error) {
    outputError(error);
  }
}

main();
