#!/usr/bin/env node

/**
 * WordPress Media Script
 * Upload, list, get, update, and delete media files.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, uploadMedia, listAll, showHelp, handleError, formatDate } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Media', {
    'Usage': 'node scripts/media.js <command> [options]',
    'Commands': [
      'list                List media items',
      'get <id>            Get media item by ID',
      'upload <file>       Upload a media file',
      'update <id>         Update media metadata',
      'delete <id>         Delete media item',
      'help                Show this help'
    ],
    'List Options': [
      '--per-page <n>      Results per page (default: 10, max: 100)',
      '--page <n>          Page number',
      '--search <term>     Search by filename or title',
      '--media-type <type> Filter by type (image, video, audio, application)',
      '--mime-type <mime>  Filter by MIME type (e.g., image/jpeg)',
      '--all               Get all media items (paginated)'
    ],
    'Upload Options': [
      '--title <title>     Media title',
      '--alt <text>        Alt text (for images)',
      '--caption <text>    Caption',
      '--description <text> Description'
    ],
    'Update Options': [
      '--title <title>     Media title',
      '--alt <text>        Alt text (for images)',
      '--caption <text>    Caption',
      '--description <text> Description'
    ],
    'Delete Options': [
      '--force             Permanently delete (required for media)'
    ],
    'Examples': [
      'node scripts/media.js list --media-type image',
      'node scripts/media.js upload ./photo.jpg --title "Featured Image" --alt "Company logo"',
      'node scripts/media.js get 123',
      'node scripts/media.js delete 123 --force'
    ]
  });
}

function formatMedia(item, detailed = false) {
  const lines = [
    `ID: ${item.id}`,
    `Title: ${item.title?.rendered || 'Untitled'}`,
    `Type: ${item.media_type}`,
    `MIME: ${item.mime_type}`,
    `Date: ${formatDate(item.date)}`
  ];
  
  if (item.source_url) {
    lines.push(`URL: ${item.source_url}`);
  }
  
  if (detailed) {
    if (item.alt_text) {
      lines.push(`Alt Text: ${item.alt_text}`);
    }
    if (item.caption?.rendered) {
      lines.push(`Caption: ${item.caption.rendered.replace(/<[^>]*>/g, '')}`);
    }
    if (item.media_details) {
      if (item.media_details.width && item.media_details.height) {
        lines.push(`Dimensions: ${item.media_details.width}x${item.media_details.height}`);
      }
      if (item.media_details.filesize) {
        const sizeMB = (item.media_details.filesize / 1024 / 1024).toFixed(2);
        lines.push(`Size: ${sizeMB} MB`);
      }
    }
    if (item.post) {
      lines.push(`Attached to Post: ${item.post}`);
    }
  }
  
  return lines.join('\n');
}

async function list() {
  const params = {};
  
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.page) params.page = parseInt(args.page);
  if (args.search) params.search = args.search;
  if (args['media-type']) params.media_type = args['media-type'];
  if (args['mime-type']) params.mime_type = args['mime-type'];
  
  if (!params.per_page && !args.all) {
    params.per_page = 10;
  }
  
  const items = await listAll('/media', { all: args.all, params });
  
  if (items.length === 0) {
    console.log('No media items found.');
    return;
  }
  
  console.log(`Found ${items.length} media item(s):\n`);
  for (const item of items) {
    console.log(formatMedia(item));
    console.log('');
  }
}

async function get(id) {
  const item = await apiRequest(`/media/${id}`);
  
  console.log(formatMedia(item, true));
  
  if (item.media_details?.sizes) {
    console.log('\nAvailable Sizes:');
    for (const [name, size] of Object.entries(item.media_details.sizes)) {
      console.log(`  ${name}: ${size.width}x${size.height} - ${size.source_url}`);
    }
  }
}

async function upload(filePath) {
  console.log(`Uploading: ${filePath}\n`);
  
  const options = {};
  if (args.title) options.title = args.title;
  if (args.alt) options.altText = args.alt;
  if (args.caption) options.caption = args.caption;
  if (args.description) options.description = args.description;
  
  const item = await uploadMedia(filePath, options);
  
  console.log('Upload successful:\n');
  console.log(formatMedia(item, true));
}

async function update(id) {
  const body = {};
  
  if (args.title) body.title = args.title;
  if (args.alt) body.alt_text = args.alt;
  if (args.caption) body.caption = args.caption;
  if (args.description) body.description = args.description;
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const item = await apiRequest(`/media/${id}`, { method: 'POST', body });
  
  console.log('Media updated:\n');
  console.log(formatMedia(item, true));
}

async function deleteMedia(id, force = false) {
  if (!force) {
    console.error('Error: Media deletion requires --force flag (no trash for media)');
    process.exit(1);
  }
  
  await apiRequest(`/media/${id}`, { method: 'DELETE', params: { force: true } });
  console.log(`Media ${id} permanently deleted.`);
}

async function main() {
  initScript(__dirname, args);
  
  const command = args._[0] || 'help';
  const idOrPath = args._[1];
  
  try {
    switch (command) {
      case 'list':
        await list();
        break;
      case 'get':
        if (!idOrPath) throw new Error('Media ID required. Usage: get <id>');
        await get(idOrPath);
        break;
      case 'upload':
        if (!idOrPath) throw new Error('File path required. Usage: upload <file>');
        await upload(idOrPath);
        break;
      case 'update':
        if (!idOrPath) throw new Error('Media ID required. Usage: update <id>');
        await update(idOrPath);
        break;
      case 'delete':
        if (!idOrPath) throw new Error('Media ID required. Usage: delete <id>');
        await deleteMedia(idOrPath, args.force);
        break;
      case 'help':
      default:
        displayHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
