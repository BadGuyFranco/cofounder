#!/usr/bin/env node
/**
 * Google Drive Operations
 * List, upload, download, share, and manage files and folders.
 * 
 * Usage:
 *   node drive.js list "Shared drives/Work" --account user@example.com
 *   node drive.js upload ./file.pdf --parent FOLDER_ID --account user@example.com
 *   node drive.js download FILE_ID ./output.pdf --account user@example.com
 */

import { google } from 'googleapis';
import { createReadStream, createWriteStream, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, extname } from 'path';
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  detectAccountFromPath,
  parseGoogleDrivePath,
  EXPORT_TYPES,
  GOOGLE_MIME_TYPES,
  requireApi
} from './utils.js';

/**
 * Get Drive API instance
 */
async function getDriveApi(email) {
  const auth = await getAuthClient(email);
  return google.drive({ version: 'v3', auth });
}

/**
 * Find a Shared Drive by name
 */
async function findSharedDrive(drive, driveName) {
  const response = await drive.drives.list({
    q: `name = '${driveName}'`,
    fields: 'drives(id, name)'
  });
  
  if (response.data.drives && response.data.drives.length > 0) {
    return response.data.drives[0];
  }
  return null;
}

/**
 * Find folder ID by traversing path
 */
async function findFolderByPath(drive, pathParts, parentId, supportsAllDrives = false) {
  if (pathParts.length === 0) {
    return parentId;
  }
  
  const [current, ...rest] = pathParts;
  
  if (!current) {
    return findFolderByPath(drive, rest, parentId, supportsAllDrives);
  }
  
  const query = parentId
    ? `name = '${current}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${current}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives,
    includeItemsFromAllDrives: supportsAllDrives
  });
  
  if (response.data.files && response.data.files.length > 0) {
    const folder = response.data.files[0];
    return findFolderByPath(drive, rest, folder.id, supportsAllDrives);
  }
  
  throw new Error(`Folder not found: ${current}`);
}

/**
 * Get folder ID from a path string
 */
export async function getFolderId(email, pathString) {
  const drive = await getDriveApi(email);
  const parts = pathString.split(/[\/\\]/).filter(p => p);
  
  if (parts[0] === 'Shared drives' && parts.length >= 2) {
    const driveName = parts[1];
    const sharedDrive = await findSharedDrive(drive, driveName);
    
    if (!sharedDrive) {
      throw new Error(`Shared Drive not found: ${driveName}`);
    }
    
    const folderPath = parts.slice(2);
    return findFolderByPath(drive, folderPath, sharedDrive.id, true);
  } else {
    const folderPath = parts[0] === 'My Drive' ? parts.slice(1) : parts;
    return findFolderByPath(drive, folderPath, 'root', false);
  }
}

/**
 * List files in a folder
 */
async function listFiles(email, pathOrId, flags = {}) {
  const drive = await getDriveApi(email);
  
  let folderId;
  let supportsAllDrives = false;
  
  // Determine if pathOrId is a path or an ID
  if (pathOrId && (pathOrId.includes('/') || pathOrId.includes('\\'))) {
    folderId = await getFolderId(email, pathOrId);
    supportsAllDrives = pathOrId.toLowerCase().includes('shared drives');
  } else if (pathOrId) {
    folderId = pathOrId;
    supportsAllDrives = true; // Assume it could be shared drive
  } else {
    folderId = 'root';
  }
  
  const query = `'${folderId}' in parents and trashed = false`;
  
  const params = {
    q: query,
    fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
    orderBy: 'name',
    pageSize: parseInt(flags.limit) || 100,
    supportsAllDrives,
    includeItemsFromAllDrives: supportsAllDrives
  };
  
  const response = await drive.files.list(params);
  
  const files = response.data.files || [];
  
  if (flags.json) {
    output(files);
  } else {
    console.log(`\nFiles in ${pathOrId || 'My Drive'} (${files.length}):\n`);
    for (const file of files) {
      const isFolder = file.mimeType === GOOGLE_MIME_TYPES.folder;
      const icon = isFolder ? '📁' : '📄';
      const size = file.size ? `(${formatSize(file.size)})` : '';
      console.log(`${icon} ${file.name} ${size}`);
      console.log(`   ID: ${file.id}`);
    }
  }
  
  return files;
}

/**
 * Get file info
 */
async function getFileInfo(email, fileId) {
  const drive = await getDriveApi(email);
  
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, parents, webViewLink, webContentLink, createdTime, modifiedTime, owners, shared, permissions, driveId',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Create a folder
 */
async function createFolder(email, name, parentId = null) {
  const drive = await getDriveApi(email);
  
  const fileMetadata = {
    name,
    mimeType: GOOGLE_MIME_TYPES.folder
  };
  
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  
  const response = await drive.files.create({
    resource: fileMetadata,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Upload a file
 */
async function uploadFile(email, localPath, parentId = null, customName = null) {
  const drive = await getDriveApi(email);
  
  const fileName = customName || basename(localPath);
  const fileSize = statSync(localPath).size;
  
  console.log(`Uploading ${fileName} (${formatSize(fileSize)})...`);
  
  const fileMetadata = { name: fileName };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  
  const media = {
    body: createReadStream(localPath)
  };
  
  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Download a file
 */
async function downloadFile(email, fileId, outputPath) {
  const drive = await getDriveApi(email);
  
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );
  
  return new Promise((resolve, reject) => {
    const dest = createWriteStream(outputPath);
    response.data
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .pipe(dest);
  });
}

/**
 * Export a Google file to a specific format
 */
async function exportFile(email, fileId, format, outputPath) {
  const drive = await getDriveApi(email);
  
  const mimeType = EXPORT_TYPES[format.toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unknown export format: ${format}. Available: ${Object.keys(EXPORT_TYPES).join(', ')}`);
  }
  
  const outputDir = dirname(outputPath);
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const response = await drive.files.export(
    { fileId, mimeType },
    { responseType: 'arraybuffer' }
  );
  
  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, Buffer.from(response.data));
  
  return outputPath;
}

