#!/usr/bin/env node
/**
 * Google Drive utilities for folder detection, file management, and export.
 * 
 * Usage:
 *   node drive.js detect-account /path/to/google/drive/folder
 *   node drive.js get-folder-id "Shared drives/Work/Documents" --account user@example.com
 *   node drive.js export FILE_ID pdf ./output.pdf --account user@example.com
 *   node drive.js move FILE_ID FOLDER_ID --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../connectors/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { writeFileSync, existsSync, mkdirSync, readdirSync, createReadStream } from 'fs';
import { dirname, basename, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { platform, homedir } from 'os';

// Local modules
import { getAuthClient } from './auth.js';

// MIME types for common image formats
const IMAGE_MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
};

/**
 * Extract Google account email from a local file path
 * Parses paths like: /Users/.../GoogleDrive-user@example.com/Shared drives/...
 */
export function detectAccountFromPath(localPath) {
  // Pattern: GoogleDrive-{email}
  const match = localPath.match(/GoogleDrive-([^\/\\]+)/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Determine if path is in a Shared Drive or My Drive
 * Returns: { type: 'shared' | 'mydrive', driveName?: string, relativePath: string }
 */
export function parseGoogleDrivePath(localPath) {
  // Extract the part after GoogleDrive-email/
  const match = localPath.match(/GoogleDrive-[^\/\\]+[\/\\](.+)/);
  if (!match) {
    return null;
  }
  
  const pathAfterDrive = match[1];
  
  // Check for Shared drives
  const sharedMatch = pathAfterDrive.match(/^Shared drives[\/\\]([^\/\\]+)[\/\\]?(.*)/);
  if (sharedMatch) {
    return {
      type: 'shared',
      driveName: sharedMatch[1],
      relativePath: sharedMatch[2] || ''
    };
  }
  
  // Otherwise it's My Drive
  return {
    type: 'mydrive',
    relativePath: pathAfterDrive
  };
}

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
  
  // Skip empty parts
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
 * Path format: "Shared drives/DriveName/Folder/Subfolder" or "My Drive/Folder/Subfolder"
 */
export async function getFolderId(email, pathString) {
  const drive = await getDriveApi(email);
  
  // Parse the path
  const parts = pathString.split(/[\/\\]/).filter(p => p);
  
  if (parts[0] === 'Shared drives' && parts.length >= 2) {
    // Shared Drive path
    const driveName = parts[1];
    const sharedDrive = await findSharedDrive(drive, driveName);
    
    if (!sharedDrive) {
      throw new Error(`Shared Drive not found: ${driveName}`);
    }
    
    const folderPath = parts.slice(2);
    return findFolderByPath(drive, folderPath, sharedDrive.id, true);
  } else {
    // My Drive path
    const folderPath = parts[0] === 'My Drive' ? parts.slice(1) : parts;
    return findFolderByPath(drive, folderPath, 'root', false);
  }
}

/**
 * Export a Google file to a specific format
 */
export async function exportFile(email, fileId, mimeType, outputPath) {
  const drive = await getDriveApi(email);
  
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const response = await drive.files.export({
    fileId,
    mimeType
  }, {
    responseType: 'arraybuffer'
  });
  
  writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

/**
 * Move a file to a different folder
 */
export async function moveFile(email, fileId, newParentId) {
  const drive = await getDriveApi(email);
  
  // Get current parents
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true
  });
  
  const previousParents = file.data.parents ? file.data.parents.join(',') : '';
  
  // Move file
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: previousParents,
    supportsAllDrives: true,
    fields: 'id, parents'
  });
  
  return fileId;
}

/**
 * Create a folder
 */
export async function createFolder(email, name, parentId = null, driveId = null) {
  const drive = await getDriveApi(email);
  
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  
  const params = {
    resource: fileMetadata,
    fields: 'id, name'
  };
  
  if (driveId) {
    params.supportsAllDrives = true;
  }
  
  const response = await drive.files.create(params);
  return response.data;
}

/**
 * Get file metadata
 */
