#!/usr/bin/env node
/**
 * Figma Files Script
 * Get file content, nodes, and metadata. Download files as JSON.
 */

import { parseArgs, apiRequest, parseFigmaUrl, output, outputError } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Figma Files - Read file content and metadata

Usage: node scripts/files.js <command> <file_key_or_url> [options]

Commands:
  get <file>              Get full file JSON (document structure)
  get-nodes <file>        Get specific nodes from file
  metadata <file>         Get file metadata (name, last modified, etc.)
  download <file>         Download file JSON to local file
  help                    Show this help

Options:
  --ids <node_ids>        Comma-separated node IDs (for get-nodes)
  --depth <n>             How deep into document tree (1=pages only)
  --version <id>          Specific version ID to get
  --geometry              Include vector path data
  --branch-data           Include branch metadata
  --output <path>         Output file path (for download command)

File Key:
  You can use either a file key or a full Figma URL:
  - File key: ABC123xyz
  - URL: https://www.figma.com/file/ABC123xyz/My-Design

Examples:
  node scripts/files.js get ABC123xyz
  node scripts/files.js get "https://www.figma.com/file/ABC123xyz/Design"
  node scripts/files.js get-nodes ABC123xyz --ids "1:2,1:3"
  node scripts/files.js metadata ABC123xyz
  node scripts/files.js download ABC123xyz --output ./design.json
  node scripts/files.js get ABC123xyz --depth 2
`);
}

/**
 * Get full file JSON
 */
async function getFile(fileKey, flags) {
  const params = new URLSearchParams();
  
  if (flags.ids) params.set('ids', flags.ids);
  if (flags.depth) params.set('depth', flags.depth);
  if (flags.version) params.set('version', flags.version);
  if (flags.geometry) params.set('geometry', 'paths');
  if (flags['branch-data']) params.set('branch_data', 'true');
  
  const queryString = params.toString();
  const endpoint = `/v1/files/${fileKey}${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  output(data);
}

/**
 * Get specific nodes from file
 */
async function getNodes(fileKey, flags) {
  if (!flags.ids) {
    throw new Error('--ids required. Usage: get-nodes <file> --ids "1:2,1:3"');
  }
  
  const params = new URLSearchParams();
  params.set('ids', flags.ids);
  
  if (flags.depth) params.set('depth', flags.depth);
  if (flags.version) params.set('version', flags.version);
  if (flags.geometry) params.set('geometry', 'paths');
  
  const endpoint = `/v1/files/${fileKey}/nodes?${params.toString()}`;
  
  const data = await apiRequest(endpoint);
  output(data);
}

/**
 * Get file metadata
 */
async function getMetadata(fileKey) {
  const endpoint = `/v1/files/${fileKey}/meta`;
  const data = await apiRequest(endpoint);
  output(data);
}

/**
 * Download file JSON to local file
 */
async function downloadFile(fileKey, flags) {
  const outputPath = flags.output || `./${fileKey}.json`;
  
  const params = new URLSearchParams();
  if (flags.depth) params.set('depth', flags.depth);
  if (flags.version) params.set('version', flags.version);
  if (flags.geometry) params.set('geometry', 'paths');
  if (flags['branch-data']) params.set('branch_data', 'true');
  
  const queryString = params.toString();
  const endpoint = `/v1/files/${fileKey}${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Downloaded to: ${outputPath}`);
  console.log(`File name: ${data.name}`);
  console.log(`Last modified: ${data.lastModified}`);
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help' || !command) {
    showHelp();
    return;
  }

  // Parse file key from URL or direct key
  const fileKeyOrUrl = args[0];
  if (!fileKeyOrUrl && command !== 'help') {
    console.error('Error: File key or URL required.');
    showHelp();
    process.exit(1);
  }

  const { fileKey } = parseFigmaUrl(fileKeyOrUrl);
  if (!fileKey) {
    console.error('Error: Could not parse file key from input.');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'get':
        await getFile(fileKey, flags);
        break;
      case 'get-nodes':
        await getNodes(fileKey, flags);
        break;
      case 'metadata':
        await getMetadata(fileKey);
        break;
      case 'download':
        await downloadFile(fileKey, flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
