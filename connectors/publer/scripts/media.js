#!/usr/bin/env node

/**
 * Publer Media Script
 * Upload and manage media assets (images, videos, GIFs, documents).
 *
 * API Reference: https://publer.com/docs
 * 
 * Usage:
 *   node media.js list
 *   node media.js get <id>
 *   node media.js upload <filepath>
 *   node media.js upload-url <url>
 *   node media.js delete <id>
 *   node media.js help
 */

import { parseArgs, apiRequest, formatMedia, formatFileSize } from './utils.js';
import fs from 'fs';
import path from 'path';

/**
 * List media assets
 */
async function listMedia(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.limit) {
    params.append('limit', flags.limit);
  }
  if (flags.page) {
    params.append('page', flags.page);
  }
  if (flags.type) {
    params.append('type', flags.type);
  }
  if (flags.folder) {
    params.append('folder_id', flags.folder);
  }
  if (flags.search) {
    params.append('search', flags.search);
  }
  
  const queryString = params.toString();
  const endpoint = `/media${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  const media = Array.isArray(data) ? data : (data.media || data.data || []);
  
  console.log(`Found ${media.length} media asset(s):\n`);
  
  for (const item of media) {
    console.log(formatMedia(item));
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return media;
}

/**
 * Get a specific media asset
 */
async function getMedia(mediaId, verbose) {
  const data = await apiRequest(`/media/${mediaId}`);
  
  console.log(formatMedia(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Upload media from file path
 */
async function uploadMedia(filePath, flags, verbose) {
  // Resolve path
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  const fileName = path.basename(resolvedPath);
  const fileStats = fs.statSync(resolvedPath);
  const fileBuffer = fs.readFileSync(resolvedPath);
  
  // Determine content type from extension
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentTypes = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    // Videos
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  
  console.log(`Uploading: ${fileName} (${formatFileSize(fileStats.size)})`);
  
  // Create form data for upload
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: fileName,
    contentType: contentType
  });
  
  if (flags.name) {
    form.append('name', flags.name);
  }
  if (flags.folder) {
    form.append('folder_id', flags.folder);
  }
  if (flags.description) {
    form.append('description', flags.description);
  }
  
  const data = await apiRequest('/media', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });
  
  console.log('\nMedia uploaded successfully!\n');
  console.log(formatMedia(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Upload media from URL
 */
async function uploadFromUrl(url, flags, verbose) {
  console.log(`Uploading from URL: ${url}`);
  
  const uploadData = {
    url: url
  };
  
  if (flags.name) {
    uploadData.name = flags.name;
  }
  if (flags.folder) {
    uploadData.folder_id = flags.folder;
  }
  if (flags.description) {
    uploadData.description = flags.description;
  }
  
  // Try multiple possible endpoints
  let data;
  try {
    data = await apiRequest('/media/url', {
      method: 'POST',
      body: uploadData
    });
  } catch (e) {
    // Fallback
    data = await apiRequest('/media', {
      method: 'POST',
      body: uploadData
    });
  }
  
  console.log('\nMedia uploaded successfully!\n');
  console.log(formatMedia(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Delete a media asset
 */
async function deleteMedia(mediaId, verbose) {
  await apiRequest(`/media/${mediaId}`, {
    method: 'DELETE'
  });
  
  console.log(`Media ${mediaId} deleted successfully.`);
}

/**
 * List media folders
 */
async function listFolders(verbose) {
  let data;
  try {
    data = await apiRequest('/media/folders');
  } catch (e) {
    data = await apiRequest('/folders');
  }
  
  const folders = Array.isArray(data) ? data : (data.folders || data.data || []);
  
  console.log(`Found ${folders.length} folder(s):\n`);
  
  for (const folder of folders) {
    console.log(`${folder.name || 'Unnamed'}`);
    console.log(`  ID: ${folder.id || folder._id}`);
    if (folder.media_count !== undefined) {
      console.log(`  Items: ${folder.media_count}`);
    }
    if (folder.created_at) {
      console.log(`  Created: ${new Date(folder.created_at).toLocaleDateString()}`);
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return folders;
}

/**
 * Create a folder
 */
async function createFolder(name, verbose) {
  let data;
  try {
    data = await apiRequest('/media/folders', {
      method: 'POST',
      body: { name }
    });
  } catch (e) {
    data = await apiRequest('/folders', {
      method: 'POST',
      body: { name }
    });
  }
  
  console.log('Folder created successfully!\n');
  console.log(`Name: ${data.name}`);
  console.log(`ID: ${data.id || data._id}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Move media to folder
 */