export async function getFileInfo(email, fileId) {
  const drive = await getDriveApi(email);
  
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, parents, webViewLink, createdTime, modifiedTime, driveId',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Get the full path of a file in Google Drive (for mapping to local path)
 * Returns array of folder names from root to parent
 */
async function getFilePath(email, fileId) {
  const drive = await getDriveApi(email);
  const path = [];
  
  let currentId = fileId;
  let isSharedDrive = false;
  let sharedDriveName = null;
  
  while (currentId) {
    const file = await drive.files.get({
      fileId: currentId,
      fields: 'id, name, parents, driveId',
      supportsAllDrives: true
    });
    
    // Check if this is a shared drive root
    if (file.data.driveId && !file.data.parents) {
      isSharedDrive = true;
      // Get the shared drive name
      const driveInfo = await drive.drives.get({ driveId: file.data.driveId });
      sharedDriveName = driveInfo.data.name;
      break;
    }
    
    // Skip the file itself, only add parent folders
    if (currentId !== fileId) {
      path.unshift(file.data.name);
    }
    
    // Move to parent
    currentId = file.data.parents?.[0] || null;
    
    // If parent is 'root' or no parent, we're at My Drive root
    if (!currentId) break;
  }
  
  return { path, isSharedDrive, sharedDriveName };
}

/**
 * Detect the local Google Drive base path for an account
 * Cross-platform: supports macOS, Windows, and Linux
 * @param {string} email - Google account email
 * @returns {string|null} - Base path or null if not found
 */
function detectGoogleDriveBasePath(email) {
  const home = homedir();
  const os = platform();
  
  if (os === 'darwin') {
    // macOS: ~/Library/CloudStorage/GoogleDrive-email/
    const macPath = join(home, 'Library', 'CloudStorage', `GoogleDrive-${email}`);
    if (existsSync(macPath)) {
      return macPath;
    }
    // Also check for paths without email in name (older installations)
    const cloudStorage = join(home, 'Library', 'CloudStorage');
    if (existsSync(cloudStorage)) {
      try {
        const dirs = readdirSync(cloudStorage);
        const match = dirs.find(d => d.startsWith('GoogleDrive-') && d.includes(email.split('@')[0]));
        if (match) {
          return join(cloudStorage, match);
        }
      } catch (e) {
        // Ignore read errors
      }
    }
  } else if (os === 'win32') {
    // Windows: Check common locations
    // 1. Virtual drive (usually G:\ but can be any letter)
    const driveLetters = 'GHIJKLMNOPQRSTUVWXYZABCDEF'.split('');
    for (const letter of driveLetters) {
      const drivePath = `${letter}:\\`;
      if (existsSync(join(drivePath, 'My Drive')) || existsSync(join(drivePath, 'Shared drives'))) {
        return drivePath;
      }
    }
    // 2. Mirror mode: ~/My Drive or ~/Google Drive
    const mirrorPaths = [
      join(home, 'My Drive'),
      join(home, 'Google Drive'),
      join(home, `Google Drive (${email})`)
    ];
    for (const p of mirrorPaths) {
      if (existsSync(p)) {
        return p;
      }
    }
  } else {
    // Linux: Google Drive doesn't have official client, but check common locations
    const linuxPaths = [
      join(home, 'Google Drive'),
      join(home, 'google-drive')
    ];
    for (const p of linuxPaths) {
      if (existsSync(p)) {
        return p;
      }
    }
  }
  
  return null;
}

/**
 * Get the local filesystem path for a Google Drive file
 * Maps Google Drive location to local sync path (cross-platform)
 */
export async function getLocalPath(email, fileId) {
  const fileInfo = await getFileInfo(email, fileId);
  const { path: folderPath, isSharedDrive, sharedDriveName } = await getFilePath(email, fileId);
  
  // Detect the Google Drive base path for this platform
  const cloudStorageBase = detectGoogleDriveBasePath(email);
  
  if (!cloudStorageBase) {
    throw new Error(
      `Could not detect Google Drive sync folder for ${email}. ` +
      `Ensure Google Drive for Desktop is installed and syncing.`
    );
  }
  
  let localDir;
  if (isSharedDrive && sharedDriveName) {
    localDir = join(cloudStorageBase, 'Shared drives', sharedDriveName, ...folderPath);
  } else {
    localDir = join(cloudStorageBase, 'My Drive', ...folderPath);
  }
  
  return {
    directory: localDir,
    filename: fileInfo.name,
    fullPath: join(localDir, fileInfo.name)
  };
}

/**
 * Delete a file (moves to trash)
 */
export async function deleteFile(email, fileId) {
  const drive = await getDriveApi(email);
  
  await drive.files.delete({
    fileId,
    supportsAllDrives: true
  });
  
  return { id: fileId, deleted: true };
}

/**
 * Upload a file to Google Drive
 * @param {string} email - Google account email
 * @param {string} localPath - Path to local file
 * @param {string} parentId - Optional parent folder ID
 * @param {string} name - Optional custom name (defaults to filename)
 * @returns {object} - { id, name, webContentLink }
 */
export async function uploadFile(email, localPath, parentId = null, name = null) {
  if (!existsSync(localPath)) {
    throw new Error(`File not found: ${localPath}`);
  }
  
  const drive = await getDriveApi(email);
  const fileName = name || basename(localPath);
  const ext = extname(localPath).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[ext] || 'application/octet-stream';
  
  const fileMetadata = { name: fileName };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  
  const media = {
    mimeType,
    body: createReadStream(localPath)
  };
  
  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, name, webContentLink, webViewLink',
    supportsAllDrives: true
  });
  
  return response.data;
}

