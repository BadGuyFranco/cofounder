#!/usr/bin/env node
/**
 * Figma Images Script
 * Export nodes as images (PNG, JPG, SVG, PDF) and download them.
 */

import { parseArgs, apiRequest, parseFigmaUrl, downloadFile, output, outputError } from './utils.js';
import path from 'path';

function showHelp() {
  console.log(`
Figma Images - Export and download images from Figma files

Usage: node scripts/images.js <command> <file_key_or_url> [options]

Commands:
  export <file>           Get export URLs for nodes
  download <file>         Export and save images locally
  fills <file>            Get image fill URLs from file
  help                    Show this help

Options:
  --ids <node_ids>        Comma-separated node IDs to export (required for export/download)
  --format <fmt>          Output format: png, jpg, svg, pdf (default: png)
  --scale <n>             Scale factor 0.01-4 (default: 1)
  --output <path>         Output file/directory path
  --version <id>          Specific file version ID

SVG Options:
  --svg-outline-text      Render text as paths (default: true)
  --svg-include-id        Include layer names as IDs
  --svg-include-node-id   Include node IDs as data attributes
  --svg-simplify-stroke   Simplify strokes (default: true)

Other Options:
  --contents-only         Exclude overlapping content (default: true)
  --use-absolute-bounds   Use full node dimensions (good for text)

Finding Node IDs:
  1. From Figma URL: ?node-id=1:23 means node ID is "1:23"
  2. From file JSON: node scripts/files.js get <file> --depth 2

Examples:
  # Get export URLs
  node scripts/images.js export ABC123 --ids "1:2,1:3" --format png

  # Download single node as PNG
  node scripts/images.js download ABC123 --ids "1:2" --output ./frame.png

  # Download multiple nodes (saves to directory)
  node scripts/images.js download ABC123 --ids "1:2,1:3" --output ./exports/

  # Export as PDF
  node scripts/images.js download ABC123 --ids "1:2" --format pdf --output ./design.pdf

  # Export as SVG with IDs
  node scripts/images.js download ABC123 --ids "1:2" --format svg --svg-include-id

  # Get all image fills from file
  node scripts/images.js fills ABC123
`);
}

/**
 * Get export URLs for nodes
 */
async function exportImages(fileKey, flags) {
  if (!flags.ids) {
    throw new Error('--ids required. Usage: export <file> --ids "1:2,1:3"');
  }

  const params = new URLSearchParams();
  params.set('ids', flags.ids);
  
  if (flags.format) params.set('format', flags.format);
  if (flags.scale) params.set('scale', flags.scale);
  if (flags.version) params.set('version', flags.version);
  
  // SVG options
  if (flags['svg-outline-text'] === false) params.set('svg_outline_text', 'false');
  if (flags['svg-include-id']) params.set('svg_include_id', 'true');
  if (flags['svg-include-node-id']) params.set('svg_include_node_id', 'true');
  if (flags['svg-simplify-stroke'] === false) params.set('svg_simplify_stroke', 'false');
  
  // Other options
  if (flags['contents-only'] === false) params.set('contents_only', 'false');
  if (flags['use-absolute-bounds']) params.set('use_absolute_bounds', 'true');

  const endpoint = `/v1/images/${fileKey}?${params.toString()}`;
  const data = await apiRequest(endpoint);
  output(data);
}

/**
 * Download images to local files
 */
async function downloadImages(fileKey, flags) {
  if (!flags.ids) {
    throw new Error('--ids required. Usage: download <file> --ids "1:2,1:3"');
  }

  const format = flags.format || 'png';
  const nodeIds = flags.ids.split(',').map(id => id.trim());

  // First get the export URLs
  const params = new URLSearchParams();
  params.set('ids', flags.ids);
  params.set('format', format);
  
  if (flags.scale) params.set('scale', flags.scale);
  if (flags.version) params.set('version', flags.version);
  
  // SVG options
  if (flags['svg-outline-text'] === false) params.set('svg_outline_text', 'false');
  if (flags['svg-include-id']) params.set('svg_include_id', 'true');
  if (flags['svg-include-node-id']) params.set('svg_include_node_id', 'true');
  if (flags['svg-simplify-stroke'] === false) params.set('svg_simplify_stroke', 'false');
  
  // Other options
  if (flags['contents-only'] === false) params.set('contents_only', 'false');
  if (flags['use-absolute-bounds']) params.set('use_absolute_bounds', 'true');

  const endpoint = `/v1/images/${fileKey}?${params.toString()}`;
  const data = await apiRequest(endpoint);

  if (!data.images) {
    throw new Error('No images returned from API');
  }

  // Download each image
  const results = [];
  
  for (const nodeId of nodeIds) {
    const imageUrl = data.images[nodeId];
    
    if (!imageUrl) {
      console.error(`Warning: No image URL for node ${nodeId}`);
      results.push({ nodeId, error: 'No image URL returned' });
      continue;
    }

    // Determine output path
    let outputPath;
    if (flags.output) {
      if (nodeIds.length === 1) {
        // Single node: use output as filename
        outputPath = flags.output;
      } else {
        // Multiple nodes: use output as directory
        const safeNodeId = nodeId.replace(/:/g, '-');
        outputPath = path.join(flags.output, `${safeNodeId}.${format}`);
      }
    } else {
      const safeNodeId = nodeId.replace(/:/g, '-');
      outputPath = `./${fileKey}-${safeNodeId}.${format}`;
    }

    try {
      await downloadFile(imageUrl, outputPath);
      console.log(`Downloaded: ${outputPath}`);
      results.push({ nodeId, path: outputPath });
    } catch (error) {
      console.error(`Failed to download ${nodeId}: ${error.message}`);
      results.push({ nodeId, error: error.message });
    }
  }

  console.log(`\nDownloaded ${results.filter(r => r.path).length}/${nodeIds.length} images`);
}

/**
 * Get image fills from file
 */
async function getImageFills(fileKey) {
  const endpoint = `/v1/files/${fileKey}/images`;
  const data = await apiRequest(endpoint);
  output(data);
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

  const { fileKey, nodeId } = parseFigmaUrl(fileKeyOrUrl);
  if (!fileKey) {
    console.error('Error: Could not parse file key from input.');
    process.exit(1);
  }

  // If URL had node-id, use it as default for --ids
  if (nodeId && !flags.ids) {
    flags.ids = nodeId;
  }

  try {
    switch (command) {
      case 'export':
        await exportImages(fileKey, flags);
        break;
      case 'download':
        await downloadImages(fileKey, flags);
        break;
      case 'fills':
        await getImageFills(fileKey);
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
