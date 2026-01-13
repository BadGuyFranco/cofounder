#!/usr/bin/env node
/**
 * Cloudflare Images Script
 * Manage image hosting and optimization.
 * 
 * Note: Requires Account-level API token with Cloudflare Images permission.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError, loadConfig } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Images Script - Manage Cloudflare Images

Usage: node scripts/images.js <command> [options]

Commands:
  list                            List all images
  upload <file>                   Upload an image
  delete <image-id>               Delete an image
  info <image-id>                 Get image details
  variants                        List image variants
  create-variant <name>           Create a variant
  delete-variant <name>           Delete a variant
  stats                           Get usage statistics
  help                            Show this help

Upload Options:
  --id <custom-id>          Custom image ID (optional)
  --metadata <json>         JSON metadata (optional)
  --require-signed-urls     Require signed URLs

Create Variant Options:
  --fit <fit>               Fit mode: scale-down, contain, cover, crop, pad
  --width <n>               Width in pixels
  --height <n>              Height in pixels
  --quality <n>             Quality (1-100, default: 85)

Examples:
  node scripts/images.js list
  node scripts/images.js upload ./photo.jpg
  node scripts/images.js upload ./photo.jpg --id my-photo --metadata '{"alt":"My Photo"}'
  node scripts/images.js info abc123
  node scripts/images.js variants
  node scripts/images.js create-variant thumbnail --width 200 --height 200 --fit cover
  node scripts/images.js delete-variant thumbnail
  node scripts/images.js stats
  node scripts/images.js delete abc123

Note: Requires Account-level token with Cloudflare Images Edit permission.
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listImages() {
  const accountId = await getAccountId();
  const images = await fetchAllPages(`/accounts/${accountId}/images/v1`);
  
  const simplified = images.map(img => ({
    id: img.id,
    filename: img.filename,
    uploaded: img.uploaded,
    variants: img.variants,
    requireSignedURLs: img.requireSignedURLs
  }));
  
  output(simplified);
}

async function uploadImage(filePath, flags) {
  if (!filePath) {
    throw new Error('File path required');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const accountId = await getAccountId();
  const config = loadConfig();
  
  // Use FormData for multipart upload
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  formData.append('file', new Blob([fileBuffer]), fileName);
  
  if (flags.id) {
    formData.append('id', flags.id);
  }
  if (flags.metadata) {
    formData.append('metadata', flags.metadata);
  }
  if (flags['require-signed-urls']) {
    formData.append('requireSignedURLs', 'true');
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.CLOUDFLARE_API_TOKEN}`
    },
    body: formData
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Upload failed');
  }

  console.log(`Uploaded image: ${fileName}`);
  output(data.result);
}

async function deleteImage(imageId) {
  if (!imageId) {
    throw new Error('Image ID required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/images/v1/${imageId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted image: ${imageId}`);
}

async function getImageInfo(imageId) {
  if (!imageId) {
    throw new Error('Image ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/images/v1/${imageId}`);
  output(data.result);
}

async function listVariants() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/images/v1/variants`);
  output(data.result.variants);
}

async function createVariant(name, flags) {
  if (!name) {
    throw new Error('Variant name required');
  }

  const accountId = await getAccountId();
  
  const options = {
    fit: flags.fit || 'scale-down',
    metadata: 'none'
  };

  if (flags.width) options.width = parseInt(flags.width);
  if (flags.height) options.height = parseInt(flags.height);
  if (flags.quality) options.quality = parseInt(flags.quality);

  const data = await apiRequest(`/accounts/${accountId}/images/v1/variants`, {
    method: 'POST',
    body: {
      id: name,
      options
    }
  });

  console.log(`Created variant: ${name}`);
  output(data.result);
}

async function deleteVariant(name) {
  if (!name) {
    throw new Error('Variant name required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/images/v1/variants/${name}`, {
    method: 'DELETE'
  });

  console.log(`Deleted variant: ${name}`);
}

async function getStats() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/images/v1/stats`);
  output(data.result);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'list':
        await listImages();
        break;

      case 'upload':
        await uploadImage(args._[1], args);
        break;

      case 'delete':
        await deleteImage(args._[1]);
        break;

      case 'info':
        await getImageInfo(args._[1]);
        break;

      case 'variants':
        await listVariants();
        break;

      case 'create-variant':
        await createVariant(args._[1], args);
        break;

      case 'delete-variant':
        await deleteVariant(args._[1]);
        break;

      case 'stats':
        await getStats();
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