/**
 * Move a file to a different folder
 */
async function moveFile(email, fileId, newParentId) {
  const drive = await getDriveApi(email);
  
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true
  });
  
  const previousParents = file.data.parents ? file.data.parents.join(',') : '';
  
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: previousParents,
    supportsAllDrives: true,
    fields: 'id, name, parents'
  });
  
  return { id: fileId, moved: true, newParent: newParentId };
}

/**
 * Copy a file
 */
async function copyFile(email, fileId, newName = null, parentId = null) {
  const drive = await getDriveApi(email);
  
  const fileMetadata = {};
  if (newName) fileMetadata.name = newName;
  if (parentId) fileMetadata.parents = [parentId];
  
  const response = await drive.files.copy({
    fileId,
    resource: fileMetadata,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Delete a file
 */
async function deleteFile(email, fileId) {
  const drive = await getDriveApi(email);
  
  await drive.files.delete({
    fileId,
    supportsAllDrives: true
  });
  
  return { id: fileId, deleted: true };
}

/**
 * Share a file with someone
 */
async function shareFile(email, fileId, shareEmail, role = 'reader', type = 'user') {
  const drive = await getDriveApi(email);
  
  const permission = {
    type,
    role,
    emailAddress: shareEmail
  };
  
  const response = await drive.permissions.create({
    fileId,
    resource: permission,
    sendNotificationEmail: true,
    supportsAllDrives: true,
    fields: 'id, type, role, emailAddress'
  });
  
  return response.data;
}

/**
 * Search for files
 */
async function searchFiles(email, query, flags = {}) {
  const drive = await getDriveApi(email);
  
  // Build search query
  let q = `fullText contains '${query}' and trashed = false`;
  
  if (flags.type) {
    if (flags.type === 'folder') {
      q += ` and mimeType = '${GOOGLE_MIME_TYPES.folder}'`;
    } else if (flags.type === 'doc') {
      q += ` and mimeType = '${GOOGLE_MIME_TYPES.doc}'`;
    } else if (flags.type === 'sheet') {
      q += ` and mimeType = '${GOOGLE_MIME_TYPES.sheet}'`;
    } else if (flags.type === 'slides') {
      q += ` and mimeType = '${GOOGLE_MIME_TYPES.slides}'`;
    }
  }
  
  const response = await drive.files.list({
    q,
    fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
    pageSize: parseInt(flags.limit) || 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  
  return response.data.files || [];
}

/**
 * List comments on a file
 */
async function listComments(email, fileId) {
  const drive = await getDriveApi(email);
  
  const response = await drive.comments.list({
    fileId,
    fields: 'comments(id, content, author, quotedFileContent, resolved, createdTime, modifiedTime, replies)'
  });
  
  return response.data.comments || [];
}

/**
 * Add a comment to a file
 */
async function addComment(email, fileId, content, quotedText = null) {
  const drive = await getDriveApi(email);
  
  const requestBody = { content };
  if (quotedText) {
    requestBody.quotedFileContent = { value: quotedText };
  }
  
  const response = await drive.comments.create({
    fileId,
    fields: 'id, content, author, createdTime',
    requestBody
  });
  
  return response.data;
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = parseInt(bytes);
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

// CLI
function printHelp() {
  showHelp('Google Drive Operations', {
    'Commands': [
      'list [PATH]                List files in a folder',
      'info FILE_ID               Get file metadata',
      'create-folder NAME         Create a folder',
      'upload LOCAL_PATH          Upload a file',
      'download FILE_ID OUTPUT    Download a file',
      'export FILE_ID FMT OUTPUT  Export Google file to format',
      'move FILE_ID PARENT_ID     Move file to folder',
      'copy FILE_ID               Copy a file',
      'delete FILE_ID             Delete a file',
      'share FILE_ID              Share file with someone',
      'search QUERY               Search for files',
      'comments FILE_ID           List comments on file',
      'comment FILE_ID TEXT       Add comment to file',
      'help                       Show this help'
    ],
    'Options': [
      '--account EMAIL            Google account (required)',
      '--parent FOLDER_ID         Parent folder for create/upload',
      '--name NAME                Custom name for copy/upload',
      '--email EMAIL              Share recipient email',
      '--role ROLE                Share role: reader, writer, commenter',
      '--type TYPE                Search type: folder, doc, sheet, slides',
      '--limit N                  Max results for list/search',
      '--json                     Output as JSON'
    ],
    'Export Formats': [
      'Docs:   pdf, docx, txt, html, rtf, odt',
      'Sheets: xlsx, csv, ods, pdf',
      'Slides: pptx, odp, pdf'
    ],
    'Examples': [
      'node drive.js list "Shared drives/Work" --account user@example.com',
      'node drive.js upload ./report.pdf --parent FOLDER_ID --account user@example.com',
      'node drive.js export DOC_ID pdf ./output.pdf --account user@example.com',
      'node drive.js share FILE_ID --email other@example.com --role writer --account user@example.com',
      'node drive.js search "quarterly report" --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  // Detect account from path if not specified
  let email = flags.account;
  if (!email && args[0]) {
    email = detectAccountFromPath(args[0]);
  }
  
  if (command !== 'help' && !email) {
    console.error('Error: --account is required (or use a Google Drive path)');
    process.exit(1);
  }
  
  // Check API is enabled
  if (command !== 'help') {
    requireApi(email, 'drive', 'drive.js');
  }
  
  try {
    switch (command) {
      case 'list':
        await listFiles(email, args[0], flags);
        break;
        
      case 'info': {
        if (!args[0]) throw new Error('FILE_ID required');
        const info = await getFileInfo(email, args[0]);
        output(info);
        break;
      }
        
      case 'create-folder': {
        if (!args[0]) throw new Error('Folder name required');
        const folder = await createFolder(email, args[0], flags.parent);
        console.log(`\n✓ Created folder: ${folder.name}`);
        console.log(`  ID: ${folder.id}`);
        console.log(`  URL: ${folder.webViewLink}`);
        break;
      }
        
      case 'upload': {
        if (!args[0]) throw new Error('Local file path required');
        if (!existsSync(args[0])) throw new Error(`File not found: ${args[0]}`);
        const file = await uploadFile(email, args[0], flags.parent, flags.name);
        console.log(`\n✓ Uploaded: ${file.name}`);
        console.log(`  ID: ${file.id}`);
        console.log(`  URL: ${file.webViewLink}`);
        break;
      }
        
      case 'download': {
        if (!args[0]) throw new Error('FILE_ID required');
        if (!args[1]) throw new Error('Output path required');
        await downloadFile(email, args[0], args[1]);
        console.log(`\n✓ Downloaded to: ${args[1]}`);
        break;
      }
        
      case 'export': {
        if (!args[0]) throw new Error('FILE_ID required');
        if (!args[1]) throw new Error('Format required (pdf, docx, etc.)');
        if (!args[2]) throw new Error('Output path required');
        await exportFile(email, args[0], args[1], args[2]);
        console.log(`\n✓ Exported to: ${args[2]}`);
        break;
      }
        
      case 'move': {
        if (!args[0]) throw new Error('FILE_ID required');
        if (!args[1]) throw new Error('New parent FOLDER_ID required');
        await moveFile(email, args[0], args[1]);
        console.log(`\n✓ File moved successfully`);
        break;
      }
        
      case 'copy': {
        if (!args[0]) throw new Error('FILE_ID required');
        const copy = await copyFile(email, args[0], flags.name, flags.parent);
        console.log(`\n✓ Copied: ${copy.name}`);
        console.log(`  ID: ${copy.id}`);
        break;
      }
        
      case 'delete': {
        if (!args[0]) throw new Error('FILE_ID required');
        const info = await getFileInfo(email, args[0]);
        console.log(`\nDeleting: ${info.name}`);
        await deleteFile(email, args[0]);
        console.log(`✓ Deleted`);
        break;
      }
        
      case 'share': {
        if (!args[0]) throw new Error('FILE_ID required');
        if (!flags.email) throw new Error('--email required');
        const permission = await shareFile(
          email,
          args[0],
          flags.email,
          flags.role || 'reader',
          flags.type || 'user'
        );
        console.log(`\n✓ Shared with ${flags.email} as ${permission.role}`);
        break;
      }
        
      case 'search': {
        if (!args[0]) throw new Error('Search query required');
        const results = await searchFiles(email, args[0], flags);
        if (flags.json) {
          output(results);
        } else {
          console.log(`\nSearch results for "${args[0]}" (${results.length}):\n`);
          for (const file of results) {
            console.log(`📄 ${file.name}`);
            console.log(`   ID: ${file.id}`);
            console.log(`   URL: ${file.webViewLink}`);
          }
        }
        break;
      }
        
      case 'comments': {
        if (!args[0]) throw new Error('FILE_ID required');
        const comments = await listComments(email, args[0]);
        if (comments.length === 0) {
          console.log('\nNo comments on this file.');
        } else {
          console.log(`\nComments (${comments.length}):\n`);
          for (const comment of comments) {
            const status = comment.resolved ? '[RESOLVED]' : '';
            console.log(`ID: ${comment.id} ${status}`);
            console.log(`Author: ${comment.author?.displayName || 'Unknown'}`);
            console.log(`Comment: ${comment.content}`);
            console.log('');
          }
        }
        break;
      }
        
      case 'comment': {
        if (!args[0]) throw new Error('FILE_ID required');
        if (!args[1]) throw new Error('Comment text required');
        const comment = await addComment(email, args[0], args[1], flags.quote);
        console.log(`\n✓ Comment added: ${comment.id}`);
        break;
      }
        
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();