/**
 * Make a file publicly accessible (anyone with link can view)
 * Required for embedding images in Google Docs
 * @param {string} email - Google account email
 * @param {string} fileId - File ID to make public
 */
export async function makeFilePublic(email, fileId) {
  const drive = await getDriveApi(email);
  
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    },
    supportsAllDrives: true
  });
  
  return { id: fileId, public: true };
}

/**
 * List comments on a file
 */
export async function listComments(email, fileId) {
  const drive = await getDriveApi(email);
  
  const response = await drive.comments.list({
    fileId,
    fields: 'comments(id, content, author, quotedFileContent, resolved, createdTime, modifiedTime, replies)',
    includeDeleted: false
  });
  
  return response.data.comments || [];
}

/**
 * Add a comment to a file
 */
export async function addComment(email, fileId, content, quotedText = null) {
  const drive = await getDriveApi(email);
  
  const requestBody = { content };
  if (quotedText) {
    requestBody.quotedFileContent = { value: quotedText };
  }
  
  const response = await drive.comments.create({
    fileId,
    fields: 'id, content, author, quotedFileContent, createdTime',
    requestBody
  });
  
  return response.data;
}

/**
 * Reply to a comment
 */
export async function replyToComment(email, fileId, commentId, content) {
  const drive = await getDriveApi(email);
  
  const response = await drive.replies.create({
    fileId,
    commentId,
    fields: 'id, content, author, createdTime',
    requestBody: { content }
  });
  
  return response.data;
}

// Export MIME types for convenience
export const EXPORT_TYPES = {
  // Google Docs
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  html: 'text/html',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  
  // Google Sheets
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  
  // Google Slides
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation'
};