async function moveToFolder(mediaId, folderId, verbose) {
  const data = await apiRequest(`/media/${mediaId}`, {
    method: 'PUT',
    body: { folder_id: folderId }
  });
  
  console.log(`Media ${mediaId} moved to folder ${folderId}`);
  
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
  console.log('Publer Media Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                     List media assets');
  console.log('  get <id>                 Get media by ID');
  console.log('  upload <filepath>        Upload media from local file');
  console.log('  upload-url <url>         Upload media from URL');
  console.log('  delete <id>              Delete media asset');
  console.log('  folders                  List media folders');
  console.log('  create-folder <name>     Create a new folder');
  console.log('  move <id> <folder-id>    Move media to folder');
  console.log('  help                     Show this help');
  console.log('');
  console.log('List Options:');
  console.log('  --type <type>            Filter by type (image, video, gif, document)');
  console.log('  --folder <id>            Filter by folder ID');
  console.log('  --search <query>         Search by name');
  console.log('  --limit <n>              Number of items to return');
  console.log('  --page <n>               Page number for pagination');
  console.log('');
  console.log('Upload Options:');
  console.log('  --name <name>            Custom name for the media');
  console.log('  --folder <id>            Folder ID to upload to');
  console.log('  --description <desc>     Description for the media');
  console.log('');
  console.log('General Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Supported File Types:');
  console.log('  Images: jpg, jpeg, png, gif, webp, svg, bmp');
  console.log('  Videos: mp4, mov, avi, webm, mkv, m4v');
  console.log('  Documents: pdf, doc, docx');
  console.log('');
  console.log('Examples:');
  console.log('  # List all media');
  console.log('  node media.js list');
  console.log('');
  console.log('  # List images only');
  console.log('  node media.js list --type image');
  console.log('');
  console.log('  # Search media');
  console.log('  node media.js list --search "logo"');
  console.log('');
  console.log('  # Upload an image');
  console.log('  node media.js upload /path/to/image.jpg');
  console.log('');
  console.log('  # Upload with custom name to folder');
  console.log('  node media.js upload /path/to/image.jpg --name "Company Logo" --folder folder123');
  console.log('');
  console.log('  # Upload from URL');
  console.log('  node media.js upload-url "https://example.com/image.jpg"');
  console.log('');
  console.log('  # Create a folder');
  console.log('  node media.js create-folder "Marketing Assets"');
  console.log('');
  console.log('  # Move media to folder');
  console.log('  node media.js move media123 folder456');
  console.log('');
  console.log('  # Delete media');
  console.log('  node media.js delete media123');
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
      case 'list':
        await listMedia(args, verbose);
        break;

      case 'get': {
        const mediaId = args._[1];
        if (!mediaId) {
          console.error('Error: Media ID is required');
          console.error('Usage: node media.js get <id>');
          process.exit(1);
        }
        await getMedia(mediaId, verbose);
        break;
      }

      case 'upload': {
        const filePath = args._[1];
        if (!filePath) {
          console.error('Error: File path is required');
          console.error('Usage: node media.js upload <filepath>');
          process.exit(1);
        }
        await uploadMedia(filePath, args, verbose);
        break;
      }

      case 'upload-url': {
        const url = args._[1];
        if (!url) {
          console.error('Error: URL is required');
          console.error('Usage: node media.js upload-url <url>');
          process.exit(1);
        }
        await uploadFromUrl(url, args, verbose);
        break;
      }

      case 'delete': {
        const mediaId = args._[1];
        if (!mediaId) {
          console.error('Error: Media ID is required');
          console.error('Usage: node media.js delete <id>');
          process.exit(1);
        }
        await deleteMedia(mediaId, verbose);
        break;
      }

      case 'folders':
        await listFolders(verbose);
        break;

      case 'create-folder': {
        const name = args._[1];
        if (!name) {
          console.error('Error: Folder name is required');
          console.error('Usage: node media.js create-folder <name>');
          process.exit(1);
        }
        await createFolder(name, verbose);
        break;
      }

      case 'move': {
        const mediaId = args._[1];
        const folderId = args._[2];
        if (!mediaId || !folderId) {
          console.error('Error: Media ID and folder ID are required');
          console.error('Usage: node media.js move <media-id> <folder-id>');
          process.exit(1);
        }
        await moveToFolder(mediaId, folderId, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
