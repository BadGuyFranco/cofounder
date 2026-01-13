#!/usr/bin/env node

/**
 * ClickUp Attachments Script
 * Upload and manage attachments on tasks.
 *
 * Usage:
 *   node attachments.js upload <task-id> --file <path>
 *   node attachments.js help
 *
 * Note: ClickUp API has limited attachment support.
 * Attachments are typically managed through the web interface.
 */

import { parseArgs, apiRequest, loadConfig } from './utils.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload an attachment to a task
 */
async function uploadAttachment(taskId, filePath, verbose) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const config = loadConfig();
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  // Create form data boundary
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  
  // Build multipart form data manually
  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="attachment"; filename="${fileName}"\r\n`;
  body += 'Content-Type: application/octet-stream\r\n\r\n';
  
  // Combine text parts with file buffer
  const textEncoder = new TextEncoder();
  const prefix = textEncoder.encode(body);
  const suffix = textEncoder.encode(`\r\n--${boundary}--\r\n`);
  
  const fullBody = new Uint8Array(prefix.length + fileBuffer.length + suffix.length);
  fullBody.set(prefix, 0);
  fullBody.set(fileBuffer, prefix.length);
  fullBody.set(suffix, prefix.length + fileBuffer.length);

  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/attachment`, {
    method: 'POST',
    headers: {
      'Authorization': config.apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: fullBody
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText} Status: ${response.status}`);
  }

  const data = await response.json();

  console.log('Uploaded attachment:');
  console.log(`  File: ${fileName}`);
  console.log(`  Task: ${taskId}`);
  
  if (data.id) {
    console.log(`  Attachment ID: ${data.id}`);
  }
  if (data.url) {
    console.log(`  URL: ${data.url}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Attachments Script');
  console.log('');
  console.log('Commands:');
  console.log('  upload <task-id> --file <path>         Upload file to task');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --file <path>            Path to file to upload');
  console.log('');
  console.log('Examples:');
  console.log('  # Upload a file');
  console.log('  node attachments.js upload abc123 --file ./document.pdf');
  console.log('');
  console.log('  # Upload an image');
  console.log('  node attachments.js upload abc123 --file ~/Desktop/screenshot.png');
  console.log('');
  console.log('Supported File Types:');
  console.log('  - Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT');
  console.log('  - Images: PNG, JPG, JPEG, GIF, SVG');
  console.log('  - Archives: ZIP, RAR');
  console.log('  - Other: Most common file types');
  console.log('');
  console.log('Limitations:');
  console.log('  - Maximum file size depends on your ClickUp plan');
  console.log('  - Free: 100MB per file');
  console.log('  - Unlimited: 5GB per file');
  console.log('');
  console.log('Note: To view attachments, use "node tasks.js get <task-id>" with');
  console.log('      --verbose to see the attachments array in the task object.');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'upload': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node attachments.js upload <task-id> --file <path>');
          process.exit(1);
        }
        if (!args.file) {
          console.error('Error: --file is required');
          console.error('Usage: node attachments.js upload <task-id> --file <path>');
          process.exit(1);
        }
        await uploadAttachment(taskId, args.file, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