// CLI - only run when this file is the main entry point
async function runCLI() {
  function showHelp() {
    console.log(`
Google Drive utilities for folder detection, file management, and export.

Usage:
  node drive.js <command> [options]

Commands:
  detect-account PATH       Extract Google account from local file path
  get-folder-id PATH        Get Drive folder ID from path string
  export FILE_ID FORMAT OUTPUT   Export file to local format
  move FILE_ID FOLDER_ID    Move file to a different folder
  info FILE_ID              Get file metadata
  delete FILE_ID            Delete a file permanently (prompts for confirmation)
                            Use --force to skip confirmation
  comments FILE_ID          List all comments on a file
  comment FILE_ID "text"    Add a comment to a file
                            Use --quote "text" to anchor to specific text
  reply FILE_ID COMMENT_ID "text"  Reply to a comment

Options:
  --account EMAIL           Google account email (required for most commands)
  --help, -h                Show this help message

Export Formats:
  Docs:   pdf, docx, txt, html, rtf, odt
  Sheets: xlsx, csv, ods, pdf
  Slides: pptx, odp, pdf

Examples:
  node drive.js detect-account "/Users/me/GoogleDrive-user@example.com/Shared drives/Work"
  node drive.js get-folder-id "Shared drives/Work/Documents" --account user@example.com
  node drive.js export abc123 pdf ./document.pdf --account user@example.com
  node drive.js move abc123 xyz789 --account user@example.com
`);
    process.exit(0);
  }

  // Parse CLI arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
  }

  const command = args[0];
  let account = null;

  // Find --account flag
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--account' && args[i + 1]) {
      account = args[++i];
    }
  }

  try {
    switch (command) {
      case 'detect-account': {
        const path = args[1];
        if (!path) {
          console.error('Error: PATH is required');
          process.exit(1);
        }
        const detected = detectAccountFromPath(path);
        if (detected) {
          console.log(detected);
        } else {
          console.error('Could not detect Google account from path');
          process.exit(1);
        }
        break;
      }
      
      case 'get-folder-id': {
        const pathStr = args[1];
        if (!pathStr || !account) {
          console.error('Error: PATH and --account are required');
          process.exit(1);
        }
        const folderId = await getFolderId(account, pathStr);
        console.log(folderId);
        break;
      }
      
      case 'export': {
        const fileId = args[1];
        const format = args[2];
        const output = args[3];
        if (!fileId || !format || !output || !account) {
          console.error('Error: FILE_ID, FORMAT, OUTPUT, and --account are required');
          process.exit(1);
        }
        const mimeType = EXPORT_TYPES[format.toLowerCase()];
        if (!mimeType) {
          console.error(`Error: Unknown format: ${format}`);
          console.error('Available formats: ' + Object.keys(EXPORT_TYPES).join(', '));
          process.exit(1);
        }
        await exportFile(account, fileId, mimeType, output);
        console.log(`Exported to: ${output}`);
        break;
      }
      
      case 'move': {
        const fileId = args[1];
        const folderId = args[2];
        if (!fileId || !folderId || !account) {
          console.error('Error: FILE_ID, FOLDER_ID, and --account are required');
          process.exit(1);
        }
        await moveFile(account, fileId, folderId);
        console.log(`File moved successfully`);
        break;
      }
      
      case 'info': {
        const fileId = args[1];
        if (!fileId || !account) {
          console.error('Error: FILE_ID and --account are required');
          process.exit(1);
        }
        const info = await getFileInfo(account, fileId);
        console.log(JSON.stringify(info, null, 2));
        break;
      }
      
      case 'delete': {
        const fileId = args[1];
        const force = args.includes('--force') || args.includes('-f');
        if (!fileId || !account) {
          console.error('Error: FILE_ID and --account are required');
          process.exit(1);
        }
        
        // Get file info first to show what we're deleting
        const fileInfo = await getFileInfo(account, fileId);
        console.log(`\nAbout to delete: ${fileInfo.name}`);
        console.log(`Type: ${fileInfo.mimeType}`);
        console.log(`ID: ${fileId}`);
        
        let confirmed = force;
        
        if (!force) {
          // Prompt for confirmation
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          confirmed = await new Promise((resolve) => {
            rl.question('\nAre you sure you want to delete this file? (yes/no): ', (answer) => {
              rl.close();
              resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
            });
          });
        }
        
        if (confirmed) {
          await deleteFile(account, fileId);
          console.log(`\nFile deleted: ${fileInfo.name}`);
        } else {
          console.log('\nDeletion cancelled.');
        }
        break;
      }
      
      case 'comments': {
        const fileId = args[1];
        if (!fileId || !account) {
          console.error('Error: FILE_ID and --account are required');
          process.exit(1);
        }
        const comments = await listComments(account, fileId);
        if (comments.length === 0) {
          console.log('\nNo comments on this file.');
        } else {
          console.log(`\nComments (${comments.length}):\n`);
          for (const comment of comments) {
            const status = comment.resolved ? '[RESOLVED]' : '';
            const quoted = comment.quotedFileContent?.value ? `"${comment.quotedFileContent.value}"` : '';
            console.log(`─────────────────────────────────`);
            console.log(`ID: ${comment.id} ${status}`);
            console.log(`Author: ${comment.author?.displayName || 'Unknown'}`);
            if (quoted) console.log(`On text: ${quoted}`);
            console.log(`Comment: ${comment.content}`);
            console.log(`Date: ${new Date(comment.createdTime).toLocaleString()}`);
            if (comment.replies?.length > 0) {
              console.log(`\n  Replies:`);
              for (const reply of comment.replies) {
                console.log(`    - ${reply.author?.displayName}: ${reply.content}`);
              }
            }
          }
        }
        break;
      }
      
      case 'comment': {
        const fileId = args[1];
        const content = args[2];
        if (!fileId || !content || !account) {
          console.error('Error: FILE_ID, comment text, and --account are required');
          console.error('Use --quote "text" to anchor comment to specific text in the document');
          process.exit(1);
        }
        // Check for --quote option
        const quoteIndex = args.indexOf('--quote');
        const quotedText = quoteIndex !== -1 ? args[quoteIndex + 1] : null;
        const comment = await addComment(account, fileId, content, quotedText);
        console.log(`\nComment added: ${comment.id}`);
        if (quotedText) {
          console.log(`Anchored to: "${quotedText}"`);
        } else {
          console.log('Note: Comment is not anchored to text. Use --quote "text" to anchor.');
        }
        break;
      }
      
      case 'reply': {
        const fileId = args[1];
        const commentId = args[2];
        const content = args[3];
        if (!fileId || !commentId || !content || !account) {
          console.error('Error: FILE_ID, COMMENT_ID, reply text, and --account are required');
          process.exit(1);
        }
        const reply = await replyToComment(account, fileId, commentId, content);
        console.log(`\nReply added: ${reply.id}`);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Only run CLI if this is the main entry point
const __filename = fileURLToPath(import.meta.url);
const isMainModule = __filename === process.argv[1];
if (isMainModule) {
  runCLI();
}

