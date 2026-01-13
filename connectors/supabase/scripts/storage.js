#!/usr/bin/env node

/**
 * Supabase Storage Script
 * Manage storage buckets and files.
 *
 * Usage:
 *   node storage.js buckets --project <ref>
 *   node storage.js create-bucket <name> [--public] --project <ref>
 *   node storage.js list <bucket> [path] --project <ref>
 *   node storage.js upload <bucket> <local-path> [remote-path] --project <ref>
 *   node storage.js download <bucket> <remote-path> [local-path] --project <ref>
 *   node storage.js delete <bucket> <path> [--force] --project <ref>
 *   node storage.js url <bucket> <path> [--expires N] --project <ref>
 *   node storage.js help
 */

import { parseArgs, storageRequest, formatBytes, formatDate } from './utils.js';
import fs from 'fs';
import path from 'path';
import * as readline from 'readline';

// List all buckets
async function listBuckets(verbose, project) {
  const data = await storageRequest('/bucket', { project });

  console.log(`Found ${data.length} bucket(s):\n`);

  for (const bucket of data) {
    const visibility = bucket.public ? 'public' : 'private';
    console.log(`  ${bucket.name} (${visibility})`);
    if (verbose) {
      console.log(`    ID: ${bucket.id}`);
      console.log(`    Created: ${formatDate(bucket.created_at)}`);
      console.log(`    Updated: ${formatDate(bucket.updated_at)}`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Create a bucket
async function createBucket(name, isPublic, verbose, project) {
  const data = await storageRequest('/bucket', {
    method: 'POST',
    body: {
      name: name,
      id: name,
      public: isPublic
    },
    project
  });

  const visibility = isPublic ? 'public' : 'private';
  console.log(`Created bucket: ${name} (${visibility})`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Delete a bucket
async function deleteBucket(name, force, verbose, project) {
  if (!force) {
    const confirmed = await confirmDelete(`bucket '${name}'`);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  // First empty the bucket
  await storageRequest(`/bucket/${name}/empty`, { method: 'POST', project });

  // Then delete it
  const data = await storageRequest(`/bucket/${name}`, { method: 'DELETE', project });

  console.log(`Deleted bucket: ${name}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// List files in a bucket
async function listFiles(bucket, prefix, verbose, project) {
  const body = {
    prefix: prefix || '',
    limit: 100,
    offset: 0
  };

  const data = await storageRequest(`/object/list/${bucket}`, {
    method: 'POST',
    body: body,
    project
  });

  if (!data || data.length === 0) {
    console.log('No files found.');
    return [];
  }

  console.log(`Found ${data.length} item(s):\n`);

  for (const item of data) {
    const type = item.id ? 'file' : 'folder';
    const size = item.metadata?.size ? formatBytes(item.metadata.size) : '';
    const date = item.updated_at ? formatDate(item.updated_at) : '';
    
    if (type === 'folder') {
      console.log(`  [DIR] ${item.name}/`);
    } else {
      console.log(`  ${item.name} (${size}) - ${date}`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Upload a file
async function uploadFile(bucket, localPath, remotePath, verbose, project) {
  if (!fs.existsSync(localPath)) {
    console.error(`Error: Local file not found: ${localPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(localPath);
  const fileName = remotePath || path.basename(localPath);
  
  // Determine content type
  const ext = path.extname(localPath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';

  const data = await storageRequest(`/object/${bucket}/${fileName}`, {
    method: 'POST',
    body: fileBuffer,
    contentType: contentType,
    headers: {
      'x-upsert': 'true'
    },
    project
  });

  console.log(`Uploaded: ${localPath} -> ${bucket}/${fileName}`);
  console.log(`Size: ${formatBytes(fileBuffer.length)}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Download a file
async function downloadFile(bucket, remotePath, localPath, verbose, project) {
  const data = await storageRequest(`/object/${bucket}/${remotePath}`, {
    returnBuffer: true,
    project
  });

  const outputPath = localPath || path.basename(remotePath);
  fs.writeFileSync(outputPath, Buffer.from(data));

  console.log(`Downloaded: ${bucket}/${remotePath} -> ${outputPath}`);
  console.log(`Size: ${formatBytes(data.byteLength)}`);

  return outputPath;
}

// Delete a file
async function deleteFile(bucket, filePath, force, verbose, project) {
  if (!force) {
    const confirmed = await confirmDelete(`file '${filePath}' from ${bucket}`);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  const data = await storageRequest(`/object/${bucket}`, {
    method: 'DELETE',
    body: {
      prefixes: [filePath]
    },
    project
  });

  console.log(`Deleted: ${bucket}/${filePath}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Get signed URL
async function getSignedUrl(bucket, filePath, expiresIn, verbose, project) {
  const data = await storageRequest(`/object/sign/${bucket}/${filePath}`, {
    method: 'POST',
    body: {
      expiresIn: expiresIn || 3600 // Default 1 hour
    },
    project
  });

  console.log(`Signed URL (expires in ${expiresIn || 3600} seconds):`);
  console.log(data.signedURL);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.signedURL;
}

// Confirm deletion
async function confirmDelete(target) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Delete ${target}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Supabase Storage Script');
  console.log('');
  console.log('Commands:');
  console.log('  buckets                              List all buckets');
  console.log('  create-bucket <name> [--public]      Create a bucket');
  console.log('  delete-bucket <name> [--force]       Delete a bucket');
  console.log('  list <bucket> [prefix]               List files in bucket');
  console.log('  upload <bucket> <local> [remote]     Upload a file');
  console.log('  download <bucket> <remote> [local]   Download a file');
  console.log('  delete <bucket> <path> [--force]     Delete a file');
  console.log('  url <bucket> <path> [--expires N]    Get signed URL');
  console.log('  help                                 Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --project <ref>                      Target project (required if multiple configured)');
  console.log('  --verbose                            Show full API responses');
  console.log('  --public                             Make bucket public');
  console.log('  --force                              Skip delete confirmation');
  console.log('  --expires N                          URL expiry in seconds (default: 3600)');
  console.log('');
  console.log('Examples:');
  console.log('  # List buckets');
  console.log('  node storage.js buckets --project abc123');
  console.log('');
  console.log('  # Create a private bucket');
  console.log('  node storage.js create-bucket my-files --project abc123');
  console.log('');
  console.log('  # Create a public bucket');
  console.log('  node storage.js create-bucket public-assets --public --project abc123');
  console.log('');
  console.log('  # List files in bucket');
  console.log('  node storage.js list my-files --project abc123');
  console.log('');
  console.log('  # Upload a file');
  console.log('  node storage.js upload my-files ./photo.jpg --project abc123');
  console.log('');
  console.log('  # Download a file');
  console.log('  node storage.js download my-files images/photo.jpg ./downloaded.jpg --project abc123');
  console.log('');
  console.log('  # Delete a file');
  console.log('  node storage.js delete my-files images/photo.jpg --project abc123');
  console.log('');
  console.log('  # Get signed URL');
  console.log('  node storage.js url my-files images/photo.jpg --project abc123');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const project = args.project;

  try {
    switch (command) {
      case 'buckets': {
        await listBuckets(verbose, project);
        break;
      }

      case 'create-bucket': {
        const name = args._[1];
        
        if (!name) {
          console.error('Error: Bucket name is required');
          console.error('Usage: node storage.js create-bucket <name> [--public] --project <ref>');
          process.exit(1);
        }
        
        await createBucket(name, args.public || false, verbose, project);
        break;
      }

      case 'delete-bucket': {
        const name = args._[1];
        
        if (!name) {
          console.error('Error: Bucket name is required');
          console.error('Usage: node storage.js delete-bucket <name> [--force] --project <ref>');
          process.exit(1);
        }
        
        await deleteBucket(name, args.force, verbose, project);
        break;
      }

      case 'list': {
        const bucket = args._[1];
        const prefix = args._[2];
        
        if (!bucket) {
          console.error('Error: Bucket name is required');
          console.error('Usage: node storage.js list <bucket> [prefix] --project <ref>');
          process.exit(1);
        }
        
        await listFiles(bucket, prefix, verbose, project);
        break;
      }

      case 'upload': {
        const bucket = args._[1];
        const localPath = args._[2];
        const remotePath = args._[3];
        
        if (!bucket || !localPath) {
          console.error('Error: Bucket and local path are required');
          console.error('Usage: node storage.js upload <bucket> <local-path> [remote-path] --project <ref>');
          process.exit(1);
        }
        
        await uploadFile(bucket, localPath, remotePath, verbose, project);
        break;
      }

      case 'download': {
        const bucket = args._[1];
        const remotePath = args._[2];
        const localPath = args._[3];
        
        if (!bucket || !remotePath) {
          console.error('Error: Bucket and remote path are required');
          console.error('Usage: node storage.js download <bucket> <remote-path> [local-path] --project <ref>');
          process.exit(1);
        }
        
        await downloadFile(bucket, remotePath, localPath, verbose, project);
        break;
      }

      case 'delete': {
        const bucket = args._[1];
        const filePath = args._[2];
        
        if (!bucket || !filePath) {
          console.error('Error: Bucket and file path are required');
          console.error('Usage: node storage.js delete <bucket> <path> [--force] --project <ref>');
          process.exit(1);
        }
        
        await deleteFile(bucket, filePath, args.force, verbose, project);
        break;
      }

      case 'url': {
        const bucket = args._[1];
        const filePath = args._[2];
        
        if (!bucket || !filePath) {
          console.error('Error: Bucket and file path are required');
          console.error('Usage: node storage.js url <bucket> <path> [--expires N] --project <ref>');
          process.exit(1);
        }
        
        const expires = args.expires ? parseInt(args.expires) : 3600;
        await getSignedUrl(bucket, filePath, expires, verbose, project);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.statusCode) {
      console.error('Status:', error.statusCode);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
