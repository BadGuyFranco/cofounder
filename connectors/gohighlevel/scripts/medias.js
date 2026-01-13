#!/usr/bin/env node

/**
 * Go High Level Media Library Management
 * 
 * Commands:
 *   list                  List media files
 *   get <id>             Get file details
 *   upload               Upload a file
 *   delete <id>          Delete file (DESTRUCTIVE)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  apiRequestPaginated,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError,
  BASE_URL
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;
const force = args.force || false;

async function listMedia(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('altId', locationConfig.id);
    params.append('altType', 'location');
    
    if (args.limit) params.append('limit', args.limit);
    if (args.offset) params.append('offset', args.offset);
    if (args.type) params.append('type', args.type);
    if (args.sortBy) params.append('sortBy', args.sortBy);
    if (args.sortOrder) params.append('sortOrder', args.sortOrder);
    
    const endpoint = `/medias/files?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} files (${meta.pages} pages):\n`);
      displayFiles(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const files = data.files || data.medias || data.data || [];
      console.log(`Found ${files.length} files:\n`);
      displayFiles(files);
      
      if (data.meta?.total > files.length) {
        console.log(`\nShowing ${files.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayFiles(files) {
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }
  
  for (const file of files) {
    console.log(`- ${file.name || file.fileName || 'Unnamed'}`);
    console.log(`  ID: ${file._id || file.id}`);
    console.log(`  Type: ${file.type || file.contentType || 'unknown'}`);
    if (file.size) console.log(`  Size: ${formatFileSize(file.size)}`);
    if (file.url) console.log(`  URL: ${file.url}`);
    console.log(`  Uploaded: ${formatDate(file.createdAt || file.uploadedAt)}`);
    console.log('');
  }
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function getMedia(fileId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/medias/${fileId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('File Details:\n');
    const file = data.file || data.media || data;
    console.log(`Name: ${file.name || file.fileName || 'Unnamed'}`);
    console.log(`ID: ${file._id || file.id}`);
    console.log(`Type: ${file.type || file.contentType || 'unknown'}`);
    if (file.size) console.log(`Size: ${formatFileSize(file.size)}`);
    if (file.url) console.log(`URL: ${file.url}`);
    if (file.thumbnailUrl) console.log(`Thumbnail: ${file.thumbnailUrl}`);
    console.log(`Uploaded: ${formatDate(file.createdAt || file.uploadedAt)}`);
    
    if (file.folder) {
      console.log(`Folder: ${file.folder.name || file.folder}`);
    }
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function uploadMedia(locationConfig) {
  try {
    const filePath = args.file || args._[1];
    
    if (!filePath) {
      console.error('Error: --file path is required');
      process.exit(1);
    }
    
    // Resolve file path
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      process.exit(1);
    }
    
    const fileName = args.name || path.basename(resolvedPath);
    const fileStats = fs.statSync(resolvedPath);
    
    console.log(`Uploading: ${fileName}`);
    console.log(`Size: ${formatFileSize(fileStats.size)}`);
    console.log('');
    
    // Read file and convert to base64 for the API
    const fileContent = fs.readFileSync(resolvedPath);
    const base64Content = fileContent.toString('base64');
    
    // Determine content type
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Use the upload endpoint
    const body = {
      altId: locationConfig.id,
      altType: 'location',
      fileName,
      fileData: base64Content,
      contentType
    };
    
    if (args.folder) body.folderId = args.folder;
    
    // Note: GHL may use multipart/form-data for uploads
    // This is a simplified version; actual implementation may need adjustment
    const data = await apiRequest('POST', '/medias/upload-file', locationConfig.key, body);
    
    console.log('File uploaded successfully!\n');
    const file = data.file || data.media || data;
    console.log(`ID: ${file._id || file.id}`);
    console.log(`Name: ${file.name || fileName}`);
    if (file.url) console.log(`URL: ${file.url}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteMedia(fileId, locationConfig) {
  try {
    // Get file details first
    const fileData = await apiRequest(
      'GET',
      `/medias/${fileId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    const file = fileData.file || fileData.media || fileData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a media file',
      [
        `Name: ${file.name || file.fileName || 'Unnamed'}`,
        `Type: ${file.type || file.contentType}`,
        `Size: ${formatFileSize(file.size)}`,
        '',
        'WARNING: If this file is used in emails, pages, or',
        'other content, those references will break.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/medias/${fileId}?altId=${locationConfig.id}&altType=location`,
      locationConfig.key
    );
    
    console.log('File deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Media Library Management

Usage:
  node medias.js <command> [options]

Commands:
  list                   List media files
  get <id>              Get file details
  upload                Upload a file
  delete <id>           Delete file (DESTRUCTIVE)
  locations             List configured locations

Options:
  --location "Name"     Specify GHL sub-account
  --file "path"         Local file path to upload
  --name "Name"         Custom file name (optional)
  --folder "id"         Folder ID for upload
  --type "image"        Filter by type: image, video, document
  --sortBy "field"      Sort field: createdAt, name, size
  --sortOrder "asc"     Sort order: asc, desc
  --all                 Fetch all pages
  --limit <n>           Results per page
  --offset <n>          Skip first n results
  --verbose             Show full API response
  --force               Skip confirmation prompts

Examples:
  node medias.js list --location "WISER"
  node medias.js list --type image --location "WISER"
  node medias.js upload --file "/path/to/image.jpg" --location "WISER"
  node medias.js get file123 --location "WISER"
  node medias.js delete file123 --location "WISER"

Supported file types: Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV),
Documents (PDF, DOC, DOCX)

WARNING: Deleting files may break references in emails, pages, and other content.
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'list':
      await listMedia(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: File ID required');
        process.exit(1);
      }
      await getMedia(args._[1], locationConfig);
      break;
    case 'upload':
      await uploadMedia(locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: File ID required');
        process.exit(1);
      }
      await deleteMedia(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node medias.js help" for usage');
      process.exit(1);
  }
}

main();
